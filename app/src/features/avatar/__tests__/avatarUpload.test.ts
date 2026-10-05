import { describe,expect,it } from 'vitest';
import { createAvatarUploader, type AvatarUploadState } from '../avatarUpload';
const photo={uri:'file:///cropped.png',width:512 as const,height:512 as const,mimeType:'image/png' as const,size:100,ownedResource:true};
const descriptor={avatarUrl:'https://storage.test/avatar.jpg',avatarUrlExpiresAt:'2026-10-05T12:05:00Z',avatarVersion:5};
function setup(){
 let puts=0,presigns=0,completes=0;
 const grant=(id:string)=>({imageId:id,storageKey:'pending/avatars/user/'+id+'.png',uploadUrl:'https://storage.test/'+id,headers:{'Content-Type':'image/png'},expiresAt:'2026-10-05T12:05:00Z',protocolVersion:2 as const});
 const calls:string[]=[];
 const deps={presign:async()=>{presigns++;return grant('image-'+presigns);},put:async()=>{puts++;},complete:async(id:string)=>{completes++;calls.push(id);return descriptor;},now:()=>new Date('2026-10-05T12:00:00Z').getTime(),wait:async()=>{}};
 return {deps,grant,calls,counts:()=>({puts,presigns,completes})};
}
describe('avatar upload retry and identity boundaries',()=>{
 it('lets the user retry a superseded grant with fresh authorization',async()=>{
  const f=setup(),normal=f.deps.complete;let stale=true;
  f.deps.complete=async id=>{if(stale){stale=false;throw Object.assign(new Error('superseded'),{code:'AVATAR_UPLOAD_SUPERSEDED'});}return normal(id);};
  const state:AvatarUploadState={grant:f.grant('old'),putDone:true},upload=createAvatarUploader(f.deps);
  await expect(upload(photo,state)).rejects.toMatchObject({code:'AVATAR_UPLOAD_SUPERSEDED'});
  expect(state.grant).toBeUndefined();
  expect(await upload(photo,state)).toEqual(descriptor);
  expect(f.counts().puts).toBe(1);
 });
 it('retries the same completion without sending the photo again even when the PUT URL has expired',async()=>{
  const f=setup();let lose=true;
  const normal=f.deps.complete;
  f.deps.complete=async id=>{if(lose){lose=false;throw new Error('network response lost');}return normal(id);};
  const upload=createAvatarUploader(f.deps),state:AvatarUploadState={putDone:false};
  await expect(upload(photo,state)).rejects.toThrow('network response lost');
  f.deps.now=()=>new Date('2026-10-05T12:10:00Z').getTime();
  expect(await upload(photo,state)).toEqual(descriptor);
  expect(f.counts().puts).toBe(1);expect(f.counts().presigns).toBe(1);
  expect(f.calls).toEqual(['image-1']);
 });
 it('never confirms an upload after the owner changes',async()=>{
  const f=setup();let current=true;f.deps.put=async()=>{current=false;};
  await expect(createAvatarUploader(f.deps)(photo,{putDone:false},()=>{},()=>current)).rejects.toMatchObject({code:'AVATAR_SESSION_CHANGED'});
  expect(f.calls).toEqual([]);
 });
 it('rejects a legacy response instead of uploading without the requested crop protocol',async()=>{
  const f=setup();f.deps.presign=async()=>({...f.grant('legacy'),protocolVersion:1 as unknown as 2});
  await expect(createAvatarUploader(f.deps)(photo,{putDone:false})).rejects.toMatchObject({code:'AVATAR_PROTOCOL_UNSUPPORTED'});
  expect(f.counts().puts).toBe(0);
 });
 it('creates a fresh grant for an expired uncommitted attempt while preserving the prepared file',async()=>{
  const f=setup(),normal=f.deps.complete;let expired=true;
  f.deps.complete=async id=>{if(expired){expired=false;throw Object.assign(new Error('expired'),{code:'AVATAR_UPLOAD_EXPIRED'});}return normal(id);};
  const state:AvatarUploadState={grant:f.grant('old'),putDone:true};
  expect(await createAvatarUploader(f.deps)(photo,state)).toEqual(descriptor);
  expect(f.counts()).toMatchObject({puts:1,presigns:1});expect(f.calls).toEqual(['image-1']);
 });
 it('waits before retrying processing and keeps one PUT',async()=>{
  const f=setup(),normal=f.deps.complete;let busy=2,waits=0;
  f.deps.complete=async id=>{if(busy-->0)throw Object.assign(new Error('busy'),{code:'AVATAR_UPLOAD_IN_PROGRESS'});return normal(id);};
  f.deps.wait=async()=>{waits++;};
  expect(await createAvatarUploader(f.deps)(photo,{putDone:false})).toEqual(descriptor);
  expect(waits).toBe(2);expect(f.counts().puts).toBe(1);
 });
});
