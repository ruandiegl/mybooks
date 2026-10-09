import { Image } from 'expo-image';
export async function warmMediaUrl(url: string): Promise<boolean> {
  try { return await Image.prefetch(url, { cachePolicy: 'memory' }); } catch { return false; }
}
