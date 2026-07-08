FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# Instala TODAS dependências (incluindo dev)
RUN npm install

RUN npx prisma generate

# Prisma 7 (Linux runners) gera imports relativos com extensão explícita
# (ex.: from "./internal/class.ts"), que o tsc preserva no CJS e faz o
# Node falhar em runtime com MODULE_NOT_FOUND. Normaliza removendo o .ts.
RUN node scripts/fix-prisma-ts-imports.mjs src/generated/prisma

# Copia resto do projeto
COPY . .

# Compila TypeScript
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Copia apenas dependências de produção
COPY package*.json ./

RUN npm install --omit=dev

# Copia build já compilado
COPY --from=builder /app/dist ./dist

# Copia Prisma client gerado, schema, config e migrations (necessários em runtime)
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Roda como usuário não-root (node UID 1000 já existe na imagem oficial)
RUN chown -R node:node /app
USER node

# Expõe porta
EXPOSE 3000

# Aplica migrations e sobe aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
