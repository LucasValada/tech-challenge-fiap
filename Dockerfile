FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./

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
COPY --from=builder /app/dist/* ./dist/

# Expõe porta
EXPOSE 3000

# Sobe aplicação
CMD ["npm", "run", "start:prod"]