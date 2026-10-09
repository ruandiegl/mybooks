export type MediaScope = { userId: string; epoch: number };
export type MediaDescriptor = { identity: string; url: string | null; expiresAt: string | null };
export type MediaRequest = { media: MediaDescriptor; pixelBucket: number };
export type MediaDisplayState = {
  identity: string | null;
  activeUrl: string | null;
  pendingUrl: string | null;
  attempt: number;
  status: 'empty' | 'loading' | 'ready' | 'error';
};
