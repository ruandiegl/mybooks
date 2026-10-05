import {
  MAX_UPLOAD_IMAGE_BYTES,
  preparePickedImage as prepareStandardImage,
  type PickedImageAsset,
  type PreparedUploadImage
} from './preparePickedImage.shared';

const MAX_CONVERTIBLE_SOURCE_BYTES = 24 * 1024 * 1024;

async function convertToJpeg(uri: string) {
  const blob = await (await fetch(uri)).blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const maxDimension = 2048;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const converted = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Conversão indisponível.')), 'image/jpeg', 0.78);
    });
    return converted;
  } finally {
    bitmap.close();
  }
}

export async function preparePickedImage(asset: PickedImageAsset): Promise<PreparedUploadImage> {
  const isHeic = asset.mimeType === 'image/heic' || asset.mimeType === 'image/heif';
  const isLargeJpeg = asset.mimeType === 'image/jpeg' && (asset.fileSize ?? 0) > MAX_UPLOAD_IMAGE_BYTES;
  if (!isHeic && !isLargeJpeg) return prepareStandardImage(asset);

  if (!asset.fileSize || asset.fileSize > MAX_CONVERTIBLE_SOURCE_BYTES) {
    throw new Error('A foto original excede o limite que o Safari consegue preparar. Escolha uma foto menor.');
  }

  let converted: Blob;
  try {
    converted = await convertToJpeg(asset.uri);
  } catch {
    if (isHeic) {
      throw new Error('Safari não conseguiu converter foto HEIC. Exporte a foto como JPEG ou escolha “Mais compatível” no app Fotos e tente novamente.');
    }
    throw new Error('Safari não conseguiu reduzir esta foto. Escolha uma imagem JPEG menor que 8 MB.');
  }

  if (converted.size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('A foto preparada ainda excede 8 MB. Escolha uma foto menor e tente novamente.');
  }

  return { uri: URL.createObjectURL(converted), mimeType: 'image/jpeg', size: converted.size };
}

export function releasePreparedImage(image: PreparedUploadImage) {
  if (image.uri.startsWith('blob:')) URL.revokeObjectURL(image.uri);
}
