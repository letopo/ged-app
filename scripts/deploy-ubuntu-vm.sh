#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  deploy-ubuntu-vm.sh — Déploiement de la GED sur la VM Ubuntu
#  (192.168.1.186), lancé depuis le poste de développement.
#
#  Principe : les images Docker sont construites ICI à partir d'un
#  commit Git (copie propre, sans fichiers locaux), puis envoyées sur
#  la VM par le réseau local — la connexion Internet de la VM est trop
#  lente pour y construire (npm/apk échouent ou se figent).
#
#  Étapes, dans cet ordre, arrêt à la première erreur :
#    1. contrôles (VM joignable, commit, ce qui change) + confirmation
#    2. sauvegarde de la base sur la VM (vérifiée)
#    3. construction des images (+ clé publique de licence)
#    4. contrôle du contenu des images
#    5. envoi sur la VM
#    6. mise à jour du code sur la VM (git, même commit)
#    7. bascule : anciennes images gardées sous « avant-<commit> »
#    8. redémarrage, attente, contrôle des journaux (migrations, licence)
#    9. vérifications HTTPS (API, bonne version de l'interface)
#  En cas d'échec après la bascule : les commandes de retour arrière
#  sont affichées (et --rollback les exécute).
#
#  Usage :
#    VM_PASS=… ./scripts/deploy-ubuntu-vm.sh               (déploie origin/main)
#    VM_PASS=… ./scripts/deploy-ubuntu-vm.sh <commit|branche>
#    ./scripts/deploy-ubuntu-vm.sh --build-only [<commit>]  (construit et contrôle, sans toucher à la VM)
#    VM_PASS=… ./scripts/deploy-ubuntu-vm.sh --rollback <tag>  (remet les images « <tag> », ex. avant-66bc0e7)
#  Options : --yes (pas de confirmation)
#
#  Accès à la VM : clé SSH (recommandé) ou mot de passe dans VM_PASS
#  (nécessite sshpass). Jamais de mot de passe écrit dans ce fichier.
#  Variables : VM_HOST (ged@192.168.1.186), VM_DIR (ged-app), VM_URL
#  (https://ged.hsjmcam.net).
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."   # racine du projet

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()    { echo -e "${GREEN}✅ $*${NC}"; }
info()  { echo -e "${BLUE}ℹ️  $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $*${NC}"; }
step()  { echo -e "\n${BOLD}── $* ──${NC}"; }
fail()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

VM_HOST="${VM_HOST:-ged@192.168.1.186}"
VM_DIR="${VM_DIR:-ged-app}"
VM_URL="${VM_URL:-https://ged.hsjmcam.net}"
COMPOSE="docker compose -f docker-compose.prod.yml"

MODE=deploy; TARGET=""; ASSUME_YES=false
while [ $# -gt 0 ]; do
  case "$1" in
    --build-only) MODE=build ;;
    --rollback)   MODE=rollback; TARGET="${2:-}"; [ $# -ge 2 ] && shift ;;
    --yes|-y)     ASSUME_YES=true ;;
    -h|--help)    sed -n '2,33p' "$0"; exit 0 ;;
    -*)           fail "Option inconnue : $1" ;;
    *)            TARGET="$1" ;;
  esac
  shift
done

# ── Accès SSH ────────────────────────────────────────────────────────────────
SSH_OPTS=(-o ConnectTimeout=8 -o ServerAliveInterval=15)
if [ -n "${VM_PASS:-}" ]; then
  command -v sshpass >/dev/null || fail "VM_PASS est défini mais sshpass n'est pas installé."
  export SSHPASS="$VM_PASS"
  SSH=(sshpass -e ssh "${SSH_OPTS[@]}" "$VM_HOST")
else
  SSH=(ssh "${SSH_OPTS[@]}" -o BatchMode=yes "$VM_HOST")
fi
# Les commandes à distance ne lisent pas l'entrée standard (sinon elles « avalent »
# la réponse aux confirmations) ; vm_pipe sert à l'envoi des images.
vm()      { "${SSH[@]}" "$@" < /dev/null; }
vm_pipe() { "${SSH[@]}" "$@"; }

confirm() {
  $ASSUME_YES && return 0
  read -r -p "$1 [o/N] " answer || answer=""
  [[ "$answer" =~ ^[oOyY]$ ]] || fail "Abandon, rien n'a été modifié sur la VM."
}

# ── Retour arrière ───────────────────────────────────────────────────────────
rollback_help() {
  echo -e "\n${BOLD}Pour revenir à la version précédente :${NC}"
  echo "  VM_PASS=… ./scripts/deploy-ubuntu-vm.sh --rollback ${1}"
  [ -n "${2:-}" ] && echo "  Base de données (si les migrations posent problème) : restaurer ~/deploy-backups/${2}"
  echo "    (voir scripts/RESTAURATION.md, section « Annuler une restauration » pour la commande psql)"
}

if [ "$MODE" = rollback ]; then
  [ -n "$TARGET" ] || fail "Précisez l'étiquette, ex. : --rollback avant-66bc0e7"
  step "Retour arrière vers les images « $TARGET »"
  vm true 2>/dev/null || fail "VM injoignable ($VM_HOST). Réseau de l'hôpital ? Accès SSH (clé ou VM_PASS) ?"
  vm "docker image inspect ged-app-backend:$TARGET ged-app-frontend:$TARGET >/dev/null" \
    || fail "Images ged-app-*:$TARGET introuvables sur la VM (docker images | grep ged-app)."
  confirm "Remettre en service les images « $TARGET » ?"
  vm "cd $VM_DIR && docker tag ged-app-backend:$TARGET ged-app-backend:latest && docker tag ged-app-frontend:$TARGET ged-app-frontend:latest && $COMPOSE up -d --no-build --force-recreate backend frontend" \
    || fail "Échec du redémarrage."
  ok "Images « $TARGET » remises en service. Le code Git de la VM n'a pas été modifié : faites-le correspondre si besoin (git checkout)."
  exit 0
fi

# ── 1. Contrôles ─────────────────────────────────────────────────────────────
step "1. Contrôles"
git fetch -q origin || fail "git fetch impossible (Internet ?)."
TARGET="${TARGET:-origin/main}"
SHA=$(git rev-parse --verify -q "${TARGET}^{commit}") || fail "Commit ou branche inconnu : $TARGET"
SHORT=$(git rev-parse --short "$SHA")
info "Version à déployer : ${BOLD}$SHORT${NC} — $(git log -1 --format=%s "$SHA")"
ON_MAIN=false; git merge-base --is-ancestor "$SHA" origin/main && [ "$(git rev-parse origin/main)" = "$SHA" ] && ON_MAIN=true
$ON_MAIN || warn "Ce commit n'est pas le dernier de main : la VM sera placée dessus en « detached HEAD »."

BUILD_DIR=$(mktemp -d -t ged-deploy)
trap 'rm -rf "$BUILD_DIR"' EXIT
git archive "$SHA" | tar x -C "$BUILD_DIR"

if [ "$MODE" = deploy ]; then
  vm true 2>/dev/null || fail "VM injoignable ($VM_HOST). Réseau de l'hôpital ? Accès SSH (clé ou VM_PASS) ?"
  VM_SHA=$(vm "cd $VM_DIR && git rev-parse HEAD") || fail "Dépôt Git introuvable sur la VM ($VM_DIR)."
  info "Version actuelle sur la VM : $(git rev-parse --short "$VM_SHA" 2>/dev/null || echo "$VM_SHA")"
  if [ "$VM_SHA" = "$SHA" ]; then warn "La VM est déjà sur ce commit (les images seront tout de même reconstruites)."; fi
  if git cat-file -e "$VM_SHA^{commit}" 2>/dev/null; then
    echo "   Changements : $(git rev-list --count "$VM_SHA..$SHA") commit(s)"
    NEW_MIGRATIONS=$(git diff --name-only --diff-filter=A "$VM_SHA" "$SHA" -- backend/database/migrations | xargs -n1 basename 2>/dev/null || true)
    if [ -n "$NEW_MIGRATIONS" ]; then
      echo "   Migrations de base de données qui seront appliquées :"; echo "$NEW_MIGRATIONS" | sed 's/^/     • /'
    else
      echo "   Aucune migration de base de données."
    fi
    git diff --quiet "$VM_SHA" "$SHA" -- frontend/nginx.conf || info "nginx.conf change (le frontend est reconstruit de toute façon)."
  else
    warn "Le commit actuel de la VM est inconnu en local : impossible de lister les changements."
  fi
  vm "cd $VM_DIR && git status --porcelain --untracked-files=no | grep -q ." \
    && warn "La VM a des fichiers suivis modifiés localement (git status) : ils seront écrasés par le checkout."
  vm "test -f $VM_DIR/backend/public_key.pem" || fail "backend/public_key.pem absent sur la VM (clé de licence)."
  vm "test -f $VM_DIR/.env" || fail ".env absent sur la VM."
  confirm "Déployer $SHORT sur la VM ($VM_HOST) ?"
fi

# ── 2. Sauvegarde ────────────────────────────────────────────────────────────
BACKUP_NAME=""
if [ "$MODE" = deploy ]; then
  step "2. Sauvegarde de la base sur la VM"
  BACKUP_NAME="ged_db-avant-deploiement-$SHORT-$(date +%Y%m%d-%H%M).sql.gz"
  vm "set -o pipefail; mkdir -p ~/deploy-backups && docker exec ged-postgres sh -c 'pg_dump -U \$POSTGRES_USER -d \$POSTGRES_DB' | gzip > ~/deploy-backups/$BACKUP_NAME \
      && zcat ~/deploy-backups/$BACKUP_NAME | tail -3 | grep -q 'dump complete'" \
    || fail "Sauvegarde de la base échouée : déploiement annulé (rien n'a été modifié)."
  ok "Base sauvegardée : ~/deploy-backups/$BACKUP_NAME ($(vm "du -h ~/deploy-backups/$BACKUP_NAME | cut -f1"))"
fi

# ── 3. Construction ──────────────────────────────────────────────────────────
step "3. Construction des images ($SHORT)"
if [ "$MODE" = deploy ]; then
  if [ -n "${VM_PASS:-}" ]; then
    sshpass -e scp -q "${SSH_OPTS[@]}" "$VM_HOST:$VM_DIR/backend/public_key.pem" "$BUILD_DIR/backend/public_key.pem"
  else
    scp -q "${SSH_OPTS[@]}" -o BatchMode=yes "$VM_HOST:$VM_DIR/backend/public_key.pem" "$BUILD_DIR/backend/public_key.pem"
  fi
elif [ -f backend/public_key.pem ]; then
  cp backend/public_key.pem "$BUILD_DIR/backend/public_key.pem"
else
  warn "Pas de backend/public_key.pem local : l'image de contrôle n'aura pas de clé de licence."
fi
( docker build -q --target production -t "ged-app-backend:$SHORT" "$BUILD_DIR/backend" > "$BUILD_DIR/backend.log" 2>&1 ) &
PID_B=$!
( docker build -q --build-arg VITE_API_URL=/api -t "ged-app-frontend:$SHORT" "$BUILD_DIR/frontend" > "$BUILD_DIR/frontend.log" 2>&1 ) &
PID_F=$!
wait $PID_B || { tail -20 "$BUILD_DIR/backend.log"; fail "Construction du backend échouée."; }
wait $PID_F || { tail -20 "$BUILD_DIR/frontend.log"; fail "Construction du frontend échouée."; }
ok "Images construites : ged-app-backend:$SHORT, ged-app-frontend:$SHORT"

# ── 4. Contrôle des images ───────────────────────────────────────────────────
step "4. Contrôle du contenu des images"
docker run --rm --entrypoint sh "ged-app-backend:$SHORT" -c 'test -f src/server.js && test -d database/migrations && node --check src/server.js' \
  || fail "Image backend incomplète."
if [ "$MODE" = deploy ] || [ -f backend/public_key.pem ]; then
  docker run --rm --entrypoint sh "ged-app-backend:$SHORT" -c 'test -s public_key.pem' || fail "Clé de licence absente de l'image backend."
fi
FRONT_BUNDLE=$(docker run --rm --entrypoint sh "ged-app-frontend:$SHORT" -c "nginx -t >/dev/null 2>&1 || true; grep -o 'main-[A-Za-z0-9_-]*\.js' /usr/share/nginx/html/index.html | head -1")
[ -n "$FRONT_BUNDLE" ] || fail "Image frontend incomplète (index.html sans script principal)."
docker run --rm --entrypoint sh "ged-app-frontend:$SHORT" -c "test -f /usr/share/nginx/html/assets/$FRONT_BUNDLE && test -f /etc/nginx/nginx.conf" \
  || fail "Image frontend incomplète (script principal ou nginx.conf absent)."
ok "Images complètes (interface : $FRONT_BUNDLE)"

if [ "$MODE" = build ]; then
  ok "Mode --build-only : rien n'a été envoyé sur la VM."
  exit 0
fi

# ── 5. Envoi ─────────────────────────────────────────────────────────────────
step "5. Envoi des images sur la VM"
docker save "ged-app-backend:$SHORT" "ged-app-frontend:$SHORT" | gzip -1 | vm_pipe "gunzip | docker load" >/dev/null \
  || fail "Envoi des images échoué (rien n'a été modifié sur la VM)."
ok "Images chargées sur la VM"

# ── 6. Code Git sur la VM ────────────────────────────────────────────────────
step "6. Mise à jour du code sur la VM"
if $ON_MAIN; then
  vm "cd $VM_DIR && git fetch -q origin && git checkout -q -f main && git merge -q --ff-only origin/main" \
    || fail "git sur la VM : impossible de passer sur main (voir git status sur la VM). Les images n'ont pas encore été basculées."
else
  vm "cd $VM_DIR && git fetch -q origin && git checkout -q -f --detach $SHA" \
    || fail "git sur la VM : checkout de $SHORT impossible. Les images n'ont pas encore été basculées."
fi
[ "$(vm "cd $VM_DIR && git rev-parse HEAD")" = "$SHA" ] || fail "Le code de la VM n'est pas sur $SHORT."
vm "cd $VM_DIR && test -x scripts/backup-nightly.sh" || fail "scripts/backup-nightly.sh n'est pas exécutable sur la VM (sauvegarde nocturne)."
ok "Code de la VM sur $SHORT"

# ── 7. Bascule ───────────────────────────────────────────────────────────────
step "7. Bascule des images"
PREV_TAG="avant-$SHORT"
vm "docker tag ged-app-backend:latest ged-app-backend:$PREV_TAG && docker tag ged-app-frontend:latest ged-app-frontend:$PREV_TAG \
    && docker tag ged-app-backend:$SHORT ged-app-backend:latest && docker tag ged-app-frontend:$SHORT ged-app-frontend:latest" \
  || fail "Étiquetage des images échoué."
ok "Anciennes images gardées sous « $PREV_TAG »"

# ── 8. Redémarrage ───────────────────────────────────────────────────────────
step "8. Redémarrage et contrôle des journaux"
STARTED=$(vm "date -u +%Y-%m-%dT%H:%M:%SZ")   # horloge de la VM (celle des journaux)
vm "cd $VM_DIR && $COMPOSE up -d --no-build --force-recreate backend frontend" >/dev/null \
  || { rollback_help "$PREV_TAG" "$BACKUP_NAME"; fail "Redémarrage échoué."; }
HEALTH=""
for _ in $(seq 1 45); do
  HEALTH=$(vm "docker inspect -f '{{.State.Health.Status}}' ged-backend 2>/dev/null; docker inspect -f '{{.State.Health.Status}}' ged-frontend 2>/dev/null" | tr '\n' ' ')
  [ "$HEALTH" = "healthy healthy " ] && break
  sleep 4
done
LOGS=$(vm "docker logs --since $STARTED ged-backend 2>&1")
echo "$LOGS" | grep -E "== .*: migrated" | sed 's/^/   /' || true
if echo "$LOGS" | grep -qE "Erreur lors de l'exécution des migrations|ERREUR CRITIQUE|SequelizeDatabaseError|Unhandled|is not defined"; then
  echo "$LOGS" | grep -E "❌|ERREUR|Error" | head -10 | sed 's/^/   /'
  rollback_help "$PREV_TAG" "$BACKUP_NAME"
  fail "Erreurs au démarrage du serveur (ci-dessus)."
fi
[ "$HEALTH" = "healthy healthy " ] || { rollback_help "$PREV_TAG" "$BACKUP_NAME"; fail "Conteneurs pas en bonne santé après 3 min : $HEALTH"; }
echo "$LOGS" | grep -q "Clé publique chargée" || warn "Le journal ne confirme pas le chargement de la clé de licence."
ok "Serveur et interface démarrés"

# ── 9. Vérifications HTTPS ───────────────────────────────────────────────────
step "9. Vérifications ($VM_URL)"
# Depuis ce poste, comme un utilisateur (-k : l'autorité interne n'est pas forcément approuvée ici)
API_CODE=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$VM_URL/api/health" || true)
SERVED=$(curl -sk --max-time 10 "$VM_URL/" | grep -o 'main-[A-Za-z0-9_-]*\.js' | head -1 || true)
[ "$API_CODE" = "200" ] || { rollback_help "$PREV_TAG" "$BACKUP_NAME"; fail "API : réponse $API_CODE au lieu de 200."; }
[ "$SERVED" = "$FRONT_BUNDLE" ] || { rollback_help "$PREV_TAG" "$BACKUP_NAME"; fail "L'interface servie ($SERVED) n'est pas la nouvelle ($FRONT_BUNDLE)."; }
ok "API en ligne, interface à jour ($SERVED)"

echo -e "\n${GREEN}${BOLD}🎉 Déploiement de $SHORT terminé.${NC}"
echo "   Sauvegarde de la base : ~/deploy-backups/$BACKUP_NAME"
rollback_help "$PREV_TAG" "$BACKUP_NAME"
echo "   (les images « $PREV_TAG » peuvent être supprimées quand tout est validé : docker image rm ged-app-backend:$PREV_TAG ged-app-frontend:$PREV_TAG)"
