import { useEffect, useRef, useState } from 'react';
export function BootMark({ dark, onSettled }: { dark: boolean; onSettled: () => void }) {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const source = dark ? '/brand/boot-mark-dark.svg' : '/brand/boot-mark.svg';
  useEffect(() => {
    setFailed(false);
    if (image.current?.complete) {
      if (!image.current.naturalWidth) setFailed(true);
      onSettled();
    }
  }, [source, onSettled]);
  return <img ref={image} src={source} width={96} height={96} alt="" aria-hidden="true" draggable={false} style={{ objectFit: 'contain', visibility: failed ? 'hidden' : 'visible' }} onLoad={onSettled} onError={() => { setFailed(true); onSettled(); }} />;
}
