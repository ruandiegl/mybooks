type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

function message(title?: string, body?: string) {
  return [title, body].filter(Boolean).join('\n\n');
}

export const Alert = {
  alert(title?: string, body?: string, buttons?: AlertButton[]) {
    const text = message(title, body);
    if (!buttons?.length) {
      window.alert(text);
      return;
    }

    if (buttons.length === 1) {
      window.alert(text);
      buttons[0].onPress?.();
      return;
    }

    const cancelButton = buttons.find((button) => button.style === 'cancel');
    const actions = buttons.filter((button) => button !== cancelButton);
    if (actions.length > 1) {
      const options = actions.map((button, index) => `${index + 1}. ${button.text || 'Continuar'}`).join('\n');
      const selection = window.prompt(`${text}\n\n${options}\n\nDigite o número da opção ou cancele para voltar.`);
      if (selection === null) {
        cancelButton?.onPress?.();
        return;
      }
      const index = Number(selection.trim()) - 1;
      if (Number.isInteger(index) && index >= 0 && index < actions.length) actions[index].onPress?.();
      return;
    }
    const actionButton = buttons.find((button) => button !== cancelButton);
    const accepted = window.confirm(`${text}\n\n${buttons.map((button) => button.text).filter(Boolean).join(' / ')}`);
    (accepted ? actionButton : cancelButton)?.onPress?.();
  }
};
