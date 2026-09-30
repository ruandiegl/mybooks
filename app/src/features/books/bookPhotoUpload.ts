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

export async function uploadBookPhoto(bookId: string, photo: BookPhotoDraft): Promise<BookImage> {
  if (!photo.mimeType || !photo.size) {
    throw new BookPhotoError('Escolha novamente a foto que não pôde ser enviada.', 'IMAGE_SIZE_INVALID');
  }

  const presign = (await api.post<ApiEnvelope<PresignedUpload>>(
    `${imagesEndpoint(bookId)}/presign`,
    { mimeType: photo.mimeType, size: photo.size }
  )).data.data;
  let blob: Blob;
  try {
    blob = await (await fetch(photo.uri)).blob();
  } catch {
    throw new Error('Não foi possível ler a foto selecionada.');
  }
  if (blob.size === 0) throw new BookPhotoError('A foto está vazia. Escolha outra imagem.', 'IMAGE_SIZE_INVALID');
  const upload = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.headers,
    body: blob
  });
  if (!upload.ok) throw new Error('O envio da foto foi interrompido. Tente novamente.');

  return (await api.post<ApiEnvelope<BookImage>>(`${imagesEndpoint(bookId)}/complete`, {
    imageId: presign.imageId,
    storageKey: presign.storageKey,
    mimeType: photo.mimeType,
    size: photo.size
  })).data.data;
}

export async function saveBookPhotoOrder(bookId: string, imageIds: string[]) {
  return (await api.put<ApiEnvelope<Book>>(`${imagesEndpoint(bookId)}/order`, { imageIds })).data.data;
}

export async function deleteBookPhoto(bookId: string, imageId: string) {
  await api.delete(`${imagesEndpoint(bookId)}/${encodeURIComponent(imageId)}`);
}
