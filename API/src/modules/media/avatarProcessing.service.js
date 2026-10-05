import sharp from 'sharp';
import { AppError } from '../../shared/errors/AppError.js';
let active = 0;
const invalid = (code = 'IMAGE_TYPE_INVALID') => new AppError('Não foi possível preparar esta imagem. Escolha outra foto.', { statusCode: 422, code });
export async function normalizeAvatar(buffer, grant) {
  if (active >= 2) throw new AppError('Tente enviar a foto novamente em instantes.', { statusCode: 503, code: 'AVATAR_PROCESSING_BUSY' });
  if (!Buffer.isBuffer(buffer) || buffer.length !== grant.size || buffer.length > (grant.protocolVersion === 2 ? 2 : 8) * 1024 * 1024) throw invalid('IMAGE_UPLOAD_MISMATCH');
  active++;
  try {
    const image = sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    const expected = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' }[grant.mimeType];
    if (!expected || metadata.format !== expected || (metadata.pages ?? 1) > 1) throw invalid();
    if (grant.protocolVersion === 2 && (metadata.width !== 512 || metadata.height !== 512 || metadata.format !== 'png')) throw invalid('AVATAR_CROP_INVALID');
    if (Math.min(metadata.width ?? 0, metadata.height ?? 0) < 128) throw invalid('AVATAR_CROP_INVALID');
    const output = await image.rotate().flatten({ background: '#ffffff' }).resize(512, 512, { fit: 'cover', position: 'centre' }).toColourspace('srgb').jpeg({ quality: 82 }).timeout({ seconds: 10 }).toBuffer();
    return { buffer: output, mimeType: 'image/jpeg', width: 512, height: 512 };
  } catch (error) { if (error instanceof AppError) throw error; throw invalid(); }
  finally { active--; }
}
