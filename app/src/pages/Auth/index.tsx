import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { useSession } from '../../providers/SessionProvider';
import { theme } from '../../styles/theme';
import { styles } from './styles';
export function Auth() {
  const { startAuth, mode } = useSession();
  const [loading, setLoading] = useState<'sign-in' | 'sign-up' | null>(null);
  async function authenticate(action: 'sign-in' | 'sign-up') {
    try { setLoading(action); await startAuth(action); } catch { Alert.alert('Não foi possível abrir a autenticação', 'Confira sua conexão e tente novamente.'); } finally { setLoading(null); }
  }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.body}><Text style={styles.brand}>mybooks.</Text><View style={styles.hero}><View style={styles.mark}><MaterialIcons name="auto-stories" size={42} color={theme.colors.white} /></View><Text style={styles.title}>Livros parados.{"\n"}<Text style={styles.accent}>Histórias circulando.</Text></Text><Text style={styles.description}>Encontre leitores por perto, combine trocas e converse com segurança em um só lugar.</Text></View><View style={styles.actions}><AppButton label={mode === 'development' ? 'Entrar no modo local' : 'Entrar'} icon="arrow-forward" loading={loading === 'sign-in'} onPress={() => authenticate('sign-in')} /><AppButton label="Criar minha conta" variant="outline" loading={loading === 'sign-up'} onPress={() => authenticate('sign-up')} /><Text style={styles.finePrint}>Ao continuar, você concorda com os termos da comunidade. Recuperação de acesso e verificação de e-mail são protegidas pelo Clerk.</Text></View></ScrollView></SafeAreaView>;
}
