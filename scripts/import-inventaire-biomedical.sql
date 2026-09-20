-- ============================================================
-- Import de l'inventaire biomédical (service Biomédical HSJM) dans le module GMAO
-- Source : fiches d'inventaire par service (Excel), 152 lignes brutes -> 149 équipements importés
-- 3 doublons identifiés dans la fiche source et exclus (voir liste en bas de ce fichier)
--
-- Idempotent : ce script peut être relancé sans risque, il ne réimporte pas si déjà exécuté
-- (détection via le marqueur [IMPORT-INVENTAIRE-BIOMEDICAL] dans la colonne notes).
--
-- Usage :
--   docker exec -i ged-postgres psql -U $DB_USER -d $DB_NAME < import-inventaire-biomedical.sql
-- (adapter le nom du conteneur postgres et les identifiants si différents)
-- ============================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_already_imported INT;
  v_inserted INT;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE domain = 'ged.hsjmcam.net' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant introuvable pour le domaine ged.hsjmcam.net. Vérifiez la colonne "domain" dans la table "tenants" (SELECT domain FROM tenants;) et ajustez la variable TENANT_DOMAIN en tête de ce script si besoin.';
  END IF;

  -- Aligne la liste des services (menu déroulant "Service" de la fiche équipement)
  -- avec les libellés utilisés par cet import, pour éviter que le champ paraisse vide
  -- après sauvegarde (la valeur est bien enregistrée, mais n'apparaît pas sélectionnée
  -- si elle ne correspond à aucune option du menu).
  UPDATE services SET name = 'Néonatologie' WHERE name = 'Néonatalogie' AND tenant_id = v_tenant_id;
  INSERT INTO services (id, name, tenant_id, created_at, updated_at)
  SELECT gen_random_uuid(), v.name, v_tenant_id, NOW(), NOW()
    FROM (VALUES ('Ophtalmologie'), ('Radiologie')) AS v(name)
   WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.name = v.name AND s.tenant_id = v_tenant_id);

  SELECT COUNT(*) INTO v_already_imported
    FROM equipements
   WHERE tenant_id = v_tenant_id AND notes LIKE '%[IMPORT-INVENTAIRE-BIOMEDICAL]%';

  IF v_already_imported > 0 THEN
    RAISE NOTICE 'Import déjà effectué précédemment (% équipements marqués trouvés) — aucun nouvel ajout.', v_already_imported;
  ELSE
    INSERT INTO equipements (nom, marque, numero_serie, service, date_mise_en_service, statut, notes, tenant_id, created_at, updated_at)
    VALUES
  ('Incubateur Néonatal', 'VXK-6G', '1704?9003', 'Néonatologie', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'ESB-300', '21503180040', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'B-3000A', '230432146', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'Mediprema', '35523081', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 1998 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'YP-30A', '0608040003', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'YP-80', '0509040033', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', 'YP-30A', '0643030003', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal', NULL, NULL, 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Incubateur Néonatal de Transport', NULL, NULL, 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2022 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Néopuff (réa. respiratoire NN)', NULL, '230911B003', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'H003-C', '10633', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'Yuwell', '2088-28200', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Poussse seringue', 'VIAL', '1811625', 'Néonatologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Poussse seringue', NULL, NULL, 'Néonatologie', '2024-08-07', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Radiante', 'GE', 'SF81710101', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2021 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Tunnel de Photothérapie', 'H-360', 'AD2B0001501', 'Néonatologie', '2025-02-28', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur multiparametrique', 'Creative medical', 'J33044H00639', 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('INSOUFLATEUR', 'Creative medical', NULL, 'Néonatologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Cardiotocographe', 'CONTEC', '240601005', 'Gynécologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Echo', 'LOGIQ C5', 'L235J2WX5', 'Gynécologie', NULL, 'actif', 'Mise en service (année uniquement) : 2020 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Echo', 'Voluson', 'NP8802444', 'Gynécologie', NULL, 'actif', 'Mise en service (année uniquement) : 2023 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Echo', 'MINDRAY', '20240130444', 'Gynécologie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('ECHO', 'GE', '4235999XXX5', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Radiante', 'MSL', '1170608012', 'Gynécologie', NULL, 'actif', 'Mise en service (année uniquement) : 2023 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'Yuwell', '0038', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'H003C', 'C2D', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'YB-5X12', '23065', 'Gynécologie', '2005-12-05', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'SA-39KB', '210458', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Opératoire', 'Mediprema', '172103196', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Opératoire', 'MSL', '576', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Opératoire', 'MSL', '172103197', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Pousse seringue', 'ViaMedical', '811625', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Pousse seringue', 'Healicom', 'H05210027', 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Eclairage Mobile', NULL, NULL, 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Eclairage Mobile', NULL, NULL, 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Eclairage Mobile', NULL, NULL, 'Gynécologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Ionogramme', 'Anchmed', '23586K', 'Laboratoire', '2024-06-21', 'actif', 'Emplacement : Biochimie | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Spectrophotomètre', 'Biolabo', '39565', 'Laboratoire', '2018-06-20', 'actif', 'Emplacement : Biochimie | Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Bain marie', 'Jouan', '39607207', 'Laboratoire', NULL, 'en_reparation', 'Emplacement : Biochimie | Marque incertaine (écriture manuscrite difficile à lire) | Mise en service (année uniquement) : 1996 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('AutoVortex', 'Stuart', '6202', 'Laboratoire', NULL, 'actif', 'Emplacement : Bio | Mise en service (année uniquement) : 1996 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Coagulomètre', 'Biosolea', '510048', 'Laboratoire', '2010-10-28', 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Centrifugeuse', 'KA-100', '001', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Hematologie', 'MSL', 'H06-EHT0149', 'Laboratoire', '2022-01-14', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Hématologie', 'Horiba', '502ESOH', 'Laboratoire', '2025-08-07', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Lecteur Elisa', 'PKL', 'A1803003', 'Laboratoire', '2022-07-22', 'en_reparation', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Micro shake incubateur', 'Microplate', 'SH0020814', 'Laboratoire', '2014-11-28', 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Laveur Elisa', 'Microplate', 'AW0170814', 'Laboratoire', NULL, 'en_reparation', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Mélangeur plaque', 'Fir labo', NULL, 'Laboratoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Mixeur + Hémato', 'Coulter', '94202', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Dosage hormones', 'BioTime', '1221031', 'Laboratoire', '2022-06-21', 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Analyseur de gaz', 'EDAN i15', '960360', 'Laboratoire', NULL, 'actif', 'Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Centrifugeuse', 'LAB IN', '001389', 'Laboratoire', '2014-12-04', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Rhésuscope', NULL, NULL, 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Microscope', 'Olympus CX22', '2N52713', 'Laboratoire', NULL, 'actif', 'Mise en service (année uniquement) : 2026 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Compteur manuel', NULL, 'L80718', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Microscope', 'Olympus CX21', '1H86423', 'Laboratoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Microscope', 'Olympus CX23', NULL, 'Laboratoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Générateur + bac de migration électrophorèse', 'Biosystem', '81007064', 'Laboratoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('TB LAM ?', 'Human', '1906-0103B', 'Laboratoire', '2021-12-30', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Étuve', NULL, NULL, 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Autoclave', 'Healicon', '3607', 'Laboratoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | Mise en service (année uniquement) : 1994 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Autoclave', 'Lequeux', '963330', 'Laboratoire', NULL, 'actif', 'Mise en service (année uniquement) : 1996 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Poupinel', 'Jouan', NULL, 'Laboratoire', NULL, 'actif', 'Mise en service (année uniquement) : 1991 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Poupinel', 'Jouan', NULL, 'Laboratoire', NULL, 'actif', 'Mise en service (année uniquement) : 1996 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Mixeur poche de sang', 'CM735A', '735185N5', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Blood sealer tube', NULL, 'L158005', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Banque de sang', 'Fiocchetti', NULL, 'Laboratoire', '2014-12-01', 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Banque de sang', 'NUVE', '040719', 'Laboratoire', '2015-04-13', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Banque de sang', 'Haier', 'HXC-106', 'Laboratoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', '7A-23B', 'YY23B', 'Pédiatrie', NULL, 'actif', 'Mise en service (année uniquement) : 2015 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'healicom', 'SS20240932', 'Pédiatrie', '2024-11-25', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'healicom', 'SS20240933', 'Pédiatrie', '2024-11-25', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'healicom', 'SS20240934', 'Pédiatrie', '2024-11-25', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Nébuliseur', 'OMRON', '202205025', 'Pédiatrie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Nébuliseur', 'OMRON', '2022050', 'Pédiatrie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('ECG', 'CONTEC', '2103160054', 'Médecine', '2025-01-06', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'Yuwell', '00576', 'Médecine', NULL, 'actif', 'Mise en service (année uniquement) : 2019 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Nebuliseur', 'Omron', NULL, 'Médecine', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Défibrillateur', 'SCHILLER', '5895701512', 'SAU', NULL, 'actif', 'Emplacement : SAU | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('ECHO portatif', 'BUTTERFLY', 'May-26', 'SAU', NULL, 'actif', 'Emplacement : SAU | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Scie à plâtre', 'WU JING', '5307', 'SAU', NULL, 'actif', 'Emplacement : SAU | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Nébuliseur', 'OMRON', '2022010025JUF', 'SAU', '2022-11-24', 'actif', 'Emplacement : SAU | Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Défibrillateur', 'G.E.', '101167601', 'SAU', NULL, 'actif', 'Emplacement : SAU | Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur chirurgical', 'MEDCO', 'YWM2022095IS', 'SAU', NULL, 'actif', 'Emplacement : SAU | Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP (scialytique ?)', NULL, 'WYKLS-0211-18-30.0017', 'SAU', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur multiparametrique', 'Creative medical', '12031135', 'SAU', NULL, 'actif', 'Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Auto Réfractomètre', 'Essilor', '416001', 'Ophtalmologie', '2026-01-20', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Projecteur de test+Tableau', 'Appassamy', '204259', 'Ophtalmologie', '2026-01-20', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Lentille 90D', 'OCULAR', '101009', 'Ophtalmologie', '2026-01-20', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Champ visuel portatif', 'ELISAR', 'I01032DC5248', 'Ophtalmologie', '2026-01-20', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('TonoPachy', 'Topcon', '2631033', 'Ophtalmologie', '2026-01-20', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Microscope (Lampe à fente)', 'Essilor', '0316654', 'Ophtalmologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Frontofocomètre', 'Essilor', '0416161', 'Ophtalmologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Frontofocomètre', 'Shin-Nippon', '347453A', 'Ophtalmologie', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Projecteur d''image', 'Luneau', '1374', 'Ophtalmologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur Chirurgical', NULL, NULL, 'Ophtalmologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Bistouri Électrique', 'ERBE', '10103', 'Bloc Opératoire', NULL, 'actif', 'Emplacement : S1 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Bistouri Électrique', NULL, NULL, 'Bloc Opératoire', NULL, 'actif', 'Date brute non interprétable (à vérifier) : 20 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur Chirurgical', 'Yuwell', '24050700206', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moteur d’ostheosynthese', 'Starline', NULL, 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table OP', 'AZM', '61M430', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('extenseur', '24012601', NULL, 'Bloc Opératoire', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Dermatome', '24020501', NULL, 'Bloc Opératoire', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Thermosoudeuse', 'AMI', NULL, 'Bloc Opératoire', NULL, 'actif', 'Emplacement : Stérilisation | Mise en service (année uniquement) : 2017 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Autoclave', 'COLUSION', '28979', 'Bloc Opératoire', NULL, 'actif', 'Mise en service (année uniquement) : 2022 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Thermosoudeuse', 'DBL-900', '23', 'Bloc Opératoire', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP (02)', 'Angenieux', 'AR00035', 'Bloc Opératoire', NULL, 'actif', 'Emplacement : S1 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP (03)', 'Angenieux', 'AR00040', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table OP', 'TE Medical', 'ST08-0B1685021', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP Mobile', 'Cold L.', 'HF20160701', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Bistouri Électrique', 'TEKNO', '2100-1010', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur Chirurgical', 'Gima', '1684', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Négatoscope', 'EUA', '86/4282', 'Bloc Opératoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Négatoscope', 'EUA', 'U1504', 'Bloc Opératoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur Chirurgical', 'Yuwell', '00575', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP', 'Angenieux', '00025', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur de Surveillance', 'Lufa Med', '280728', 'Bloc Opératoire', '2025-05-11', 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Négatoscope', 'EUA', NULL, 'Bloc Opératoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Éclairage OP', 'ALM', '3611', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table OP', 'CGR', NULL, 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Appareil de Coelioscopie ?', 'Olympus', 'EB-182209', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Amplificateur de Brillance', 'Siemens', '1830', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Microscope Chirurgical', 'Aesculap', 'AS0616537', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Table Orthopédique', NULL, NULL, 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Lampe Scialytique OP', 'Steris', '22509', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Lampe Scialytique OP (2e bras ?)', 'Steris', '22505', 'Bloc Opératoire', NULL, 'actif', 'Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Lampe Frontale', 'WBSME', '23110210-015', 'Bloc Opératoire', NULL, 'actif', 'Marque incertaine (écriture manuscrite difficile à lire) | Numéro de série incertain (écriture manuscrite difficile à lire) | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Appareil de désinfection par voie aérienne', 'Anios', '3074', 'Bloc Opératoire', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Appareil de radio', 'DR GEM', 'ABC25304667A', 'Radiologie', '2025-07-10', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Appareil d’echo', 'MINDRAY', 'JM3-46006306', 'Radiologie', '2025-05-10', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Negatoscope', NULL, 'F1P080', 'Radiologie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'Yuwell', '24050700249', 'Chirurgie', '2024-05-21', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Scie à plâtre', NULL, NULL, 'Chirurgie', NULL, 'actif', 'Date brute suspecte (à vérifier) : 17/07/1905 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Pousse Seringue', 'MSL', 'BY-21810102', 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2021 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Pousse Seringue 03 Piste', 'HEALICOM', NULL, 'Anesthésie', '2024-12-11', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Pousse Seringue 02 Piste', NULL, 'J33044H0638', 'Anesthésie', '2024-10-18', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Respirateur', 'AX CENT', NULL, 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Respirateur', 'AX CENT', NULL, 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2024 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur multiparametrique', 'Osen', '12031134', 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2021 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur multiparametrique', 'creative medical', NULL, 'Anesthésie', '2024-10-18', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Moniteur multiparametrique', 'MSL', NULL, 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Aspirateur', 'Ie medical', 'H350', 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Colonne d’anesthesie', 'OHMEDA', '1870', 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Colonne d’anesthesie', 'OHMEDA', '1893', 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Colonne d’anesthesie', NULL, NULL, 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('ECG', 'LEPU Med', '123M25405993', 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Défibrillateur', 'BEIJIMGMB', '250711018DM', 'Anesthésie', NULL, 'actif', 'Mise en service (année uniquement) : 2025 | [IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Échographe', 'CONSONA N5', 'WC5-5B000277', 'Anesthésie', '2026-04-09', 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW()),
  ('Neurostimulateur', NULL, NULL, 'Anesthésie', NULL, 'actif', '[IMPORT-INVENTAIRE-BIOMEDICAL]', v_tenant_id, NOW(), NOW());

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RAISE NOTICE 'Import terminé : % équipements ajoutés au module GMAO.', v_inserted;
  END IF;
END $$;

-- ============================================================
-- Doublons exclus de l'import (présents dans la fiche source, non importés) :
--   - Gynéco-Obstétrique (G/O) / Cardiotocographe / CONTEC / série 240601005
--   - Médecine / Pousse Seringue / MSL / série BY-21810102
--   - Bloc Opératoire (BOP) / Aspirateur Chirurgical / Gima (idem) / série 1684 (idem)
-- ============================================================
