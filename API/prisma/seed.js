import { prisma } from '../src/shared/database/prisma.js';

const seedUsers = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    clerkUserId: 'dev-mybooks-user',
    name: 'Leitor de Teste',
    email: 'leitor.teste@local.mybooks',
    bio: 'Conta local para testar descoberta, likes, matches e conversas.',
    city: 'São Paulo, SP'
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    clerkUserId: 'seed-ana-martins',
    name: 'Ana Martins',
    email: 'ana.martins@seed.mybooks',
    bio: 'Gosto de histórias brasileiras, ficção contemporânea e boas conversas.',
    city: 'Belo Horizonte, MG'
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    clerkUserId: 'seed-caio-nogueira',
    name: 'Caio Nogueira',
    email: 'caio.nogueira@seed.mybooks',
    bio: 'Troco livros de fantasia, não ficção e tudo que rende uma boa recomendação.',
    city: 'Curitiba, PR'
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    clerkUserId: 'seed-marina-alves',
    name: 'Marina Alves',
    email: 'marina.alves@seed.mybooks',
    bio: 'Leitora de romances, clássicos e livros que ficam na cabeça por dias.',
    city: 'Recife, PE'
  }
];

const seedBooks = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    owner: 'dev-mybooks-user',
    title: 'A Hora da Estrela',
    authors: ['Clarice Lispector'],
    publisher: 'Rocco',
    synopsis: 'Um clássico breve e intenso sobre identidade, silêncio e existência.',
    year: 1977,
    pageCount: 88,
    subjects: ['Clássicos', 'Literatura brasileira'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788532508126-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    owner: 'dev-mybooks-user',
    title: 'O Pequeno Príncipe',
    authors: ['Antoine de Saint-Exupéry'],
    publisher: 'HarperCollins',
    synopsis: 'Uma viagem delicada sobre amizade, cuidado e o que realmente importa.',
    year: 1943,
    pageCount: 96,
    subjects: ['Ficção', 'Clássicos'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788522031445-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000003',
    owner: 'dev-mybooks-user',
    title: 'Torto Arado',
    authors: ['Itamar Vieira Junior'],
    publisher: 'Todavia',
    synopsis: 'Uma história de família, terra e resistência no sertão baiano.',
    year: 2019,
    pageCount: 264,
    subjects: ['Literatura brasileira', 'Drama'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9786580309312-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000004',
    owner: 'seed-ana-martins',
    title: 'Tudo é Rio',
    authors: ['Carla Madeira'],
    publisher: 'Record',
    synopsis: 'Amor, culpa e recomeço em uma narrativa brasileira arrebatadora.',
    year: 2014,
    pageCount: 210,
    subjects: ['Romance', 'Literatura brasileira'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788501112514-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000005',
    owner: 'seed-ana-martins',
    title: 'Pequeno Manual Antirracista',
    authors: ['Djamila Ribeiro'],
    publisher: 'Companhia das Letras',
    synopsis: 'Um convite prático para reconhecer e enfrentar o racismo cotidiano.',
    year: 2019,
    pageCount: 136,
    subjects: ['Não ficção', 'Sociedade'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788598349219-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000006',
    owner: 'seed-ana-martins',
    title: 'O Avesso da Pele',
    authors: ['Jeferson Tenório'],
    publisher: 'Companhia das Letras',
    synopsis: 'Memória e identidade se encontram em uma investigação íntima e potente.',
    year: 2020,
    pageCount: 192,
    subjects: ['Literatura brasileira', 'Família'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788535933907-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000007',
    owner: 'seed-caio-nogueira',
    title: 'A Biblioteca da Meia-Noite',
    authors: ['Matt Haig'],
    publisher: 'Bertrand Brasil',
    synopsis: 'Entre infinitas possibilidades, uma biblioteca ajuda Nora a imaginar novos caminhos.',
    year: 2020,
    pageCount: 308,
    subjects: ['Ficção', 'Fantasia'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9786558380546-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000008',
    owner: 'seed-caio-nogueira',
    title: 'Sapiens',
    authors: ['Yuval Noah Harari'],
    publisher: 'Companhia das Letras',
    synopsis: 'Uma visão ampla da trajetória humana, das primeiras sociedades ao presente.',
    year: 2011,
    pageCount: 464,
    subjects: ['História', 'Não ficção'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788535920815-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000009',
    owner: 'seed-caio-nogueira',
    title: 'O Hobbit',
    authors: ['J. R. R. Tolkien'],
    publisher: 'HarperCollins',
    synopsis: 'Uma aventura clássica pela Terra-média, com coragem, amizade e dragões.',
    year: 1937,
    pageCount: 336,
    subjects: ['Fantasia', 'Aventura'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788595084742-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000010',
    owner: 'seed-marina-alves',
    title: 'Pessoas Normais',
    authors: ['Sally Rooney'],
    publisher: 'Companhia das Letras',
    synopsis: 'Duas pessoas, muitos silêncios e as formas tortas de permanecer conectado.',
    year: 2018,
    pageCount: 264,
    subjects: ['Romance', 'Contemporâneo'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788535932481-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000011',
    owner: 'seed-marina-alves',
    title: 'Antes que o Café Esfrie',
    authors: ['Toshikazu Kawaguchi'],
    publisher: 'Valentina',
    synopsis: 'Em um café especial, visitantes ganham uma chance breve de revisitar o passado.',
    year: 2015,
    pageCount: 208,
    subjects: ['Ficção', 'Família'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788558890728-M.jpg'
  },
  {
    id: '30000000-0000-4000-8000-000000000012',
    owner: 'seed-marina-alves',
    title: 'O Conto da Aia',
    authors: ['Margaret Atwood'],
    publisher: 'Rocco',
    synopsis: 'Uma distopia sobre poder, liberdade e a resistência de continuar contando a própria história.',
    year: 1985,
    pageCount: 368,
    subjects: ['Distopia', 'Clássicos'],
    coverExternalUrl: 'https://covers.openlibrary.org/isbn/9788532520795-M.jpg'
  }
];

async function seed() {
  const usersByClerkId = new Map();

  for (const user of seedUsers) {
    const savedUser = await prisma.user.upsert({
      where: { clerkUserId: user.clerkUserId },
      create: user,
      update: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        city: user.city
      }
    });
    usersByClerkId.set(user.clerkUserId, savedUser);
  }

  for (const book of seedBooks) {
    const owner = usersByClerkId.get(book.owner);
    if (!owner) throw new Error('Dono não encontrado para o livro seed: ' + book.owner);

    const data = {
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      synopsis: book.synopsis,
      year: book.year,
      pageCount: book.pageCount,
      subjects: book.subjects,
      isbn: null,
      isbnStatus: 'NONE',
      isbnProvider: null,
      isbnValidatedAt: null,
      coverExternalUrl: book.coverExternalUrl,
      availability: 'AVAILABLE',
      ownerId: owner.id
    };

    await prisma.book.upsert({
      where: { id: book.id },
      create: { id: book.id, ...data },
      update: data
    });
  }

  const localUser = usersByClerkId.get('dev-mybooks-user');
  const ana = usersByClerkId.get('seed-ana-martins');
  const localBook = seedBooks.find((book) => book.owner === 'dev-mybooks-user');

  if (!localUser || !ana || !localBook) throw new Error('Dados base do match seed não encontrados.');

  await prisma.interaction.upsert({
    where: {
      actorId_targetBookId: {
        actorId: ana.id,
        targetBookId: localBook.id
      }
    },
    create: {
      id: '40000000-0000-4000-8000-000000000001',
      actorId: ana.id,
      targetBookId: localBook.id,
      action: 'LIKE',
      clientActionId: 'seed-reverse-like-ana-local'
    },
    update: {
      action: 'LIKE',
      clientActionId: 'seed-reverse-like-ana-local'
    }
  });

  console.info(JSON.stringify({
    message: 'Seed do MyBooks concluída.',
    users: seedUsers.length,
    books: seedBooks.length,
    preparedMatch: true
  }));
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
