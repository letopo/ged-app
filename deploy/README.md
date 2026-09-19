# Déploiement GED — images de base (réseau bloquant le Docker Hub)

Le réseau de production bloque le Docker Hub (`registry-1.docker.io`). Un
`docker compose build` échoue donc dès qu'il doit télécharger une image de base
(`node`, `nginx`, `postgres`, `onlyoffice`). Solution : charger ces images de
base **une seule fois** ; ensuite tous les builds se font sans contacter le Hub.

## Étapes

### 1. Sur une machine avec accès au Docker Hub (partage 4G, box maison…)
```bash
./prepare-base-images.sh           # produit base-images.tar.gz (linux/amd64)
```
> Depuis un Mac Apple Silicon pour un serveur Windows : la plateforme amd64 est
> déjà forcée par défaut.

### 2. Transférer `base-images.tar.gz` sur le serveur de production
Clé USB ou partage réseau.

### 3. Sur le serveur Windows (Docker installé)
```powershell
powershell -ExecutionPolicy Bypass -File load-base-images.ps1
```

### 4. Construire et démarrer (sur le serveur)
```powershell
docker compose build
docker compose up -d postgres backend frontend onlyoffice
docker compose exec backend npx sequelize-cli db:migrate   # si nouveau schéma
```

## À refaire quand ?
Uniquement si une **version d'image de base change** (ex. `node:20-alpine` →
`node:22-alpine`, ou nouvelle version d'OnlyOffice). Au quotidien, le code
applicatif se reconstruit sans rejouer cette étape.

## Important
- `docker compose up -d` ne touche pas aux volumes (données préservées).
  **Ne jamais** faire `docker compose down -v` (le `-v` détruit les données).
- Épingler OnlyOffice sur une version fixe (ex. `:8.2.0`) plutôt que `:latest`
  pour que dev et prod restent identiques.
- Le `.env` de production doit contenir `ANTHROPIC_API_KEY`, `JWT_SECRET`, le
  mot de passe de base et les URLs internes.

## Alternative durable (à étudier avec la DSI)
- **Miroir Docker Hub** autorisé (`daemon.json` → `registry-mirrors`).
- **Registre privé interne** (Harbor / Nexus / `registry:2` sur le LAN) : on y
  pousse les images une fois, le serveur tire depuis le réseau interne.
