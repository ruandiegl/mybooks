import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../AppButton';
import { theme } from '../../styles/theme';
import { editorStyles as styles } from './editorStyles.shared';
type Direction='left'|'right'|'up'|'down';
type Props=PropsWithChildren<{zoom:number;busy:boolean;ready:boolean;error?:string;statusLabel?:string;lowResolution:boolean;
 onMove:(direction:Direction)=>void;onZoom:(zoom:number)=>void;onCenter:()=>void;onSave:()=>void;onCancel:()=>void;onChooseAnother:()=>void}>;
const controls: {direction:Direction;icon:keyof typeof MaterialIcons.glyphMap;label:string}[]=[
 {direction:'left',icon:'arrow-back',label:'Mover foto para a esquerda'},{direction:'up',icon:'arrow-upward',label:'Mover foto para cima'},
 {direction:'down',icon:'arrow-downward',label:'Mover foto para baixo'},{direction:'right',icon:'arrow-forward',label:'Mover foto para a direita'}
];
export function AvatarEditorControls({children,zoom,busy,ready,error,statusLabel,lowResolution,onMove,onZoom,onCenter,onSave,onCancel,onChooseAnother}:Props) {
 return <View style={styles.root} accessibilityViewIsModal>
  <View style={styles.header}><Text accessibilityRole="header" style={styles.heading}>Ajustar foto</Text></View>
  <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
   {children}
   <Text style={styles.caption}>Arraste a foto e use dois dedos para ajustar.{ '\n' }Você também pode usar os botões abaixo.</Text>
   <View style={styles.row}>
    <AppButton label="Diminuir" icon="remove" variant="outline" disabled={busy||zoom<=1} onPress={()=>onZoom(Math.max(1,zoom-0.1))}/>
    <Text style={styles.zoom} accessibilityLabel={'Ampliação '+Math.round(zoom*100)+' por cento'}>{Math.round(zoom*100)}%</Text>
    <AppButton label="Ampliar" icon="add" variant="outline" disabled={busy||zoom>=3} onPress={()=>onZoom(Math.min(3,zoom+0.1))}/>
   </View>
   <View style={styles.row}>{controls.map(c=><Pressable key={c.direction} accessibilityRole="button" accessibilityLabel={c.label} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>onMove(c.direction)} style={({pressed})=>[styles.control,busy&&styles.disabled,pressed&&styles.pressed]}><MaterialIcons name={c.icon} size={24} color={theme.colors.primary} accessible={false}/></Pressable>)}</View>
   <AppButton label="Centralizar" variant="ghost" disabled={busy} onPress={onCenter}/>
   <AppButton label="Outra foto" variant="outline" disabled={busy} onPress={onChooseAnother}/>
   {lowResolution ? <Text style={styles.caption}>Este enquadramento pode perder um pouco de nitidez.</Text>:null}
   {error?<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>:null}
   {busy?<Text style={styles.caption} accessibilityLiveRegion="polite">{statusLabel||'Salvando foto…'}</Text>:null}
  </ScrollView>
  <View style={styles.footer}>
   <AppButton label={busy?statusLabel||'Salvando foto…':error?'Tentar novamente':'Salvar foto'} loading={busy} disabled={busy||!ready} onPress={onSave}/>
   <AppButton label="Cancelar ajuste" variant="ghost" disabled={busy} onPress={onCancel}/>
  </View>
 </View>;
}
