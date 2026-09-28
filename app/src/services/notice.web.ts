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
    const actionButton = buttons.find((button) => button !== cancelButton);
    const accepted = window.confirm(`${text}\n\n${buttons.map((button) => button.text).filter(Boolean).join(' / ')}`);
    (accepted ? actionButton : cancelButton)?.onPress?.();
  }
};
