import type { AvatarSource, AvatarCropRect } from '../../features/avatar/avatarTypes';
export type AvatarEditorProps = { source:AvatarSource;busy:boolean;error?:string;statusLabel?:string;previewUri?:string;
  onSave:(rect:AvatarCropRect)=>void;onCancel:()=>void;onChooseAnother:()=>void };
