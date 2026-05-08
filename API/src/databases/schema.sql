CREATE DATABASE mybooks;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID NOt NULL UNIQUE DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  phone VARCHAR
);

CREATE TABLE IF NOT EXISTS books (
  id UUID NOt NULL UNIQUE DEFAULT uuid_generate_v4(),
  title VARCHAR,
  user_id UUID,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
