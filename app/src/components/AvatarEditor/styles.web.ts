import type { CSSProperties } from 'react';
import { theme } from '../../styles/theme';
export const webStyles:Record<string,CSSProperties>={
 stage:{position:'relative',overflow:'hidden',backgroundColor:theme.colors.surface,borderRadius:theme.radius.lg,touchAction:'none',WebkitTouchCallout:'none',userSelect:'none'},
 media:{pointerEvents:'none'},
 cropArea:{border:'none',outline:'2px solid '+theme.colors.outline,boxShadow:'0 0 0 9999px '+theme.colors.overlay}
};
