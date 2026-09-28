import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Alert } from '../notice.web';

describe('web alert adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { alert: vi.fn(), confirm: vi.fn() });
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
