# Sauvegardes et restauration de la GED (serveur Ubuntu)

## Ce qui est sauvegardé, et quand

Chaque nuit à minuit, `scripts/backup-nightly.sh` (tâche `/etc/cron.d/ged-backup`, lancée en root) enregistre dans `/home/ged/backups/` :

| Dossier | Contenu |
|---|---|
| `db/ged_db_AAAA-MM-JJ.sql.gz` | la base de données complète |
| `uploads/AAAA-MM-JJ/` | tous les documents (PDF, pièces jointes…) tels qu'ils étaient ce jour-là |
| `signatures/AAAA-MM-JJ/` | les signatures et cachets |
| `backup-AAAA-MM-JJ.log` | le journal de la nuit |

Chaque dossier du jour est une copie **complète**. Les fichiers qui n'ont pas changé depuis la veille ne prennent pas de place en plus (liens durs).

**Conservation :**
- les 7 derniers jours ;
- plus le dimanche des 5 dernières semaines ;
- plus le 1er de chaque mois pendant 6 mois.

Cela fait 17 points de restauration une fois le cycle complet.

**Vérification :** chaque nuit, l'archive de la base est relue et le nombre de fichiers copiés est comparé à l'original. Le résultat est écrit dans `/home/ged/ged-app/backup-status/status.json`. En cas d'échec, de sauvegarde manquante depuis plus de 26 h ou de disque plein à plus de 85 %, **les administrateurs voient une alerte rouge sur l'Accueil de la GED**.

> ⚠️ Les sauvegardes sont sur le **même disque** que la GED. Elles protègent contre les erreurs, les suppressions et les corruptions, mais **pas** contre la perte du disque ou de la machine. Une copie hors du serveur reste à mettre en place.

## Restaurer

Toutes les commandes se lancent sur le serveur (`ssh ged@192.168.1.186`), avec `sudo`.

### 1. Voir les points de restauration

```bash
sudo ~/ged-app/scripts/restore-nightly.sh --list
```

### 2. Toujours faire un essai d'abord (sans risque)

```bash
sudo ~/ged-app/scripts/restore-nightly.sh --test 2026-09-30
```

L'essai restaure la base dans un conteneur temporaire, isolé du réseau et supprimé ensuite. **La production n'est pas touchée.** Il compare ensuite avec la production :
- le nombre de documents, de workflows et d'utilisateurs ;
- la date du dernier document ;
- la présence du fichier de chaque document.

Il se termine par `✅ Essai réussi` si la sauvegarde est utilisable.

### 3. Restauration réelle

```bash
sudo ~/ged-app/scripts/restore-nightly.sh 2026-09-30               # base + fichiers
sudo ~/ged-app/scripts/restore-nightly.sh 2026-09-30 --db-only     # base seulement
sudo ~/ged-app/scripts/restore-nightly.sh 2026-09-30 --files-only  # fichiers seulement
```

- Il faut taper `RESTAURER` pour confirmer.
- **Tout ce qui a été créé ou modifié après cette date est perdu.**
- La GED est indisponible pendant l'opération : quelques secondes pour la base, plus longtemps s'il faut recopier beaucoup de fichiers.
- Juste avant, l'état actuel est copié dans `backups/avant-restauration-<date-heure>/`.

**Quel mode choisir ?**
- **Base seulement** : des données ont été supprimées ou abîmées (documents effacés, mauvaise manipulation, correction ratée), mais les fichiers sont intacts.
- **Base + fichiers** : pour revenir entièrement à un jour donné, par exemple après une panne grave.
- **Fichiers seulement** : des fichiers ont été effacés sur le disque alors que la base est bonne. C'est un cas rare.

### Annuler une restauration

La copie `backups/avant-restauration-<date-heure>/` contient l'état d'avant la restauration. Pour y revenir :

```bash
S=/home/ged/backups/avant-restauration-<date-heure>
sudo docker stop ged-backend
zcat $S/ged_db.sql.gz | sudo docker exec -i ged-postgres psql -U ged_user -d ged_db -q -v ON_ERROR_STOP=1
# seulement si les fichiers avaient été restaurés :
sudo rsync -a --delete $S/uploads/ /var/lib/docker/volumes/ged-app_uploads_data/_data/
sudo rsync -a --delete $S/signatures/ /var/lib/docker/volumes/ged-app_signatures_data/_data/
sudo docker start ged-backend
```

Une fois la situation stable, supprimer ce dossier pour libérer la place.

## Vérifications régulières conseillées

- **Chaque mois** : `sudo ~/ged-app/scripts/restore-nightly.sh --test <date d'hier>`.
- Vérifier la place disque avec `df -h /`. Au-delà de 85 %, l'Accueil affiche un avertissement.
- Lire le journal d'une nuit : `cat /home/ged/backups/backup-$(date +%F).log`.
