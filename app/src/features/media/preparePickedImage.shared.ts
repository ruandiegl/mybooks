export type UploadImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';
export type PreparedUploadImage = { uri: string; mimeType: UploadImageMimeType; size: number };
export type PickedImageAsset = { uri: string; mimeType?: string | null; fileSize?: number | null };

export const MAX_UPLOAD_IMAGE_BYTES = 8 * 1024 * 1024;

export async function preparePickedImage(asset: PickedImageAsset): Promise<PreparedUploadImage> {
  if (!asset.fileSize) throw new Error('Não foi possível identificar o tamanho da imagem.');
  if (asset.fileSize > MAX_UPLOAD_IMAGE_BYTES) throw new Error('Escolha uma imagem de até 8 MB.');
  if (asset.mimeType !== 'image/jpeg' && asset.mimeType !== 'image/png' && asset.mimeType !== 'image/webp') {
    throw new Error('Escolha uma imagem JPEG, PNG ou WebP.');
  }
  return { uri: asset.uri, mimeType: asset.mimeType, size: asset.fileSize };
}
