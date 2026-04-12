#!/usr/bin/env python3
"""
Script d'import COMPLET des données HSJM_Gestion_v3.xlsm (nouvelle version)
vers la base de données PostgreSQL de la GED-APP.

ATTENTION : efface et réimporte TOUTES les données PHP existantes.

Nouvelles données :
  - 2 453 patients
  - 5 087 consultations
  - 466  hospitalisations
  - 11   opérations
  - 35   repos maladie

Usage : python3 scripts/import_excel_php_v2.py
"""

import sys, uuid, warnings, re
from datetime import datetime, date, timedelta

warnings.filterwarnings('ignore')

try:
    import pandas as pd
except ImportError:
    print("❌ pandas manquant → pip3 install pandas openpyxl"); sys.exit(1)
try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ psycopg2 manquant → pip3 install psycopg2-binary"); sys.exit(1)

# ─── Configuration ─────────────────────────────────────────────────────────────
EXCEL_FILE = '/Users/test/Movies/ged-app/HSJM_Gestion_v3.xlsm'
DB_CONF = {
    'host':     'localhost',
    'port':     5432,
    'dbname':   'ged_db',
    'user':     'ged_user',
    'password': 'D@minguez123',
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def nid(): return str(uuid.uuid4())

def parse_mat(v):
    """Convertit 801636.0 → '801636'. Gère aussi les cellules fusionnées avec espaces."""
    if pd.isna(v): return None
    s = str(v).strip()
    if not s or s.lower() in ('nan', 'none'): return None
    # Certaines cellules contiennent '[mat]   [mat]' (cellules fusionnées) — on prend le 1er token
    tokens = s.split()
    first = tokens[0] if tokens else s
    try:
        result = str(int(float(first)))
        return result[:100]   # sécurité VARCHAR(100)
    except:
        return first[:100]

def parse_date(v):
    if pd.isna(v) or v is None: return None
    if isinstance(v, (datetime, date)): return v if isinstance(v, date) else v.date()
    try: return pd.to_datetime(str(v)).date()
    except: return None

def parse_int(v, default=0):
    if pd.isna(v) or v is None: return default
    try: return int(float(re.sub(r'[^\d.]', '', str(v))))
    except: return default

def clean(v, upper=False):
    if pd.isna(v) or v is None: return None
    s = str(v).strip()
    if not s or s.lower() in ('nan', 'none', 'nat'): return None
    return s.upper() if upper else s

# Mapping Devenir → resultat DB
DEVENIR_MAP = {
    'REPOS':            'repos',
    'HOSPI':            'hospitalisation',
    'HOSPITALISATION':  'hospitalisation',
    'OPERATION':        'operation',
    'OPERÉ':            'operation',
    'OPÉRÉ':            'operation',
    'DÉCÈS':            'deces',
    'DECES':            'deces',
    'TRANSFERT':        'transfert',
    'PHP':              'retour_travail',
    'LUNETTES':         'retour_travail',
    'RETOUR TRAVAIL':   'retour_travail',
    'RETOUR AU TRAVAIL':'retour_travail',
    'RAT':              'retour_travail',
}

def map_devenir(v):
    if not v: return 'retour_travail'
    return DEVENIR_MAP.get(str(v).strip().upper(), 'retour_travail')

# ─── Connexion DB ──────────────────────────────────────────────────────────────
print("\n🔌 Connexion à la base de données...")
try:
    conn = psycopg2.connect(**DB_CONF)
    conn.autocommit = False
    cur  = conn.cursor()
    print("   ✅ Connecté")
except Exception as e:
    print(f"   ❌ Impossible de se connecter : {e}")
    sys.exit(1)

# ─── Récupération de l'admin user ─────────────────────────────────────────────
cur.execute("SELECT id FROM users LIMIT 1")
row = cur.fetchone()
if not row:
    print("❌ Aucun utilisateur trouvé dans la DB"); sys.exit(1)
ADMIN_ID = row[0]
print(f"   👤 Agent par défaut : {ADMIN_ID}")

# ─── Lecture des référentiels DB ──────────────────────────────────────────────
print("\n📚 Chargement des référentiels...")
cur.execute("SELECT id, code FROM php_infirmeries")
infirmeries_db = {code.upper(): uid for uid, code in cur.fetchall()}
print(f"   Infirmeries DB : {len(infirmeries_db)}")

cur.execute("SELECT id, nom, infirmerie_id FROM php_secteurs")
secteurs_db = {}
for uid, nom, inf_id in cur.fetchall():
    secteurs_db[nom.upper().strip()] = (uid, inf_id)
print(f"   Secteurs DB    : {len(secteurs_db)}")

# ─── Lecture du fichier Excel ─────────────────────────────────────────────────
print(f"\n📖 Lecture de {EXCEL_FILE} ...")
sheets = pd.read_excel(EXCEL_FILE, sheet_name=None, header=None, engine='openpyxl')
print(f"   Feuilles trouvées : {list(sheets.keys())}")

def read_sheet(name, header_row=2):
    df = sheets[name].copy()
    df.columns = df.iloc[header_row]
    df = df.iloc[header_row+1:].reset_index(drop=True)
    return df

# ─── NETTOYAGE des tables existantes ─────────────────────────────────────────
print("\n🗑️  Nettoyage des données PHP existantes...")
tables_order = [
    'php_deces_transferts',
    'php_operations',
    'php_repos',
    'php_hospitalisations',
    'php_consultations',
    'php_bons_prise_en_charge',
    'php_patients',
]
for t in tables_order:
    cur.execute(f"TRUNCATE TABLE {t} CASCADE")
    print(f"   TRUNCATE {t}")
conn.commit()
print("   ✅ Tables nettoyées")

# ─────────────────────────────────────────────────────────────────────────────
# 1. PATIENTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n👥 Import des patients...")
df_patients = read_sheet('DB_Patients')
print(f"   Colonnes : {list(df_patients.columns)}")
print(f"   Lignes   : {len(df_patients)}")

patients_map = {}   # matricule → uuid
skipped_patients = 0
patient_rows = []

for _, row in df_patients.iterrows():
    mat = parse_mat(row.get('Matricule') or row.get('MATRICULE'))
    if not mat:
        skipped_patients += 1
        continue

    nom_prenom = clean(row.get('Nom et Prénoms') or row.get('NOM ET PRÉNOMS') or row.get('Nom'), upper=True)
    if not nom_prenom:
        skipped_patients += 1
        continue

    # Séparer nom / prénom (premier mot = nom)
    parts = nom_prenom.split(' ', 1)
    nom    = parts[0]
    prenom = parts[1] if len(parts) > 1 else None

    secteur_raw = clean(row.get('Secteur') or row.get('SECTEUR'), upper=True)
    infirmerie_raw = clean(row.get('Infirmerie') or row.get('INFIRMERIE'), upper=True)

    # Résolution secteur / infirmerie
    secteur_id     = None
    infirmerie_id  = None

    if secteur_raw and secteur_raw in secteurs_db:
        secteur_id, infirmerie_id = secteurs_db[secteur_raw]
    if not infirmerie_id and infirmerie_raw and infirmerie_raw in infirmeries_db:
        infirmerie_id = infirmeries_db[infirmerie_raw]

    pid = nid()
    patients_map[mat] = pid

    patient_rows.append((
        pid, mat, nom, prenom,
        secteur_id, infirmerie_id,
        'actif', ADMIN_ID,
    ))

execute_values(cur, """
    INSERT INTO php_patients
      (id, matricule, nom, prenom, secteur_id, infirmerie_id, status, created_by_user_id)
    VALUES %s
    ON CONFLICT (matricule) DO UPDATE SET
      nom       = EXCLUDED.nom,
      prenom    = EXCLUDED.prenom,
      secteur_id    = EXCLUDED.secteur_id,
      infirmerie_id = EXCLUDED.infirmerie_id,
      updated_at    = NOW()
""", patient_rows)
conn.commit()

# ⚠️  Relire les vrais UUIDs depuis la DB (en cas de matricules dupliqués dans l'Excel,
# le ON CONFLICT garde l'UUID d'origine qui peut différer de patients_map)
cur.execute("SELECT matricule, id FROM php_patients")
patients_map = {mat: uid for mat, uid in cur.fetchall()}
print(f"   ✅ {len(patients_map)} patients en base ({skipped_patients} lignes ignorées)")

# ─────────────────────────────────────────────────────────────────────────────
# 2. CONSULTATIONS  (→ bons + consultations)
# ─────────────────────────────────────────────────────────────────────────────
print("\n🩺 Import des consultations...")
df_consult = read_sheet('Consultations')
print(f"   Colonnes : {list(df_consult.columns)}")
print(f"   Lignes   : {len(df_consult)}")

bons_rows   = []
consult_rows = []
skipped_c   = 0

# Mapping consultation_id par (matricule, date) pour la liaison hospi/repos plus tard
# On utilise un index séquentiel pour le lien Hospi/Repos via ID_Consultation
consult_seq_map = {}   # numéro_ligne (N°) → consultation_uuid

for _, row in df_consult.iterrows():
    mat = parse_mat(row.get('Matricule'))
    d   = parse_date(row.get('Date'))
    if not mat or not d: skipped_c += 1; continue

    pid = patients_map.get(mat)
    if not pid: skipped_c += 1; continue

    devenir  = map_devenir(clean(row.get('Devenir')))
    service  = clean(row.get('Service'), upper=True) or 'MEDECINE'
    diag     = clean(row.get('Diagnostic'), upper=True)
    num      = parse_int(row.get('N°') or row.get('N'))

    bon_id  = nid()
    cons_id = nid()

    bon_num = f"BON-{d.strftime('%Y%m')}-{mat}-{uuid.uuid4().hex[:4].upper()}"

    bons_rows.append((
        bon_id, bon_num, pid, d, service, ADMIN_ID, 'utilise',
    ))
    consult_rows.append((
        cons_id, pid, bon_id, d, service, devenir, diag, ADMIN_ID,
    ))

    if num:
        consult_seq_map[num] = cons_id

execute_values(cur, """
    INSERT INTO php_bons_prise_en_charge
      (id, numero_bon, patient_id, date_emission, service_destination, agent_emetteur_id, status)
    VALUES %s
""", bons_rows)

execute_values(cur, """
    INSERT INTO php_consultations
      (id, patient_id, bon_prise_en_charge_id, date_consultation,
       service_name, resultat, diagnostic, agent_accueil_id)
    VALUES %s
""", consult_rows)
conn.commit()
print(f"   ✅ {len(consult_rows)} consultations importées ({skipped_c} ignorées)")
print(f"   ✅ {len(bons_rows)} bons de prise en charge créés")

# ─────────────────────────────────────────────────────────────────────────────
# 3. HOSPITALISATIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\n🏥 Import des hospitalisations...")
df_hosp = read_sheet('Hospitalisations')
print(f"   Colonnes : {list(df_hosp.columns)}")
print(f"   Lignes   : {len(df_hosp)}")

hosp_rows  = []
skipped_h  = 0

for _, row in df_hosp.iterrows():
    mat        = parse_mat(row.get('Matricule'))
    date_entree = parse_date(row.get('Date Entrée'))
    if not mat or not date_entree: skipped_h += 1; continue

    pid = patients_map.get(mat)
    if not pid: skipped_h += 1; continue

    date_sortie = parse_date(row.get('Date Sortie'))
    service     = clean(row.get('Service'), upper=True) or 'HOSPITALISATION'
    chambre     = clean(row.get('Chambre/Lit') or row.get('Chambre'))
    diag        = clean(row.get('Diagnostic'), upper=True)

    duree = None
    if date_sortie and date_entree:
        duree = (date_sortie - date_entree).days

    status = 'sorti' if date_sortie else 'en_cours'

    hosp_rows.append((
        nid(), pid, None,          # id, patient_id, consultation_id (non lié)
        service, chambre,
        date_entree, date_sortie, duree,
        status, diag,
    ))

execute_values(cur, """
    INSERT INTO php_hospitalisations
      (id, patient_id, consultation_id,
       service_hospitalisation, numero_chambre,
       date_entree, date_sortie, duree_sejour,
       status, diagnostic)
    VALUES %s
""", hosp_rows)
conn.commit()
print(f"   ✅ {len(hosp_rows)} hospitalisations importées ({skipped_h} ignorées)")

# ─────────────────────────────────────────────────────────────────────────────
# 4. OPÉRATIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\n🔧 Import des opérations...")
df_ops = read_sheet('Operations')
print(f"   Colonnes : {list(df_ops.columns)}")
print(f"   Lignes   : {len(df_ops)}")

ops_rows  = []
skipped_o = 0

for _, row in df_ops.iterrows():
    mat        = parse_mat(row.get('Matricule'))
    date_op    = parse_date(row.get('Date Entrée'))
    if not mat or not date_op: skipped_o += 1; continue

    pid = patients_map.get(mat)
    if not pid: skipped_o += 1; continue

    service = clean(row.get('Service'), upper=True) or 'CHIRURGIE'
    diag    = clean(row.get('Diagnostic/Intervention') or row.get('Diagnostic'), upper=True)
    date_sortie = parse_date(row.get('Date Sortie'))

    ops_rows.append((
        nid(), pid, None,
        service, date_op,
        'realisee', diag,
    ))

execute_values(cur, """
    INSERT INTO php_operations
      (id, patient_id, consultation_id,
       type_operation, date_operation,
       status, diagnostic)
    VALUES %s
""", ops_rows)
conn.commit()
print(f"   ✅ {len(ops_rows)} opérations importées ({skipped_o} ignorées)")

# ─────────────────────────────────────────────────────────────────────────────
# 5. REPOS MALADIE
# ─────────────────────────────────────────────────────────────────────────────
print("\n🛏️  Import des repos maladie...")
df_repos = read_sheet('Repos')
print(f"   Colonnes : {list(df_repos.columns)}")
print(f"   Lignes   : {len(df_repos)}")

repos_rows = []
skipped_r  = 0

for _, row in df_repos.iterrows():
    mat = parse_mat(row.get('Matricule'))
    date_debut = parse_date(row.get('Date Debut'))
    if not mat or not date_debut: skipped_r += 1; continue

    pid = patients_map.get(mat)
    if not pid: skipped_r += 1; continue

    nb_jours  = parse_int(row.get('Nb Jours') or row.get('Nb jours'), 0)
    date_fin  = parse_date(row.get('Date Fin')) or (
        date_debut + timedelta(days=nb_jours) if nb_jours else None
    )

    statut_raw = clean(row.get('Statut'), upper=True) or 'EN_COURS'
    if statut_raw == 'CLOTURE': status = 'termine'
    elif statut_raw == 'PROLONGE': status = 'prolonge'
    else: status = 'en_cours'

    diag = clean(row.get('Diagnostic'), upper=True)
    service = clean(row.get('Service'), upper=True)

    # Historique prolongations (si disponible)
    prolongations = '[]'
    hist_raw = clean(row.get('Historique Periodes') or row.get('Historique périodes'))
    if hist_raw:
        import json
        periods = [p.strip() for p in hist_raw.split(';') if p.strip()]
        prolongs = []
        for p in periods:
            prolongs.append({'periode': p})
        if prolongs:
            prolongations = json.dumps(prolongs)

    total_jours = parse_int(row.get('Total Jours Cumules') or row.get('Total jours cumulés'), nb_jours)
    if total_jours == 0: total_jours = nb_jours

    repos_rows.append((
        nid(), pid, None,
        date_debut, date_fin or date_debut,
        total_jours or nb_jours, status,
        prolongations, diag,
    ))

execute_values(cur, """
    INSERT INTO php_repos
      (id, patient_id, consultation_id,
       date_debut, date_fin,
       duree_jours, status,
       prolongations, motif)
    VALUES %s
""", repos_rows)
conn.commit()
print(f"   ✅ {len(repos_rows)} repos importés ({skipped_r} ignorés)")

# ─────────────────────────────────────────────────────────────────────────────
# RÉSUMÉ FINAL
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("✅  IMPORT TERMINÉ AVEC SUCCÈS")
print("="*55)

cur.execute("SELECT COUNT(*) FROM php_patients")
print(f"   Patients       : {cur.fetchone()[0]:>6}")
cur.execute("SELECT COUNT(*) FROM php_bons_prise_en_charge")
print(f"   Bons émis      : {cur.fetchone()[0]:>6}")
cur.execute("SELECT COUNT(*) FROM php_consultations")
print(f"   Consultations  : {cur.fetchone()[0]:>6}")
cur.execute("SELECT COUNT(*) FROM php_hospitalisations")
print(f"   Hospitalisations:{cur.fetchone()[0]:>5}")
cur.execute("SELECT COUNT(*) FROM php_operations")
print(f"   Opérations     : {cur.fetchone()[0]:>6}")
cur.execute("SELECT COUNT(*) FROM php_repos")
print(f"   Repos maladie  : {cur.fetchone()[0]:>6}")
print("="*55)

# Validation : totaux Mars 2026 (comparaison avec l'Excel)
print("\n📊 Validation — Totaux Mars 2026 (comparaison Excel):")
cur.execute("""
    SELECT
        COUNT(DISTINCT b.id) AS declarations,
        COUNT(DISTINCT c.id) AS reçus_hsjm,
        SUM(CASE WHEN c.resultat='hospitalisation' THEN 1 ELSE 0 END) AS hospi
    FROM php_consultations c
    JOIN php_bons_prise_en_charge b ON b.id = c.bon_prise_en_charge_id
    WHERE c.date_consultation BETWEEN '2026-03-01' AND '2026-03-31'
""")
r = cur.fetchone()
print(f"   Mars 2026 → Décl: {r[0]} | Reçus: {r[1]} | Hospi: {r[2]}")
print("   (Excel attendu → Décl: 1651 | Reçus: 742 | Hospi: 78)")

# Top infirmeries Mars 2026
print("\n📊 Validation — Reçus à HSJM par infirmerie (Mars 2026):")
cur.execute("""
    SELECT i.code, COUNT(c.id) as nb
    FROM php_consultations c
    JOIN php_patients p ON p.id = c.patient_id
    JOIN php_infirmeries i ON i.id = p.infirmerie_id
    WHERE c.date_consultation BETWEEN '2026-03-01' AND '2026-03-31'
    GROUP BY i.code
    ORDER BY nb DESC
""")
for code, nb in cur.fetchall():
    print(f"   {code:<20} {nb:>4}")

cur.close()
conn.close()
print("\n✅ Connexion fermée.")
