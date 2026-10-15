import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { lightTheme } from '../../styles/theme';

export function QrCode({ url }: { url: string }) {
  const { modules, path } = useMemo(() => {
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const modules = qr.getModuleCount(); const cells: string[] = [];
    for (let row = 0; row < modules; row++) for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) cells.push(`M${col + 4} ${row + 4}h1v1h-1z`);
    }
    return { modules, path: cells.join('') };
  }, [url]);
  return <svg role="img" aria-label="QR code para abrir o TrocaLivros no celular" width="208" height="208" viewBox={`0 0 ${modules + 8} ${modules + 8}`} shapeRendering="crispEdges">
    <rect width="100%" height="100%" fill={lightTheme.colors.white} />
    <path d={path} fill={lightTheme.colors.black} />
  </svg>;
}
