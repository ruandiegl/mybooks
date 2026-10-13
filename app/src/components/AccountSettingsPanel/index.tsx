import { Text, View } from 'react-native';
import { useSession } from '../../providers/SessionProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
export function AccountSettingsPanel() {
  const { user } = useSession(), styles = useThemedStyles(createStyles);
  return <View style={styles.group}>
    <View style={styles.rowCopy}><Text style={styles.label}>E-mail</Text><Text selectable style={styles.detail}>{user?.email || 'Não informado'}</Text><Text style={styles.detail}>{user?.emailVerifiedAt ? 'E-mail confirmado' : 'E-mail não confirmado'}</Text></View>
    <View style={[styles.rowCopy, { paddingTop: 16 }]}><Text style={styles.label}>Telefone</Text><Text selectable style={styles.detail}>{user?.phone || 'Não informado'}</Text></View>
    <Text style={[styles.detail, { paddingTop: 24 }]}>Você pode atualizar seu telefone e suas informações em Editar perfil. A alteração do e-mail ainda não está disponível.</Text>
  </View>;
}
