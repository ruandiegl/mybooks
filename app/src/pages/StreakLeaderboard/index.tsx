import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { StateView } from '../../components/StateView';
import { GAMIFICATION_LEADERBOARD_QUERY_KEY, gamificationApi } from '../../features/gamification/api';
import { presentLeaderboard } from '../../features/gamification/presentation';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useMediaBinding } from '../../features/media/useMediaBinding';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';

export function StreakLeaderboard() {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const mediaBinding = useMediaBinding();
  const query = useQuery({
    queryKey: GAMIFICATION_LEADERBOARD_QUERY_KEY,
    queryFn: gamificationApi.getLeaderboard,
    staleTime: 60_000
  });
  const refreshAvatar = useAvatarRefresh(query.data, query.refetch, useIsFocused());

  if (query.isLoading) {
    return <AppScreen><StateView loading title="Carregando o ranking" /></AppScreen>;
  }

  if (query.isError || !query.data) {
    return <AppScreen><StateView
      title="Não foi possível abrir o ranking"
      description="Confira sua conexão e tente novamente."
      icon="cloud-off"
      actionLabel="Tentar novamente"
      onAction={() => { void query.refetch(); }}
    /></AppScreen>;
  }

  const leaderboard = presentLeaderboard(query.data);

  return (
    <AppScreen style={styles.page}>
      <FlatList
        data={leaderboard.entries}
        keyExtractor={(entry, index) => `${entry.rank}-${entry.name}-${index}`}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.entrySeparator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeading}>
                <View style={styles.flameIcon} importantForAccessibility="no-hide-descendants">
                  <MaterialIcons name="local-fire-department" size={30} color={theme.colors.primary} accessible={false} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.eyebrow}>Sua sequência diária</Text>
                  <Text style={styles.streakValue}>
                    {leaderboard.currentUser.currentStreak > 0
                      ? `${leaderboard.currentUser.currentStreak} ${leaderboard.currentUser.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}`
                      : 'Nenhum dia registrado ainda'}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.rankSummary}>
                <Text style={styles.rankLabel}>Sua posição no ranking</Text>
                <Text style={styles.rankValue}>{leaderboard.currentUser.rankLabel}</Text>
              </View>
            </Card>
            <View style={styles.sectionHeading}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Ranking atual</Text>
              <Text style={styles.sectionDescription}>Sequências ativas de hoje e de ontem. Pessoas empatadas compartilham a posição.</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<StateView compact title="Ainda não há sequências ativas" description="Entre no TrocaLivros todos os dias para iniciar a sua." icon="local-fire-department" />}
        renderItem={({ item: entry }) => (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Posição ${entry.rankLabel}, ${entry.name}, ${entry.currentStreak} ${entry.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}`}
            style={styles.entry}
          >
            <Text style={styles.position}>{entry.rankLabel}</Text>
            <Avatar subjectId={`${entry.rank}-${entry.name}`} binding={mediaBinding} name={entry.name} url={entry.avatarUrl} onImageError={refreshAvatar} size={48} />
            <View style={styles.entryCopy}>
              <Text style={styles.entryName}>{entry.name}</Text>
              <Text style={styles.entryMeta}>{entry.currentStreak === 1 ? '1 dia seguido' : `${entry.currentStreak} dias seguidos`}</Text>
            </View>
              </View>
        )}
      />
    </AppScreen>
  );
}
