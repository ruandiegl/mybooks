// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,render,screen } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { afterEach,describe,expect,it,vi } from 'vitest';
const boundary=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('react-native',async()=>await import('react-native-web'));
vi.mock('@expo/vector-icons/MaterialIcons',()=>({default:()=>null}));
vi.mock('@react-navigation/native',async()=>{const React=await import('react');return {useIsFocused:()=>React.useState(true)[0]};});
vi.mock('../../../services/api',()=>({api:{get:boundary.get}}));
import { Matches } from '../../../pages/Matches';
afterEach(()=>cleanup());
describe('matches mounted query transitions',()=>{
 it('survives loading to success without changing hook order',async()=>{
  let resolve!:(data:unknown)=>void;
  boundary.get.mockReturnValue(new Promise(r=>{resolve=r;}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={client}><Matches navigation={{navigate:()=>{}} as any} route={{} as any}/></QueryClientProvider>);
  expect(screen.getByText('Reunindo seus matches')).toBeTruthy();
  await act(async()=>resolve({data:{data:[]}}));
  expect(await screen.findByText('Nenhum match por enquanto')).toBeTruthy();
  client.clear();
 });
 it('survives loading to error and then a successful retry',async()=>{
  let reject!:(error:Error)=>void;
  boundary.get.mockReturnValueOnce(new Promise((_r,j)=>{reject=j;})).mockResolvedValue({data:{data:[]}});
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={client}><Matches navigation={{navigate:()=>{}} as any} route={{} as any}/></QueryClientProvider>);
  await act(async()=>reject(new Error('offline')));
  expect(await screen.findByText('Não foi possível carregar os matches')).toBeTruthy();
  await act(async()=>{await client.refetchQueries({queryKey:['matches']});});
  expect(await screen.findByText('Nenhum match por enquanto')).toBeTruthy();
  client.clear();
 });
});
