-- Seed: cria usuário admin padrão para acesso às rotas administrativas.
-- Usa pgcrypto para gerar o hash em runtime, evitando hash hardcoded no código.
-- ON CONFLICT garante idempotência — se o admin já existir, não faz nada.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin',
  'admin@oficina.com',
  crypt('senha123', gen_salt('bf', 10)),
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;
