import { TextField } from '../TextField';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function VerificationCodeField({ value, onChangeText, error }: Props) {
  return (
    <TextField
      accessibilityLabel="Código de verificação de seis dígitos"
      label="Código de verificação"
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))}
      error={error}
      placeholder="000000"
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={6}
    />
  );
}
