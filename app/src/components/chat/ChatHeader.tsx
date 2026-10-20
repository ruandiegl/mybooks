import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../Avatar';
import { theme } from '../../styles/theme';

type TitleProps = { name: string; avatarUrl?: string | null };
type ActionsProps = { disabled?: boolean; onOpenBooks: () => void; onRemoveMatch: () => void };

export function ChatHeader({ name, avatarUrl }: TitleProps) {
  return (
    <View style={styles.title}>
      <Avatar name={name} url={avatarUrl} size={36} />
      <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>{name}</Text>
    </View>
  );
}

export function ChatHeaderActions({ disabled, onOpenBooks, onRemoveMatch }: ActionsProps) {
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver livros da troca"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onOpenBooks}
        style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
      >
        <MaterialIcons name="menu-book" size={22} color={theme.colors.secondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remover match"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onRemoveMatch}
        style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
      >
        <MaterialIcons name="person-remove-alt-1" size={21} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1, minWidth: 0 },
  name: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 14, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: theme.colors.surfaceMuted }
});
