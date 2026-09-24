import { prisma } from '../src/shared/database/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('A seed de demonstração não pode ser executada em produção.');
}

const seedPassword = 'TrocaLivros1!';
const seedVerifiedAt = new Date('2026-09-01T12:00:00.000Z');

const seedUsers = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    seedKey: 'dev-mybooks-user',
    name: 'Leitor de Teste',
    email: 'leitor.teste@local.mybooks',
    passwordHash: null,
    emailVerifiedAt: null,
    firstName: 'Leitor',
    lastName: 'de Teste',
    cpfHash: null,
    cpfEncrypted: null,
    phone: null,
    interests: ['Literatura brasileira', 'Clássicos'],
    profileCompletedAt: null,
    booksOnboardingCompletedAt: null,
    isActive: false,
    bio: 'Conta local para testar descoberta, likes, matches e conversas.',
    city: 'São Paulo, SP'
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    seedKey: 'seed-ana-martins',
    name: 'Ana Martins',
    email: 'ana.martins@seed.mybooks',
    passwordHash: null,
    emailVerifiedAt: null,
    firstName: 'Ana',
    lastName: 'Martins',
    cpfHash: null,
    cpfEncrypted: null,
    phone: null,
    interests: ['Literatura brasileira', 'Romance'],
    profileCompletedAt: null,
    booksOnboardingCompletedAt: null,
    isActive: false,
    bio: 'Gosto de histórias brasileiras, ficção contemporânea e boas conversas.',
    city: 'Belo Horizonte, MG'
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    seedKey: 'seed-caio-nogueira',
    name: 'Caio Nogueira',
    email: 'caio.nogueira@seed.mybooks',
    passwordHash: null,
    emailVerifiedAt: null,
    firstName: 'Caio',
    lastName: 'Nogueira',
    cpfHash: null,
    cpfEncrypted: null,
    phone: null,
    interests: ['Fantasia', 'Não ficção'],
    profileCompletedAt: null,
    booksOnboardingCompletedAt: null,
    isActive: false,
    bio: 'Troco livros de fantasia, não ficção e tudo que rende uma boa recomendação.',
    city: 'Curitiba, PR'
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    seedKey: 'seed-marina-alves',
    name: 'Marina Alves',
    email: 'marina.alves@seed.mybooks',
    passwordHash: null,
    emailVerifiedAt: null,
    firstName: 'Marina',
    lastName: 'Alves',
    cpfHash: null,
    cpfEncrypted: null,
    phone: null,
    interests: ['Romance', 'Clássicos'],
    profileCompletedAt: null,
    booksOnboardingCompletedAt: null,
    isActive: false,
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

const seedIsbns = {
  '30000000-0000-4000-8000-000000000001': '9788532508126',
  '30000000-0000-4000-8000-000000000002': '9788522031445',
  '30000000-0000-4000-8000-000000000003': '9786580309312',
  '30000000-0000-4000-8000-000000000004': '9788501112514',
  '30000000-0000-4000-8000-000000000005': '9788598349219',
  '30000000-0000-4000-8000-000000000006': '9788535933907',
  '30000000-0000-4000-8000-000000000007': '9786558380546',
  '30000000-0000-4000-8000-000000000008': '9788535920815',
  '30000000-0000-4000-8000-000000000009': '9788595084742',
  '30000000-0000-4000-8000-000000000010': '9788535932481',
  '30000000-0000-4000-8000-000000000011': '9788558890728',
  '30000000-0000-4000-8000-000000000012': '9788532520795'
};

const seedCoverFiles = {
  '30000000-0000-4000-8000-000000000001': 'a-hora-da-estrela.jpg',
  '30000000-0000-4000-8000-000000000002': 'o-pequeno-principe.jpg',
  '30000000-0000-4000-8000-000000000003': 'torto-arado.jpg',
  '30000000-0000-4000-8000-000000000004': 'tudo-e-rio.jpg',
  '30000000-0000-4000-8000-000000000005': 'pequeno-manual-antirracista.jpg',
  '30000000-0000-4000-8000-000000000006': 'o-avesso-da-pele.jpg',
  '30000000-0000-4000-8000-000000000007': 'a-biblioteca-da-meia-noite.jpg',
  '30000000-0000-4000-8000-000000000008': 'sapiens.jpg',
  '30000000-0000-4000-8000-000000000009': 'o-hobbit.jpg',
  '30000000-0000-4000-8000-000000000010': 'pessoas-normais.jpg',
  '30000000-0000-4000-8000-000000000011': 'antes-que-o-cafe-esfrie.jpg',
  '30000000-0000-4000-8000-000000000012': 'o-conto-da-aia.jpg'
};

const seedInteractions = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    actor: 'seed-ana-martins',
    targetBookId: '30000000-0000-4000-8000-000000000001',
    action: 'LIKE',
    clientActionId: 'seed-reverse-like-ana-local'
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    actor: 'dev-mybooks-user',
    targetBookId: '30000000-0000-4000-8000-000000000004',
    action: 'LIKE',
    clientActionId: 'seed-local-like-ana-book'
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    actor: 'seed-caio-nogueira',
    targetBookId: '30000000-0000-4000-8000-000000000002',
    action: 'LIKE',
    clientActionId: 'seed-reverse-like-caio-local'
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    actor: 'dev-mybooks-user',
    targetBookId: '30000000-0000-4000-8000-000000000007',
    action: 'LIKE',
    clientActionId: 'seed-local-like-caio-book'
  }
];

const seedChats = [
  {
    matchId: '50000000-0000-4000-8000-000000000001',
    conversationId: '60000000-0000-4000-8000-000000000001',
    userOne: 'dev-mybooks-user',
    userTwo: 'seed-ana-martins',
    messages: [
      {
        id: '70000000-0000-4000-8000-000000000001',
        sender: 'seed-ana-martins',
        clientMessageId: 'seed-chat-ana-001',
        body: 'Oi! Vi que você também curte literatura brasileira. A gente pode conversar sobre a troca?',
        createdAt: '2026-09-09T14:20:00.000Z'
      },
      {
        id: '70000000-0000-4000-8000-000000000002',
        sender: 'dev-mybooks-user',
        clientMessageId: 'seed-chat-local-001',
        body: 'Oi, Ana! Podemos sim. Tenho muito interesse em Tudo é Rio.',
        createdAt: '2026-09-09T14:24:00.000Z'
      },
      {
        id: '70000000-0000-4000-8000-000000000003',
        sender: 'seed-ana-martins',
        clientMessageId: 'seed-chat-ana-002',
        body: 'Perfeito! Podemos combinar um ponto de encontro no fim de semana.',
        createdAt: '2026-09-09T14:26:00.000Z'
      }
    ]
  },
  {
    matchId: '50000000-0000-4000-8000-000000000002',
    conversationId: '60000000-0000-4000-8000-000000000002',
    userOne: 'dev-mybooks-user',
    userTwo: 'seed-caio-nogueira',
    messages: [
      {
        id: '70000000-0000-4000-8000-000000000004',
        sender: 'dev-mybooks-user',
        clientMessageId: 'seed-chat-local-002',
        body: 'Caio, tudo bem? Seu exemplar de A Biblioteca da Meia-Noite parece ótimo.',
        createdAt: '2026-09-08T18:05:00.000Z'
      },
      {
        id: '70000000-0000-4000-8000-000000000005',
        sender: 'seed-caio-nogueira',
        clientMessageId: 'seed-chat-caio-001',
        body: 'Tudo bem! Eu adoraria trocar por um livro de literatura brasileira.',
        createdAt: '2026-09-08T18:08:00.000Z'
      },
      {
        id: '70000000-0000-4000-8000-000000000006',
        sender: 'dev-mybooks-user',
        clientMessageId: 'seed-chat-local-003',
        body: 'Tenho Torto Arado disponível. Parece uma boa troca?',
        createdAt: '2026-09-08T18:12:00.000Z'
      }
    ]
  }
];

async function seed() {
  const usersBySeedKey = new Map();
  const passwordHash = await hashPassword(seedPassword);

  for (const user of seedUsers) {
    const { seedKey, ...profile } = user;
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        ...profile,
        passwordHash,
        emailVerifiedAt: seedVerifiedAt,
        isActive: true
      },
      update: {
        clerkUserId: null,
        name: user.name,
        email: user.email,
        passwordHash,
        emailVerifiedAt: seedVerifiedAt,
        firstName: user.firstName,
        lastName: user.lastName,
        cpfHash: user.cpfHash,
        cpfEncrypted: user.cpfEncrypted,
        phone: user.phone,
        interests: user.interests,
        profileCompletedAt: user.profileCompletedAt,
        booksOnboardingCompletedAt: user.booksOnboardingCompletedAt,
        isActive: true,
        bio: user.bio,
        city: user.city
      }
    });
    usersBySeedKey.set(seedKey, savedUser);
  }

  for (const book of seedBooks) {
    const owner = usersBySeedKey.get(book.owner);
    if (!owner) throw new Error('Dono não encontrado para o livro seed: ' + book.owner);

    const data = {
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      synopsis: book.synopsis,
      year: book.year,
      pageCount: book.pageCount,
      subjects: book.subjects,
      isbn: seedIsbns[book.id] || null,
      isbnStatus: seedIsbns[book.id] ? 'VALID' : 'NONE',
      isbnProvider: seedIsbns[book.id] ? 'BRASIL_API' : null,
      isbnValidatedAt: seedIsbns[book.id] ? new Date('2026-09-09T12:00:00.000Z') : null,
      coverExternalUrl: seedCoverFiles[book.id]
        ? `${process.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'}/covers/${seedCoverFiles[book.id]}`
        : book.coverExternalUrl,
      availability: 'AVAILABLE',
      ownerId: owner.id
    };

    await prisma.book.upsert({
      where: { id: book.id },
      create: { id: book.id, ...data },
      update: data
    });
  }

  const localUser = usersBySeedKey.get('dev-mybooks-user');
  const localBook = seedBooks.find((book) => book.owner === 'dev-mybooks-user');

  if (!localUser || !localBook) throw new Error('Dados base do seed não encontrados.');

  for (const interaction of seedInteractions) {
    const actor = usersBySeedKey.get(interaction.actor);
    if (!actor) throw new Error('Ator não encontrado para a interação seed: ' + interaction.actor);

    await prisma.interaction.upsert({
      where: {
        actorId_targetBookId: {
          actorId: actor.id,
          targetBookId: interaction.targetBookId
        }
      },
      create: {
        id: interaction.id,
        actorId: actor.id,
        targetBookId: interaction.targetBookId,
        action: interaction.action,
        clientActionId: interaction.clientActionId
      },
      update: {
        action: interaction.action,
        clientActionId: interaction.clientActionId
      }
    });
  }

  for (const chat of seedChats) {
    const firstUser = usersBySeedKey.get(chat.userOne);
    const secondUser = usersBySeedKey.get(chat.userTwo);
    if (!firstUser || !secondUser) throw new Error('Usuário não encontrado para o chat seed.');

    const [userAId, userBId] = [firstUser.id, secondUser.id].sort();
    const match = await prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: {
        id: chat.matchId,
        userAId,
        userBId,
        status: 'ACTIVE'
      },
      update: { status: 'ACTIVE' }
    });

    const conversation = await prisma.conversation.upsert({
      where: { matchId: match.id },
      create: { id: chat.conversationId, matchId: match.id },
      update: { updatedAt: new Date() }
    });

    for (const userId of [userAId, userBId]) {
      await prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {}
      });
    }

    for (const message of chat.messages) {
      const sender = usersBySeedKey.get(message.sender);
      if (!sender) throw new Error('Remetente não encontrado para a mensagem seed.');

      await prisma.message.upsert({
        where: {
          senderId_clientMessageId: {
            senderId: sender.id,
            clientMessageId: message.clientMessageId
          }
        },
        create: {
          id: message.id,
          conversationId: conversation.id,
          senderId: sender.id,
          clientMessageId: message.clientMessageId,
          body: message.body,
          createdAt: new Date(message.createdAt)
        },
        update: {
          conversationId: conversation.id,
          body: message.body
        }
      });
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });
  }

  console.info(JSON.stringify({
    message: 'Seed do TrocaLivros concluída.',
    users: seedUsers.length,
    books: seedBooks.length,
    isbnBooks: Object.keys(seedIsbns).length,
    matches: seedChats.length,
    conversations: seedChats.length,
    messages: seedChats.reduce((total, chat) => total + chat.messages.length, 0)
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
