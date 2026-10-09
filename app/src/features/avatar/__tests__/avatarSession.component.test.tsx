// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,renderHook } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { afterEach,describe,expect,it,vi } from 'vitest';
vi.mock('react-native',async()=>await import('react-native-web'));
vi.mock('../../auth/authApi',()=>({authApi:{me:async()=>null}}));
vi.mock('../../auth/authTransport',()=>({sessionTransport:{restore:async()=>null,accept:async(response:any)=>({accessToken:response.accessToken,expiresAt:Date.parse(response.expiresAt),user:response.user}),clear:async()=>{},getToken:async()=>null,signOut:async()=>{}}}));
vi.mock('../../../services/api',()=>({configureApiSession:()=>{}}));
import { SessionProvider,useSession } from '../../../providers/SessionProvider';
afterEach(()=>cleanup());
const response=(id:string)=>({accessToken:id,expiresAt:'2026-10-06T18:00:00Z',user:{id,name:id,interests:[],isActive:true,avatarUrl:null,avatarVersion:0}});
describe('avatar receipt belongs to the current snapshot, not an older React render',()=>{
 it('reads the current account and login generation through a stable session scope getter',async()=>{
  const client=new QueryClient();
  const wrapper=({children}:React.PropsWithChildren)=><QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const hook=renderHook(()=>useSession(),{wrapper});
  await act(async()=>{await hook.result.current.establishSession(response('first'));});
  const scope=hook.result.current.getSessionScope;
  expect(scope).toBeTypeOf('function');
  const first=scope();
  await act(async()=>{await hook.result.current.establishSession(response('second'));});
  expect(scope().userId).toBe('second'); expect(scope().epoch).toBeGreaterThan(first.epoch);
  const second=scope(); await act(async()=>{await hook.result.current.signOut();});
  expect(scope().userId).toBeUndefined(); expect(scope().epoch).toBeGreaterThan(second.epoch);
  client.clear();
 });
 it('preserves a newer session photo even when the own-profile cache is older',async()=>{
  const client=new QueryClient({defaultOptions:{queries:{gcTime:Infinity}}});
  const wrapper=({children}:React.PropsWithChildren)=><QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const hook=renderHook(()=>useSession(),{wrapper});
  const fresh=response('second');fresh.user.avatarVersion=5;(fresh.user as any).avatarUrl='latest-photo';
  await act(async()=>{await hook.result.current.establishSession(fresh);});
  client.setQueryData(['me'],response('second').user);
  act(()=>hook.result.current.updateAvatar({avatarUrl:'older-photo',avatarUrlExpiresAt:null,avatarVersion:3},'second'));
  expect(client.getQueryData<any>(['me']).avatarUrl).toBe('latest-photo');
  expect(client.getQueryData<any>(['me']).avatarVersion).toBe(5);
  client.clear();
 });
 it('does not copy another account identity into the current own-profile cache',async()=>{
  const client=new QueryClient({defaultOptions:{queries:{gcTime:Infinity}}});
  const wrapper=({children}:React.PropsWithChildren)=><QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const hook=renderHook(()=>useSession(),{wrapper});
  await act(async()=>{await hook.result.current.establishSession(response('second'));});
  client.setQueryData(['me'],{...response('first').user,email:'first-private@example.test'});
  act(()=>hook.result.current.updateAvatar({avatarUrl:'second-photo',avatarUrlExpiresAt:null,avatarVersion:1},'second'));
  expect(client.getQueryData<any>(['me']).id).toBe('second');
  expect(client.getQueryData<any>(['me']).email).not.toBe('first-private@example.test');
  client.clear();
 });
 it('does not overwrite the next account during a batched session change',async()=>{
  const client=new QueryClient({defaultOptions:{queries:{gcTime:Infinity}}});
  const wrapper=({children}:React.PropsWithChildren)=><QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const hook=renderHook(()=>useSession(),{wrapper});
  await act(async()=>{await hook.result.current.establishSession(response('first'));});
  const prior=hook.result.current;
  await act(async()=>{
   await prior.establishSession(response('second'));
   prior.updateAvatar({avatarUrl:'first-photo',avatarUrlExpiresAt:null,avatarVersion:2},'first');
  });
  expect(hook.result.current.user?.id).toBe('second');
  expect(hook.result.current.user?.avatarUrl).toBeNull();
  expect(client.getQueryData<any>(['me'])?.avatarUrl).not.toBe('first-photo');
  client.clear();
 });
});
