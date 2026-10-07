import type { AvatarDescriptor } from '../../types/api';
import type { AvatarCropRect, AvatarSource } from '../../features/avatar/avatarTypes';

export type AvatarPhotoModalProps = {
  visible: boolean;
  name: string;
  avatar: AvatarDescriptor;
  source?: AvatarSource;
  previewUri?: string;
  busy: boolean;
  error?: string;
  statusLabel?: string;
  onClose: () => void;
  onEdit: () => void;
  onTakePhoto: () => void;
  onRemove: () => void;
  onCancelCrop: () => void;
  onSave: (rect: AvatarCropRect) => void;
  onImageError?: () => void;
  onOpenSettings?: () => void;
};
