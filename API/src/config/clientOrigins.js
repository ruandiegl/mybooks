export function buildClientOrigins(clientOrigins, pwaClientOrigin) {
  const existingOrigins = clientOrigins.split(',').map((item) => item.trim()).filter(Boolean);
  return [...new Set([...existingOrigins, ...(pwaClientOrigin ? [pwaClientOrigin] : [])])];
}
