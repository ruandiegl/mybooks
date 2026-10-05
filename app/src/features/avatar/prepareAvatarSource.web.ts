import type { ImagePickerAsset } from 'expo-image-picker';
import { validateAvatarDimensions, validateAvatarFile } from './avatarCrop';
import type { AvatarSource } from './avatarTypes';
import { avatarCanvasPng, decodeAvatarBlob } from './avatarWebImage';
export async function prepareAvatarSource(asset: ImagePickerAsset): Promise<AvatarSource> {
  const blob=await (await fetch(asset.uri)).blob();
  validateAvatarFile(blob.type || asset.mimeType,blob.size);
  const decoded=await decodeAvatarBlob(blob);
  const canvas=document.createElement('canvas');
  try {
    validateAvatarDimensions(decoded.width,decoded.height);
    const ratio=Math.min(1,2048/Math.max(decoded.width,decoded.height));
    canvas.width=Math.round(decoded.width*ratio);canvas.height=Math.round(decoded.height*ratio);
    const ctx=canvas.getContext('2d');
    if(!ctx) throw new Error('Este navegador não conseguiu preparar a foto.');
    ctx.drawImage(decoded.image,0,0,canvas.width,canvas.height);
    const png=await avatarCanvasPng(canvas);
    return {uri:URL.createObjectURL(png),width:canvas.width,height:canvas.height,ownedResource:true};
  } finally { decoded.release(); canvas.width=0;canvas.height=0; }
}
export function releaseAvatarResource(resource: {uri:string;ownedResource:boolean}) {
  if(resource.ownedResource && resource.uri.startsWith('blob:')) URL.revokeObjectURL(resource.uri);
}
