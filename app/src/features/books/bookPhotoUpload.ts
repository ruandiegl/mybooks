import { File, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from '../../services/api';
import type { ApiEnvelope, Book, BookImage } from '../../types/api';
import { BookPhotoError, type BookPhotoDraft } from './bookPhotos';

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
  if (!photo.mimeType || !photo.size) {
    throw new BookPhotoError('Escolha novamente a foto que não pôde ser enviada.', 'IMAGE_SIZE_INVALID');
  }

  const presign = (await api.post<ApiEnvelope<PresignedUpload>>(
    `${imagesEndpoint(bookId)}/presign`,
    { mimeType: photo.mimeType, size: photo.size }
  )).data.data;
  let status: number;
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(photo.uri)).blob();
      if (blob.size === 0) throw new BookPhotoError('A foto está vazia. Escolha outra imagem.', 'IMAGE_SIZE_INVALID');
      const response = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: presign.headers,
        body: blob
      });
      status = response.status;
    } else {
      const response = await new File(photo.uri).upload(presign.uploadUrl, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        headers: presign.headers
      });
      status = response.status;
    }
  } catch (error) {
    if (error instanceof BookPhotoError) throw error;
    throw new BookPhotoUploadError(
      'Não foi possível transferir a foto do aparelho para o armazenamento. Tente novamente.',
      'BOOK_PHOTO_TRANSFER_FAILED'
    );
  }
  if (status < 200 || status >= 300) {
    throw new BookPhotoUploadError(
      `O armazenamento recusou a foto (HTTP ${status}).`,
      'BOOK_PHOTO_UPLOAD_REJECTED',
      status
    );
  }

  try {
    return (await api.post<ApiEnvelope<BookImage>>(`${imagesEndpoint(bookId)}/complete`, {
      imageId: presign.imageId,
      storageKey: presign.storageKey,
      mimeType: photo.mimeType,
      size: photo.size
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
