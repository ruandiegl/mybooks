import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppScreen } from '../../components/AppScreen';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { StateView } from '../../components/StateView';
import { TextField } from '../../components/TextField';
import { TopBar } from '../../components/TopBar';
import { useSession } from '../../providers/SessionProvider';
import { api, apiErrorMessage } from '../../services/api';
import type { ApiEnvelope, User } from '../../types/api';
import { styles } from './styles';
export function Profile() {
  const session = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => { if (query.data) { setName(query.data.name); setCity(query.data.city || ''); setBio(query.data.bio || ''); setPhone(query.data.phone || ''); } }, [query.data]);
  const mutation = useMutation({ mutationFn: async () => (await api.patch<ApiEnvelope<User>>('/api/v1/me', { name, city: city || null, bio: bio || null, phone: phone || null })).data.data, onSuccess: (user) => { queryClient.setQueryData(['me'], user); Alert.alert('Perfil atualizado', 'Suas informações foram salvas.'); }, onError: (error) => Alert.alert('Não foi possível salvar', apiErrorMessage(error)) });
  return <AppScreen><TopBar eyebrow="Sua presença" title="Perfil" />{query.isLoading ? <StateView loading title="Carregando perfil" /> : !query.data ? <StateView title="Perfil indisponível" actionLabel="Tentar novamente" onAction={() => query.refetch()} /> : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={styles.identity}><Avatar name={query.data.name} url={query.data.avatarUrl} size={82} /><Text style={styles.name}>{query.data.name}</Text>{query.data.email ? <Text style={styles.email}>{query.data.email}</Text> : null}<Badge label={session.mode === 'clerk' ? 'Conta protegida pelo Clerk' : 'Ambiente local'} variant="violet" /></View><Card style={styles.card}><Text style={styles.section}>Informações públicas</Text><TextField label="Nome" value={name} onChangeText={setName} /><TextField label="Cidade" value={city} onChangeText={setCity} placeholder="Ex.: São Paulo" /><TextField label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Conte um pouco sobre seus gostos literários" /><AppButton label="Salvar alterações" loading={mutation.isPending} onPress={() => mutation.mutate()} /></Card><AppButton label="Sair da conta" variant="ghost" icon="logout" onPress={() => session.signOut()} /></ScrollView>}</AppScreen>;
}
