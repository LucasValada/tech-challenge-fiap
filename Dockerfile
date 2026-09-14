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

# Copia resto do projeto (.env e .env.* ficam de fora pelo .dockerignore)
COPY . .

# Compila TypeScript
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Copia apenas dependências de produção (inclui o agente `newrelic`)
COPY package*.json ./

RUN npm install --omit=dev

# Copia build já compilado
COPY --from=builder /app/dist ./dist

# Copia Prisma client gerado, schema, config e migrations (necessários em runtime)
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# ─── New Relic: só configuração NÃO sensível ─────────────────────────────────
# Nenhuma credencial entra na imagem — nem como ENV, nem como ARG (ARG fica no
# histórico da imagem). NEW_RELIC_LICENSE_KEY chega apenas em runtime: Secret
# `app-secret` no Kubernetes, `.env` no docker compose.
#
# Defaults seguros: o agente nasce DESLIGADO e só liga quando o ambiente pede
# (ConfigMap no cluster). Uma imagem rodando sem configuração não tenta falar
# com o New Relic nem gasta cota.
ENV NEW_RELIC_ENABLED=false \
    NEW_RELIC_NO_CONFIG_FILE=true \
    NEW_RELIC_LOG=stdout \
    NEW_RELIC_LOG_LEVEL=warn \
    NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED=false \
    NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED=false

# Roda como usuário não-root (node UID 1000 já existe na imagem oficial)
RUN chown -R node:node /app
USER node

# Expõe porta
EXPOSE 3000

# `node` direto, em forma exec, por três motivos:
#   1. stdout 100% JSON: `npm run` e `prisma migrate` imprimiam texto puro antes
#      da primeira linha da aplicação — linhas que o New Relic não indexa e que
#      contam na cota do free tier.
#   2. O Node vira PID 1 e recebe o SIGTERM do Kubernetes. Com `sh -c` o sinal
#      morria no shell, o pod esperava o grace period inteiro e levava junto o
#      buffer do agente (ver TelemetriaShutdown).
#   3. `-r newrelic` carrega o agente antes de qualquer módulo da aplicação —
#      é o que permite instrumentar Express e Prisma.
#
# As migrations saíram do CMD: no cluster rodam no Job `db-migration` (antes do
# Deployment), no docker compose no serviço `migrate`. Rodá-las em todo pod
# também fazia réplicas concorrerem pela mesma migration a cada scale-out.
CMD ["node", "-r", "newrelic", "dist/src/main.js"]
