# PrimeCell — imagem de produção (API + frontend estático)
FROM node:22-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia manifests primeiro (melhor uso de cache)
COPY client/package.json client/package-lock.json* ./client/
COPY server/package.json server/package-lock.json* ./server/

RUN cd client && npm ci
RUN cd server && npm ci

# Copia o restante do código
COPY client ./client
COPY server ./server

# Build do frontend e backend
RUN cd client && npm run build
RUN cd server && npm run build

# --- Imagem final ---
FROM node:22-bookworm-slim

# Instala build tools, dependências de produção e remove build tools depois
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev \
  && npm cache clean --force

# Remove build tools após compilar dependências nativas (reduz tamanho da imagem)
RUN apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

# Artefatos do build
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY server/.env.example ./server/.env.example
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p ./server/data ./server/uploads

ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_DIST_PATH=/app/client/dist

EXPOSE 3001

VOLUME ["/app/server/data", "/app/server/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1);process.exit(0)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]