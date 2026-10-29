import { readFile } from 'node:fs/promises';

function splitStatements(sql) {
  const statements = [];
  let start = 0;
  let quote = null;
  let dollarTag = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index++; }
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) { index += dollarTag.length - 1; dollarTag = null; }
      continue;
    }
    if (quote) {
      if (char === quote) {
        if (next === quote) index++;
        else quote = null;
      }
      continue;
    }
    if (char === '-' && next === '-') { lineComment = true; index++; continue; }
    if (char === '/' && next === '*') { blockComment = true; index++; continue; }
    if (char === '\'' || char === '"') { quote = char; continue; }
    if (char === '$') {
      const tag = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z_0-9]*\$|^\$\$/)?.[0];
      if (tag) { dollarTag = tag; index += tag.length - 1; continue; }
    }
    if (char === ';') {
      const statement = sql.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }
  if (quote || dollarTag || blockComment) throw new Error('Migration contains an unfinished SQL literal or comment.');
  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

export async function applyMigration(db, migrationsRoot, name, expectedSchema) {
  const sql = await readFile(new URL(`${name}/migration.sql`, migrationsRoot), 'utf8');
  // One historical migration names public explicitly; bind it to this test's isolated schema.
  const statements = splitStatements(sql.replaceAll('"public".', ''));
  await db.$transaction(async (tx) => {
    const [context] = await tx.$queryRaw`SELECT current_schema() AS "schema"`;
    if (context?.schema !== expectedSchema) throw new Error('Migration transaction escaped its isolated test schema.');
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
  }, { timeout: 60000 });
}
