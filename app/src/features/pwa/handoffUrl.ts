export function getPublicHandoffUrl(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Origem web inválida.');
  return new URL('/', url.origin).href;
}
