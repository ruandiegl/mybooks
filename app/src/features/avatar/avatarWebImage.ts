export async function decodeAvatarBlob(blob: Blob): Promise<{image:CanvasImageSource;width:number;height:number;release:()=>void}> {
  if (typeof createImageBitmap === 'function') {
    try { const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'}); return {image:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close()}; } catch { /* Safari HEIC may only decode through Image */ }
  }
  const uri=URL.createObjectURL(blob);
  const image=new Image();
  try { await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Exporte a foto como JPEG e tente novamente.'));image.src=uri;});
    return {image,width:image.naturalWidth,height:image.naturalHeight,release:()=>{image.src='';URL.revokeObjectURL(uri);}};
  } catch(error) { URL.revokeObjectURL(uri);throw error; }
}
export function avatarCanvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Não foi possível preparar o recorte.')),'image/png'));
}
