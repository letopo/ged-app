#!/usr/bin/env python3
"""
Script d'import des données Excel HSJM_Gestion_v3.xlsm
vers la base de données PostgreSQL de la GED-APP

Données importées :
  - 2 045 patients
  - 4 027 consultations
  - 286  hospitalisations
  - 11   opérations
  - 3    repos actifs + repos déduits des consultations

Usage : python3 scripts/import_excel_php.py
"""

import sys
import uuid
import warnings
from datetime import datetime, timedelta
import re

warnings.filterwarnings('ignore')

try:
    import pandas as pd
except ImportError:
    print("❌ pandas manquant → pip3 install pandas"); sys.exit(1)
try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ psycopg2 manquant → pip3 install psycopg2-binary"); sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────
EXCEL_PATH = "/Users/test/Movies/ged-app/HSJM_Gestion_v3.xlsm"
DB_CONFIG  = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "ged_db",
    "user":     "ged_user",
    "password": "D@minguez123",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def uid():
    return str(uuid.uuid4())

def clean_str(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except Exception:
        pass
    return str(v).strip() or None

def clean_int(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except Exception:
        pass
    txt = re.sub(r'[^0-9]', '', str(v))
    return int(txt) if txt else None

def clean_date(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except Exception:
        pass
    if isinstance(v, (datetime,)):
        return v.date() if hasattr(v, 'date') else v
    try:
        import pandas as _pd
        ts = _pd.Timestamp(v)
        return ts.date()
    except Exception:
        pass
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(str(v)[:10], fmt).date()
        except Exception:
            pass
    return None

def read_sheet(name):
    df = pd.read_excel(EXCEL_PATH, sheet_name=name, header=2, engine='openpyxl')
    df = df.dropna(how='all')
    if df.shape[1] >= 2:
        df = df[df.iloc[:, 1].notna()]
    return df.reset_index(drop=True)

# ─── Connexion ────────────────────────────────────────────────────────────────
print("\n🔌 Connexion à PostgreSQL...")
try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()
    print("   ✅ Connecté à ged_db")
except Exception as e:
    print(f"   ❌ {e}"); sys.exit(1)

NOW = datetime.now()

# ─── Référentiels ─────────────────────────────────────────────────────────────
print("\n📚 Chargement des référentiels...")
cur.execute("SELECT code, id FROM php_infirmeries")
infirmeries_map = {r[0]: r[1] for r in cur.fetchall()}

cur.execute("SELECT nom, id, infirmerie_id FROM php_secteurs")
secteurs_map = {r[0].upper(): (r[1], r[2]) for r in cur.fetchall()}
print(f"   ✅ {len(infirmeries_map)} infirmeries, {len(secteurs_map)} secteurs")

def get_secteur(nom):
    if not nom: return None, None
    return secteurs_map.get(str(nom).upper().strip(), (None, None))

def get_infirmerie(code):
    if not code: return None
    return infirmeries_map.get(str(code).upper().strip())

# ─── Patients déjà en base ────────────────────────────────────────────────────
cur.execute("SELECT matricule, id FROM php_patients")
patients_id_by_matricule = {str(r[0]).strip(): r[1] for r in cur.fetchall()}
existing = len(patients_id_by_matricule)
if existing:
    print(f"\n⚠️  {existing} patients déjà en base.")
    ans = input("   Continuer (ignorer les doublons) ? [O/n] ").strip().lower()
    if ans == 'n':
        conn.close(); sys.exit(0)

# ══════════════════════════════════════════════════════════════════════════════
# 1 — PATIENTS  (2 045)
# ══════════════════════════════════════════════════════════════════════════════
print("\n👥 Import des patients...")
df_p = read_sheet('DB_Patients')
print(f"   → {len(df_p)} lignes lues")

rows, skip = [], 0
for _, r in df_p.iterrows():
    mat = clean_str(r.get('Matricule'))
    if not mat: skip += 1; continue
    if mat in patients_id_by_matricule: skip += 1; continue

    nom            = clean_str(r.get('Nom et Prénoms')) or 'INCONNU'
    sect_id, inf_s = get_secteur(clean_str(r.get('Secteur')))
    inf_id         = get_infirmerie(clean_str(r.get('Infirmerie'))) or inf_s

    pid = uid()
    patients_id_by_matricule[mat] = pid
    rows.append((pid, mat, nom, None, None, None,
                 sect_id, inf_id, None, None, 'actif', None, None, NOW, NOW))

if rows:
    execute_values(cur, """
        INSERT INTO php_patients
          (id, matricule, nom, prenom, genre, date_naissance,
           secteur_id, infirmerie_id, telephone, adresse,
           status, created_by_user_id, notes, created_at, updated_at)
        VALUES %s ON CONFLICT (matricule) DO NOTHING
    """, rows)
    conn.commit()
print(f"   ✅ {len(rows)} insérés  ({skip} ignorés/doublons)")

# ══════════════════════════════════════════════════════════════════════════════
# 2 — CONSULTATIONS  (4 027)
# ══════════════════════════════════════════════════════════════════════════════
print("\n🩺 Import des consultations...")
df_c = read_sheet('Consultations')
print(f"   → {len(df_c)} lignes lues")

DEVENIR = {
    'REPOS': 'repos', 'HOSPI': 'hospitalisation',
    'PHP': 'retour_travail', 'AT': 'retour_travail',
    'LUNETTES': 'retour_travail', 'RETRAITE': 'retour_travail',
    '10 SEANCES': 'retour_travail',
}

rows_c, repos_queue, id_by_num, skip = [], [], {}, 0

for _, r in df_c.iterrows():
    mat = clean_str(r.get('Matricule'))
    if not mat: skip += 1; continue
    pid = patients_id_by_matricule.get(mat)
    if not pid: skip += 1; continue

    d     = clean_date(r.get('Date'))
    if not d: skip += 1; continue

    num   = clean_int(r.get('N°'))
    diag  = clean_str(r.get('Diagnostic'))
    svc   = clean_str(r.get('Service'))
    dev   = clean_str(r.get('Devenir'))
    rjrs  = clean_int(r.get('Repos (jrs)'))

    dev_up  = dev.upper().strip() if dev else ''
    resultat = DEVENIR.get(dev_up, 'retour_travail')

    cid = uid()
    if num: id_by_num[num] = cid

    rows_c.append((
        cid, pid,
        None,   # bon_prise_en_charge_id
        d,      # date_consultation
        None, None, None, None,   # heures
        None,   # duree_attente_minutes
        svc,    # service_name
        None,   # medecin_id
        None,   # medecin_nom
        None,   # motif
        diag,   # diagnostic
        None,   # ordonnance
        resultat,
        None,   # agent_accueil_id
        None,   # notes
        NOW, NOW,
    ))

    if resultat == 'repos' and rjrs and d:
        repos_queue.append((pid, cid, d, rjrs))

if rows_c:
    execute_values(cur, """
        INSERT INTO php_consultations
          (id, patient_id, bon_prise_en_charge_id, date_consultation,
           heure_arrivee, heure_appel_medecin, heure_debut_consultation, heure_fin_consultation,
           duree_attente_minutes, service_name, medecin_id, medecin_nom,
           motif, diagnostic, ordonnance, resultat,
           agent_accueil_id, notes, created_at, updated_at)
        VALUES %s
    """, rows_c)
    conn.commit()
print(f"   ✅ {len(rows_c)} insérées  ({skip} ignorées) — {len(repos_queue)} repos à créer")

# ══════════════════════════════════════════════════════════════════════════════
# 3 — HOSPITALISATIONS  (286)
# ══════════════════════════════════════════════════════════════════════════════
print("\n🏥 Import des hospitalisations...")
df_h = read_sheet('Hospitalisations')
print(f"   → {len(df_h)} lignes lues")

rows_h, skip = [], 0
for _, r in df_h.iterrows():
    mat = clean_str(r.get('Matricule'))
    if not mat:
        try:
            v = r.get('Matricule')
            if not pd.isna(v): mat = str(int(float(v)))
        except Exception: pass
    if not mat: skip += 1; continue
    pid = patients_id_by_matricule.get(mat)
    if not pid: skip += 1; continue

    d_entree = clean_date(r.get('Date Entrée'))
    if not d_entree: skip += 1; continue
    d_sortie = clean_date(r.get('Date Sortie'))
    svc      = clean_str(r.get('Service'))
    diag     = clean_str(r.get('Diagnostic'))
    chambre  = clean_str(r.get('Chambre/Lit'))
    status   = 'sorti' if d_sortie else 'en_cours'

    duree = None
    if d_sortie and d_entree:
        try: duree = (d_sortie - d_entree).days
        except Exception: pass

    rows_h.append((
        uid(), pid,
        None,           # consultation_id
        svc,            # service_hospitalisation
        chambre,        # numero_chambre
        d_entree,
        d_sortie,
        duree,          # duree_sejour
        status,
        None,           # medecin_responsable
        diag,           # diagnostic
        None,           # notes
        NOW, NOW,
    ))

if rows_h:
    execute_values(cur, """
        INSERT INTO php_hospitalisations
          (id, patient_id, consultation_id,
           service_hospitalisation, numero_chambre,
           date_entree, date_sortie, duree_sejour,
           status, medecin_responsable, diagnostic, notes,
           created_at, updated_at)
        VALUES %s
    """, rows_h)
    conn.commit()
print(f"   ✅ {len(rows_h)} insérées  ({skip} ignorées)")

# ══════════════════════════════════════════════════════════════════════════════
# 4 — OPÉRATIONS  (11)
# ══════════════════════════════════════════════════════════════════════════════
print("\n⚕️  Import des opérations...")
df_o = read_sheet('Operations')
print(f"   → {len(df_o)} lignes lues")

rows_o, skip = [], 0
for _, r in df_o.iterrows():
    mat = clean_str(r.get('Matricule'))
    if not mat:
        try:
            v = r.get('Matricule')
            if not pd.isna(v): mat = str(int(float(v)))
        except Exception: pass
    if not mat: skip += 1; continue
    pid = patients_id_by_matricule.get(mat)
    if not pid: skip += 1; continue

    d_op    = clean_date(r.get('Date Entrée'))
    svc     = clean_str(r.get('Service'))
    diag    = clean_str(r.get('Diagnostic/Intervention'))
    status  = 'realisee'

    rows_o.append((
        uid(), pid,
        None,       # consultation_id
        svc,        # type_operation (utilise le service comme type)
        d_op,
        None,       # chirurgien_nom
        None,       # anesthesiste_nom
        status,
        diag,       # diagnostic
        None,       # compte_rendu
        None,       # notes
        NOW, NOW,
    ))

if rows_o:
    execute_values(cur, """
        INSERT INTO php_operations
          (id, patient_id, consultation_id,
           type_operation, date_operation,
           chirurgien_nom, anesthesiste_nom,
           status, diagnostic, compte_rendu, notes,
           created_at, updated_at)
        VALUES %s
    """, rows_o)
    conn.commit()
print(f"   ✅ {len(rows_o)} insérées  ({skip} ignorées)")

# ══════════════════════════════════════════════════════════════════════════════
# 5 — REPOS MALADIE
# ══════════════════════════════════════════════════════════════════════════════
print("\n🛌 Import des repos maladie...")
rows_r = []

# 5a — Repos déduits des consultations (Devenir=REPOS)
for (pid, cid, d_debut, duree) in repos_queue:
    try:
        d_fin = d_debut + timedelta(days=duree)
    except Exception:
        continue
    rows_r.append((
        uid(), pid, cid,
        d_debut, d_fin, duree,
        'termine',  # données historiques = terminées
        '[]',       # prolongations JSONB
        None,       # motif
        None, None, # medecin_id, medecin_nom
        None,       # notes
        NOW, NOW,
    ))

# 5b — Feuille Repos (repos actifs en cours)
df_r = read_sheet('Repos')
skip = 0
for _, r in df_r.iterrows():
    mat = clean_str(r.get('Matricule'))
    if not mat:
        try:
            v = r.get('Matricule')
            if not pd.isna(v): mat = str(int(float(v)))
        except Exception: pass
    if not mat: skip += 1; continue
    pid = patients_id_by_matricule.get(mat)
    if not pid: skip += 1; continue

    d_debut   = clean_date(r.get('Date Debut'))
    d_fin     = clean_date(r.get('Date Fin'))
    if not d_debut or not d_fin: skip += 1; continue

    duree     = clean_int(r.get('Nb Jours')) or 0
    statut_r  = clean_str(r.get('Statut')) or 'EN_COURS'
    status    = 'en_cours' if 'EN_COURS' in statut_r.upper() else 'termine'
    motif     = clean_str(r.get('Diagnostic'))

    num_c     = clean_int(r.get('ID_Consultation'))
    cid       = id_by_num.get(num_c) if num_c else None

    rows_r.append((
        uid(), pid, cid,
        d_debut, d_fin, duree,
        status,
        '[]',
        motif,
        None, None,
        None,
        NOW, NOW,
    ))

if rows_r:
    execute_values(cur, """
        INSERT INTO php_repos
          (id, patient_id, consultation_id,
           date_debut, date_fin, duree_jours,
           status, prolongations, motif,
           medecin_id, medecin_nom, notes,
           created_at, updated_at)
        VALUES %s
    """, rows_r)
    conn.commit()
actifs    = sum(1 for r in rows_r if r[6] == 'en_cours')
termines  = sum(1 for r in rows_r if r[6] == 'termine')
print(f"   ✅ {len(rows_r)} insérés  ({actifs} actifs, {termines} terminés, {skip} ignorés)")

# ══════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ══════════════════════════════════════════════════════════════════════════════
for tbl, label in [
    ('php_patients', '👥  Patients'),
    ('php_consultations', '🩺  Consultations'),
    ('php_hospitalisations', '🏥  Hospitalisations'),
    ('php_operations', '⚕️   Opérations'),
    ('php_repos', '🛌  Repos maladie'),
]:
    cur.execute(f"SELECT COUNT(*) FROM {tbl}")
    print(f"   {label:25s}: {cur.fetchone()[0]:>6}" if '═' not in label else '')

cur.execute("SELECT COUNT(*) FROM php_patients");        nb_p = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM php_consultations");   nb_c = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM php_hospitalisations");nb_h = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM php_operations");      nb_o = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM php_repos");           nb_r = cur.fetchone()[0]

print("\n" + "═"*50)
print("  ✅  IMPORT TERMINÉ AVEC SUCCÈS")
print("═"*50)
print(f"  👥  Patients         : {nb_p:>6,}")
print(f"  🩺  Consultations    : {nb_c:>6,}")
print(f"  🏥  Hospitalisations : {nb_h:>6,}")
print(f"  ⚕️   Opérations       : {nb_o:>6,}")
print(f"  🛌  Repos maladie    : {nb_r:>6,}")
print("═"*50 + "\n")

cur.close()
conn.close()
