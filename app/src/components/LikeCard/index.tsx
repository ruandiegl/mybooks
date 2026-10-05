import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../Avatar';
import { BookPhoto } from '../BookPhoto';
import { Card } from '../Card';
import { getLikeActionAccessibility } from './likeActionAccessibility';
import { styles } from './styles';

type LikeCardProps = {
  userName: string;
  userAvatar?: string | null;
  avatarVersion?: number;
  onAvatarError?: () => void;
  userCity?: string | null;
  bookTitle: string;
  bookCoverUrl?: string | null;
  likedAt: string;
  variant: 'received' | 'sent';
  onLikeBack?: () => void;
  onDismiss?: () => void;
  onUnlike?: () => void;
  onPress?: () => void;
  relatedBookTitle?: string;
  onOpenRelatedBook?: () => void;
  disabled?: boolean;
};

export function LikeCard({
  userName, userAvatar, avatarVersion, onAvatarError, userCity, bookTitle, bookCoverUrl, variant,
  onLikeBack, onDismiss, onUnlike, onPress, relatedBookTitle, onOpenRelatedBook, disabled
}: LikeCardProps) {
  const { width } = useWindowDimensions();
  const gridWidth = Math.min(width - theme.spacing.md * 2, 560);
  const cardWidth = Math.max(0, (gridWidth - theme.spacing.sm) / 2);
  const coverHeight = Math.min(cardWidth * 0.8, 200);
  const actionAccessibility = getLikeActionAccessibility(userName, bookTitle);

  return (
    <Card style={[styles.container, { width: cardWidth }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Ver ' + bookTitle + (variant === 'received' ? ', seu livro curtido por ' : ', livro de ') + userName}
        accessibilityHint="Abre todas as fotos e informações do livro, sem alterar a curtida."
        accessibilityState={{ disabled: Boolean(disabled || !onPress) }}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={styles.topRow}>
          <Avatar name={userName} url={userAvatar} version={avatarVersion} onImageError={onAvatarError} size={28} />
          <View style={styles.userSection}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.userCaption} numberOfLines={1}>{variant === 'received' ? 'Curtiu seu livro' : userCity || 'Dono do livro'}</Text>
          </View>
        </View>
        <View style={[styles.cover, { height: coverHeight }]}>
          <BookPhoto key={bookCoverUrl || bookTitle} url={bookCoverUrl} title={bookTitle} label={'Capa de ' + bookTitle} compact />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.bookTitle} numberOfLines={2}>{bookTitle}</Text>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.primary} accessible={false} />
        </View>
      </Pressable>

      {variant === 'received' && onOpenRelatedBook ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Ver livro de ' + userName + ' para troca' + (relatedBookTitle ? ': ' + relatedBookTitle : '')}
          accessibilityHint="Abre o livro da pessoa que enviou a curtida."
          accessibilityState={{ disabled: Boolean(disabled) }}
          disabled={disabled}
          onPress={onOpenRelatedBook}
          style={({ pressed }) => [styles.relatedBook, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <View style={styles.relatedBookInfo}>
            <Text style={styles.relatedBookCaption} numberOfLines={1}>Para troca</Text>
            <Text style={styles.relatedBookTitle} numberOfLines={1}>{relatedBookTitle || 'Ver livro de ' + userName}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.primary} accessible={false} />
        </Pressable>
      ) : null}

      <View style={styles.actionsContainer}>
        {variant === 'received' ? (
          onLikeBack && onDismiss ? (
            <>
              <Pressable {...actionAccessibility.dismiss} accessibilityState={{ disabled: Boolean(disabled) }} onPress={onDismiss} disabled={disabled} style={({ pressed }) => [styles.actionButton, styles.dismissButton, disabled && styles.disabled, pressed && styles.pressed]}>
                <MaterialIcons name="close" size={24} color={theme.colors.mutedForeground} accessible={false} />
              </Pressable>
              <Pressable {...actionAccessibility.likeBack} accessibilityState={{ disabled: Boolean(disabled) }} onPress={onLikeBack} disabled={disabled} style={({ pressed }) => [styles.actionButton, styles.likeButton, disabled && styles.disabled, pressed && styles.pressed]}>
                <MaterialIcons name="favorite" size={24} color={theme.colors.white} accessible={false} />
              </Pressable>
            </>
          ) : <Text style={styles.unavailableActions}>Sem livro para troca</Text>
        ) : (
          <Pressable {...actionAccessibility.unlike} accessibilityState={{ disabled: Boolean(disabled || !onUnlike) }} onPress={onUnlike} disabled={disabled || !onUnlike} style={({ pressed }) => [styles.actionButton, styles.unlikeButton, disabled && styles.disabled, pressed && styles.pressed]}>
            <MaterialIcons name="heart-broken" size={20} color={theme.colors.danger} accessible={false} />
            <Text style={[styles.actionLabel, styles.unlikeLabel]}>Remover</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}
