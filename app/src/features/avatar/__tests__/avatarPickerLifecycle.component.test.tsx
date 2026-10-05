// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,renderHook } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { afterEach,describe,expect,it,vi } from 'vitest';
const gallery=vi.hoisted(()=>({pick:vi.fn()}));
vi.mock('react-native',async()=>await import('react-native-web'));
vi.mock('expo-image-picker',()=>({launchImageLibraryAsync:gallery.pick}));
vi.mock('../avatarApi',()=>({avatarApi:{presign:async()=>{},complete:async()=>{},remove:async()=>{}}}));
vi.mock('../prepareAvatarSource',()=>({prepareAvatarSource:async()=>{},releaseAvatarResource:()=>{}}));
vi.mock('../exportAvatarCrop',()=>({exportAvatarCrop:async()=>{}}));
vi.mock('../../media/putPreparedImage',()=>({putPreparedImage:async()=>{}}));
vi.mock('../../../services/api',()=>({apiErrorMessage:()=> 'offline'}));
import { useAvatarEditor } from '../useAvatarEditor';
afterEach(()=>cleanup());
describe('picker ownership and local original lifetime',()=>{
 it('releases the picker Blob URL when selection resolves after unmount',async()=>{
  const active=new Set(['blob:late-picker-photo']);
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:(uri:string)=>active.delete(uri)});
  let resolve!:(value:unknown)=>void;
  gallery.pick.mockReturnValue(new Promise(r=>{resolve=r;}));
  const client=new QueryClient();
  const wrapper=({children}:React.PropsWithChildren)=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook=renderHook(()=>useAvatarEditor('first',()=>{}),{wrapper});
  let pending!:Promise<void>;
  act(()=>{pending=hook.result.current.choose();});
  hook.unmount();
  await act(async()=>{resolve({canceled:false,assets:[{uri:'blob:late-picker-photo'}]});await pending;});
  expect([...active]).toEqual([]);
  client.clear();
 });
});
