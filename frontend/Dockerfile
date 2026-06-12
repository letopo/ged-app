# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install dependencies
# Fallback avec --ignore-scripts + rebuild si erreur ETXTBSY (esbuild sur certains systèmes)
RUN npm install --no-audit --no-fund || \
    ( npm install --no-audit --no-fund --ignore-scripts && \
      npm rebuild esbuild 2>/dev/null; \
      npm rebuild rollup 2>/dev/null; \
      npm rebuild @rollup/rollup-linux-x64-musl 2>/dev/null; \
      true )

COPY . .

# Variable d'environnement pour le build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 3: Production avec Nginx
FROM nginx:alpine AS production

# Copier la configuration Nginx
COPY /nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés depuis dist (inclut déjà sw.js et manifest.json via
# copyPublicDir ; sw.js y est versionné par le plugin Vite — ne pas le réécraser
# avec la version source qui contient le placeholder __SW_VERSION__).
COPY --from=builder /app/dist /usr/share/nginx/html

# Créer un utilisateur non-root et définir les permissions
RUN apk add --no-cache curl && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html && \
    chmod 644 /usr/share/nginx/html/sw.js && \
    chmod 644 /usr/share/nginx/html/manifest.json

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost/ -o /dev/null -w '%{http_code}' | grep -q '200' || exit 1

CMD ["nginx", "-g", "daemon off;"]