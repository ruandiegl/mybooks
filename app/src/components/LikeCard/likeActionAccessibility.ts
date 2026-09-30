type ButtonAccessibility = {
  accessibilityRole: 'button';
  accessibilityLabel: string;
};

export function getLikeActionAccessibility(userName: string, bookTitle: string) {
  const button = (accessibilityLabel: string): ButtonAccessibility => ({
    accessibilityRole: 'button',
    accessibilityLabel
  });

  return {
    dismiss: button(`Dispensar curtida em ${bookTitle} de ${userName}`),
    likeBack: button(`Curtir de volta o livro de ${userName}`),
    unlike: button(`Remover curtida enviada para ${userName}`)
  };
}
