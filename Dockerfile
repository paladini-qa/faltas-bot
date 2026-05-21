# =============================================================================
# Stage 1 — builder: instala dependências do client e gera o build estático
# =============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /build/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
ARG VITE_API_KEY
ENV VITE_API_KEY=$VITE_API_KEY
RUN npm run build


# =============================================================================
# Stage 2 — runtime: servidor Node.js + Chromium para o whatsapp-web.js
# =============================================================================
FROM node:20-bookworm-slim AS runtime

# Dependências do Chromium necessárias para o puppeteer funcionar em Linux sem display
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

# Usuário não-root para segurança (Chromium recusa executar como root sem --no-sandbox,
# mas o whatsapp.js já passa --no-sandbox e --disable-setuid-sandbox)
# Rodamos como node (uid 1000), que já existe na imagem base
WORKDIR /app

# Instala dependências de produção da raiz (whatsapp-web.js, pg, pdf-parse, etc.)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copia código-fonte do servidor e módulos compartilhados
COPY server/ ./server/
COPY src/    ./src/
COPY index.js ./

# Copia o build estático do React gerado no stage anterior
COPY --from=builder /build/client/dist ./client/dist

# Garante que as pastas de dados existam com permissões corretas
RUN mkdir -p data/uploads .wwebjs_auth .wwebjs_cache \
 && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "server/index.js"]
