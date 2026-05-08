import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'ROOT',
  password: 'root',
  database: 'mybooks'
});

client.connect();

export default async function query(query, values) {
  const { rows } = await client.query(query, values)
  return rows
}

