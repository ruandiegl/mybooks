export type ProfileStats = {
  bookCount: number;
  matchCount: number;
  conversationCount: number;
};

export type User = {
  id: string;
  name: string;
  email?: string | null;
  emailVerifiedAt?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  interests: string[];
  profileCompletedAt?: string | null;
  booksOnboardingCompletedAt?: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  stats?: ProfileStats | null;
};

export type AuthCodeType = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
};

export type RegisterInput = {
  email: string;
  password: string;
  cpf: string;
  phone: string;
};

export type RegistrationResult = {
  userId: string;
  email: string;
  requiresEmailVerification: true;
};

export type VerifyEmailInput = { email: string; code: string };
export type LoginInput = { email: string; password: string };
export type ResetPasswordInput = { email: string; code: string; password: string };

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
