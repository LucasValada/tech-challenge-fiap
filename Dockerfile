FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# Instala TODAS dependências (incluindo dev) — npm ci para build determinístico.
# --ignore-scripts bloqueia lifecycle scripts de dependências (hardening de
# supply chain). O prisma generate é rodado explicitamente logo abaixo.
RUN npm ci --ignore-scripts

RUN npx prisma generate

# Prisma 7 (Linux runners) gera imports relativos com extensão explícita
# (ex.: from "./internal/class.ts"), que o tsc preserva no CJS e faz o
# Node falhar em runtime com MODULE_NOT_FOUND. Normaliza removendo o .ts.
RUN node scripts/fix-prisma-ts-imports.mjs src/generated/prisma

# Copia resto do projeto
COPY . .

# Compila TypeScript
RUN npm run build

FROM node:24-alpine

WORKDIR /app

# Copia apenas dependências de produção
COPY package*.json ./

# --ignore-scripts (hardening) e, em seguida, rebuild só do bcrypt — o único
# módulo nativo de runtime — para garantir o binário sem executar scripts de
# instalação de terceiros.
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcrypt

# Copia build já compilado
COPY --from=builder /app/dist ./dist

# Copia Prisma client gerado, schema, config e migrations (necessários em runtime)
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Bundle da CA do RDS — usado pelo PrismaService para validar o certificado TLS
COPY certs ./certs

# Roda como usuário não-root (node UID 1000 já existe na imagem oficial)
RUN chown -R node:node /app
USER node

# Expõe porta
EXPOSE 3000

# Sobe a aplicação. As migrations NÃO rodam aqui: no EKS ficam a cargo do Job
# de migration (executado e aguardado pelo CD antes do rollout); no local, o
# docker-compose sobrescreve o command para migrar antes de iniciar.
CMD ["npm", "run", "start:prod"]
