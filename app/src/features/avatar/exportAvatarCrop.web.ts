import { validateAvatarCropRect } from './avatarCrop';
import type { AvatarSource, AvatarCropRect, PreparedAvatar } from './avatarTypes';
import { avatarCanvasPng, decodeAvatarBlob } from './avatarWebImage';
export async function exportAvatarCrop(source: AvatarSource, rect: AvatarCropRect): Promise<PreparedAvatar> {
  validateAvatarCropRect(source,rect);
  const decoded=await decodeAvatarBlob(await (await fetch(source.uri)).blob());
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  try {
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador não conseguiu preparar o recorte.');
    ctx.drawImage(decoded.image,rect.originX,rect.originY,rect.width,rect.height,0,0,512,512);
    const blob=await avatarCanvasPng(canvas);
    if(!blob.size || blob.size>2*1024*1024) throw new Error('O recorte excede 2 MB. Escolha outra foto.');
    return {uri:URL.createObjectURL(blob),mimeType:'image/png',size:blob.size,width:512,height:512,ownedResource:true};
  } finally { decoded.release();canvas.width=0;canvas.height=0; }
}
