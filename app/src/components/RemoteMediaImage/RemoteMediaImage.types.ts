import type { ImageStyle, StyleProp } from 'react-native';
import type { MediaDescriptor, MediaScope } from '../../features/media/mediaTypes';

export type RemoteMediaImageProps = {
  media: MediaDescriptor | null;
  scope: MediaScope;
  getScope: () => MediaScope | null;
  pixelBucket: number;
  retryToken?: number;
  fit: 'cover' | 'contain';
  transitionMs: 0 | 120;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  onReady?: () => void;
  onError?: () => void;
};
