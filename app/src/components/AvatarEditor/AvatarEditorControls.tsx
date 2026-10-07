import { useState, type PropsWithChildren } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppButton } from '../AppButton';
import { editorStyles as styles } from './editorStyles.shared';
type Props=PropsWithChildren<{busy:boolean;ready:boolean;error?:string;statusLabel?:string;lowResolution:boolean;onSave:()=>void;onCancel:()=>void}>;
export function AvatarEditorControls({children,busy,ready,error,statusLabel,lowResolution,onSave,onCancel}:Props) {
 const [focused,setFocused]=useState<'cancel'|'save'|null>(null);
 const [wrappedTitle,setWrappedTitle]=useState(false);
 const {width,fontScale}=useWindowDimensions(),stackedHeader=width<360||fontScale>=1.5||wrappedTitle;
 // Text-only browser zoom may not update fontScale; adapt once, without a layout loop.
 const heading=<Text accessibilityRole="header" onLayout={event=>{if(!stackedHeader&&event.nativeEvent.layout.height>60)setWrappedTitle(true);}} style={[styles.heading,stackedHeader?styles.stackedHeading:styles.inlineHeading]}>Ajustar foto</Text>;
 return <View style={styles.root} accessibilityViewIsModal>
  <View style={styles.header}>
   {stackedHeader?heading:null}
   <View style={styles.headerRow}>
    <AppButton label="Cancelar" accessibilityLabel="Cancelar ajuste" accessibilityState={{disabled:busy}} variant="ghost" disabled={busy} onPress={onCancel} onFocus={()=>setFocused('cancel')} onBlur={()=>setFocused(null)} labelStyle={styles.headerLabel} style={[styles.headerButton,stackedHeader&&styles.stackedButton,focused==='cancel'&&styles.cancelFocused]}/>
    {!stackedHeader?heading:null}
    <AppButton label={error?'Tentar':'Salvar'} accessibilityLabel={busy?statusLabel||'Salvando foto…':error?'Tentar novamente':'Salvar foto'} accessibilityState={{disabled:busy||!ready,busy}} loading={busy} disabled={busy||!ready} onPress={onSave} onFocus={()=>setFocused('save')} onBlur={()=>setFocused(null)} labelStyle={styles.headerLabel} style={[styles.headerButton,stackedHeader&&styles.stackedButton,focused==='save'&&styles.saveFocused]}/>
   </View>
  </View>
  <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
   {children}
   <Text style={styles.caption}>Arraste para posicionar.{ '\n' }Use dois dedos para ajustar o zoom.</Text>
   {lowResolution ? <Text style={styles.caption}>Este enquadramento pode perder um pouco de nitidez.</Text>:null}
   {error?<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>:null}
   {busy?<Text style={styles.caption} accessibilityLiveRegion="polite">{statusLabel||'Salvando foto…'}</Text>:null}
  </ScrollView>
 </View>;
}
