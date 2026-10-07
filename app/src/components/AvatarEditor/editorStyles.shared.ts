import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const editorStyles = StyleSheet.create({
  root:{flex:1,backgroundColor:theme.colors.background},
  header:{paddingHorizontal:theme.spacing.md,paddingVertical:theme.spacing.xs,gap:theme.spacing.xs},
  headerRow:{flexDirection:'row',alignItems:'center',gap:theme.spacing.xs},
  heading:{fontFamily:theme.typography.semibold,fontSize:17,color:theme.colors.foreground,textAlign:'center'},
  inlineHeading:{flex:1,minWidth:80},stackedHeading:{width:'100%'},
  headerButton:{minWidth:64,minHeight:48,flexShrink:1,paddingHorizontal:theme.spacing.xs,borderWidth:2,borderColor:'transparent'},
  stackedButton:{flex:1,flexBasis:0,minWidth:0},headerLabel:{flexShrink:1,minWidth:0,textAlign:'center'},
  cancelFocused:{borderColor:theme.colors.primary},saveFocused:{borderColor:theme.colors.white},
  scroll:{flex:1},body:{flexGrow:1,justifyContent:'center',padding:theme.spacing.md,gap:theme.spacing.md,alignItems:'center'},
  caption:{fontFamily:theme.typography.regular,fontSize:14,lineHeight:21,color:theme.colors.mutedForeground,textAlign:'center'},
  error:{fontFamily:theme.typography.regular,fontSize:14,color:theme.colors.danger,textAlign:'center'},
  stage:{overflow:'hidden',borderRadius:theme.radius.lg,backgroundColor:theme.colors.surface},
  circle:{position:'absolute',top:16,left:16,overflow:'hidden',backgroundColor:theme.colors.surface},
  ring:{position:'absolute',top:16,left:16,borderWidth:2,borderColor:theme.colors.outline}
});
