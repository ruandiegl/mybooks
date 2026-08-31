export const welcomeEmailV1 = {
  subject: 'Sua estante MyBooks está pronta',
  html({ name }) {
    const safeName = String(name)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll(/'/g, '&#039;');

    return [
      '<main style="font-family:Arial,sans-serif;color:#271719">',
      '<h1>Bem-vindo ao MyBooks, ' + safeName + '.</h1>',
      '<p>Cadastre seu primeiro livro e comece a descobrir novas leituras.</p>',
      '</main>'
    ].join('');
  }
};
