import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { validateAvatarDimensions, validateAvatarFile } from './avatarCrop';
import type { AvatarSource } from './avatarTypes';
export async function prepareAvatarSource(asset: ImagePickerAsset): Promise<AvatarSource> {
  validateAvatarFile(asset.mimeType, new File(asset.uri).size);
  if (asset.width > 0 && asset.height > 0) validateAvatarDimensions(asset.width,asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  const refs = [];
  try {
    let image = await context.renderAsync(); refs.push(image);
    validateAvatarDimensions(image.width,image.height);
    const ratio = Math.min(1,2048/Math.max(image.width,image.height));
    if (ratio < 1) { context.resize({width:Math.round(image.width*ratio),height:Math.round(image.height*ratio)}); image=await context.renderAsync(); refs.push(image); }
    const result = await image.saveAsync({format:SaveFormat.PNG});
    return { uri:result.uri,width:result.width,height:result.height,ownedResource:true };
  } catch (error) {
    if (error instanceof Error && /Escolha/.test(error.message)) throw error;
    throw new Error('Esta foto não pôde ser aberta. Exporte como JPEG e tente novamente.');
  } finally { for (const ref of refs) ref.release(); context.release(); }
}
export function releaseAvatarResource(resource: {uri:string;ownedResource:boolean}) {
  if (resource.ownedResource) { try { new File(resource.uri).delete(); } catch { /* already released */ } }
}
