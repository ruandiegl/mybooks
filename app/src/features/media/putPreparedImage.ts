import { File,UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
import type { PreparedUploadImage } from './preparePickedImage.shared';
const safeCodes=new Set(['AccessDenied','InvalidAccessKeyId','NoSuchBucket','RequestExpired','RequestTimeTooSkewed','SignatureDoesNotMatch']);
export class MediaUploadError extends Error {constructor(message:string,public code:string,public status?:number){super(message);}}
export async function putPreparedImage(photo:PreparedUploadImage,grant:{uploadUrl:string;headers:Record<string,string>}) {
 let status:number,body='';
 try{
  if(Platform.OS==='web'){
   const blob=await(await fetch(photo.uri)).blob();
   if(blob.size!==photo.size)throw new MediaUploadError('A foto selecionada mudou. Escolha-a novamente.','MEDIA_FILE_CHANGED');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30_000);
   try{const response=await fetch(grant.uploadUrl,{method:'PUT',headers:grant.headers,body:blob,signal:controller.signal});status=response.status;if(!response.ok)body=await response.text();}
   finally{clearTimeout(timer);}
  }else{
   const file=new File(photo.uri);
   if(file.size!==photo.size)throw new MediaUploadError('A foto selecionada mudou. Escolha-a novamente.','MEDIA_FILE_CHANGED');
   const response=await file.upload(grant.uploadUrl,{httpMethod:'PUT',uploadType:UploadType.BINARY_CONTENT,headers:{...grant.headers,'Content-Length':String(photo.size)}});
   status=response.status;body=response.body??'';
  }
 }catch(error){
  if(error instanceof MediaUploadError)throw error;
  throw new MediaUploadError('Não foi possível transferir a foto do aparelho para o armazenamento. Tente novamente.','MEDIA_TRANSFER_FAILED');
 }
 if(status<200||status>=300){
  const raw=body.match(/<Code>\s*([^<\s]+)\s*<\/Code>/i)?.[1],code=raw&&safeCodes.has(raw)?raw:undefined;
  throw new MediaUploadError(`O armazenamento recusou a foto (HTTP ${status}${code?': '+code:''}).`,'MEDIA_UPLOAD_REJECTED',status);
 }
}
