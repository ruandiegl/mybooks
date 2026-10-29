import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { StateView } from '../../components/StateView';
import { GAMIFICATION_LEADERBOARD_QUERY_KEY, gamificationApi } from '../../features/gamification/api';
import { presentLeaderboard } from '../../features/gamification/presentation';
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
      <ScrollView contentContainerStyle={styles.content}>
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

        {leaderboard.entries.length === 0 ? (
          <StateView compact title="Ainda não há sequências ativas" description="Entre no TrocaLivros todos os dias para iniciar a sua." icon="local-fire-department" />
        ) : (
          <View style={styles.entries}>
            {leaderboard.entries.map((entry, index) => (
              <View
                key={`${entry.rank}-${entry.name}-${index}`}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Posição ${entry.rankLabel}, ${entry.name}, ${entry.currentStreak} ${entry.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}`}
                style={styles.entry}
              >
                <Text style={styles.position}>{entry.rankLabel}</Text>
                <Avatar subjectId={`${entry.rank}-${entry.name}`} binding={mediaBinding} name={entry.name} url={entry.avatarUrl} size={48} />
                <View style={styles.entryCopy}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryMeta}>{entry.currentStreak === 1 ? '1 dia seguido' : `${entry.currentStreak} dias seguidos`}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}
