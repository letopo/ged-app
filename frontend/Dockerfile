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
# --ignore-scripts évite ETXTBSY sur esbuild, puis on rebuild esbuild seul
RUN npm install --no-audit --no-fund --ignore-scripts && \
    node node_modules/esbuild/install.js 2>/dev/null || \
    npm install --no-audit --no-fund

COPY . .

# Variable d'environnement pour le build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 3: Production avec Nginx
FROM nginx:alpine AS production

# Copier la configuration Nginx
COPY /nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés depuis dist
COPY --from=builder /app/dist /usr/share/nginx/html

# ✅ Copier explicitement le Service Worker et le Manifest
COPY --from=builder /app/public/sw.js /usr/share/nginx/html/sw.js
COPY --from=builder /app/public/manifest.json /usr/share/nginx/html/manifest.json

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