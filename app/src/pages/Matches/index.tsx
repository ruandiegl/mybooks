import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { StateView } from '../../components/StateView';
import { api } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Match } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

export function Matches({ navigation }: Props) {
  const query = useQuery({ queryKey: ['matches'], queryFn: async () => (await api.get<ApiEnvelope<Match[]>>('/api/v1/matches')).data.data });
  if (query.isLoading) return <View style={styles.page}><StateView loading title="Reunindo seus matches" /></View>;
  if (query.isError) return <View style={styles.page}><StateView title="Não foi possível carregar os matches" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /></View>;
  return <View style={styles.page}><FlatList data={query.data || []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Card style={styles.card}><Avatar name={item.otherUser.name} url={item.otherUser.avatarUrl} size={52} /><View style={styles.copy}><Text style={styles.name}>{item.otherUser.name}</Text><Text style={styles.meta}>{item.otherUser.city || 'Localização não informada'} · match em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text></View>{item.conversationId ? <Pressable accessibilityRole="button" accessibilityLabel={'Conversar com ' + item.otherUser.name} style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={() => navigation.navigate('Chat', { conversationId: item.conversationId as string, title: item.otherUser.name })}><MaterialIcons name="chat-bubble" size={20} color={theme.colors.white} /></Pressable> : null}</Card>} ListEmptyComponent={<StateView title="Nenhum match por enquanto" description="Quando o interesse por livros for mútuo, a nova conexão aparece aqui." icon="favorite-border" />} /></View>;
}
