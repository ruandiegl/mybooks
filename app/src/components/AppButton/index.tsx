import { useThemedStyles } from '../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps, type StyleProp, type TextStyle } from 'react-native';
import { useAppTheme } from '../../providers/ThemeProvider';
import { createStyles } from './styles';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type IconName = ComponentProps<typeof MaterialIcons>['name'];
type Props = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  labelStyle?: StyleProp<TextStyle>;
};

export function AppButton({ label, variant = 'primary', icon, loading, disabled, style, labelStyle, ...props }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  const light = variant === 'primary' || variant === 'secondary';
  const color = variant === 'primary' ? theme.colors.onPrimary : variant === 'secondary' ? theme.colors.onSecondary : theme.colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.82 },
        typeof style === 'function' ? style({ pressed }) : style
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={color} /> : icon ? <MaterialIcons name={icon} size={20} color={color} /> : null}
      <Text style={[styles.label, { color }, labelStyle]}>{label}</Text>
    </Pressable>
  );
}
