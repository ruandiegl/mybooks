import { randomUUID } from 'node:crypto';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const stop=reason=>{throw Object.assign(new Error(reason),{backfillReason:reason});};

function controlledKey(value,origins) {
  let url;
  try {url=new URL(value);} catch {return null;}
  if(!origins.has(url.origin)) return null;
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash) stop('UNSAFE_CONTROLLED_URL');
  const pieces=url.pathname.slice(1).split('/');
  const file=pieces.at(-1)?.match(/^([0-9a-f-]{36})\.(jpg|png|webp)$/i);
  if(!file||!uuid.test(file[1])||!pieces.slice(1,-1).every(id=>uuid.test(id))) stop('INVALID_MEDIA_KEY');
  if(!((pieces[0]==='avatars'&&pieces.length===3)||(pieces[0]==='books'&&pieces.length===4))) stop('INVALID_MEDIA_KEY');
  return pieces.join('/');
}

function verifyObject(object) {
  if(!object) stop('OBJECT_MISSING');
  if(!extension[object.mimeType]||!Number.isInteger(object.size)||object.size<=0||object.size>8*1024*1024) stop('OBJECT_INVALID');
  return object;
}

// Operational backfill only. No URL is fetched, and no source object is deleted.
export async function backfillLegacyMedia({users,images,origins,inspectObject,copyObject,holdCopy,releaseCopy,saveAvatar,saveBook,enqueueCleanup,newId=randomUUID,dryRun=true}) {
  const trusted=new Set(origins.map(origin=>new URL(origin).origin));
  const result={avatars:0,books:0,copies:0,skipped:0,planned:0,blocked:[]};
  for(const user of users) {
    try {
      if(user.avatarStorageKey){result.skipped++;continue;}
      const key=controlledKey(user.avatarUrl,trusted);
      if(!key){result.skipped++;continue;}
      if(!uuid.test(user.id)||key.split('/')[0]!=='avatars'||key.split('/')[1]!==user.id) stop('AVATAR_OWNER_MISMATCH');
      verifyObject(await inspectObject(key));
      if(dryRun){result.planned++;continue;}
      if(!await saveAvatar(user,{avatarUrl:null,avatarStorageKey:key,avatarVersion:user.avatarVersion+1})) stop('CONCURRENT_CHANGE');
      result.avatars++;
    } catch(error) {result.blocked.push({kind:'avatar',reason:error.backfillReason??'STORAGE_OR_DATABASE_FAILED'});}
  }
  for(const image of images) {
    let copiedKey;
    let copySucceeded=false, recordState='not-started';
    try {
      if(image.storageKey){result.skipped++;continue;}
      const source=controlledKey(image.url,trusted);
      if(!source){result.skipped++;continue;}
      if(![image.id,image.bookId,image.ownerId].every(id=>uuid.test(id))) stop('BOOK_OWNER_INVALID');
      const object=verifyObject(await inspectObject(source));
      const expected=`books/${image.ownerId}/${image.bookId}/${image.id}.${extension[object.mimeType]}`;
      let destination=source;
      if(source!==expected) {
        const id=newId();if(!uuid.test(id))stop('INVALID_NEW_ID');
        destination=`books/${image.ownerId}/${image.bookId}/${id}.${extension[object.mimeType]}`;
        if(await inspectObject(destination))stop('DESTINATION_EXISTS');
      }
      if(dryRun){result.planned++;continue;}
      if(source!==destination) {
        await holdCopy(destination);
        copiedKey=destination;
        await copyObject(source,destination,object.etag);
        copySucceeded=true;result.copies++;
        const copied=verifyObject(await inspectObject(destination));
        if(copied.mimeType!==object.mimeType||copied.size!==object.size)stop('COPY_MISMATCH');
      }
      recordState='unknown';
      const saved=await saveBook(image,{url:null,storageKey:destination,mimeType:object.mimeType,size:object.size});
      recordState=saved?'linked':'unlinked';
      if(!saved)stop('CONCURRENT_CHANGE');
      if(copiedKey)await releaseCopy(copiedKey);
      copiedKey=null;result.books++;
    } catch(error) {
      result.blocked.push({kind:'book',reason:error.backfillReason??'STORAGE_OR_DATABASE_FAILED'});
      // An uncertain write or DB commit remains held indefinitely for reconciliation.
      // A cleanup worker must never race a transaction whose result is unknown.
      if(copiedKey&&copySucceeded&&recordState!=='unknown'&&recordState!=='linked') {
        try {await enqueueCleanup(copiedKey);} catch {result.blocked.push({kind:'book',reason:'UNLINKED_COPY_CLEANUP_FAILED'});}
      }
    }
  }
  return result;
}
