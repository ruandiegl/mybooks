import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from '../../services/api';
import { MediaUploadError, putPreparedImage } from '../media/putPreparedImage';
import type { ApiEnvelope, Book, BookImage } from '../../types/api';
import { BookPhotoError, MAX_BOOK_PHOTO_SIZE, type BookPhotoDraft } from './bookPhotos';

type PresignedUpload = {
  imageId: string;
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
  expiresIn: number;
};

const imagesEndpoint = (bookId: string) => `/api/v1/books/${encodeURIComponent(bookId)}/images`;
export class BookPhotoUploadError extends Error {
  constructor(message: string, public readonly code: string, public readonly status?: number) {
    super(message);
    this.name = 'BookPhotoUploadError';
  }
}

export function bookPhotoPartialSaveMessage(error: unknown) {
  if (error instanceof BookPhotoUploadError) return error.message;
  return 'Algumas alterações ficaram pendentes. Revise as fotos e tente salvar novamente.';
}

export async function uploadBookPhoto(bookId: string, photo: BookPhotoDraft): Promise<BookImage> {
  if (!photo.mimeType) {
    throw new BookPhotoError('Escolha novamente a foto que não pôde ser enviada.', 'IMAGE_TYPE_INVALID');
  }

  let localFile: File | undefined;
  let blob: Blob | undefined;
  let uploadSize = photo.size;
  try {
    if (Platform.OS === 'web') {
      blob = await (await fetch(photo.uri)).blob();
      uploadSize = blob.size;
    } else {
      localFile = new File(photo.uri);
      uploadSize = localFile.size;
    }
  } catch {
    throw new BookPhotoUploadError(
      'Não foi possível ler a foto selecionada. Escolha-a novamente.',
      'BOOK_PHOTO_FILE_UNREADABLE'
    );
  }
  if (!Number.isInteger(uploadSize) || !uploadSize || uploadSize > MAX_BOOK_PHOTO_SIZE) {
    throw new BookPhotoError('Cada foto precisa ter entre 1 byte e 8 MB.', 'IMAGE_SIZE_INVALID');
  }

  const presign = (await api.post<ApiEnvelope<PresignedUpload>>(
    `${imagesEndpoint(bookId)}/presign`,
    { mimeType: photo.mimeType, size: uploadSize }
  )).data.data;
  try {
    await putPreparedImage({uri:photo.uri,mimeType:photo.mimeType,size:uploadSize},presign);
  } catch(error) {
    throw new BookPhotoUploadError(
      error instanceof MediaUploadError ? error.message : 'Não foi possível transferir a foto. Tente novamente.',
      error instanceof MediaUploadError && error.code === 'MEDIA_UPLOAD_REJECTED' ? 'BOOK_PHOTO_UPLOAD_REJECTED' : 'BOOK_PHOTO_TRANSFER_FAILED',
      error instanceof MediaUploadError ? error.status : undefined
    );
  }

  try {
    return (await api.post<ApiEnvelope<BookImage>>(`${imagesEndpoint(bookId)}/complete`, {
      imageId: presign.imageId,
      storageKey: presign.storageKey,
      mimeType: photo.mimeType,
      size: uploadSize
    })).data.data;
  } catch {
    throw new BookPhotoUploadError(
      'A foto foi transferida, mas a API não confirmou o salvamento. Tente salvar novamente.',
      'BOOK_PHOTO_CONFIRMATION_FAILED'
    );
  }
}

export async function saveBookPhotoOrder(bookId: string, imageIds: string[]) {
  return (await api.put<ApiEnvelope<Book>>(`${imagesEndpoint(bookId)}/order`, { imageIds })).data.data;
}

export async function deleteBookPhoto(bookId: string, imageId: string) {
  await api.delete(`${imagesEndpoint(bookId)}/${encodeURIComponent(imageId)}`);
}
