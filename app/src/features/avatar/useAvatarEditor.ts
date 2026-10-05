import * as ImagePicker from 'expo-image-picker';
import { useEffect,useRef,useState } from 'react';
import { Linking,Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../services/api';
import { Alert } from '../../services/notice';
import type { AvatarDescriptor } from '../../types/api';
import { avatarApi } from './avatarApi';
import { runAvatarRemoval } from './avatarRemoval';
import { createAvatarUploader,avatarErrorCode,type AvatarUploadState } from './avatarUpload';
import { putPreparedImage } from '../media/putPreparedImage';
import { prepareAvatarSource,releaseAvatarResource } from './prepareAvatarSource';
import { exportAvatarCrop } from './exportAvatarCrop';
import type { AvatarSource,PreparedAvatar,AvatarCropRect } from './avatarTypes';
type Phase='idle'|'selecting'|'preparing'|'editing'|'exporting'|'uploading'|'confirming'|'error';
const labels:Partial<Record<Phase,string>>={preparing:'Preparando foto…',exporting:'Preparando recorte…',uploading:'Enviando foto…',confirming:'Confirmando foto…'};
export function useAvatarEditor(userId:string|undefined,onUploaded:(avatar:AvatarDescriptor)=>void){
 const queryClient=useQueryClient(),owner=useRef(userId),callback=useRef(onUploaded);
 owner.current=userId;callback.current=onUploaded;
 const epoch=useRef(0),lock=useRef(false),sourceRef=useRef<AvatarSource|undefined>(undefined);
 const resources=useRef(new Map<string,{uri:string;ownedResource:boolean}>()),prepared=useRef<PreparedAvatar|undefined>(undefined),savedRect=useRef('');
 const uploadState=useRef<AvatarUploadState>({putDone:false});
 const [source,setSource]=useState<AvatarSource>(),[phase,setPhase]=useState<Phase>('idle'),[error,setError]=useState<string>(),[previewUri,setPreviewUri]=useState<string>(),[permissionBlocked,setPermissionBlocked]=useState(false);
 function release(){for(const resource of resources.current.values())releaseAvatarResource(resource);resources.current.clear();sourceRef.current=undefined;prepared.current=undefined;savedRect.current='';uploadState.current={putDone:false};}
 function invalidate(){for(const key of ['me','books','book','likes','matches','conversations','messages','chat'])void queryClient.invalidateQueries({queryKey:[key],refetchType:'active'}).catch(()=>undefined);}
 useEffect(()=>{
  setSource(undefined);setPhase('idle');setError(undefined);setPreviewUri(undefined);lock.current=false;
  return()=>{epoch.current++;release();lock.current=false;};
 },[userId]);
 const current=(ticket:number,id:string|undefined)=>epoch.current===ticket&&owner.current===id;
 async function choose(){
  if(lock.current||!owner.current)return;
  lock.current=true;const id=owner.current,ticket=++epoch.current;setError(undefined);setPermissionBlocked(false);setPhase('selecting');
  let asset:ImagePicker.ImagePickerAsset|undefined;
  try{
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,allowsMultipleSelection:false,quality:1,base64:false,exif:false,
    ...(Platform.OS==='ios'?{preferredAssetRepresentationMode:ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,shouldDownloadFromNetwork:true}:{})});
   asset=result.canceled?undefined:result.assets[0];
   if(!current(ticket,id))return;
   if(result.canceled){setPhase(sourceRef.current?'editing':'idle');return;}
   setPhase('preparing');
   if(!asset)throw new Error('Escolha uma foto e tente novamente.');
   const next=await prepareAvatarSource(asset);
   if(!current(ticket,id)){releaseAvatarResource(next);return;}
   release();resources.current.set(next.uri,next);sourceRef.current=next;setSource(next);setPreviewUri(undefined);setPhase('editing');
  }catch(cause){
   if(current(ticket,id)){setError(cause instanceof Error?cause.message:'Escolha outra foto e tente novamente.');setPermissionBlocked(Platform.OS!=='web'&&/permission|permiss/i.test(String(cause)));setPhase('error');}
  }finally{
   if(Platform.OS==='web'&&asset?.uri.startsWith('blob:'))URL.revokeObjectURL(asset.uri);
   if(current(ticket,id))lock.current=false;
  }
 }
 async function save(rect:AvatarCropRect){
  if(lock.current||!sourceRef.current||!owner.current)return;
  lock.current=true;const ticket=epoch.current,id=owner.current;setError(undefined);
  try{
   const key=JSON.stringify(rect);
   if(!prepared.current||savedRect.current!==key){
    setPhase('exporting');
    if(prepared.current){releaseAvatarResource(prepared.current);resources.current.delete(prepared.current.uri);prepared.current=undefined;}
    uploadState.current={putDone:false};setPreviewUri(undefined);
    const photo=await exportAvatarCrop(sourceRef.current,rect);
    if(!current(ticket,id)){releaseAvatarResource(photo);return;}
    resources.current.set(photo.uri,photo);prepared.current=photo;savedRect.current=key;setPreviewUri(photo.uri);
   }
   const uploader=createAvatarUploader({presign:photo=>avatarApi.presign(photo,id),put:putPreparedImage,complete:imageId=>avatarApi.complete(imageId,id)});
   const result=await uploader(prepared.current,uploadState.current,setPhase,()=>current(ticket,id));
   if(!current(ticket,id))return;
   callback.current(result);invalidate();release();setSource(undefined);setPreviewUri(undefined);setPhase('idle');
  }catch(cause){
   if(current(ticket,id)){
    const code=avatarErrorCode(cause);
    setError(code==='AVATAR_UPLOAD_SUPERSEDED'?'A foto foi alterada em outra sessão. Salve novamente para confirmar este enquadramento.':cause instanceof Error&&!('response' in cause)?cause.message:apiErrorMessage(cause,'Não foi possível salvar a foto. Tente novamente.'));
    if(code==='AVATAR_UPLOAD_SUPERSEDED')invalidate();
    setPhase('error');
   }
  }finally{if(current(ticket,id))lock.current=false;}
 }
 function cancel(){if(lock.current)return;epoch.current++;release();setSource(undefined);setPreviewUri(undefined);setError(undefined);setPhase('idle');}
 async function removeNow(){
  if(lock.current||!owner.current)return;
  lock.current=true;const ticket=epoch.current,id=owner.current;setError(undefined);setPhase('confirming');
  try{await runAvatarRemoval(()=>current(ticket,id),()=>avatarApi.remove(id),result=>{callback.current(result);invalidate();setPhase('idle');});}
  catch(cause){if(current(ticket,id)){setError(apiErrorMessage(cause,'Não foi possível remover a foto. Tente novamente.'));setPhase('error');}}
  finally{if(current(ticket,id))lock.current=false;}
 }
 function remove(){if(lock.current)return;const ticket=epoch.current,id=owner.current;Alert.alert('Remover foto?','Seu perfil voltará a mostrar suas iniciais.',[{text:'Cancelar',style:'cancel'},{text:'Remover',style:'destructive',onPress:()=>{if(current(ticket,id))void removeNow();}}]);}
 return {source,error,phase,previewUri,permissionBlocked,busy:!['idle','editing','error'].includes(phase),statusLabel:labels[phase],choose,save,cancel,remove,openSettings:()=>{void Linking.openSettings();}};
}
