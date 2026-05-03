-- Seed: cria usuário admin padrão para acesso às rotas administrativas.
-- Usa ON CONFLICT para ser idempotente — se o admin já existir, não faz nada.
INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin',
  'admin@oficina.com',
  '$2b$10$T7QEYTTlOg.blEYhFBh6ou.5fa5zygKpBaqUHGTs4hAWK8Vhd8S2G', -- senha123
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;
