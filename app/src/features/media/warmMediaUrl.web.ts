export function warmMediaUrl(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false, loaded = false, decodeRejected = false;
    const timer = setTimeout(() => finish(false), 10_000);
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true; clearTimeout(timer); image.onload = null; image.onerror = null; resolve(success);
    };
    image.onload = () => { loaded = true; if (!image.decode || decodeRejected) finish(true); };
    image.onerror = () => finish(false);
    image.src = url;
    if (image.decode) void image.decode().then(() => finish(true)).catch(() => { decodeRejected = true; if (loaded || (image.complete && image.naturalWidth > 0)) finish(true); });
    else if (image.complete && image.naturalWidth > 0) finish(true);
  });
}
