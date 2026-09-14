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

# Copia resto do projeto (.env e .env.* ficam de fora pelo .dockerignore)
COPY . .

# Compila TypeScript
RUN npm run build

FROM node:24-alpine

WORKDIR /app

# Copia apenas dependências de produção (inclui o agente `newrelic`)
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
# As migrations NÃO rodam aqui: no EKS ficam a cargo do Job `db-migration`
# (executado e aguardado pelo CD antes do rollout) e, no local, do serviço
# one-shot `migrate` do docker-compose. Rodá-las em todo pod também fazia
# réplicas concorrerem pela mesma migration a cada scale-out.
CMD ["node", "-r", "newrelic", "dist/src/main.js"]
