export type User = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
};

export type BookImage = {
  id: string;
  url: string;
  isCover: boolean;
};

export type Book = {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  synopsis?: string | null;
  year?: number | null;
  pageCount?: number | null;
  subjects: string[];
  isbn?: string | null;
  hasIsbnBadge: boolean;
  isbnProvider?: string | null;
  availability: 'AVAILABLE' | 'RESERVED' | 'EXCHANGED';
  coverUrl?: string | null;
  images: BookImage[];
  owner?: Pick<User, 'id' | 'name' | 'avatarUrl' | 'city'> | null;
  createdAt: string;
  updatedAt: string;
};

export type PageInfo = {
  hasNextPage: boolean;
  nextCursor?: string | null;
};

export type Paginated<T> = {
  items: T[];
  pageInfo: PageInfo;
};

export type Match = {
  id: string;
  status: string;
  otherUser: Pick<User, 'id' | 'name' | 'avatarUrl' | 'city'>;
  conversationId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  sender?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  body: string;
  createdAt: string;
  updatedAt: string;
  localStatus?: 'sending' | 'sent' | 'failed';
};

export type Conversation = {
  id: string;
  matchId: string;
  otherUser: Pick<User, 'id' | 'name' | 'avatarUrl' | 'city'>;
  lastMessage?: Message | null;
  updatedAt: string;
};

export type IsbnLookup = {
  isbn: string;
  status: 'FOUND';
  source: string;
  book: {
    title: string;
    subtitle?: string | null;
    authors: string[];
    publisher?: string | null;
    synopsis?: string | null;
    year?: number | null;
    pageCount?: number | null;
    subjects: string[];
    coverUrl?: string | null;
  };
};

export type ApiEnvelope<T> = {
  data: T;
};
