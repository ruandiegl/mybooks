// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../../../components/RemoteMediaImage', async () => await vi.importActual('../../../components/RemoteMediaImage/index.web'));
import { Avatar } from '../../../components/Avatar';
import { BookCard } from '../../../components/BookCard';
import { LikeCard } from '../../../components/LikeCard';
import { BookGallery } from '../../../components/BookGallery';
import type { Book } from '../../../types/api';
const scope = { userId: 'viewer', epoch: 1 };
const binding = { scope, getScope: () => scope, transitionMs: 0 as const };
let images: HTMLImageElement[];
beforeEach(() => {
  images = [];
  vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = async () => {}; images.push(image); return image; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function loaded() { await act(async () => { for (const image of images) fireEvent.load(image); }); }
const photo = (signature: number, id = 'photo1', sortOrder = 0) => ({ id, sortOrder, isCover: sortOrder === 0, url: 'https://fixture.invalid/' + id + '?sig=' + signature, expiresAt: null });
const book = (signature: number) => ({ id: 'book1', title: 'Mesmo título', authors: [], images: [photo(signature)], availability: 'AVAILABLE', subjects: [] }) as unknown as Book;

describe('real book and avatar consumers', () => {
  it('routes an expired cover to the query owner in Likes and Library', async () => {
    let renewals = 0;
    const expired = book(1); expired.images[0].expiresAt = '2000-01-01T00:00:00Z';
    const library = render(<BookCard {...{ book: expired, binding, onImageError: () => renewals++ }} />);
    await loaded(); expect(renewals).toBe(1); library.unmount();
    render(<LikeCard {...{ userId: 'reader', bookId: 'book1', userName: 'Ana', bookTitle: 'Livro', bookCoverUrl: photo(1).url, bookCoverUrlExpiresAt: '2000-01-01T00:00:00Z', coverImageId: 'photo1', variant: 'sent' as const, likedAt: '2026-10-09', binding, onAvatarError: () => renewals++ }} />);
    await loaded(); expect(renewals).toBe(2);
  });
  it('retries a failed stable avatar and cover only when explicitly requested', async () => {
    let failing = true;
    vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = async () => { await Promise.resolve(); if (failing) { image.dispatchEvent(new Event('error')); throw Error('opaque image error'); } }; return image; });
    const avatar = { subjectId: 'reader', binding, name: 'Ana', url: 'https://fixture.invalid/stable-avatar', version: 1 };
    const mounted = render(<Avatar {...avatar} />); await loaded();
    expect(mounted.container.querySelector('img')).toBeNull();
    failing = false; mounted.rerender(<Avatar {...{ ...avatar, retryToken: 1 }} />); await loaded();
    expect(mounted.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/stable-avatar');
    mounted.unmount(); failing = true;
    const library = render(<BookCard {...{ book: book(1), binding }} />); await loaded();
    expect(library.container.querySelector('img')).toBeNull();
    failing = false; library.rerender(<BookCard {...{ book: book(1), binding, retryToken: 1 }} />); await loaded();
    expect(library.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/photo1?sig=1');
  });
  it('restores the static fallback when revisiting photo1 while photo2 is still pending', async () => {
    const mounted = render(<BookCard {...{ book: book(1), binding }} />); await loaded();
    vi.stubGlobal('Image', function () { const image = document.createElement('img'); image.decode = () => new Promise<void>(() => {}); return image; });
    const second = { ...book(1), images: [photo(1, 'photo2')] };
    mounted.rerender(<BookCard {...{ book: second, binding }} />);
    mounted.rerender(<BookCard {...{ book: book(1), binding }} />);
    expect(mounted.container.querySelector('img')).toBeNull();
    expect(mounted.container.textContent).toContain('MB');
  });
  it('retains the Library cover node through twenty signature changes', async () => {
    const mounted = render(<BookCard {...{ book: book(1), binding }} />);
    await loaded();
    const frame = mounted.container.querySelector('img')!;
    for (let index = 2; index < 22; index++) mounted.rerender(<BookCard {...{ book: book(index), binding }} />);
    await loaded();
    expect(mounted.container.querySelector('img')).toBe(frame);
    expect(frame.getAttribute('src')).toBe('https://fixture.invalid/photo1?sig=1');
  });
  it('keeps the actual photo1 in Likes and updates only when the ordered cover ID changes', async () => {
    const props = { userName: 'Ana', userId: 'reader', bookId: 'book1', bookTitle: 'Mesmo título', coverImageId: 'photo1', bookCoverUrl: photo(1).url, likedAt: '2026-10-09', variant: 'sent' as const, binding };
    const mounted = render(<LikeCard {...props} />);
    await loaded(); const first = mounted.container.querySelector('img')!;
    for (let index = 2; index < 22; index++) mounted.rerender(<LikeCard {...props} bookCoverUrl={photo(index).url} />);
    await loaded();
    expect(mounted.container.querySelector('img')).toBe(first);
    expect(first.getAttribute('src')).toBe('https://fixture.invalid/photo1?sig=1');
    mounted.rerender(<LikeCard {...props} coverImageId="photo2" bookCoverUrl={photo(1, 'photo2').url} />);
    expect(mounted.container.contains(first)).toBe(false);
    await loaded(); expect(mounted.container.querySelector('img')?.getAttribute('src')).toBe('https://fixture.invalid/photo2?sig=1');
  });
  it('retains gallery thumbnails when only query timestamps/signatures change', async () => {
    const props = { bookId: 'book1', title: 'Livro', photos: [photo(1), photo(1, 'photo2', 1)], refreshing: false, refreshVersion: 1, binding, onRefresh: () => {} };
    const mounted = render(<BookGallery {...props} />);
    await loaded(); const frames = [...mounted.container.querySelectorAll('img')];
    expect(frames).toHaveLength(2);
    for (let index = 2; index < 22; index++) mounted.rerender(<BookGallery {...{ ...props, refreshVersion: index, photos: [photo(index), photo(index, 'photo2', 1)] }} />);
    await loaded(); expect([...mounted.container.querySelectorAll('img')]).toEqual(frames);
  });
  it('retains a known avatar through renewed/missing grants and clears on removal or subject change', async () => {
    const props = { name: 'Ana', subjectId: 'reader', url: 'https://fixture.invalid/avatar?sig=1', version: 1, binding };
    const mounted = render(<Avatar {...props} />);
    await loaded(); const first = mounted.container.querySelector('img')!;
    for (let index = 2; index < 22; index++) mounted.rerender(<Avatar {...props} url={'https://fixture.invalid/avatar?sig=' + index} />);
    mounted.rerender(<Avatar {...props} url={null} />);
    await loaded(); expect(mounted.container.querySelector('img')).toBe(first);
    mounted.rerender(<Avatar {...props} version={2} url={null} />);
    expect(mounted.container.querySelector('img')).toBeNull();
    expect(mounted.container.textContent).toContain('A');
  });
});
