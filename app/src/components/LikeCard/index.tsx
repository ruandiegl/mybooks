import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Pressable, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../Avatar';
import { getLikeActionAccessibility } from './likeActionAccessibility';
import { styles } from './styles';

type LikeCardProps = {
  userName: string;
  userAvatar?: string | null;
  userCity?: string | null;
  bookTitle: string;
  bookCoverUrl?: string | null;
  likedAt: string;
  variant: 'received' | 'sent';
  onLikeBack?: () => void;
  onDismiss?: () => void;
  onUnlike?: () => void;
  onPress?: () => void;
  disabled?: boolean;
};

export function LikeCard({
  userName,
  userAvatar,
  userCity,
  bookTitle,
  bookCoverUrl,
  likedAt,
  variant,
  onLikeBack,
  onDismiss,
  onUnlike,
  onPress,
  disabled
}: LikeCardProps) {
  const actionAccessibility = getLikeActionAccessibility(userName, bookTitle);
  const content = (
    <>
      <View style={styles.topRow}>
        <View style={styles.userSection}>
          <Avatar name={userName} url={userAvatar} size={28} />
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>
      </View>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient}>
        <View style={styles.infoContainer}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {bookTitle}
          </Text>
          {userCity ? (
            <View style={styles.cityRow}>
              <MaterialIcons name="location-on" size={12} color={theme.colors.surfaceMuted} />
              <Text style={styles.userCity} numberOfLines={1}>
                {userCity}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsContainer}>
          {variant === 'received' ? (
            onLikeBack && onDismiss ? (
              <>
                <Pressable {...actionAccessibility.dismiss} style={[styles.actionButton, styles.dismissButton]} onPress={onDismiss} disabled={disabled}>
                  <MaterialIcons name="close" size={20} color={theme.colors.mutedForeground} />
                </Pressable>
                <Pressable {...actionAccessibility.likeBack} style={[styles.actionButton, styles.likeButton]} onPress={onLikeBack} disabled={disabled}>
                  <MaterialIcons name="favorite" size={20} color={theme.colors.white} />
                </Pressable>
              </>
            ) : (
              <Text style={styles.unavailableActions}>Sem livro disponível para responder</Text>
            )
          ) : (
            <Pressable
              {...actionAccessibility.unlike}
              style={[styles.actionButton, styles.unlikeButton]}
              onPress={onUnlike}
              disabled={disabled}
            >
              <MaterialIcons name="heart-broken" size={20} color={theme.colors.danger} />
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </>
  );

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={disabled}>
      {bookCoverUrl ? (
        <ImageBackground source={{ uri: bookCoverUrl }} style={styles.background} imageStyle={styles.imageStyle}>
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.background, styles.fallbackBackground]}>
          <Text style={styles.fallbackTitle} numberOfLines={3}>{bookTitle}</Text>
          {content}
        </View>
      )}
    </Pressable>
  );
}
