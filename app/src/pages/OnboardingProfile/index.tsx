import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Card } from '../../components/Card';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { TextField } from '../../components/TextField';
import { useSession } from '../../providers/SessionProvider';
import { api, apiErrorMessage } from '../../services/api';
import { Alert } from '../../services/notice';
import type { ApiEnvelope, User } from '../../types/api';
import { styles } from './styles';

export function OnboardingProfile() {
  const { user, refreshUser } = useSession();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests.join(', ') || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [busy, setBusy] = useState(false);

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      const interestList = interests.split(',').map((item) => item.trim()).filter(Boolean);
      const hasData = Boolean(firstName.trim() || lastName.trim() || bio.trim() || interestList.length);
      if (skip || !hasData) {
        await api.post('/api/v1/me/onboarding/profile/skip');
      } else {
        const payload = {
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
          interests: interestList
        };
        await api.patch<ApiEnvelope<User>>('/api/v1/me', payload);
      }
      await refreshUser();
    } catch (error) {
      Alert.alert('Não foi possível continuar', apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <OnboardingProgress step={2} />
          <Text style={styles.title}>Conte um pouco sobre você</Text>
          <Text style={styles.description}>Essa etapa é opcional. Um perfil completo ajuda outras pessoas a conhecerem seus gostos de leitura.</Text>
          <Card style={styles.card}>
            <AvatarPicker avatarUrl={avatarUrl} name={[firstName, lastName].filter(Boolean).join(' ')} onUploaded={setAvatarUrl} />
            <TextField label="Nome" value={firstName} onChangeText={setFirstName} autoComplete="name-given" textContentType="givenName" maxLength={50} />
            <TextField label="Sobrenome" value={lastName} onChangeText={setLastName} autoComplete="name-family" textContentType="familyName" maxLength={80} />
            <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={280} help={`${bio.length}/280`} />
            <TextField label="Interesses" value={interests} onChangeText={setInterests} placeholder="Fantasia, clássicos, romance" help="Separe por vírgulas; até 12 interesses." />
          </Card>
          <AppButton label="Salvar e continuar" loading={busy} onPress={() => finish(false)} />
          <AppButton label="Pular por agora" variant="ghost" disabled={busy} onPress={() => finish(true)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
