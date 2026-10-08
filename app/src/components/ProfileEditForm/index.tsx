import { Text, View } from 'react-native';
import { AvatarPicker } from '../AvatarPicker';
import { AppButton } from '../AppButton';
import { TextField } from '../TextField';
import { avatarDescriptorOf } from '../../features/avatar/avatarTypes';
import { maskBrazilianPhone } from '../../features/auth/inputMasks';
import type { useProfileEditor } from '../../features/profile/useProfileEditor';
import type { useAvatarEditor } from '../../features/avatar/useAvatarEditor';
import type { User } from '../../types/api';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
type Props = { editor: ReturnType<typeof useProfileEditor>; avatarEditor: ReturnType<typeof useAvatarEditor>; profile: User };
export function ProfileEditForm({ editor, avatarEditor, profile }: Props) {
  const styles = useThemedStyles(createStyles);
  const { draft } = editor;
  return <View style={{ gap: 16 }}>
    <AvatarPicker name={[draft.firstName, draft.lastName].filter(Boolean).join(' ')} avatar={avatarDescriptorOf(profile)} busy={avatarEditor.busy || editor.pending} error={avatarEditor.error} onChoose={avatarEditor.choose} onTakePhoto={avatarEditor.takePhoto} onRemove={avatarEditor.remove} onOpenSettings={avatarEditor.permissionBlocked ? avatarEditor.openSettings : undefined} />
    <TextField label="Nome" value={draft.firstName} maxLength={50} onChangeText={value => editor.setField('firstName', value)} error={editor.nameError} autoCapitalize="words" editable={!editor.pending} />
    <TextField label="Sobrenome" value={draft.lastName} maxLength={80} onChangeText={value => editor.setField('lastName', value)} autoCapitalize="words" editable={!editor.pending} />
    <TextField label="Cidade" value={draft.city} maxLength={100} onChangeText={value => editor.setField('city', value)} placeholder="Ex.: São Paulo" editable={!editor.pending} />
    <TextField label="Telefone" value={draft.phone} onChangeText={value => editor.setField('phone', maskBrazilianPhone(value))} keyboardType="phone-pad" textContentType="telephoneNumber" maxLength={15} editable={!editor.pending} />
    <TextField label="Bio" value={draft.bio} onChangeText={value => editor.setField('bio', value)} maxLength={280} multiline help={`${draft.bio.length}/280 caracteres`} editable={!editor.pending} />
    <TextField label="Interesses" value={draft.interestsText} onChangeText={value => editor.setField('interestsText', value)} help="Separe por vírgulas." editable={!editor.pending} />
    {editor.error ? <Text accessibilityLiveRegion="polite" style={[styles.detail, styles.danger]}>{editor.error}</Text> : null}
    <AppButton label="Salvar alterações" icon="check" loading={editor.pending} disabled={avatarEditor.busy} onPress={editor.submit} />
  </View>;
}
