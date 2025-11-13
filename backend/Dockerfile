# Stage 1: Base avec dépendances système
FROM node:20-alpine AS base

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-eng \
    postgresql-client \
    bash

WORKDIR /app

# Stage 2: Development
FROM base AS development

# Copier les fichiers de dépendances
COPY package*.json ./

# Installation de toutes les dépendances (y compris dev)
RUN npm ci

# Copier le reste du code
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p uploads signatures database/migrations database/seeders

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Stage 3: Build
FROM base AS builder

COPY package*.json ./
RUN npm ci --omit=dev

# Copier tout le code source
COPY . .

# Stage 4: Production
FROM base AS production

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les dépendances de production
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier tous les fichiers nécessaires
COPY --from=builder --chown=nodejs:nodejs /app/ ./

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p uploads signatures fonts database/migrations database/seeders && \
    chown -R nodejs:nodejs /app

# Copier le script d'entrée
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown nodejs:nodejs /usr/local/bin/docker-entrypoint.sh

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]