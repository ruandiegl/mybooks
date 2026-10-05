import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { validateAvatarCropRect } from './avatarCrop';
import type { AvatarSource, AvatarCropRect, PreparedAvatar } from './avatarTypes';
export async function exportAvatarCrop(source: AvatarSource, rect: AvatarCropRect): Promise<PreparedAvatar> {
  validateAvatarCropRect(source,rect);
  const context=ImageManipulator.manipulate(source.uri);
  let image;
  try {
    context.crop(rect).resize({width:512,height:512});
    image=await context.renderAsync();
    const result=await image.saveAsync({format:SaveFormat.PNG});
    const file = new File(result.uri);
    if (!file.size || file.size > 2*1024*1024) { file.delete(); throw new Error('O recorte ficou acima de 2 MB. Escolha outra foto.'); }
    return { uri:result.uri, mimeType:'image/png',size:file.size,width:512,height:512,ownedResource:true };
  } finally { image?.release(); context.release(); }
}
