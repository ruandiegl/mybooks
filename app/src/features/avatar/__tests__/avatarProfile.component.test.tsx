// @vitest-environment jsdom
import React from 'react';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const boundary=vi.hoisted(()=>({get:vi.fn(),patch:vi.fn(),session:undefined as any,selections:0,failImage:false}));
vi.mock('react-native',async()=>{
 const native=await import('react-native-web'),React=await import('react');
 return {...native,Image:(props:any)=>{React.useEffect(()=>{if(!boundary.failImage)return;let alive=true;queueMicrotask(()=>{if(alive)props.onError?.();});return()=>{alive=false;};},[props.source.uri]);return React.createElement('img',{src:props.source.uri,alt:'avatar'});}};
});
vi.mock('@expo/vector-icons/MaterialIcons',()=>({default:()=>null}));
vi.mock('@react-navigation/native',async()=>{const React=await import('react');return {useIsFocused:()=>React.useState(true)[0]};});
vi.mock('react-native-safe-area-context',async()=>({SafeAreaView:(await import('react-native-web')).View,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('../../../services/api',()=>({api:{get:boundary.get,patch:boundary.patch},apiErrorMessage:()=> 'offline'}));
vi.mock('../../../services/notice',()=>({Alert:{alert:()=>{}}}));
vi.mock('../../../providers/SessionProvider',()=>({useSession:()=>boundary.session}));
vi.mock('../useAvatarEditor',()=>({useAvatarEditor:()=>({busy:false,source:undefined,choose:()=>{boundary.selections++;},remove:()=>{},cancel:()=>{}})}));
vi.mock('../../../components/AvatarEditor',()=>({AvatarEditor:()=>null}));
vi.mock('../../premium/PremiumOfferProvider',()=>({usePremiumOffer:()=>({open:()=>{}}),PremiumStatusCard:()=>null}));
vi.mock('../../premium/usePremiumStatus',()=>({usePremiumStatus:()=>({data:null})}));
import { Profile } from '../../../pages/profile';
import { OnboardingProfile } from '../../../pages/OnboardingProfile';
import { useAvatarRefresh } from '../useAvatarRefresh';
const person={id:'one',name:'Ana Silva',firstName:'Ana',lastName:'Silva',interests:[],isActive:true,city:'SP',avatarUrl:'https://signed.test/old',avatarUrlExpiresAt:'2026-10-05T18:00:00Z',avatarVersion:1};
const clients:QueryClient[]=[];
function host(node:React.ReactNode){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});clients.push(client);return <QueryClientProvider client={client}>{node}</QueryClientProvider>;}
beforeEach(()=>{vi.clearAllMocks();boundary.selections=0;boundary.session={user:{...person},isSignedIn:true,refreshUser:async()=>person,refreshAvatar:()=>{},updateAvatar:()=>{},signOut:async()=>{}};boundary.get.mockImplementation(async(url:string)=>({data:{data:url.endsWith('/me')?person:{items:[],pageInfo:{hasNextPage:false}}}}));});
afterEach(()=>{cleanup();clients.forEach(c=>c.clear());clients.length=0;boundary.failImage=false;vi.useRealTimers();});
describe('profile and onboarding mounted avatar coordination',()=>{
 it('bounds profile image-error renewals even when each response has a new broken URL',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-05T16:00:00Z'));
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  boundary.failImage=true;
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity,staleTime:Infinity}}});clients.push(client);client.setQueryData(['me'],person);
  let requests=0;
  const refetch=async()=>{requests++;if(requests<=5)client.setQueryData(['me'],{...person,avatarUrl:'https://signed.test/broken-'+requests});return person;};
  boundary.session.refreshUser=refetch;
  function Host(){boundary.session.refreshAvatar=useAvatarRefresh(person,refetch);return <Profile navigation={{navigate:()=>{}} as any}/>;}
  render(<QueryClientProvider client={client}><Host/></QueryClientProvider>);
  for(let n=0;n<8;n++)await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
  expect(requests).toBe(1);
 });
 it('blocks photo selection until a pending text submission is confirmed',async()=>{
  let resolve!:(value:unknown)=>void;
  boundary.patch.mockReturnValue(new Promise(r=>{resolve=r;}));
  render(host(<Profile navigation={{navigate:()=>{}} as any}/>));
  fireEvent.click(await screen.findByRole('button',{name:'Editar perfil'}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  const choose=screen.getByRole('button',{name:'Escolher ou alterar foto de perfil'});
  await waitFor(()=>expect(choose.getAttribute('aria-disabled')).toBe('true'));
  fireEvent.click(choose);
  expect(boundary.selections).toBe(0);
  await act(async()=>resolve({data:{data:person}}));
 });
 it('uses renewed session photo without resetting unsaved onboarding text',async()=>{
  const tree=host(<OnboardingProfile/>),mounted=render(tree);
  fireEvent.change(screen.getByRole('textbox',{name:'Nome'}),{target:{value:'Nome ainda não salvo'}});
  boundary.session={...boundary.session,user:{...person,avatarUrl:'https://signed.test/renewed'}};
  mounted.rerender(React.cloneElement(tree as React.ReactElement,{},<OnboardingProfile/>));
  expect(document.querySelector('img')?.getAttribute('src')).toBe('https://signed.test/renewed');
  expect((screen.getByRole('textbox',{name:'Nome'}) as HTMLInputElement).value).toBe('Nome ainda não salvo');
 });
});
