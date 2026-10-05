import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSize = 8 * 1024 * 1024;

let client;

function assertConfigured() {
  if (
    env.STORAGE_MODE !== 'r2'
    || !env.R2_ACCOUNT_ID
    || !env.R2_ACCESS_KEY_ID
    || !env.R2_SECRET_ACCESS_KEY
    || !env.R2_BUCKET
  ) {
    throw new AppError('O armazenamento de imagens ainda não foi configurado neste ambiente.', {
      statusCode: 503,
      code: 'STORAGE_NOT_CONFIGURED'
    });
  }
}

function getClient() {
  assertConfigured();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      endpoint: 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return client;
}

function extensionFor(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function assertImage({ mimeType, size }) {
  if (!allowedMimeTypes.has(mimeType)) {
    throw new AppError('Envie uma imagem JPEG, PNG ou WebP.', {
      statusCode: 422,
      code: 'IMAGE_TYPE_INVALID'
    });
  }
  if (!Number.isInteger(size) || size <= 0 || size > maxImageSize) {
    throw new AppError('A imagem deve ter no máximo 8 MB.', {
      statusCode: 422,
      code: 'IMAGE_SIZE_INVALID'
    });
  }
}

export const storageService = {
  assertImage,

  async createPresignedUpload({ ownerId, bookId, imageId, mimeType, size }) {
    assertImage({ mimeType, size });
    const storageKey = [
      'pending',
      'books',
      ownerId,
      bookId,
      imageId + '.' + extensionFor(mimeType)
    ].join('/');

    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: storageKey,
        ContentType: mimeType
      }),
      { expiresIn: env.R2_PRESIGN_EXPIRES_IN, signableHeaders: new Set(['content-type']) }
    );

    return {
      uploadUrl,
      storageKey,
      expiresIn: env.R2_PRESIGN_EXPIRES_IN,
      headers: {
        'Content-Type': mimeType
      }
    };
  },

  async createPresignedAvatarUpload({ ownerId, imageId, mimeType, size }) {
    assertImage({ mimeType, size });
    const storageKey = ['pending', 'avatars', ownerId, imageId + '.' + extensionFor(mimeType)].join('/');
    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: storageKey,
        ContentType: mimeType
      }),
      { expiresIn: env.R2_PRESIGN_EXPIRES_IN, signableHeaders: new Set(['content-type']) }
    );
    return {
      uploadUrl,
      storageKey,
      expiresIn: env.R2_PRESIGN_EXPIRES_IN,
      headers: { 'Content-Type': mimeType }
    };
  },

  async assertUploaded(storageKey, expected) {
    const result = await getClient().send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: storageKey
    }));

    if (result.ContentType !== expected.mimeType || Number(result.ContentLength) !== expected.size) {
      throw new AppError('O arquivo enviado não corresponde ao upload autorizado.', {
        statusCode: 422,
        code: 'IMAGE_UPLOAD_MISMATCH'
      });
    }
  },

  async copy({ sourceKey, destinationKey }) {
    const encodedSource = `${env.R2_BUCKET}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`;
    await getClient().send(new CopyObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: destinationKey,
      CopySource: encodedSource,
      MetadataDirective: 'COPY'
    }));
  },

  async readObjectLimited(storageKey, maxBytes) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10_000);
    let body;
    try {
      const result = await getClient().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey }), { abortSignal: abort.signal });
      body = result.Body;
      if (!body || Number(result.ContentLength) > maxBytes) throw new AppError('Arquivo acima do limite.', { statusCode: 422, code: 'IMAGE_SIZE_INVALID' });
      const chunks = [];
      let length = 0;
      for await (const chunk of body) {
        length += chunk.length;
        if (length > maxBytes) throw new AppError('Arquivo acima do limite.', { statusCode: 422, code: 'IMAGE_SIZE_INVALID' });
        chunks.push(Buffer.from(chunk));
      }
      if (!length) throw new AppError('Arquivo vazio.', { statusCode: 422, code: 'IMAGE_SIZE_INVALID' });
      return Buffer.concat(chunks);
    } finally {
      clearTimeout(timer);
      body?.destroy?.();
    }
  },

  async putImageBuffer(storageKey, buffer, mimeType) {
    assertImage({ size: buffer.length, mimeType });
    await getClient().send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey, Body: buffer, ContentType: mimeType }), { abortSignal: AbortSignal.timeout(10_000) });
  },

  async getPresignedGetUrl(storageKey) {
    const expiresIn = env.R2_GET_URL_EXPIRES_IN;
    const url = await getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey }),
      { expiresIn }
    );
    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  },

  getPublicUrl(storageKey) {
    assertConfigured();
    if (!env.R2_PUBLIC_URL) {
      throw new AppError('A URL pública para avatares não está configurada.', {
        statusCode: 503,
        code: 'STORAGE_NOT_CONFIGURED'
      });
    }
    return env.R2_PUBLIC_URL.replace(/\/$/, '') + '/' + storageKey;
  },

  async delete(storageKey) {
    if (!storageKey || env.STORAGE_MODE !== 'r2') return;
    await getClient().send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: storageKey
    }));
  }
};
