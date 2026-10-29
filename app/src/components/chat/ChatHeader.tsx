import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../Avatar';
import { useMediaBinding } from '../../features/media/useMediaBinding';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import type { AppTheme } from '../../styles/theme';

type TitleProps = { subjectId: string; name: string; avatarUrl?: string | null; avatarVersion?: number; onImageError?: () => void };
type ActionsProps = { disabled?: boolean; onOpenBooks: () => void; onRemoveMatch: () => void };

export function ChatHeader({ subjectId, name, avatarUrl, avatarVersion, onImageError }: TitleProps) {
  const styles = useThemedStyles(createStyles);
  const mediaBinding = useMediaBinding();
  return (
    <View style={styles.title}>
      <Avatar subjectId={subjectId} binding={mediaBinding} name={name} url={avatarUrl} version={avatarVersion} size={36} onImageError={onImageError} />
      <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>{name}</Text>
    </View>
  );
}

export function ChatHeaderActions({ disabled, onOpenBooks, onRemoveMatch }: ActionsProps) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1, minWidth: 0 },
  name: { color: theme.colors.foreground, fontFamily: theme.typography.semibold, fontSize: 14, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  action: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: theme.colors.surfaceMuted }
});
