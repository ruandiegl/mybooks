import { describe, expect, it } from 'vitest';
import { getBookGalleryPhotos } from '../bookPresentation';

describe('book gallery presentation', () => {
  it('shows uploaded photos in the saved order rather than the response order', () => {
    const images = [
      { id: 'back', url: 'https://photos/back.jpg', sortOrder: 2, isCover: false, expiresAt: null },
      { id: 'cover', url: 'https://photos/cover.jpg', sortOrder: 0, isCover: true, expiresAt: null },
      { id: 'inside', url: 'https://photos/inside.jpg', sortOrder: 1, isCover: false, expiresAt: null }
    ];
    expect(getBookGalleryPhotos({ images, coverUrl: 'https://old-cover.jpg' }).map((photo) => photo.url))
      .toEqual(['https://photos/cover.jpg', 'https://photos/inside.jpg', 'https://photos/back.jpg']);
    expect(images[0].id).toBe('back');
  });

  it('includes a legacy seed cover when there are no uploaded photos', () => {
    expect(getBookGalleryPhotos({ images: [], coverUrl: 'https://api/covers/seed.jpg' }))
      .toEqual([{ id: 'external-cover', url: 'https://api/covers/seed.jpg', sortOrder: 0, isCover: true, expiresAt: null }]);
    expect(getBookGalleryPhotos({ images: [], coverUrl: null })).toEqual([]);
  });

  it('preserves unavailable photo slots without replacing every photo with the cover', () => {
    const photos = getBookGalleryPhotos({
      coverUrl: 'https://photos/cover.jpg',
      coverUrlExpiresAt: '2026-10-01T15:00:00Z',
      images: [
        { id: 'cover', url: null, sortOrder: 0, isCover: true, expiresAt: null },
        { id: 'inside', url: null, sortOrder: 1, isCover: false, expiresAt: null }
      ]
    });
    expect(photos[0].url).toBe('https://photos/cover.jpg');
    expect(photos[0].expiresAt).toBe('2026-10-01T15:00:00Z');
    expect(photos[1].url).toBeNull();
  });
});
