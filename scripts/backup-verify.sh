#!/bin/bash
# =============================================================================
# GED-APP - Vérification de la dernière sauvegarde
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       GED-APP — État des Sauvegardes                      ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Vérifier l'existence du dossier
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "  ${RED}❌ Aucune sauvegarde trouvée (dossier manquant)${NC}"
  echo -e "  Lancez: ${YELLOW}./scripts/backup.sh${NC}"
  exit 1
fi

# Lister les sauvegardes
BACKUPS=$(ls -t "$BACKUP_DIR"/ged-backup_*.tar.gz 2>/dev/null)

if [ -z "$BACKUPS" ]; then
  echo -e "  ${RED}❌ Aucune sauvegarde disponible${NC}"
  echo -e "  Lancez: ${YELLOW}./scripts/backup.sh${NC}"
  exit 1
fi

COUNT=$(echo "$BACKUPS" | wc -l)
echo -e "  📦 ${GREEN}$COUNT sauvegarde(s) disponible(s)${NC}"
echo ""

# Dernière sauvegarde
LAST_BACKUP=$(echo "$BACKUPS" | head -1)
LAST_DATE=$(stat -f "%Sm" -t "%d/%m/%Y %H:%M" "$LAST_BACKUP" 2>/dev/null || \
            stat --format="%y" "$LAST_BACKUP" 2>/dev/null | cut -d'.' -f1)
LAST_SIZE=$(du -sh "$LAST_BACKUP" | cut -f1)

echo -e "  🕐 Dernière sauvegarde:"
echo -e "     Fichier : $(basename "$LAST_BACKUP")"
echo -e "     Date    : ${YELLOW}$LAST_DATE${NC}"
echo -e "     Taille  : $LAST_SIZE"

# Vérifier l'âge de la dernière sauvegarde
LAST_MOD=$(stat -f "%m" "$LAST_BACKUP" 2>/dev/null || stat --format="%Y" "$LAST_BACKUP" 2>/dev/null)
NOW=$(date +%s)
AGE_HOURS=$(( (NOW - LAST_MOD) / 3600 ))
AGE_DAYS=$(( AGE_HOURS / 24 ))

echo ""
if [ "$AGE_HOURS" -lt 25 ]; then
  echo -e "  ${GREEN}✅ Sauvegarde récente (il y a ${AGE_HOURS}h)${NC}"
elif [ "$AGE_DAYS" -lt 3 ]; then
  echo -e "  ${YELLOW}⚠️  Sauvegarde un peu ancienne (il y a ${AGE_DAYS} jour(s))${NC}"
else
  echo -e "  ${RED}❌ ATTENTION: Dernière sauvegarde il y a ${AGE_DAYS} jours !${NC}"
  echo -e "     Lancez une sauvegarde maintenant: ${YELLOW}./scripts/backup.sh${NC}"
fi

echo ""

# Vérifier l'intégrité de la dernière sauvegarde
echo -e "  🔍 Vérification de l'intégrité..."
if tar tzf "$LAST_BACKUP" &>/dev/null; then
  echo -e "  ${GREEN}✅ Archive intègre${NC}"

  # Afficher le contenu
  CONTENTS=$(tar tzf "$LAST_BACKUP" 2>/dev/null | grep -E "\.(gz|json)$" | head -10)
  echo -e "\n  📋 Contenu:"
  while IFS= read -r file; do
    echo -e "     - $file"
  done <<< "$CONTENTS"
else
  echo -e "  ${RED}❌ Archive corrompue !${NC}"
fi

echo ""

# Liste de toutes les sauvegardes
if [ "$COUNT" -gt 1 ]; then
  echo -e "  📋 Toutes les sauvegardes:"
  echo "$BACKUPS" | while read backup; do
    size=$(du -sh "$backup" | cut -f1)
    name=$(basename "$backup")
    echo -e "     $name ($size)"
  done
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Commandes utiles:"
echo -e "    Sauvegarder maintenant : ${YELLOW}./scripts/backup.sh${NC}"
echo -e "    Restaurer              : ${YELLOW}./scripts/restore.sh <fichier.tar.gz>${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
