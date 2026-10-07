import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable,Text,View } from 'react-native';
import { Avatar } from '../Avatar';
import { AppButton } from '../AppButton';
import type { AvatarDescriptor } from '../../types/api';
import { theme } from '../../styles/theme';
import { styles } from './styles';
type Props={avatar?:AvatarDescriptor;name:string;busy:boolean;error?:string;onChoose:()=>void;onTakePhoto?:()=>void;onRemove:()=>void;onOpenSettings?:()=>void};
export function AvatarPicker({avatar,name,busy,error,onChoose,onTakePhoto,onRemove,onOpenSettings}:Props){
 return <View style={styles.wrapper}>
  <Pressable accessibilityRole="button" accessibilityLabel="Escolher ou alterar foto de perfil" accessibilityState={{disabled:busy,busy}} disabled={busy} onPress={onChoose} style={({pressed})=>[styles.avatar,pressed&&styles.pressed]}>
   <Avatar name={name} url={avatar?.avatarUrl} version={avatar?.avatarVersion} size={104} suppressBrowserActions/>
   <View style={styles.edit}><MaterialIcons name="photo-camera" size={16} color={theme.colors.white} accessible={false}/></View>
  </Pressable>
  <Text style={styles.help}>{busy?'Aguarde a foto terminar de salvar…':'Toque para escolher uma foto e ajustar o círculo.'}</Text>
  {error?<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>:null}
  {onTakePhoto?<AppButton label="Tirar foto" icon="photo-camera" variant="outline" disabled={busy} onPress={onTakePhoto}/>:null}
  {onOpenSettings?<AppButton label="Abrir ajustes de fotos" variant="outline" onPress={onOpenSettings}/>:null}
  {avatar?.avatarUrl?<Pressable accessibilityRole="button" accessibilityLabel="Remover foto de perfil" accessibilityState={{disabled:busy}} disabled={busy} onPress={onRemove} style={({pressed})=>[styles.action,pressed&&styles.pressed]}><Text style={styles.remove}>Remover foto</Text></Pressable>:null}
 </View>;
}
