import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Alert } from '../notice.web';

describe('web alert adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { alert: vi.fn(), confirm: vi.fn(), prompt: vi.fn() });
  });

  it('allows either action when a notice has two non-cancel choices', () => {
    const choices: string[] = [];
    vi.mocked(window.prompt).mockReturnValueOnce('2').mockReturnValueOnce('1');
    const buttons = [
      { text: 'Ver livro', onPress: () => choices.push('view') },
      { text: 'Editar fotos', onPress: () => choices.push('edit') }
    ];
    Alert.alert('Fotos pendentes', 'Escolha como continuar.', buttons);
    Alert.alert('Fotos pendentes', 'Escolha como continuar.', buttons);
    expect(choices).toEqual(['edit', 'view']);
  });

  it('selects any book from a filter and treats dismissal as cancellation', () => {
    const choices: string[] = [];
    vi.mocked(window.prompt).mockReturnValueOnce('3').mockReturnValueOnce(null).mockReturnValueOnce('999');
    const buttons = [
      { text: 'Todos os livros', onPress: () => choices.push('all') },
      { text: 'Livro A', onPress: () => choices.push('a') },
      { text: 'Livro B', onPress: () => choices.push('b') },
      { text: 'Cancelar', style: 'cancel' as const, onPress: () => choices.push('cancel') }
    ];
    Alert.alert('Filtrar por livro', 'Selecione um livro.', buttons);
    Alert.alert('Filtrar por livro', 'Selecione um livro.', buttons);
    Alert.alert('Filtrar por livro', 'Selecione um livro.', buttons);
    expect(choices).toEqual(['b', 'cancel']);
  });

  it('shows informational messages and runs the single action after dismissal', () => {
    const onPress = vi.fn();
    Alert.alert('Livro publicado', 'O livro já está na biblioteca.', [{ text: 'Ver livro', onPress }]);

    expect(window.alert).toHaveBeenCalledWith('Livro publicado\n\nO livro já está na biblioteca.');
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('keeps destructive actions behind browser confirmation and maps cancel correctly', () => {
    const cancel = vi.fn();
    const remove = vi.fn();
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValueOnce(true);

    Alert.alert('Remover livro?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel', onPress: cancel },
      { text: 'Remover', style: 'destructive', onPress: remove }
    ]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();

    Alert.alert('Remover livro?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel', onPress: cancel },
      { text: 'Remover', style: 'destructive', onPress: remove }
    ]);
    expect(remove).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
