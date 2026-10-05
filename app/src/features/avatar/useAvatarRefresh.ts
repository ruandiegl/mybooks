import { useEffect,useRef } from 'react';
import { AppState,Platform } from 'react-native';
import { getAvatarRefreshDelay } from './avatarRefresh';
// One timer belongs to the query, never to each rendered avatar.
export function useAvatarRefresh(data:unknown,refetch:()=>Promise<unknown>,enabled=true){
 const latest=useRef({data,refetch});latest.current={data,refetch};
 const lastAttempt=useRef(0),inFlight=useRef(false),request=useRef(()=>{});
 useEffect(()=>{
  if(!enabled){request.current=()=>{};return;}
  let alive=true,timer:ReturnType<typeof setTimeout>|undefined;
  let active=Platform.OS==='web'?typeof document==='undefined'||document.visibilityState==='visible':AppState.currentState!=='background';
  const clear=()=>{if(timer)clearTimeout(timer);timer=undefined;};
  const schedule=()=>{clear();if(!alive||!active)return;const delay=getAvatarRefreshDelay(latest.current.data,Date.now(),lastAttempt.current);if(delay!==false)timer=setTimeout(()=>{void refresh();},delay);};
  const refresh=async()=>{
   if(!alive||!active||inFlight.current)return;
   if(Date.now()-lastAttempt.current<30000){schedule();return;}
   lastAttempt.current=Date.now();inFlight.current=true;clear();
   try{await latest.current.refetch();}catch{/* Keep identity usable while offline. */}
   finally{inFlight.current=false;schedule();}
  };
  request.current=()=>{void refresh();};
  const foreground=(next:boolean)=>{active=next;if(!next)clear();else if(getAvatarRefreshDelay(latest.current.data)!==false)void refresh();};
  const app=AppState.addEventListener('change',state=>foreground(state==='active'));
  const visibility=()=>foreground(document.visibilityState==='visible');
  if(Platform.OS==='web'&&typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  schedule();
  return()=>{alive=false;clear();app.remove();request.current=()=>{};if(Platform.OS==='web'&&typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);};
 },[data,enabled]);
 return ()=>request.current();
}
