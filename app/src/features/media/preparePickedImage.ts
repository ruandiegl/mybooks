import type { PreparedUploadImage } from './preparePickedImage.shared';
export {
  MAX_UPLOAD_IMAGE_BYTES,
  preparePickedImage,
  type UploadImageMimeType,
  type PreparedUploadImage,
  type PickedImageAsset
} from './preparePickedImage.shared';

export function releasePreparedImage(_image: PreparedUploadImage) {}
