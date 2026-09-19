#!/usr/bin/env bash
# Génère une CA interne + un certificat serveur signé par cette CA pour la GED.
# - La CA (ca.crt) est à déployer sur les postes clients (cf. SSL-DEPLOYMENT.md).
# - server.crt / server.key sont utilisés par nginx.
# Les clés privées (ca.key, server.key) NE DOIVENT JAMAIS être partagées ni commitées.
#
# Autonome : n'a pas besoin du fichier openssl.cnf système (config fournie en interne).
# Adapter DOMAIN / SERVER_IP ci-dessous puis relancer.
set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="ged.hsjm.local"        # nom DNS interne
EXTRA_DOMAINS="ged.hsjmcam.net" # autres noms DNS couverts, séparés par des espaces (laisser vide "" si aucun)
SERVER_IP="192.168.1.186"      # IP du serveur (laisser vide "" si non utilisée)
EXTRA_IPS="192.168.219.13"     # autres IP couvertes (autres serveurs/VM), séparées par des espaces

CA_DAYS=3650                   # validité CA : 10 ans
CERT_DAYS=825                  # validité serveur : 825 j (max accepté par les navigateurs)

ORG="Hopital Saint Jean de Malte"

# Petit utilitaire : exécute une étape et s'arrête avec un message clair si elle échoue.
run() { echo "→ $1"; shift; if ! "$@"; then echo "❌ Échec : $*" >&2; exit 1; fi; }

# Config openssl interne (évite la dépendance à /etc/ssl/openssl.cnf du serveur)
cat > openssl-ca.cnf <<EOF
[req]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca
[dn]
C = CM
O = ${ORG}
CN = HSJM Internal CA
[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
EOF

cat > openssl-server.cnf <<EOF
[req]
distinguished_name = dn
prompt = no
[dn]
C = CM
O = ${ORG}
CN = ${DOMAIN}
[v3_srv]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${DOMAIN}
EOF
dns_idx=2
for d in $EXTRA_DOMAINS; do
  echo "DNS.${dns_idx} = ${d}" >> openssl-server.cnf
  dns_idx=$((dns_idx + 1))
done
ip_idx=1
if [[ -n "$SERVER_IP" ]]; then
  echo "IP.${ip_idx} = ${SERVER_IP}" >> openssl-server.cnf
  ip_idx=$((ip_idx + 1))
fi
for ip in $EXTRA_IPS; do
  echo "IP.${ip_idx} = ${ip}" >> openssl-server.cnf
  ip_idx=$((ip_idx + 1))
done

# ── 1) CA interne (générée une seule fois ; ne pas écraser si déjà déployée) ──
if [[ -f ca.crt && -f ca.key ]]; then
  echo "✓ CA déjà présente (ca.crt + ca.key) — réutilisée. Supprimez ca.* pour en recréer une."
else
  run "Génération de la clé CA"  openssl genrsa -out ca.key 4096
  run "Génération du certificat CA"  openssl req -x509 -new -nodes -key ca.key -sha256 \
      -days "$CA_DAYS" -out ca.crt -config openssl-ca.cnf
fi

# ── 2) Certificat serveur signé par la CA, avec SAN (domaine + IP) ──
run "Génération de la clé serveur"  openssl genrsa -out server.key 2048
run "Génération de la demande (CSR)"  openssl req -new -key server.key -out server.csr -config openssl-server.cnf
run "Signature du certificat serveur"  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days "$CERT_DAYS" -sha256 \
    -extfile openssl-server.cnf -extensions v3_srv

rm -f server.csr openssl-ca.cnf openssl-server.cnf
chmod 600 ca.key server.key 2>/dev/null || true

echo ""
echo "✅ Terminé. Fichiers :"
ls -1 ca.crt ca.key server.crt server.key 2>/dev/null | sed 's/^/   - /'
echo "   nginx utilise : server.crt + server.key"
echo "   à déployer sur les postes : ca.crt  (JAMAIS ca.key)"
echo "   SAN du certificat :"
openssl x509 -in server.crt -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^/     /'
