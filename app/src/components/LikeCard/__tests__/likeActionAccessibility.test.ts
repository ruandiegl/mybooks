import { describe, expect, it } from 'vitest';
import { getLikeActionAccessibility } from '../likeActionAccessibility';

describe('getLikeActionAccessibility', () => {
  it('provides accessible labels for received-like actions', () => {
    const accessibility = getLikeActionAccessibility('Ana', 'A Vida Invisível');
    expect(accessibility.dismiss).toEqual({
      accessibilityRole: 'button', accessibilityLabel: 'Dispensar curtida de Ana no seu livro A Vida Invisível'
    });
    expect(accessibility.likeBack).toEqual({
      accessibilityRole: 'button', accessibilityLabel: 'Curtir de volta o livro de Ana'
    });
  });

  it('provides an accessible label for sent-like removal', () => {
    expect(getLikeActionAccessibility('Ana', 'A Vida Invisível').unlike).toEqual({
      accessibilityRole: 'button', accessibilityLabel: 'Remover curtida enviada para Ana'
    });
  });
});
