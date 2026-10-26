// backend/src/types/metadata.ts
// Formes réelles de documents.metadata (JSONB), relevées dans le code qui les
// écrit. Toutes les clés sont optionnelles : un document n'en porte qu'une
// partie selon sa catégorie, et les anciens documents peuvent en manquer.
// Les clés réservées au serveur sont listées dans SERVER_METADATA_KEYS
// (controllers/documentController.js).

/** Signature manuscrite (controllers/manualSignatureController.js). */
export interface ManualSignatureRecord {
  signerName: string;
  signedAt: string; // ISO
  requestedBy: { id: string; name: string };
  page: number;
  placement: { x: number; y: number; w: number; h: number };
  autoPlaced: boolean;
  pointerType: 'touch' | 'pen' | 'mouse' | null;
  ip: string | null;
  userAgent: string;
  /** Signée sur une tablette (lien / QR code ou borne). */
  remote: { kioskName: string | null; ip: string | null; userAgent: string | null } | null;
  sha256: string;
  original: { filePath: string; fileName: string; fileType: string; sha256: string };
}

/** Remplaçant écrit sur une demande de permission approuvée (workflowController). */
export interface InterimRecord {
  name: string;
  byId: string | null;
  byName: string | null;
  at: string | null; // ISO
}

/** Zone de signature d'un PDF généré (factures / relevés PHP, signatureLabels). */
export interface SignatureZone {
  index: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signer?: unknown;
}

/** Document de la GED fusionné dans celui-ci (addPageToDocument). */
export interface MergedFromEntry {
  id: string;
  title: string;
  position: 'before' | 'after';
  at: string; // ISO
  by: string;
}

/** Missionnaire d'un ordre de mission (frontend/src/utils/omMissionnaires.js). */
export interface Missionnaire {
  nom: string;
  id: string | null;
  source: string | null;
}

/** Champs d'un ordre de mission (formulaire OrdreDeMission, ordreMissionChain). */
export interface OrdreMissionFields {
  type_mission?: string;
  objet_mission?: string;
  destination?: string;
  date_depart?: string;
  date_retour?: string;
  heure_depart?: string;
  heure_retour?: string;
  /** Liste des noms séparés par des virgules (titre, PDF, anciens écrans). */
  nom_missionnaire?: string;
  missionnaire_id?: string | null;
  missionnaire_source?: string | null;
  /** OM récents : un ou plusieurs missionnaires. */
  missionnaires?: Missionnaire[];
  nom_conducteur?: string;
  conducteur_id?: string | null;
  conducteur_source?: string | null;
  vehicle_id?: string | null;
  /** Ajoute le comptable au circuit. */
  frais_mission?: boolean;
}

/** Période d'une demande de permission (formulaire DemandePermission). */
export interface PermissionPeriod {
  startDate: string; // AAAA-MM-JJ
  endDate: string;
}

export interface PermissionFields {
  periods?: PermissionPeriod[];
  totalDays?: number;
  motif?: string;
  motif_exceptionnel?: string;
  noms_prenoms?: string;
  service?: string;
  objet?: string;
  date_lieu?: string;
  remplacant?: string;
}

/** Clés posées par le serveur (jamais modifiables par le client). */
export interface ServerMetadata {
  manualSignature?: ManualSignatureRecord;
  verification_hash?: string;
  interim?: InterimRecord;
  mergedFrom?: MergedFromEntry[];
  paye?: boolean;
  payeAt?: string;
  signatureZones?: SignatureZone[];
  signaturePage?: number;
  unsignedFilePath?: string;
  pageCount?: number;
  sourceType?: string;
  vehicleId?: string;
  missionId?: string;
  checkId?: string;
  inventoryId?: string;
}

/**
 * metadata d'un document. Les formulaires ajoutent leurs propres champs :
 * les clés inconnues restent permises (index signature) en attendant que
 * chaque formulaire soit décrit.
 */
export type DocumentMetadata = ServerMetadata & OrdreMissionFields & PermissionFields & {
  type?: string;
  [key: string]: unknown;
};
