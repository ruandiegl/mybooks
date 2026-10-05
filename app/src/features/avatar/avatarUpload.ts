import type { PreparedAvatar } from './avatarTypes';
import type { AvatarDescriptor } from '../../types/api';
export type AvatarGrant={imageId:string;storageKey:string;uploadUrl:string;headers:Record<string,string>;expiresAt:string;protocolVersion:2};
export type AvatarUploadState={grant?:AvatarGrant;putDone:boolean};
export type AvatarUploadStage='uploading'|'confirming';
type Dependencies={presign:(photo:PreparedAvatar)=>Promise<AvatarGrant>;put:(photo:PreparedAvatar,grant:AvatarGrant)=>Promise<void>;complete:(id:string)=>Promise<AvatarDescriptor>;now?:()=>number;wait?:(ms:number)=>Promise<void>};
export class AvatarUploadError extends Error { constructor(message:string,public code:string){super(message);} }
export function avatarErrorCode(error:unknown):string|undefined {
 const candidate=error as {code?:string;response?:{data?:{error?:{code?:string}}}};
 return candidate?.response?.data?.error?.code??candidate?.code;
}
export function createAvatarUploader(deps:Dependencies) {
 const now=deps.now??Date.now,wait=deps.wait??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 return async (photo:PreparedAvatar,state:AvatarUploadState,onStage:(stage:AvatarUploadStage)=>void=()=>{},isCurrent:()=>boolean=()=>true):Promise<AvatarDescriptor>=>{
  const guard=()=>{if(!isCurrent())throw new AvatarUploadError('A conta mudou. Escolha novamente a foto.','AVATAR_SESSION_CHANGED');};
  for(let restart=0;restart<2;restart++){
   guard();
   if(state.grant&&!state.putDone&&Date.parse(state.grant.expiresAt)<=now())state.grant=undefined;
   if(!state.grant){
    const grant=await deps.presign(photo);guard();
    if(grant.protocolVersion!==2 || !grant.imageId || !grant.storageKey.startsWith('pending/avatars/') || !Number.isFinite(Date.parse(grant.expiresAt)) || new URL(grant.uploadUrl).protocol!=='https:' || grant.headers['Content-Type']!=='image/png')
     throw new AvatarUploadError('O envio de fotos ainda não está disponível. Tente novamente mais tarde.','AVATAR_PROTOCOL_UNSUPPORTED');
    state.grant=grant;state.putDone=false;
   }
   if(!state.putDone){onStage('uploading');await deps.put(photo,state.grant);guard();state.putDone=true;}
   onStage('confirming');
   let expired=false;
   for(let retry=0;retry<4;retry++){
    guard();
    try{const result=await deps.complete(state.grant.imageId);guard();return result;}
    catch(error){
     guard();const code=avatarErrorCode(error);
     if(code==='AVATAR_UPLOAD_EXPIRED'){state.grant=undefined;state.putDone=false;expired=true;break;}
     if(code==='AVATAR_UPLOAD_SUPERSEDED'){state.grant=undefined;state.putDone=false;throw error;}
     if(code==='AVATAR_UPLOAD_IN_PROGRESS'&&retry<3){await wait(600*2**retry);continue;}
     throw error;
    }
   }
   if(!expired)break;
  }
  throw new AvatarUploadError('O envio expirou. Tente salvar a foto novamente.','AVATAR_UPLOAD_EXPIRED');
 };
}
