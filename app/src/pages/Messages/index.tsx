import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { StateView } from '../../components/StateView';
import { TopBar } from '../../components/TopBar';
import { api } from '../../services/api';
import { theme } from '../../styles/theme';
import type { ApiEnvelope, Conversation } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';
export function Messages() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({ queryKey: ['conversations'], queryFn: async () => (await api.get<ApiEnvelope<Conversation[]>>('/api/v1/conversations')).data.data });
  return <AppScreen><TopBar eyebrow="Conexões" title="Mensagens" action={<Pressable accessibilityRole="button" accessibilityLabel="Ver matches" style={({ pressed }) => [styles.matches, pressed && styles.matchesPressed]} onPress={() => navigation.navigate('Matches')}><MaterialIcons name="favorite" size={20} color={theme.colors.secondary} /></Pressable>} />{query.isLoading ? <StateView loading title="Abrindo conversas" /> : query.isError ? <StateView title="Não foi possível carregar" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : <FlatList data={query.data || []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={'Abrir conversa com ' + item.otherUser.name} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.otherUser.name })}><Avatar name={item.otherUser.name} url={item.otherUser.avatarUrl} /><View style={styles.copy}><Text style={styles.name}>{item.otherUser.name}</Text><Text numberOfLines={1} style={styles.preview}>{item.lastMessage?.body || 'O match aconteceu. Diga oi!'}</Text></View><Text style={styles.date}>{new Date(item.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text><MaterialIcons name="chevron-right" size={22} color={theme.colors.mutedForeground} /></Pressable>} ListEmptyComponent={<StateView title="As conversas começam com um match" description="Curta livros em Descobrir. Quando o interesse for mútuo, o chat aparece aqui." icon="forum" />} />}</AppScreen>;
}
