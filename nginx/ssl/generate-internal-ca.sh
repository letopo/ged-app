#!/usr/bin/env bash
# Génère une CA interne + un certificat serveur signé par cette CA pour la GED.
# - La CA (ca.crt) est à déployer sur les postes clients (cf. SSL-DEPLOYMENT.md).
# - server.crt / server.key sont utilisés par nginx.
# Les clés privées (ca.key, server.key) NE DOIVENT JAMAIS être partagées ni commitées.
#
# Adapter ces 2 variables à votre environnement puis relancer :
set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="ged.hsjm.local"        # nom DNS interne
SERVER_IP="192.168.1.212"      # IP du serveur (laisser vide "" si non utilisée)

CA_DAYS=3650                   # validité CA : 10 ans
CERT_DAYS=825                  # validité serveur : 825 j (max accepté par les navigateurs)

# ── 1) CA interne (générée une seule fois ; ne pas écraser si déjà déployée) ──
if [[ -f ca.crt && -f ca.key ]]; then
  echo "✓ CA déjà présente (ca.crt) — réutilisée. Supprimez ca.* pour en recréer une."
else
  echo "→ Génération de la CA interne…"
  openssl genrsa -out ca.key 4096
  openssl req -x509 -new -nodes -key ca.key -sha256 -days "$CA_DAYS" -out ca.crt \
    -subj "/C=CM/O=Hopital Saint Jean de Malte/CN=HSJM Internal CA"
fi

# ── 2) Certificat serveur signé par la CA, avec SAN (domaine + IP) ──
echo "→ Génération du certificat serveur pour $DOMAIN${SERVER_IP:+ / $SERVER_IP}…"

cat > server-san.ext <<EOF
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${DOMAIN}
EOF
if [[ -n "$SERVER_IP" ]]; then
  echo "IP.1 = ${SERVER_IP}" >> server-san.ext
fi

openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/C=CM/O=Hopital Saint Jean de Malte/CN=${DOMAIN}"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days "$CERT_DAYS" -sha256 -extfile server-san.ext

rm -f server.csr server-san.ext
chmod 600 ca.key server.key 2>/dev/null || true

echo ""
echo "✅ Terminé."
echo "   - nginx utilise : server.crt + server.key"
echo "   - à déployer sur les postes : ca.crt  (PAS ca.key)"
echo "   SAN du certificat :"
openssl x509 -in server.crt -noout -ext subjectAltName 2>/dev/null || \
  openssl x509 -in server.crt -noout -text | grep -A1 "Subject Alternative Name"
