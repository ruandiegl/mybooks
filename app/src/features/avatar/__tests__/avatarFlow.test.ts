import { describe,expect,it } from 'vitest';
import { runAvatarRemoval } from '../avatarRemoval';
describe('confirmed avatar removal and session ownership',()=>{
 it('does not remove the new account photo when confirmation outlives its session',async()=>{
  let current='second';let photo='second-photo';
  await runAvatarRemoval(()=>current==='first',async()=>{photo='removed';return {avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:2};},()=>{});
  expect(photo).toBe('second-photo');
 });
 it('ignores a receipt after logout or unmount while the request was in flight',async()=>{
  let active=true,photo='current-photo';
  await runAvatarRemoval(()=>active,async()=>{active=false;return {avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:2};},()=>{photo='removed';});
  expect(photo).toBe('current-photo');
 });
 it('applies the atomic removal version only to the still-current session',async()=>{
  let version=1;
  await runAvatarRemoval(()=>true,async()=>({avatarUrl:null,avatarUrlExpiresAt:null,avatarVersion:4}),receipt=>{version=receipt.avatarVersion;});
  expect(version).toBe(4);
 });
});
