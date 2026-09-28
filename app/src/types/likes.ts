export type ReceivedLike = {
  id: string;
  actor: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    city?: string | null;
  };
  book: {
    id: string;
    title: string;
    coverUrl?: string | null;
  };
  actorBook?: {
    id: string;
    title: string;
    coverUrl?: string | null;
  } | null;
  likedAt: string;
};

export type SentLike = {
  id: string;
  book: {
    id: string;
    title: string;
    coverUrl?: string | null;
  };
  owner: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    city?: string | null;
  };
  likedAt: string;
};

export type LikeBook = {
  id: string;
  title: string;
};
