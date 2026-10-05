import { describe,expect,it } from 'vitest';
import { getAvatarRefreshDelay,mergeAvatarVersion } from '../avatarRefresh';
describe('private media renewal',()=>{
 const now=Date.parse('2026-10-05T16:00:00Z');
 it('uses the earliest book or avatar expiry once for a whole query',()=>{
  const user={avatarUrl:'https://signed',avatarUrlExpiresAt:'2026-10-05T16:05:00Z'};
  expect(getAvatarRefreshDelay({pages:[{owner:user,images:[{expiresAt:'2026-10-05T16:00:40Z'}]},{owner:user}]},now)).toBe(32000);
 });
 it('has no timer for absent or public legacy photos',()=>expect(getAvatarRefreshDelay({avatarUrl:'https://public',avatarUrlExpiresAt:null},now)).toBe(false));
 it('renews expired photos without a busy retry loop',()=>{
  const data={avatarUrlExpiresAt:'2026-10-05T15:59:00Z'};
  expect(getAvatarRefreshDelay(data,now)).toBe(5000);
  expect(getAvatarRefreshDelay(data,now,now-1000)).toBe(29000);
 });
 it('ignores invalid dates and unrelated expiration fields',()=>expect(getAvatarRefreshDelay({avatarUrlExpiresAt:'invalid',subscriptionExpiresAt:'2026-10-05T15:00:00Z'},now)).toBe(false));
 it('preserves newer removals while accepting other profile fields',()=>{
  const current={id:'one',name:'Old',avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:4};
  expect(mergeAvatarVersion(current,{id:'one',name:'New',avatarUrl:'old-photo',avatarVersion:3})).toEqual({...current,name:'New'});
 });
 it('does not carry a previous account photo into another account',()=>{
  expect(mergeAvatarVersion({id:'one',avatarVersion:9,avatarUrl:'one'},{id:'two',avatarVersion:1,avatarUrl:'two'}).avatarUrl).toBe('two');
 });
});
