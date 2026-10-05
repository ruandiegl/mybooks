import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
export const editorStyles = StyleSheet.create({
  root:{flex:1,backgroundColor:theme.colors.background},
  header:{padding:theme.spacing.md,borderBottomWidth:1,borderBottomColor:theme.colors.outline},
  heading:{fontFamily:theme.typography.bold,fontSize:22,color:theme.colors.foreground},
  scroll:{flex:1},body:{padding:theme.spacing.md,gap:theme.spacing.md,alignItems:'center'},
  caption:{fontFamily:theme.typography.regular,fontSize:14,lineHeight:21,color:theme.colors.mutedForeground,textAlign:'center'},
  row:{flexDirection:'row',gap:theme.spacing.xs,alignItems:'center',justifyContent:'center',flexWrap:'wrap'},
  control:{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:theme.colors.outline,borderRadius:theme.radius.sm,backgroundColor:theme.colors.surface},
  zoom:{fontFamily:theme.typography.semibold,fontSize:14,color:theme.colors.foreground,minWidth:60,textAlign:'center'},
  pressed:{opacity:0.76},disabled:{opacity:0.45},
  error:{fontFamily:theme.typography.regular,fontSize:14,color:theme.colors.danger,textAlign:'center'},
  footer:{padding:theme.spacing.md,gap:theme.spacing.xs,borderTopWidth:1,borderTopColor:theme.colors.outline},
  stage:{overflow:'hidden',borderRadius:theme.radius.lg,backgroundColor:theme.colors.surface},
  circle:{position:'absolute',top:16,left:16,overflow:'hidden',backgroundColor:theme.colors.surface},
  ring:{position:'absolute',top:16,left:16,borderWidth:2,borderColor:theme.colors.outline}
});
