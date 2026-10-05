import { useEffect,useRef } from 'react';
import { AppState,Platform } from 'react-native';
import { getAvatarRefreshDelay } from './avatarRefresh';
// One timer belongs to the query, never to each rendered avatar.
export function useAvatarRefresh(data:unknown,refetch:()=>Promise<unknown>,enabled=true){
 const latest=useRef({data,refetch});latest.current={data,refetch};
 const lastAttempt=useRef(0),lastFailure=useRef(0),wasEnabled=useRef(enabled),inFlight=useRef(false),request=useRef(()=>{});
 useEffect(()=>{
  if(!enabled){wasEnabled.current=false;request.current=()=>{};return;}
  const regainedFocus=!wasEnabled.current;wasEnabled.current=true;
  let alive=true,timer:ReturnType<typeof setTimeout>|undefined;
  let active=Platform.OS==='web'?typeof document==='undefined'||document.visibilityState==='visible':AppState.currentState!=='background';
  const clear=()=>{if(timer)clearTimeout(timer);timer=undefined;};
  const schedule=()=>{clear();if(!alive||!active)return;const delay=getAvatarRefreshDelay(latest.current.data,Date.now(),lastFailure.current);if(delay!==false)timer=setTimeout(()=>{void refresh();},delay);};
  const refresh=async(manual=false)=>{
   if(!alive||!active||inFlight.current)return;
   if(Date.now()-lastAttempt.current<(manual?30000:5000)||Date.now()-lastFailure.current<30000){schedule();return;}
   lastAttempt.current=Date.now();inFlight.current=true;clear();
   try{const result=await latest.current.refetch();lastFailure.current=result&&typeof result==='object'&&'isError' in result&&result.isError?Date.now():0;}
   catch{lastFailure.current=Date.now();}
   finally{inFlight.current=false;schedule();}
  };
  request.current=()=>{void refresh(true);};
  const foreground=(next:boolean)=>{active=next;if(!next)clear();else if(latest.current.data!==undefined)void refresh();};
  const app=AppState.addEventListener('change',state=>foreground(state==='active'));
  const visibility=()=>foreground(document.visibilityState==='visible');
  if(Platform.OS==='web'&&typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  schedule();
  if(regainedFocus&&latest.current.data!==undefined)void refresh();
  return()=>{alive=false;clear();app.remove();request.current=()=>{};if(Platform.OS==='web'&&typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);};
 },[data,enabled]);
 return ()=>request.current();
}
