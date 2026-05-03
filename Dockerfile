FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# Instala TODAS dependências (incluindo dev)
RUN npm install

RUN npx prisma generate

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

# Expõe porta
EXPOSE 3000

# Aplica migrations e sobe aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
