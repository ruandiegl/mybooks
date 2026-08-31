import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type IconName = ComponentProps<typeof MaterialIcons>['name'];
type Props = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
};

export function AppButton({ label, variant = 'primary', icon, loading, disabled, style, ...props }: Props) {
  const light = variant === 'primary' || variant === 'secondary';
  const color = light ? theme.colors.white : theme.colors.foreground;

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
      <Text style={[styles.label, light ? styles.lightLabel : styles.darkLabel]}>{label}</Text>
    </Pressable>
  );
}
