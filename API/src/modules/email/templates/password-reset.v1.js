const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll(/'/g, '&#039;');

export const passwordResetV1 = {
  subject: 'Redefina sua senha do TrocaLivros',
  html({ code, ttlMinutes }) {
    return [
      '<main style="font-family:Arial,sans-serif;color:#271719">',
      '<h1>Redefinição de senha</h1>',
      '<p>Use este código no TrocaLivros:</p>',
      '<p style="font-size:24px;font-weight:bold;letter-spacing:4px">' + escapeHtml(code) + '</p>',
      '<p>O código expira em ' + escapeHtml(ttlMinutes) + ' minutos.</p>',
      '</main>'
    ].join('');
  }
};
