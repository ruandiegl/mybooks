import { describe, expect, it } from 'vitest';
import { backfillLegacyMedia } from '../src/modules/media/legacyMediaBackfill.js';
const owner='10000000-0000-4000-8000-000000000001';
const donor='10000000-0000-4000-8000-000000000002';
const book='20000000-0000-4000-8000-000000000001';
const image='30000000-0000-4000-8000-000000000001';
const fresh='40000000-0000-4000-8000-000000000001';
const origin='https://media.example';
const avatarKey=`avatars/${owner}/${image}.jpg`;
const borrowed=`books/${donor}/${book}/${image}.jpg`;
function fixture({users=[],images=[],objects={},concurrent=false,dryRun=false}={}) {
 const stored=new Map(Object.entries(objects));
 const changes=[];
 const held=new Set();
 return {stored,changes,held,options:{users,images,origins:[origin],newId:()=>fresh,dryRun,
  holdCopy:async key=>held.add(key),
  releaseCopy:async key=>held.delete(key),
  inspectObject:async key=>stored.get(key)??null,
  copyObject:async (source,destination)=>{if(stored.has(destination))throw new Error('overwrite');stored.set(destination,{...stored.get(source)});},
  saveAvatar:async (row,data)=>{if(concurrent)return false;changes.push({kind:'avatar',id:row.id,data});return true;},
  saveBook:async (row,data)=>{if(concurrent)return false;changes.push({kind:'book',id:row.id,data});return true;},
  enqueueCleanup:async key=>changes.push({kind:'cleanup',key})
 }};
}
const object={mimeType:'image/jpeg',size:100};
describe('legacy private media backfill',()=>{
 it('links only a verified exact-owner avatar and increments its version',async()=>{
  const f=fixture({users:[{id:owner,avatarUrl:origin+'/'+avatarKey,avatarVersion:4}],objects:{[avatarKey]:object}});
  const result=await backfillLegacyMedia(f.options);
  expect(result.avatars).toBe(1);expect(result.blocked).toEqual([]);
  expect(f.changes).toEqual([{kind:'avatar',id:owner,data:{avatarUrl:null,avatarStorageKey:avatarKey,avatarVersion:5}}]);
  expect(f.stored.get(avatarKey)).toEqual(object);
 });
 it('does not adopt another owners avatar or a query-bearing URL',async()=>{
  const f=fixture({users:[{id:donor,avatarUrl:origin+'/'+avatarKey,avatarVersion:0},{id:owner,avatarUrl:origin+'/'+avatarKey+'?token=x',avatarVersion:0}],objects:{[avatarKey]:object}});
  const result=await backfillLegacyMedia(f.options);expect(result.blocked).toHaveLength(2);expect(f.changes).toEqual([]);
 });
 it('leaves external and lookalike-domain images untouched',async()=>{
  const f=fixture({users:[{id:owner,avatarUrl:'https://external.example/'+avatarKey,avatarVersion:0}],images:[{id:image,url:'https://media.example.evil/'+borrowed,bookId:book,ownerId:owner}]});
  const result=await backfillLegacyMedia(f.options);expect(result.skipped).toBe(2);expect(result.blocked).toEqual([]);expect(f.stored.size).toBe(0);expect(f.changes).toEqual([]);
 });
 it('copies a shared book photo to a fresh owned immutable key without deleting the source',async()=>{
  const f=fixture({images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:object}});
  const result=await backfillLegacyMedia(f.options);expect(result.books).toBe(1);expect(result.copies).toBe(1);
  expect(f.changes).toEqual([{kind:'book',id:image,data:{url:null,storageKey:`books/${owner}/${book}/${fresh}.jpg`,mimeType:'image/jpeg',size:100}}]);
  expect(f.stored.get(borrowed)).toEqual(object);expect(f.stored.size).toBe(2);
 });
 it('preserves existing destinations rather than overwriting them',async()=>{
  const destination=`books/${owner}/${book}/${fresh}.jpg`;
  const original={mimeType:'image/jpeg',size:200};
  const f=fixture({images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:object,[destination]:original}});
  const result=await backfillLegacyMedia(f.options);expect(result.blocked).toHaveLength(1);expect(f.stored.get(destination)).toEqual(original);expect(f.changes).toEqual([]);
 });
 it('does not change records for missing or unsupported objects',async()=>{
  const f=fixture({users:[{id:owner,avatarUrl:origin+'/'+avatarKey,avatarVersion:0}],images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:{mimeType:'image/svg+xml',size:100}}});
  const result=await backfillLegacyMedia(f.options);expect(result.blocked).toHaveLength(2);expect(f.changes).toEqual([]);
 });
 it('keeps concurrent avatars and queues only a newly copied unlinked book object',async()=>{
  const f=fixture({concurrent:true,users:[{id:owner,avatarUrl:origin+'/'+avatarKey,avatarVersion:0}],images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[avatarKey]:object,[borrowed]:object}});
  const result=await backfillLegacyMedia(f.options);expect(result.avatars).toBe(0);expect(result.books).toBe(0);expect(result.blocked).toHaveLength(2);
  expect(f.changes).toEqual([{kind:'cleanup',key:`books/${owner}/${book}/${fresh}.jpg`}]);expect(f.stored.has(borrowed)).toBe(true);
 });
 it('dry-run verifies sources without copying or mutating records',async()=>{
  const f=fixture({dryRun:true,users:[{id:owner,avatarUrl:origin+'/'+avatarKey,avatarVersion:0}],images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[avatarKey]:object,[borrowed]:object}});
  const result=await backfillLegacyMedia(f.options);expect(result.planned).toBe(2);expect(result.avatars).toBe(0);expect(result.books).toBe(0);expect(f.stored.size).toBe(2);expect(f.changes).toEqual([]);
 });
 it('holds the exact new key before a copy whose successful write response is lost',async()=>{
  const destination=`books/${owner}/${book}/${fresh}.jpg`;
  const f=fixture({images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:object}});
  f.options.copyObject=async(source,key)=>{f.stored.set(key,{...f.stored.get(source)});throw new Error('response lost');};
  const result=await backfillLegacyMedia(f.options);
  expect(result.books).toBe(0);expect(f.held.has(destination)).toBe(true);
  expect(f.changes).toEqual([]);expect(f.stored.has(borrowed)).toBe(true);
 });
 it('never schedules deletion when a book transaction may still commit',async()=>{
  const destination=`books/${owner}/${book}/${fresh}.jpg`;
  const f=fixture({images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:object}});
  f.options.saveBook=async()=>{throw new Error('database response lost');};
  const result=await backfillLegacyMedia(f.options);
  expect(result.books).toBe(0);expect(f.held.has(destination)).toBe(true);expect(f.changes).toEqual([]);
 });
 it('releases a held copy only after the reference is confirmed',async()=>{
  const f=fixture({images:[{id:image,bookId:book,ownerId:owner,url:origin+'/'+borrowed}],objects:{[borrowed]:object}});
  const save=f.options.saveBook;let heldAtSave=false;
  f.options.saveBook=async(row,data)=>{heldAtSave=f.held.has(data.storageKey);return save(row,data);};
  await backfillLegacyMedia(f.options);
  expect(heldAtSave).toBe(true);expect(f.held.size).toBe(0);
 });
});
