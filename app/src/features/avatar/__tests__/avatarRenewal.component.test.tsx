// @vitest-environment jsdom
import { useState } from 'react';
import { act,cleanup,renderHook } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('react-native',async()=>await import('react-native-web'));
import { useAvatarRefresh } from '../useAvatarRefresh';
let visible=true;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-05T16:00:00Z'));visible=true;Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visible?'visible':'hidden'});});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('mounted renewal clocks and foreground',()=>{
 it('renews successive 30-second grants before they expire, without success backoff',async()=>{
  let requests=0;
  renderHook(()=>{const[data,setData]=useState({avatarUrlExpiresAt:new Date(Date.now()+30000).toISOString()});useAvatarRefresh(data,async()=>{requests++;setData({avatarUrlExpiresAt:new Date(Date.now()+30000).toISOString()});});});
  await act(async()=>{await vi.advanceTimersByTimeAsync(24000);});
  expect(requests).toBe(1);
  await act(async()=>{await vi.advanceTimersByTimeAsync(24000);});
  expect(requests).toBe(2);
 });
 it('backs off failed expiration requests for 30 seconds',async()=>{
  let requests=0;
  renderHook(()=>useAvatarRefresh({avatarUrlExpiresAt:new Date(Date.now()-1000).toISOString()},async()=>{requests++;throw new Error('offline');}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});expect(requests).toBe(1);
  await act(async()=>{await vi.advanceTimersByTimeAsync(29000);});expect(requests).toBe(1);
  await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});expect(requests).toBe(2);
 });
 it('retries an unavailable signature once on foreground without per-avatar requests',async()=>{
  let requests=0;
  renderHook(()=>useAvatarRefresh({id:'reader',avatarUrl:null,avatarVersion:2},async()=>{requests++;}));
  visible=false;act(()=>document.dispatchEvent(new Event('visibilitychange')));
  visible=true;await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));});
  expect(requests).toBe(1);
 });
});
