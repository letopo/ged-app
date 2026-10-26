-- Généré par scripts/dump-test-schema.sh le 2026-10-26 — structure seule, aucune donnée.
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_demandes_achats_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_demandes_achats_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'in_progress',
    'completed'
);


--
-- Name: enum_departments_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_departments_type AS ENUM (
    'medical',
    'paramedical',
    'administrative',
    'support',
    'pharmacy'
);


--
-- Name: enum_documents_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_documents_status AS ENUM (
    'draft',
    'pending_validation',
    'approved',
    'rejected',
    'en_attente_dependance',
    'in_progress'
);


--
-- Name: enum_employees_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_gender AS ENUM (
    'M',
    'F'
);


--
-- Name: enum_employees_marital_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_marital_status AS ENUM (
    'Célibataire',
    'Marié(e)',
    'Divorcé(e)',
    'Veuf(ve)'
);


--
-- Name: enum_invoice_folders_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_invoice_folders_type AS ENUM (
    'inbox',
    'custom',
    'archive',
    'container'
);


--
-- Name: enum_motifs_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_motifs_type AS ENUM (
    'MG',
    'Biomedical',
    'Informatique'
);


--
-- Name: enum_php_factures_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_php_factures_statut AS ENUM (
    'brouillon',
    'valide'
);


--
-- Name: enum_positions_queue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_positions_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


--
-- Name: enum_positions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_positions_status AS ENUM (
    'offline',
    'available',
    'busy'
);


--
-- Name: enum_queue_positions_queue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_queue_positions_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


--
-- Name: enum_queue_positions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_queue_positions_status AS ENUM (
    'available',
    'busy',
    'offline'
);


--
-- Name: enum_schedule_changes_log_change_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schedule_changes_log_change_type AS ENUM (
    'create',
    'update',
    'delete',
    'status_change',
    'validation',
    'publish'
);


--
-- Name: enum_schedule_validations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schedule_validations_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: enum_schedule_validations_validator_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schedule_validations_validator_role AS ENUM (
    'dds',
    'medical_chief',
    'dg'
);


--
-- Name: enum_schedules_schedule_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schedules_schedule_type AS ENUM (
    'administrative',
    'paramedical_services',
    'paramedical_pharmacy',
    'medical_duties',
    'hospital_services_agents',
    'general_services',
    'emergency_reinforcement',
    'weekend'
);


--
-- Name: enum_schedules_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schedules_status AS ENUM (
    'draft',
    'pending_dds',
    'pending_medical',
    'pending_dg',
    'approved',
    'rejected',
    'archived'
);


--
-- Name: enum_template_fields_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_template_fields_type AS ENUM (
    'text',
    'number',
    'date',
    'select',
    'textarea'
);


--
-- Name: enum_tenants_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tenants_status AS ENUM (
    'active',
    'suspended',
    'cancelled'
);


--
-- Name: enum_ticket_history_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_ticket_history_action AS ENUM (
    'created',
    'called',
    'started',
    'transferred',
    'completed',
    'cancelled'
);


--
-- Name: enum_tickets_patient_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tickets_patient_type AS ENUM (
    'php',
    'normal'
);


--
-- Name: enum_tickets_queue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tickets_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


--
-- Name: enum_tickets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tickets_status AS ENUM (
    'waiting',
    'called',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: enum_tickets_visit_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tickets_visit_type AS ENUM (
    'consultation',
    'visite',
    'garde_malade'
);


--
-- Name: enum_trello_activity_logs_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_trello_activity_logs_action_type AS ENUM (
    'card_created',
    'card_moved',
    'card_updated',
    'card_archived',
    'card_assigned',
    'card_unassigned',
    'comment_added',
    'attachment_added',
    'due_date_set',
    'priority_changed',
    'status_changed',
    'label_added',
    'label_removed'
);


--
-- Name: enum_trello_attachments_attachment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_trello_attachments_attachment_type AS ENUM (
    'photo_before',
    'photo_after',
    'document',
    'other'
);


--
-- Name: enum_trello_boards_service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_trello_boards_service_type AS ENUM (
    'MG',
    'Biomedical',
    'Informatique'
);


--
-- Name: enum_trello_cards_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_trello_cards_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: enum_trello_cards_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_trello_cards_status AS ENUM (
    'todo',
    'in_progress',
    'blocked',
    'completed',
    'cancelled'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'user',
    'validator',
    'director',
    'admin',
    'gardien',
    'agent_accueil_php',
    'agent_accueil_normal',
    'caissier',
    'chef_de_service',
    'superadmin'
);


--
-- Name: enum_workflows_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_workflows_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'queued',
    'en_pause'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email character varying(255),
    user_name character varying(255),
    action character varying(255) NOT NULL,
    resource character varying(255) NOT NULL,
    resource_id character varying(255),
    details jsonb,
    ip_address character varying(100),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: category_access_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_access_rules (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    category character varying(150) NOT NULL,
    allowed_postes jsonb DEFAULT '[]'::jsonb NOT NULL,
    include_participants boolean DEFAULT true NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: chat_conversation_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversation_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    last_read_at timestamp with time zone DEFAULT now(),
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) DEFAULT 'channel'::character varying NOT NULL,
    name character varying(100),
    description text,
    document_id uuid,
    created_by uuid,
    is_archived boolean DEFAULT false NOT NULL,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL,
    CONSTRAINT chat_conversations_type_check CHECK (((type)::text = ANY ((ARRAY['channel'::character varying, 'direct'::character varying, 'document'::character varying])::text[])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    author_id uuid,
    content text DEFAULT ''::text NOT NULL,
    attachment_path text,
    attachment_name character varying(255),
    is_deleted boolean DEFAULT false NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: compta_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compta_docs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_ordre integer,
    date_reception date,
    libelle text,
    date_piece date,
    numero_piece character varying(120),
    numero_comptable character varying(120),
    montant numeric(18,2),
    devise character varying(8) DEFAULT 'XAF'::character varying NOT NULL,
    type_mouvement character varying(10) DEFAULT 'inconnu'::character varying NOT NULL,
    document_id uuid,
    statut character varying(20) DEFAULT 'valide'::character varying NOT NULL,
    extraction jsonb,
    saisi_par uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    group_id uuid,
    ligne_ordre integer DEFAULT 1,
    tenant_id uuid NOT NULL
);


--
-- Name: demandes_achats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demandes_achats (
    id uuid NOT NULL,
    da_number character varying(255) NOT NULL,
    requester_id uuid NOT NULL,
    da_date date NOT NULL,
    domain character varying(255) NOT NULL,
    domain_description text,
    delivery_date date,
    purchase_type character varying(255) NOT NULL,
    article_nature character varying(255),
    request_description text NOT NULL,
    beneficiary_name character varying(255),
    beneficiary_email character varying(255),
    beneficiary_phone character varying(255),
    is_magasin_output boolean DEFAULT false,
    linked_doc_number character varying(255),
    is_for_works boolean DEFAULT false,
    non_ref_articles jsonb DEFAULT '[]'::jsonb,
    total_ref_value numeric(10,2) DEFAULT 0,
    total_non_ref_value numeric(10,2) DEFAULT 0,
    attached_documents jsonb DEFAULT '[]'::jsonb,
    supplier_id uuid,
    status public.enum_demandes_achats_status DEFAULT 'draft'::public.enum_demandes_achats_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type public.enum_departments_type NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: COLUMN departments.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.code IS 'Code du département (ex: SAU, CHIR, MED)';


--
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.name IS 'Nom complet du département';


--
-- Name: COLUMN departments.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.type IS 'Type de département';


--
-- Name: document_transmissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_transmissions (
    id uuid NOT NULL,
    document_id uuid NOT NULL,
    from_user_id uuid,
    to_user_id uuid NOT NULL,
    message text,
    read_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255),
    file_path character varying(255) NOT NULL,
    file_size integer,
    file_type character varying(255),
    user_id uuid NOT NULL,
    category character varying(255),
    metadata jsonb,
    extracted_text text,
    status character varying(255) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    date_debut timestamp with time zone,
    date_fin timestamp with time zone,
    linked_document_id uuid,
    invoice_folder_id uuid,
    archived boolean DEFAULT false NOT NULL,
    tenant_id uuid NOT NULL,
    visibility character varying(255) DEFAULT 'personal'::character varying NOT NULL,
    service_id uuid
);


--
-- Name: COLUMN documents.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.metadata IS 'Stocke des informations supplÔö£┬«mentaires comme l''Ôö£┬«tat de la signature (hasSignature, signaturesCount)';


--
-- Name: COLUMN documents.date_debut; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.date_debut IS 'Date de dÔö£┬«but de la permission';


--
-- Name: COLUMN documents.date_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.date_fin IS 'Date de fin de la permission';


--
-- Name: COLUMN documents.visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.visibility IS '''personal'' (auteur + validateurs de workflow) ou ''service'' (tout le service)';


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    birth_date date NOT NULL,
    birth_place character varying(255) NOT NULL,
    gender public.enum_employees_gender NOT NULL,
    children_count integer DEFAULT 0 NOT NULL,
    matricule character varying(255) NOT NULL,
    marital_status public.enum_employees_marital_status NOT NULL,
    service_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    categorie character varying(255)
);


--
-- Name: COLUMN employees.categorie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.categorie IS 'Catégorie/grade du personnel — détermine le taux d''indemnité de mission';


--
-- Name: equipements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipements (
    id integer NOT NULL,
    nom character varying(255) NOT NULL,
    reference character varying(255),
    numero_serie character varying(255),
    service character varying(255),
    type_equipement character varying(255),
    marque character varying(255),
    modele character varying(255),
    date_mise_en_service date,
    statut character varying(20) DEFAULT 'actif'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    matricule character varying(255),
    origine character varying(50) DEFAULT 'achat'::character varying,
    fournisseur character varying(255),
    date_mise_au_rebus date,
    tenant_id uuid NOT NULL,
    CONSTRAINT equipements_statut_check CHECK (((statut)::text = ANY ((ARRAY['actif'::character varying, 'en_reparation'::character varying, 'hors_service'::character varying])::text[])))
);


--
-- Name: equipements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipements_id_seq OWNED BY public.equipements.id;


--
-- Name: form_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id character varying(100) NOT NULL,
    can_view boolean DEFAULT true,
    can_fill boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: form_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    form_version integer DEFAULT 1,
    submitted_by uuid,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying,
    ip_address character varying(45),
    submitted_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    workflow_status character varying(30) DEFAULT NULL::character varying,
    workflow_current_step integer,
    workflow_data jsonb
);


--
-- Name: COLUMN form_responses.workflow_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_responses.workflow_status IS 'null | pending_approval | approved | rejected';


--
-- Name: COLUMN form_responses.workflow_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_responses.workflow_data IS 'Snapshot du template + statut de chaque étape';


--
-- Name: forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    schema jsonb DEFAULT '{"logic": {"conditions": [], "calculations": []}, "fields": [], "layout": {"gap": 8, "columns": 12, "rowHeight": 40}, "version": 1}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    published_at timestamp without time zone,
    version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid NOT NULL,
    workflow_template_id uuid
);


--
-- Name: gmao_acquisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_acquisitions (
    id integer NOT NULL,
    reference character varying(50),
    designation character varying(255) NOT NULL,
    type_equipement character varying(100),
    quantite integer DEFAULT 1 NOT NULL,
    service_demandeur character varying(100),
    demandeur_nom character varying(255),
    demandeur_id uuid,
    priorite character varying(10) DEFAULT 'normale'::character varying NOT NULL,
    motif text,
    specifications text,
    budget_estime double precision,
    statut character varying(20) DEFAULT 'en_attente'::character varying NOT NULL,
    date_demande date NOT NULL,
    date_approbation date,
    date_commande date,
    date_reception date,
    fournisseur character varying(255),
    numero_commande character varying(100),
    prix_achat double precision,
    equipement_id integer,
    motif_rejet text,
    notes text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_acquisitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_acquisitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_acquisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_acquisitions_id_seq OWNED BY public.gmao_acquisitions.id;


--
-- Name: gmao_budget_depenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_budget_depenses (
    id integer NOT NULL,
    annee integer NOT NULL,
    type character varying(10) NOT NULL,
    date date NOT NULL,
    description character varying(500),
    categorie character varying(100),
    montant double precision NOT NULL,
    fournisseur character varying(255),
    numero_facture character varying(100),
    montant_ht double precision,
    tva double precision,
    statut_facture character varying(20) DEFAULT 'en_attente'::character varying,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_budget_depenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_budget_depenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_budget_depenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_budget_depenses_id_seq OWNED BY public.gmao_budget_depenses.id;


--
-- Name: gmao_budget_lignes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_budget_lignes (
    id integer NOT NULL,
    annee integer NOT NULL,
    categorie character varying(100) NOT NULL,
    montant double precision DEFAULT '0'::double precision NOT NULL,
    description text,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_budget_lignes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_budget_lignes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_budget_lignes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_budget_lignes_id_seq OWNED BY public.gmao_budget_lignes.id;


--
-- Name: gmao_contrats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_contrats (
    id integer NOT NULL,
    reference character varying(50),
    prestataire character varying(255) NOT NULL,
    type_contrat character varying(30) DEFAULT 'maintenance_totale'::character varying NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    montant double precision,
    periodicite character varying(20),
    equipements_couverts text,
    services_couverts text,
    statut character varying(20) DEFAULT 'actif'::character varying NOT NULL,
    description text,
    contact_prestataire character varying(255),
    telephone character varying(30),
    email character varying(255),
    alerte_renouvellement integer DEFAULT 30,
    notes text,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_contrats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_contrats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_contrats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_contrats_id_seq OWNED BY public.gmao_contrats.id;


--
-- Name: gmao_mouvements_pieces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_mouvements_pieces (
    id integer NOT NULL,
    piece_id integer NOT NULL,
    type character varying(20) NOT NULL,
    quantite integer NOT NULL,
    date date NOT NULL,
    intervention_id integer,
    motif character varying(255),
    prix_unitaire double precision,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_mouvements_pieces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_mouvements_pieces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_mouvements_pieces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_mouvements_pieces_id_seq OWNED BY public.gmao_mouvements_pieces.id;


--
-- Name: gmao_pieces_rechange; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmao_pieces_rechange (
    id integer NOT NULL,
    reference character varying(100) NOT NULL,
    designation character varying(255) NOT NULL,
    categorie character varying(100),
    quantite_stock integer DEFAULT 0 NOT NULL,
    quantite_min integer DEFAULT 1 NOT NULL,
    unite character varying(30) DEFAULT 'unité'::character varying,
    prix_unitaire double precision,
    fournisseur character varying(255),
    localisation character varying(100),
    notes text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmao_pieces_rechange_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmao_pieces_rechange_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmao_pieces_rechange_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmao_pieces_rechange_id_seq OWNED BY public.gmao_pieces_rechange.id;


--
-- Name: interventions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interventions (
    id integer NOT NULL,
    equipement_id integer NOT NULL,
    plan_id integer,
    type character varying(20) DEFAULT 'preventive'::character varying NOT NULL,
    statut character varying(20) DEFAULT 'planifiee'::character varying NOT NULL,
    priorite character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    date_planifiee date NOT NULL,
    date_realisation date,
    technicien_id uuid,
    description text,
    actions_effectuees text,
    pieces_remplacees text,
    duree_reelle double precision,
    observations text,
    signale_par character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL,
    CONSTRAINT interventions_priorite_check CHECK (((priorite)::text = ANY ((ARRAY['faible'::character varying, 'normal'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT interventions_statut_check CHECK (((statut)::text = ANY ((ARRAY['planifiee'::character varying, 'en_cours'::character varying, 'terminee'::character varying, 'reportee'::character varying])::text[]))),
    CONSTRAINT interventions_type_check CHECK (((type)::text = ANY ((ARRAY['preventive'::character varying, 'corrective'::character varying])::text[])))
);


--
-- Name: interventions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interventions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interventions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interventions_id_seq OWNED BY public.interventions.id;


--
-- Name: invoice_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_folders (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type public.enum_invoice_folders_type DEFAULT 'custom'::public.enum_invoice_folders_type,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    parent_id uuid,
    tenant_id uuid NOT NULL
);


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    key text NOT NULL,
    client_name character varying(255),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- Name: mission_meal_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_meal_rates (
    id uuid NOT NULL,
    categorie character varying(255) NOT NULL,
    montant_petit_dejeuner numeric(10,2) DEFAULT 0 NOT NULL,
    montant_dejeuner numeric(10,2) DEFAULT 0 NOT NULL,
    montant_diner numeric(10,2) DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    montant_hebergement numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: mission_meal_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_meal_thresholds (
    id uuid NOT NULL,
    heure_limite_petit_dejeuner time without time zone DEFAULT '07:30:00'::time without time zone NOT NULL,
    heure_limite_diner time without time zone DEFAULT '20:00:00'::time without time zone NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    heure_dejeuner_debut time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
    heure_dejeuner_fin time without time zone DEFAULT '14:00:00'::time without time zone NOT NULL,
    heure_diner_debut time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    montant_prime_securite numeric(10,2) DEFAULT 5000 NOT NULL,
    montant_peage_chauffeur numeric(10,2) DEFAULT 1000 NOT NULL
);


--
-- Name: motifs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motifs (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_on_new_task boolean DEFAULT true,
    email_on_approval boolean DEFAULT true,
    email_on_rejection boolean DEFAULT true,
    email_on_comment boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: ordre_mission_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordre_mission_types (
    id uuid NOT NULL,
    code character varying(40) NOT NULL,
    label character varying(100) NOT NULL,
    poste_chain jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL,
    service_id uuid
);


--
-- Name: COLUMN ordre_mission_types.service_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordre_mission_types.service_id IS 'Pôle lié à ce type — restreint la liste de missionnaires proposée';


--
-- Name: php_bons_prise_en_charge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_bons_prise_en_charge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_bon character varying(50) NOT NULL,
    patient_id uuid NOT NULL,
    date_emission date DEFAULT CURRENT_DATE NOT NULL,
    heure_emission time without time zone,
    service_destination character varying(255),
    motif_visite text,
    agent_emetteur_id uuid NOT NULL,
    status character varying(20) DEFAULT 'emis'::character varying NOT NULL,
    ticket_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_bons_prise_en_charge_status_check CHECK (((status)::text = ANY ((ARRAY['emis'::character varying, 'utilise'::character varying, 'annule'::character varying])::text[])))
);


--
-- Name: php_consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    bon_prise_en_charge_id uuid,
    date_consultation date DEFAULT CURRENT_DATE NOT NULL,
    heure_arrivee time without time zone,
    heure_appel_medecin time without time zone,
    heure_debut_consultation time without time zone,
    heure_fin_consultation time without time zone,
    duree_attente_minutes integer,
    service_name character varying(255),
    medecin_id uuid,
    medecin_nom character varying(255),
    motif text,
    diagnostic text,
    ordonnance text,
    resultat character varying(30) DEFAULT 'en_cours'::character varying NOT NULL,
    agent_accueil_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_consultations_resultat_check CHECK (((resultat)::text = ANY ((ARRAY['en_cours'::character varying, 'retour_travail'::character varying, 'repos'::character varying, 'hospitalisation'::character varying, 'operation'::character varying, 'transfert'::character varying, 'deces'::character varying, 'non_presente'::character varying, 'pharmacie'::character varying, 'laboratoire'::character varying, 'radiologie'::character varying, 'specialiste'::character varying, 'rendez_vous'::character varying])::text[])))
);


--
-- Name: php_deces_transferts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_deces_transferts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    type character varying(20) NOT NULL,
    date date NOT NULL,
    motif text,
    destination character varying(500),
    causes_deces text,
    enregistre_par_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_deces_transferts_type_check CHECK (((type)::text = ANY ((ARRAY['deces'::character varying, 'transfert'::character varying])::text[])))
);


--
-- Name: php_factures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_factures (
    id uuid NOT NULL,
    numero_ordre integer,
    date_reception date,
    fournisseur character varying(255),
    date_facture date,
    numero_facture character varying(120),
    numero_comptable character varying(120),
    montant numeric(18,2),
    devise character varying(8) DEFAULT 'XAF'::character varying NOT NULL,
    document_id uuid,
    statut public.enum_php_factures_statut DEFAULT 'brouillon'::public.enum_php_factures_statut NOT NULL,
    extraction jsonb,
    saisi_par uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: php_hospitalisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_hospitalisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    service_hospitalisation character varying(255),
    numero_chambre character varying(50),
    date_entree date NOT NULL,
    date_sortie date,
    duree_sejour integer,
    status character varying(20) DEFAULT 'en_cours'::character varying NOT NULL,
    medecin_responsable character varying(255),
    diagnostic text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_hospitalisations_status_check CHECK (((status)::text = ANY ((ARRAY['en_cours'::character varying, 'sorti'::character varying, 'transfert'::character varying, 'deces'::character varying])::text[])))
);


--
-- Name: php_infirmeries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_infirmeries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(255) NOT NULL,
    localisation character varying(255),
    responsable character varying(255),
    telephone character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: php_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    type_operation character varying(255),
    date_operation date,
    chirurgien_nom character varying(255),
    anesthesiste_nom character varying(255),
    status character varying(20) DEFAULT 'planifiee'::character varying NOT NULL,
    diagnostic text,
    compte_rendu text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_operations_status_check CHECK (((status)::text = ANY ((ARRAY['planifiee'::character varying, 'realisee'::character varying, 'annulee'::character varying])::text[])))
);


--
-- Name: php_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matricule character varying(100) NOT NULL,
    nom character varying(255) NOT NULL,
    prenom character varying(255),
    genre character varying(1),
    date_naissance date,
    secteur_id uuid,
    infirmerie_id uuid,
    telephone character varying(20),
    adresse character varying(500),
    status character varying(20) DEFAULT 'actif'::character varying NOT NULL,
    created_by_user_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL,
    CONSTRAINT php_patients_genre_check CHECK (((genre)::text = ANY ((ARRAY['M'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT php_patients_status_check CHECK (((status)::text = ANY ((ARRAY['actif'::character varying, 'decede'::character varying, 'transfere'::character varying, 'inactif'::character varying])::text[])))
);


--
-- Name: php_rendez_vous; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_rendez_vous (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    date_rdv date NOT NULL,
    heure_rdv time without time zone,
    service character varying(255),
    motif text,
    notes text,
    status character varying(20) DEFAULT 'planifie'::character varying NOT NULL,
    cree_par_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_rendez_vous_status_check CHECK (((status)::text = ANY ((ARRAY['planifie'::character varying, 'honore'::character varying, 'annule'::character varying, 'reporte'::character varying])::text[])))
);


--
-- Name: php_repos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_repos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    duree_jours integer,
    status character varying(20) DEFAULT 'en_cours'::character varying NOT NULL,
    prolongations jsonb DEFAULT '[]'::jsonb,
    motif text,
    medecin_id uuid,
    medecin_nom character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT php_repos_status_check CHECK (((status)::text = ANY ((ARRAY['en_cours'::character varying, 'termine'::character varying, 'prolonge'::character varying])::text[])))
);


--
-- Name: php_secteurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_secteurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    nom character varying(255) NOT NULL,
    infirmerie_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: php_services_medicaux; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.php_services_medicaux (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(255) NOT NULL,
    actif boolean DEFAULT true
);


--
-- Name: plans_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans_maintenance (
    id integer NOT NULL,
    equipement_id integer NOT NULL,
    mois jsonb DEFAULT '[]'::jsonb NOT NULL,
    jour_du_mois integer NOT NULL,
    duree_estimee double precision,
    technicien_id uuid,
    notes text,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: plans_maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plans_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plans_maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plans_maintenance_id_seq OWNED BY public.plans_maintenance.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id uuid NOT NULL,
    queue_type public.enum_positions_queue_type NOT NULL,
    position_number integer NOT NULL,
    user_id uuid,
    status public.enum_positions_status DEFAULT 'offline'::public.enum_positions_status,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: postes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postes (
    id uuid NOT NULL,
    code character varying(40) NOT NULL,
    label character varying(100) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    subscription text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN push_subscriptions.subscription; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.push_subscriptions.subscription IS 'JSON stringifié de la souscription push complète';


--
-- Name: queue_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_positions (
    id uuid NOT NULL,
    queue_type public.enum_queue_positions_queue_type NOT NULL,
    position_number integer NOT NULL,
    user_id uuid,
    current_ticket_id uuid,
    status public.enum_queue_positions_status DEFAULT 'offline'::public.enum_queue_positions_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: release_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_notes (
    id uuid NOT NULL,
    title character varying(200) NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    target character varying(120) DEFAULT 'app'::character varying NOT NULL,
    audience character varying(20) DEFAULT 'all'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp with time zone,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sage_facture_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sage_facture_imports (
    id uuid NOT NULL,
    sage_doc_piece character varying(64) NOT NULL,
    sage_client_num character varying(64),
    patient_nom character varying(255),
    encounter_key character varying(128),
    montant_ht numeric(18,2),
    montant_ttc numeric(18,2),
    document_id uuid,
    raw_snapshot jsonb,
    imported_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: schedule_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_assignments (
    id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    user_id uuid,
    employee_id uuid,
    employee_name character varying(200),
    assignment_date date NOT NULL,
    shift_type_id uuid NOT NULL,
    shift_code character varying(10) NOT NULL,
    department_id uuid,
    "position" character varying(100),
    notes text,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN schedule_assignments.schedule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.schedule_id IS 'Planning parent';


--
-- Name: COLUMN schedule_assignments.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.user_id IS 'Utilisateur assigné (si dans users)';


--
-- Name: COLUMN schedule_assignments.employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.employee_id IS 'Employé assigné (si dans employees)';


--
-- Name: COLUMN schedule_assignments.employee_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.employee_name IS 'Nom de l''employé (pour référence rapide)';


--
-- Name: COLUMN schedule_assignments.assignment_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.assignment_date IS 'Date de l''affectation';


--
-- Name: COLUMN schedule_assignments.shift_type_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.shift_type_id IS 'Type de shift';


--
-- Name: COLUMN schedule_assignments.shift_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.shift_code IS 'Code du shift pour référence rapide (P, R, J, N, etc.)';


--
-- Name: COLUMN schedule_assignments.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.department_id IS 'Département pour ce jour (si applicable)';


--
-- Name: COLUMN schedule_assignments."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments."position" IS 'Position/poste spécifique (ex: Poste 1, SAU, etc.)';


--
-- Name: COLUMN schedule_assignments.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.notes IS 'Notes spécifiques pour cette affectation';


--
-- Name: COLUMN schedule_assignments.notification_sent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.notification_sent IS 'Notification envoyée';


--
-- Name: COLUMN schedule_assignments.notification_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.notification_sent_at IS 'Date d''envoi de la notification';


--
-- Name: COLUMN schedule_assignments.reminder_sent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.reminder_sent IS 'Rappel envoyé';


--
-- Name: COLUMN schedule_assignments.reminder_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_assignments.reminder_sent_at IS 'Date d''envoi du rappel';


--
-- Name: schedule_changes_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_changes_log (
    id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    assignment_id uuid,
    changed_by_user_id uuid NOT NULL,
    change_type public.enum_schedule_changes_log_change_type NOT NULL,
    affected_date date,
    affected_employee character varying(200),
    old_value json,
    new_value json,
    description text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN schedule_changes_log.schedule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.schedule_id IS 'Planning modifié';


--
-- Name: COLUMN schedule_changes_log.assignment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.assignment_id IS 'ID de l''affectation modifiée (peut être null si supprimée)';


--
-- Name: COLUMN schedule_changes_log.changed_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.changed_by_user_id IS 'Utilisateur ayant effectué la modification';


--
-- Name: COLUMN schedule_changes_log.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.change_type IS 'Type de modification';


--
-- Name: COLUMN schedule_changes_log.affected_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.affected_date IS 'Date affectée par le changement';


--
-- Name: COLUMN schedule_changes_log.affected_employee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.affected_employee IS 'Nom de l''employé affecté';


--
-- Name: COLUMN schedule_changes_log.old_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.old_value IS 'Ancienne valeur (JSON)';


--
-- Name: COLUMN schedule_changes_log.new_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.new_value IS 'Nouvelle valeur (JSON)';


--
-- Name: COLUMN schedule_changes_log.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.description IS 'Description du changement';


--
-- Name: COLUMN schedule_changes_log.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.ip_address IS 'Adresse IP de l''utilisateur';


--
-- Name: COLUMN schedule_changes_log.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_changes_log.user_agent IS 'User agent du navigateur';


--
-- Name: schedule_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_validations (
    id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    validator_role public.enum_schedule_validations_validator_role NOT NULL,
    validator_user_id uuid,
    validation_order integer NOT NULL,
    status public.enum_schedule_validations_status DEFAULT 'pending'::public.enum_schedule_validations_status,
    validated_at timestamp with time zone,
    comments text,
    rejection_reason text,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN schedule_validations.schedule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.schedule_id IS 'Planning à valider';


--
-- Name: COLUMN schedule_validations.validator_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.validator_role IS 'Rôle du validateur';


--
-- Name: COLUMN schedule_validations.validator_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.validator_user_id IS 'Utilisateur validateur';


--
-- Name: COLUMN schedule_validations.validation_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.validation_order IS 'Ordre de validation (1, 2, 3...)';


--
-- Name: COLUMN schedule_validations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.status IS 'Statut de la validation';


--
-- Name: COLUMN schedule_validations.validated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.validated_at IS 'Date de validation/rejet';


--
-- Name: COLUMN schedule_validations.comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.comments IS 'Commentaires du validateur';


--
-- Name: COLUMN schedule_validations.rejection_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.rejection_reason IS 'Raison du rejet';


--
-- Name: COLUMN schedule_validations.notification_sent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_validations.notification_sent IS 'Notification envoyée au validateur';


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    id uuid NOT NULL,
    title character varying(200) NOT NULL,
    schedule_type public.enum_schedules_schedule_type NOT NULL,
    department_id uuid,
    month integer NOT NULL,
    year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_by_user_id uuid NOT NULL,
    status public.enum_schedules_status DEFAULT 'draft'::public.enum_schedules_status,
    validation_workflow json,
    notes text,
    published_at timestamp with time zone,
    published_by_user_id uuid,
    pdf_path character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: COLUMN schedules.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.title IS 'Titre du planning (ex: Planning Novembre 2025)';


--
-- Name: COLUMN schedules.schedule_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.schedule_type IS 'Type de planning';


--
-- Name: COLUMN schedules.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.department_id IS 'Département concerné (si applicable)';


--
-- Name: COLUMN schedules.month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.month IS 'Mois du planning (1-12)';


--
-- Name: COLUMN schedules.year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.year IS 'Année du planning';


--
-- Name: COLUMN schedules.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.start_date IS 'Date de début du planning';


--
-- Name: COLUMN schedules.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.end_date IS 'Date de fin du planning';


--
-- Name: COLUMN schedules.created_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.created_by_user_id IS 'Utilisateur créateur';


--
-- Name: COLUMN schedules.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.status IS 'Statut du planning';


--
-- Name: COLUMN schedules.validation_workflow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.validation_workflow IS 'Workflow de validation requis selon le type';


--
-- Name: COLUMN schedules.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.notes IS 'Notes ou commentaires';


--
-- Name: COLUMN schedules.published_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.published_at IS 'Date de publication';


--
-- Name: COLUMN schedules.pdf_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.pdf_path IS 'Chemin vers le PDF généré';


--
-- Name: service_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_members (
    id uuid NOT NULL,
    service_id uuid NOT NULL,
    user_id uuid NOT NULL,
    fonction character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: shift_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_types (
    id uuid NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    color character varying(7),
    start_time time without time zone,
    end_time time without time zone,
    is_work_day boolean DEFAULT true,
    is_night_shift boolean DEFAULT false,
    requires_notification boolean DEFAULT false,
    notification_hours_before integer DEFAULT 24,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: COLUMN shift_types.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.code IS 'Code du shift (P, R, J, N, A, etc.)';


--
-- Name: COLUMN shift_types.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.name IS 'Nom du shift';


--
-- Name: COLUMN shift_types.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.color IS 'Couleur hexadécimale pour affichage (#RRGGBB)';


--
-- Name: COLUMN shift_types.start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.start_time IS 'Heure de début (si applicable)';


--
-- Name: COLUMN shift_types.end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.end_time IS 'Heure de fin (si applicable)';


--
-- Name: COLUMN shift_types.is_work_day; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.is_work_day IS 'Indique si c''est un jour de travail';


--
-- Name: COLUMN shift_types.is_night_shift; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.is_night_shift IS 'Indique si c''est une garde de nuit';


--
-- Name: COLUMN shift_types.requires_notification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.requires_notification IS 'Nécessite une notification de rappel';


--
-- Name: COLUMN shift_types.notification_hours_before; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shift_types.notification_hours_before IS 'Heures avant le shift pour notifier';


--
-- Name: template_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_fields (
    id integer NOT NULL,
    template_id integer NOT NULL,
    field_name character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type public.enum_template_fields_type NOT NULL,
    options json,
    "order" integer DEFAULT 0 NOT NULL,
    required boolean DEFAULT false,
    default_value character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: template_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.template_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_fields_id_seq OWNED BY public.template_fields.id;


--
-- Name: template_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255) NOT NULL,
    allowed_roles jsonb DEFAULT '[]'::jsonb,
    allowed_user_ids jsonb DEFAULT '[]'::jsonb,
    is_restricted boolean DEFAULT false,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL,
    default_visibility character varying(255) DEFAULT 'personal'::character varying NOT NULL
);


--
-- Name: COLUMN template_permissions.default_visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_permissions.default_visibility IS 'Visibilité par défaut des documents créés avec ce template';


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    icon character varying(255),
    description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: tenant_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_integrations (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    kind character varying(20) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_encrypted text,
    admin_can_manage boolean DEFAULT false NOT NULL,
    last_test_at timestamp with time zone,
    last_test_ok boolean,
    last_test_error text,
    last_run_at timestamp with time zone,
    last_run_ok boolean,
    last_run_message text,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: tenant_mail_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_mail_settings (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    host character varying(255),
    port integer,
    security character varying(10) DEFAULT 'starttls'::character varying NOT NULL,
    username character varying(255),
    password_encrypted text,
    from_name character varying(150),
    from_email character varying(255),
    reply_to character varying(255),
    admin_can_manage boolean DEFAULT false NOT NULL,
    last_test_at timestamp with time zone,
    last_test_ok boolean,
    last_test_error text,
    last_sent_at timestamp with time zone,
    last_error_at timestamp with time zone,
    last_error text,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_deadline_days integer DEFAULT 7 NOT NULL,
    late_days integer DEFAULT 2 NOT NULL,
    session_idle_minutes integer DEFAULT 30 NOT NULL,
    session_max_days integer DEFAULT 7 NOT NULL,
    max_upload_mb integer DEFAULT 50 NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    stamp_real_size boolean DEFAULT true NOT NULL,
    sage_bl_access_postes jsonb DEFAULT '["facturation", "dg", "ccg"]'::jsonb NOT NULL,
    fleet_admin_access boolean DEFAULT false NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    logo_url character varying(255),
    is_active boolean DEFAULT true,
    admin_email character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    subdomain character varying(100),
    status public.enum_tenants_status DEFAULT 'active'::public.enum_tenants_status NOT NULL,
    cancelled_at timestamp with time zone,
    auto_delete_at timestamp with time zone,
    contact_name character varying(255),
    contact_phone character varying(255),
    notes text,
    primary_color character varying(7),
    additional_domains text
);


--
-- Name: COLUMN tenants.subdomain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.subdomain IS 'Sous-domaine client (ex: hsjm → hsjm.hsjmcam.net)';


--
-- Name: COLUMN tenants.auto_delete_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.auto_delete_at IS 'Si défini, suppression automatique à cette date';


--
-- Name: COLUMN tenants.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.notes IS 'Notes internes (non visibles du client)';


--
-- Name: COLUMN tenants.primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.primary_color IS 'Couleur de marque au format hex (#1B3A6B) appliquée à --brand';


--
-- Name: ticket_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_history (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    action public.enum_ticket_history_action NOT NULL,
    queue_type character varying(50),
    position_number integer,
    user_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid NOT NULL,
    ticket_number character varying(20) NOT NULL,
    visit_type public.enum_tickets_visit_type NOT NULL,
    patient_type public.enum_tickets_patient_type NOT NULL,
    status public.enum_tickets_status DEFAULT 'waiting'::public.enum_tickets_status NOT NULL,
    queue_type public.enum_tickets_queue_type NOT NULL,
    position_number integer,
    patient_name character varying(255),
    patient_phone character varying(20),
    called_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by_user_id uuid NOT NULL,
    assigned_to_user_id uuid,
    assigned_position integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: trello_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_activity_logs (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type public.enum_trello_activity_logs_action_type NOT NULL,
    action_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN trello_activity_logs.action_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_activity_logs.action_data IS 'Données de l''action (old_value, new_value, etc.)';


--
-- Name: trello_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_attachments (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(255) NOT NULL,
    file_size integer NOT NULL,
    attachment_type public.enum_trello_attachments_attachment_type DEFAULT 'other'::public.enum_trello_attachments_attachment_type NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN trello_attachments.file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_attachments.file_path IS 'Chemin du fichier';


--
-- Name: COLUMN trello_attachments.file_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_attachments.file_type IS 'MIME type';


--
-- Name: COLUMN trello_attachments.file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_attachments.file_size IS 'Taille en octets';


--
-- Name: COLUMN trello_attachments.attachment_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_attachments.attachment_type IS 'Type de pièce jointe';


--
-- Name: trello_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_boards (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    service_type public.enum_trello_boards_service_type NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: COLUMN trello_boards.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_boards.name IS 'Nom du tableau (ex: Moyens Généraux, Biomédical, Informatique)';


--
-- Name: COLUMN trello_boards.service_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_boards.service_type IS 'Type de service technique';


--
-- Name: COLUMN trello_boards.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_boards.settings IS 'Paramètres du tableau (couleurs, règles, etc.)';


--
-- Name: trello_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_cards (
    id uuid NOT NULL,
    list_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    priority public.enum_trello_cards_priority DEFAULT 'medium'::public.enum_trello_cards_priority NOT NULL,
    due_date timestamp with time zone,
    assigned_to uuid,
    created_by uuid NOT NULL,
    linked_work_request_id uuid,
    status public.enum_trello_cards_status DEFAULT 'todo'::public.enum_trello_cards_status NOT NULL,
    labels jsonb DEFAULT '[]'::jsonb,
    estimated_hours numeric(5,2),
    actual_hours numeric(5,2),
    location character varying(255),
    equipment character varying(255),
    parts_used jsonb DEFAULT '[]'::jsonb,
    completed_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_history json DEFAULT '[]'::json,
    dates jsonb DEFAULT '{}'::jsonb,
    checklists jsonb DEFAULT '[]'::jsonb
);


--
-- Name: COLUMN trello_cards.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.title IS 'Titre de la tâche';


--
-- Name: COLUMN trello_cards.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.description IS 'Description détaillée';


--
-- Name: COLUMN trello_cards."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards."position" IS 'Ordre dans la colonne';


--
-- Name: COLUMN trello_cards.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.priority IS 'Priorité de la tâche';


--
-- Name: COLUMN trello_cards.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.due_date IS 'Date d''échéance';


--
-- Name: COLUMN trello_cards.assigned_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.assigned_to IS 'Technicien assigné';


--
-- Name: COLUMN trello_cards.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.created_by IS 'Créateur de la tâche';


--
-- Name: COLUMN trello_cards.linked_work_request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.linked_work_request_id IS 'Lien vers la Demande de Travaux';


--
-- Name: COLUMN trello_cards.labels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.labels IS 'Étiquettes (électrique, plomberie, urgent, etc.)';


--
-- Name: COLUMN trello_cards.estimated_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.estimated_hours IS 'Temps estimé en heures';


--
-- Name: COLUMN trello_cards.actual_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.actual_hours IS 'Temps réel passé';


--
-- Name: COLUMN trello_cards.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.location IS 'Localisation (service, salle, etc.)';


--
-- Name: COLUMN trello_cards.equipment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.equipment IS 'Équipement concerné';


--
-- Name: COLUMN trello_cards.parts_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.parts_used IS 'Pièces utilisées [{name, quantity, ref}]';


--
-- Name: COLUMN trello_cards.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.completed_at IS 'Date de complétion';


--
-- Name: COLUMN trello_cards.date_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_cards.date_history IS 'Historique des reports de dates';


--
-- Name: trello_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_comments (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN trello_comments.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_comments.content IS 'Contenu du commentaire';


--
-- Name: trello_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trello_lists (
    id uuid NOT NULL,
    board_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    color character varying(7),
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN trello_lists.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_lists.name IS 'Nom de la colonne (ex: À faire, En cours, Terminé)';


--
-- Name: COLUMN trello_lists."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_lists."position" IS 'Ordre d''affichage';


--
-- Name: COLUMN trello_lists.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trello_lists.color IS 'Couleur hex de la colonne';


--
-- Name: user_postes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_postes (
    id uuid NOT NULL,
    poste_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'user'::public.enum_users_role,
    signature_path character varying(255),
    stamp_path character varying(255),
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    "position" character varying(255),
    tenant_id uuid NOT NULL,
    totp_secret character varying(255),
    totp_enabled boolean DEFAULT false NOT NULL,
    is_absent boolean DEFAULT false NOT NULL,
    substitute_id uuid,
    lang character varying(5) DEFAULT 'fr'::character varying NOT NULL,
    seen_release_notes jsonb DEFAULT '[]'::jsonb NOT NULL,
    email_otp_enabled boolean DEFAULT false NOT NULL,
    email_otp_hash character varying(128),
    email_otp_expires_at timestamp with time zone,
    email_otp_attempts integer DEFAULT 0 NOT NULL,
    email_otp_sent_at timestamp with time zone,
    stamp_width_mm numeric(5,1) DEFAULT 58 NOT NULL,
    stamp_height_mm numeric(5,1) DEFAULT 22 NOT NULL
);


--
-- Name: COLUMN users.signature_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.signature_path IS 'Chemin vers l''image de la signature de l''utilisateur';


--
-- Name: COLUMN users.stamp_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.stamp_path IS 'Chemin vers l''image du cachet de l''utilisateur';


--
-- Name: vehicle_checklist_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_checklist_templates (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    vehicle_type character varying(30) DEFAULT 'ambulance'::character varying NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    inventory_sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    inventory_days jsonb DEFAULT '[1, 3, 5]'::jsonb NOT NULL
);


--
-- Name: vehicle_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_checks (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    phase character varying(10) NOT NULL,
    section_key character varying(40) NOT NULL,
    section_label character varying(120) NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    answered_items integer DEFAULT 0 NOT NULL,
    anomalies integer DEFAULT 0 NOT NULL,
    critical_anomaly boolean DEFAULT false NOT NULL,
    mileage integer,
    comment text,
    performed_by uuid,
    performed_by_name character varying(150),
    performed_at timestamp with time zone NOT NULL,
    signature_path character varying(255),
    document_id uuid,
    sha256 character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicle_deadlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_deadlines (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    label character varying(120) NOT NULL,
    due_date date,
    due_mileage integer,
    interval_months integer,
    interval_km integer,
    last_done_date date,
    last_done_mileage integer,
    notes text,
    attachment_path character varying(255),
    alerts_sent jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicle_fuel_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_fuel_logs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    date date NOT NULL,
    liters numeric(8,2) NOT NULL,
    amount integer,
    mileage integer,
    full_tank boolean DEFAULT true NOT NULL,
    station character varying(120),
    attachment_path character varying(255),
    created_by uuid,
    created_by_name character varying(150),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicle_inventories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_inventories (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    inventory_date date NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    answered_items integer DEFAULT 0 NOT NULL,
    shortages integer DEFAULT 0 NOT NULL,
    expiring integer DEFAULT 0 NOT NULL,
    critical_anomaly boolean DEFAULT false NOT NULL,
    restock jsonb DEFAULT '[]'::jsonb NOT NULL,
    comment text,
    performed_by uuid,
    performed_by_name character varying(150),
    performed_at timestamp with time zone NOT NULL,
    signature_path character varying(255),
    document_id uuid,
    sha256 character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicle_maintenances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_maintenances (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'terminee'::character varying NOT NULL,
    date date NOT NULL,
    mileage integer,
    description text,
    garage character varying(120),
    cost integer,
    attachment_path character varying(255),
    deadline_id uuid,
    check_id uuid,
    created_by uuid,
    created_by_name character varying(150),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicle_missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_missions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    document_id uuid,
    title character varying(255),
    destination character varying(255),
    status character varying(20) DEFAULT 'planifiee'::character varying NOT NULL,
    planned_departure_at timestamp with time zone,
    planned_return_at timestamp with time zone,
    departed_at timestamp with time zone,
    returned_at timestamp with time zone,
    crew jsonb DEFAULT '[]'::jsonb NOT NULL,
    urgent boolean DEFAULT false NOT NULL,
    om_after_departure boolean DEFAULT false NOT NULL,
    alerts_sent jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    label character varying(120) NOT NULL,
    immatriculation character varying(40) NOT NULL,
    vehicle_type character varying(30) DEFAULT 'ambulance'::character varying NOT NULL,
    service_id uuid,
    manager_poste_code character varying(60),
    checklist_template_id uuid,
    status character varying(20) DEFAULT 'disponible'::character varying NOT NULL,
    unavailable_reason character varying(255),
    mileage integer,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    brand character varying(60),
    model character varying(60),
    year integer,
    fuel_type character varying(20),
    vin character varying(40),
    inventory_alerts jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: workflow_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(500),
    categories jsonb,
    validators jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id uuid NOT NULL,
    document_id uuid NOT NULL,
    validator_id uuid NOT NULL,
    step integer NOT NULL,
    status character varying(255) NOT NULL,
    comment text,
    validated_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    assigned_at timestamp with time zone,
    deadline_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    original_validator_id uuid,
    is_substituted boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN workflows.step; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workflows.step IS 'L''ordre de cette étape dans le workflow';


--
-- Name: COLUMN workflows.assigned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workflows.assigned_at IS 'Date à laquelle la tâche a été assignée au validateur';


--
-- Name: equipements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements ALTER COLUMN id SET DEFAULT nextval('public.equipements_id_seq'::regclass);


--
-- Name: gmao_acquisitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_acquisitions ALTER COLUMN id SET DEFAULT nextval('public.gmao_acquisitions_id_seq'::regclass);


--
-- Name: gmao_budget_depenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_depenses ALTER COLUMN id SET DEFAULT nextval('public.gmao_budget_depenses_id_seq'::regclass);


--
-- Name: gmao_budget_lignes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_lignes ALTER COLUMN id SET DEFAULT nextval('public.gmao_budget_lignes_id_seq'::regclass);


--
-- Name: gmao_contrats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_contrats ALTER COLUMN id SET DEFAULT nextval('public.gmao_contrats_id_seq'::regclass);


--
-- Name: gmao_mouvements_pieces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces ALTER COLUMN id SET DEFAULT nextval('public.gmao_mouvements_pieces_id_seq'::regclass);


--
-- Name: gmao_pieces_rechange id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_pieces_rechange ALTER COLUMN id SET DEFAULT nextval('public.gmao_pieces_rechange_id_seq'::regclass);


--
-- Name: interventions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions ALTER COLUMN id SET DEFAULT nextval('public.interventions_id_seq'::regclass);


--
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- Name: plans_maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_maintenance ALTER COLUMN id SET DEFAULT nextval('public.plans_maintenance_id_seq'::regclass);


--
-- Name: template_fields id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_fields ALTER COLUMN id SET DEFAULT nextval('public.template_fields_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: category_access_rules category_access_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_access_rules
    ADD CONSTRAINT category_access_rules_pkey PRIMARY KEY (id);


--
-- Name: chat_conversation_members chat_conversation_members_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_members
    ADD CONSTRAINT chat_conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: chat_conversation_members chat_conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_members
    ADD CONSTRAINT chat_conversation_members_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_reactions chat_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: chat_reactions chat_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);


--
-- Name: compta_docs compta_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compta_docs
    ADD CONSTRAINT compta_docs_pkey PRIMARY KEY (id);


--
-- Name: demandes_achats demandes_achats_da_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_da_number_key UNIQUE (da_number);


--
-- Name: demandes_achats demandes_achats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: document_transmissions document_transmissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_transmissions
    ADD CONSTRAINT document_transmissions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_matricule_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key UNIQUE (matricule);


--
-- Name: employees employees_matricule_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key1 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key10; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key10 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key11 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key12; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key12 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key13; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key13 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key14; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key14 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key15; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key15 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key16 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key17; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key17 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key18 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key19 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key2 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key20; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key20 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key21; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key21 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key22; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key22 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key23 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key24 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key25; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key25 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key26; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key26 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key27; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key27 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key28; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key28 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key29; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key29 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key3 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key30; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key30 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key31; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key31 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key32 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key33; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key33 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key34 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key35; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key35 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key4 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key5 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key6 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key7 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key8 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key9 UNIQUE (matricule);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: equipements equipements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_pkey PRIMARY KEY (id);


--
-- Name: form_permissions form_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_permissions
    ADD CONSTRAINT form_permissions_pkey PRIMARY KEY (id);


--
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: gmao_acquisitions gmao_acquisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_acquisitions
    ADD CONSTRAINT gmao_acquisitions_pkey PRIMARY KEY (id);


--
-- Name: gmao_budget_depenses gmao_budget_depenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_depenses
    ADD CONSTRAINT gmao_budget_depenses_pkey PRIMARY KEY (id);


--
-- Name: gmao_budget_lignes gmao_budget_lignes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_lignes
    ADD CONSTRAINT gmao_budget_lignes_pkey PRIMARY KEY (id);


--
-- Name: gmao_contrats gmao_contrats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_contrats
    ADD CONSTRAINT gmao_contrats_pkey PRIMARY KEY (id);


--
-- Name: gmao_mouvements_pieces gmao_mouvements_pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces
    ADD CONSTRAINT gmao_mouvements_pieces_pkey PRIMARY KEY (id);


--
-- Name: gmao_pieces_rechange gmao_pieces_rechange_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_pieces_rechange
    ADD CONSTRAINT gmao_pieces_rechange_pkey PRIMARY KEY (id);


--
-- Name: gmao_pieces_rechange gmao_pieces_rechange_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_pieces_rechange
    ADD CONSTRAINT gmao_pieces_rechange_reference_key UNIQUE (reference);


--
-- Name: interventions interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_pkey PRIMARY KEY (id);


--
-- Name: invoice_folders invoice_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_folders
    ADD CONSTRAINT invoice_folders_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: mission_meal_rates mission_meal_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_meal_rates
    ADD CONSTRAINT mission_meal_rates_pkey PRIMARY KEY (id);


--
-- Name: mission_meal_thresholds mission_meal_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_meal_thresholds
    ADD CONSTRAINT mission_meal_thresholds_pkey PRIMARY KEY (id);


--
-- Name: mission_meal_thresholds mission_meal_thresholds_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_meal_thresholds
    ADD CONSTRAINT mission_meal_thresholds_tenant_id_key UNIQUE (tenant_id);


--
-- Name: motifs motifs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motifs
    ADD CONSTRAINT motifs_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: ordre_mission_types ordre_mission_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordre_mission_types
    ADD CONSTRAINT ordre_mission_types_code_key UNIQUE (code);


--
-- Name: ordre_mission_types ordre_mission_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordre_mission_types
    ADD CONSTRAINT ordre_mission_types_pkey PRIMARY KEY (id);


--
-- Name: php_bons_prise_en_charge php_bons_prise_en_charge_numero_bon_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_bons_prise_en_charge
    ADD CONSTRAINT php_bons_prise_en_charge_numero_bon_key UNIQUE (numero_bon);


--
-- Name: php_bons_prise_en_charge php_bons_prise_en_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_bons_prise_en_charge
    ADD CONSTRAINT php_bons_prise_en_charge_pkey PRIMARY KEY (id);


--
-- Name: php_consultations php_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_consultations
    ADD CONSTRAINT php_consultations_pkey PRIMARY KEY (id);


--
-- Name: php_deces_transferts php_deces_transferts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_deces_transferts
    ADD CONSTRAINT php_deces_transferts_pkey PRIMARY KEY (id);


--
-- Name: php_factures php_factures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_factures
    ADD CONSTRAINT php_factures_pkey PRIMARY KEY (id);


--
-- Name: php_hospitalisations php_hospitalisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_hospitalisations
    ADD CONSTRAINT php_hospitalisations_pkey PRIMARY KEY (id);


--
-- Name: php_infirmeries php_infirmeries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_infirmeries
    ADD CONSTRAINT php_infirmeries_code_key UNIQUE (code);


--
-- Name: php_infirmeries php_infirmeries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_infirmeries
    ADD CONSTRAINT php_infirmeries_pkey PRIMARY KEY (id);


--
-- Name: php_operations php_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_operations
    ADD CONSTRAINT php_operations_pkey PRIMARY KEY (id);


--
-- Name: php_patients php_patients_matricule_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_matricule_key UNIQUE (matricule);


--
-- Name: php_patients php_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_pkey PRIMARY KEY (id);


--
-- Name: php_rendez_vous php_rendez_vous_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_rendez_vous
    ADD CONSTRAINT php_rendez_vous_pkey PRIMARY KEY (id);


--
-- Name: php_repos php_repos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_repos
    ADD CONSTRAINT php_repos_pkey PRIMARY KEY (id);


--
-- Name: php_secteurs php_secteurs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_secteurs
    ADD CONSTRAINT php_secteurs_code_key UNIQUE (code);


--
-- Name: php_secteurs php_secteurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_secteurs
    ADD CONSTRAINT php_secteurs_pkey PRIMARY KEY (id);


--
-- Name: php_services_medicaux php_services_medicaux_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_services_medicaux
    ADD CONSTRAINT php_services_medicaux_code_key UNIQUE (code);


--
-- Name: php_services_medicaux php_services_medicaux_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_services_medicaux
    ADD CONSTRAINT php_services_medicaux_pkey PRIMARY KEY (id);


--
-- Name: plans_maintenance plans_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_maintenance
    ADD CONSTRAINT plans_maintenance_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: postes postes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_code_key UNIQUE (code);


--
-- Name: postes postes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: queue_positions queue_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_pkey PRIMARY KEY (id);


--
-- Name: release_notes release_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_notes
    ADD CONSTRAINT release_notes_pkey PRIMARY KEY (id);


--
-- Name: sage_facture_imports sage_facture_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sage_facture_imports
    ADD CONSTRAINT sage_facture_imports_pkey PRIMARY KEY (id);


--
-- Name: schedule_assignments schedule_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_pkey PRIMARY KEY (id);


--
-- Name: schedule_changes_log schedule_changes_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_pkey PRIMARY KEY (id);


--
-- Name: schedule_validations schedule_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: service_members service_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_pkey PRIMARY KEY (id);


--
-- Name: services services_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key UNIQUE (name);


--
-- Name: services services_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key1 UNIQUE (name);


--
-- Name: services services_name_key10; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key10 UNIQUE (name);


--
-- Name: services services_name_key100; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key100 UNIQUE (name);


--
-- Name: services services_name_key101; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key101 UNIQUE (name);


--
-- Name: services services_name_key102; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key102 UNIQUE (name);


--
-- Name: services services_name_key103; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key103 UNIQUE (name);


--
-- Name: services services_name_key104; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key104 UNIQUE (name);


--
-- Name: services services_name_key105; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key105 UNIQUE (name);


--
-- Name: services services_name_key106; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key106 UNIQUE (name);


--
-- Name: services services_name_key107; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key107 UNIQUE (name);


--
-- Name: services services_name_key108; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key108 UNIQUE (name);


--
-- Name: services services_name_key109; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key109 UNIQUE (name);


--
-- Name: services services_name_key11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key11 UNIQUE (name);


--
-- Name: services services_name_key110; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key110 UNIQUE (name);


--
-- Name: services services_name_key111; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key111 UNIQUE (name);


--
-- Name: services services_name_key112; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key112 UNIQUE (name);


--
-- Name: services services_name_key113; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key113 UNIQUE (name);


--
-- Name: services services_name_key114; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key114 UNIQUE (name);


--
-- Name: services services_name_key115; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key115 UNIQUE (name);


--
-- Name: services services_name_key116; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key116 UNIQUE (name);


--
-- Name: services services_name_key117; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key117 UNIQUE (name);


--
-- Name: services services_name_key118; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key118 UNIQUE (name);


--
-- Name: services services_name_key119; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key119 UNIQUE (name);


--
-- Name: services services_name_key12; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key12 UNIQUE (name);


--
-- Name: services services_name_key120; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key120 UNIQUE (name);


--
-- Name: services services_name_key121; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key121 UNIQUE (name);


--
-- Name: services services_name_key122; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key122 UNIQUE (name);


--
-- Name: services services_name_key123; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key123 UNIQUE (name);


--
-- Name: services services_name_key124; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key124 UNIQUE (name);


--
-- Name: services services_name_key125; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key125 UNIQUE (name);


--
-- Name: services services_name_key13; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key13 UNIQUE (name);


--
-- Name: services services_name_key14; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key14 UNIQUE (name);


--
-- Name: services services_name_key15; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key15 UNIQUE (name);


--
-- Name: services services_name_key16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key16 UNIQUE (name);


--
-- Name: services services_name_key17; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key17 UNIQUE (name);


--
-- Name: services services_name_key18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key18 UNIQUE (name);


--
-- Name: services services_name_key19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key19 UNIQUE (name);


--
-- Name: services services_name_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key2 UNIQUE (name);


--
-- Name: services services_name_key20; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key20 UNIQUE (name);


--
-- Name: services services_name_key21; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key21 UNIQUE (name);


--
-- Name: services services_name_key22; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key22 UNIQUE (name);


--
-- Name: services services_name_key23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key23 UNIQUE (name);


--
-- Name: services services_name_key24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key24 UNIQUE (name);


--
-- Name: services services_name_key25; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key25 UNIQUE (name);


--
-- Name: services services_name_key26; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key26 UNIQUE (name);


--
-- Name: services services_name_key27; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key27 UNIQUE (name);


--
-- Name: services services_name_key28; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key28 UNIQUE (name);


--
-- Name: services services_name_key29; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key29 UNIQUE (name);


--
-- Name: services services_name_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key3 UNIQUE (name);


--
-- Name: services services_name_key30; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key30 UNIQUE (name);


--
-- Name: services services_name_key31; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key31 UNIQUE (name);


--
-- Name: services services_name_key32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key32 UNIQUE (name);


--
-- Name: services services_name_key33; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key33 UNIQUE (name);


--
-- Name: services services_name_key34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key34 UNIQUE (name);


--
-- Name: services services_name_key35; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key35 UNIQUE (name);


--
-- Name: services services_name_key36; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key36 UNIQUE (name);


--
-- Name: services services_name_key37; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key37 UNIQUE (name);


--
-- Name: services services_name_key38; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key38 UNIQUE (name);


--
-- Name: services services_name_key39; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key39 UNIQUE (name);


--
-- Name: services services_name_key4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key4 UNIQUE (name);


--
-- Name: services services_name_key40; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key40 UNIQUE (name);


--
-- Name: services services_name_key41; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key41 UNIQUE (name);


--
-- Name: services services_name_key42; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key42 UNIQUE (name);


--
-- Name: services services_name_key43; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key43 UNIQUE (name);


--
-- Name: services services_name_key44; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key44 UNIQUE (name);


--
-- Name: services services_name_key45; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key45 UNIQUE (name);


--
-- Name: services services_name_key46; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key46 UNIQUE (name);


--
-- Name: services services_name_key47; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key47 UNIQUE (name);


--
-- Name: services services_name_key48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key48 UNIQUE (name);


--
-- Name: services services_name_key49; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key49 UNIQUE (name);


--
-- Name: services services_name_key5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key5 UNIQUE (name);


--
-- Name: services services_name_key50; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key50 UNIQUE (name);


--
-- Name: services services_name_key51; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key51 UNIQUE (name);


--
-- Name: services services_name_key52; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key52 UNIQUE (name);


--
-- Name: services services_name_key53; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key53 UNIQUE (name);


--
-- Name: services services_name_key54; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key54 UNIQUE (name);


--
-- Name: services services_name_key55; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key55 UNIQUE (name);


--
-- Name: services services_name_key56; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key56 UNIQUE (name);


--
-- Name: services services_name_key57; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key57 UNIQUE (name);


--
-- Name: services services_name_key58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key58 UNIQUE (name);


--
-- Name: services services_name_key59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key59 UNIQUE (name);


--
-- Name: services services_name_key6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key6 UNIQUE (name);


--
-- Name: services services_name_key60; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key60 UNIQUE (name);


--
-- Name: services services_name_key61; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key61 UNIQUE (name);


--
-- Name: services services_name_key62; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key62 UNIQUE (name);


--
-- Name: services services_name_key63; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key63 UNIQUE (name);


--
-- Name: services services_name_key64; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key64 UNIQUE (name);


--
-- Name: services services_name_key65; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key65 UNIQUE (name);


--
-- Name: services services_name_key66; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key66 UNIQUE (name);


--
-- Name: services services_name_key67; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key67 UNIQUE (name);


--
-- Name: services services_name_key68; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key68 UNIQUE (name);


--
-- Name: services services_name_key69; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key69 UNIQUE (name);


--
-- Name: services services_name_key7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key7 UNIQUE (name);


--
-- Name: services services_name_key70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key70 UNIQUE (name);


--
-- Name: services services_name_key71; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key71 UNIQUE (name);


--
-- Name: services services_name_key72; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key72 UNIQUE (name);


--
-- Name: services services_name_key73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key73 UNIQUE (name);


--
-- Name: services services_name_key74; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key74 UNIQUE (name);


--
-- Name: services services_name_key75; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key75 UNIQUE (name);


--
-- Name: services services_name_key76; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key76 UNIQUE (name);


--
-- Name: services services_name_key77; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key77 UNIQUE (name);


--
-- Name: services services_name_key78; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key78 UNIQUE (name);


--
-- Name: services services_name_key79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key79 UNIQUE (name);


--
-- Name: services services_name_key8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key8 UNIQUE (name);


--
-- Name: services services_name_key80; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key80 UNIQUE (name);


--
-- Name: services services_name_key81; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key81 UNIQUE (name);


--
-- Name: services services_name_key82; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key82 UNIQUE (name);


--
-- Name: services services_name_key83; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key83 UNIQUE (name);


--
-- Name: services services_name_key84; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key84 UNIQUE (name);


--
-- Name: services services_name_key85; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key85 UNIQUE (name);


--
-- Name: services services_name_key86; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key86 UNIQUE (name);


--
-- Name: services services_name_key87; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key87 UNIQUE (name);


--
-- Name: services services_name_key88; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key88 UNIQUE (name);


--
-- Name: services services_name_key89; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key89 UNIQUE (name);


--
-- Name: services services_name_key9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key9 UNIQUE (name);


--
-- Name: services services_name_key90; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key90 UNIQUE (name);


--
-- Name: services services_name_key91; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key91 UNIQUE (name);


--
-- Name: services services_name_key92; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key92 UNIQUE (name);


--
-- Name: services services_name_key93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key93 UNIQUE (name);


--
-- Name: services services_name_key94; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key94 UNIQUE (name);


--
-- Name: services services_name_key95; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key95 UNIQUE (name);


--
-- Name: services services_name_key96; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key96 UNIQUE (name);


--
-- Name: services services_name_key97; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key97 UNIQUE (name);


--
-- Name: services services_name_key98; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key98 UNIQUE (name);


--
-- Name: services services_name_key99; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key99 UNIQUE (name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: shift_types shift_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_types
    ADD CONSTRAINT shift_types_code_key UNIQUE (code);


--
-- Name: shift_types shift_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_types
    ADD CONSTRAINT shift_types_pkey PRIMARY KEY (id);


--
-- Name: template_fields template_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT template_fields_pkey PRIMARY KEY (id);


--
-- Name: template_permissions template_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_permissions
    ADD CONSTRAINT template_permissions_pkey PRIMARY KEY (id);


--
-- Name: template_permissions template_permissions_template_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_permissions
    ADD CONSTRAINT template_permissions_template_name_key UNIQUE (template_name);


--
-- Name: templates templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_name_key UNIQUE (name);


--
-- Name: templates templates_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_name_key1 UNIQUE (name);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: templates templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_slug_key UNIQUE (slug);


--
-- Name: templates templates_slug_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_slug_key1 UNIQUE (slug);


--
-- Name: tenant_integrations tenant_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_pkey PRIMARY KEY (id);


--
-- Name: tenant_mail_settings tenant_mail_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_mail_settings
    ADD CONSTRAINT tenant_mail_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_mail_settings tenant_mail_settings_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_mail_settings
    ADD CONSTRAINT tenant_mail_settings_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenants tenants_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_domain_key UNIQUE (domain);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: ticket_history ticket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: trello_activity_logs trello_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: trello_attachments trello_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_pkey PRIMARY KEY (id);


--
-- Name: trello_boards trello_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_boards
    ADD CONSTRAINT trello_boards_pkey PRIMARY KEY (id);


--
-- Name: trello_boards trello_boards_service_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_boards
    ADD CONSTRAINT trello_boards_service_type_key UNIQUE (service_type);


--
-- Name: trello_cards trello_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_pkey PRIMARY KEY (id);


--
-- Name: trello_comments trello_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_pkey PRIMARY KEY (id);


--
-- Name: trello_lists trello_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_lists
    ADD CONSTRAINT trello_lists_pkey PRIMARY KEY (id);


--
-- Name: template_fields unique_template_field_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT unique_template_field_name UNIQUE (template_id, field_name);


--
-- Name: user_postes user_postes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_postes
    ADD CONSTRAINT user_postes_pkey PRIMARY KEY (id);


--
-- Name: user_postes user_postes_poste_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_postes
    ADD CONSTRAINT user_postes_poste_user_unique UNIQUE (poste_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key10; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key10 UNIQUE (email);


--
-- Name: users users_email_key100; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key100 UNIQUE (email);


--
-- Name: users users_email_key101; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key101 UNIQUE (email);


--
-- Name: users users_email_key102; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key102 UNIQUE (email);


--
-- Name: users users_email_key103; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key103 UNIQUE (email);


--
-- Name: users users_email_key104; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key104 UNIQUE (email);


--
-- Name: users users_email_key105; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key105 UNIQUE (email);


--
-- Name: users users_email_key106; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key106 UNIQUE (email);


--
-- Name: users users_email_key107; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key107 UNIQUE (email);


--
-- Name: users users_email_key108; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key108 UNIQUE (email);


--
-- Name: users users_email_key109; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key109 UNIQUE (email);


--
-- Name: users users_email_key11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key11 UNIQUE (email);


--
-- Name: users users_email_key110; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key110 UNIQUE (email);


--
-- Name: users users_email_key111; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key111 UNIQUE (email);


--
-- Name: users users_email_key112; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key112 UNIQUE (email);


--
-- Name: users users_email_key113; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key113 UNIQUE (email);


--
-- Name: users users_email_key114; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key114 UNIQUE (email);


--
-- Name: users users_email_key115; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key115 UNIQUE (email);


--
-- Name: users users_email_key116; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key116 UNIQUE (email);


--
-- Name: users users_email_key117; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key117 UNIQUE (email);


--
-- Name: users users_email_key118; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key118 UNIQUE (email);


--
-- Name: users users_email_key119; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key119 UNIQUE (email);


--
-- Name: users users_email_key12; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key12 UNIQUE (email);


--
-- Name: users users_email_key120; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key120 UNIQUE (email);


--
-- Name: users users_email_key121; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key121 UNIQUE (email);


--
-- Name: users users_email_key122; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key122 UNIQUE (email);


--
-- Name: users users_email_key123; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key123 UNIQUE (email);


--
-- Name: users users_email_key124; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key124 UNIQUE (email);


--
-- Name: users users_email_key125; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key125 UNIQUE (email);


--
-- Name: users users_email_key126; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key126 UNIQUE (email);


--
-- Name: users users_email_key127; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key127 UNIQUE (email);


--
-- Name: users users_email_key128; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key128 UNIQUE (email);


--
-- Name: users users_email_key129; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key129 UNIQUE (email);


--
-- Name: users users_email_key13; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key13 UNIQUE (email);


--
-- Name: users users_email_key130; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key130 UNIQUE (email);


--
-- Name: users users_email_key131; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key131 UNIQUE (email);


--
-- Name: users users_email_key132; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key132 UNIQUE (email);


--
-- Name: users users_email_key133; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key133 UNIQUE (email);


--
-- Name: users users_email_key134; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key134 UNIQUE (email);


--
-- Name: users users_email_key135; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key135 UNIQUE (email);


--
-- Name: users users_email_key136; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key136 UNIQUE (email);


--
-- Name: users users_email_key137; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key137 UNIQUE (email);


--
-- Name: users users_email_key138; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key138 UNIQUE (email);


--
-- Name: users users_email_key139; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key139 UNIQUE (email);


--
-- Name: users users_email_key14; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key14 UNIQUE (email);


--
-- Name: users users_email_key140; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key140 UNIQUE (email);


--
-- Name: users users_email_key141; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key141 UNIQUE (email);


--
-- Name: users users_email_key142; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key142 UNIQUE (email);


--
-- Name: users users_email_key143; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key143 UNIQUE (email);


--
-- Name: users users_email_key144; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key144 UNIQUE (email);


--
-- Name: users users_email_key145; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key145 UNIQUE (email);


--
-- Name: users users_email_key146; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key146 UNIQUE (email);


--
-- Name: users users_email_key147; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key147 UNIQUE (email);


--
-- Name: users users_email_key148; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key148 UNIQUE (email);


--
-- Name: users users_email_key149; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key149 UNIQUE (email);


--
-- Name: users users_email_key15; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key15 UNIQUE (email);


--
-- Name: users users_email_key150; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key150 UNIQUE (email);


--
-- Name: users users_email_key151; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key151 UNIQUE (email);


--
-- Name: users users_email_key152; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key152 UNIQUE (email);


--
-- Name: users users_email_key153; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key153 UNIQUE (email);


--
-- Name: users users_email_key154; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key154 UNIQUE (email);


--
-- Name: users users_email_key155; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key155 UNIQUE (email);


--
-- Name: users users_email_key156; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key156 UNIQUE (email);


--
-- Name: users users_email_key157; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key157 UNIQUE (email);


--
-- Name: users users_email_key158; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key158 UNIQUE (email);


--
-- Name: users users_email_key159; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key159 UNIQUE (email);


--
-- Name: users users_email_key16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key16 UNIQUE (email);


--
-- Name: users users_email_key160; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key160 UNIQUE (email);


--
-- Name: users users_email_key161; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key161 UNIQUE (email);


--
-- Name: users users_email_key162; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key162 UNIQUE (email);


--
-- Name: users users_email_key163; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key163 UNIQUE (email);


--
-- Name: users users_email_key164; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key164 UNIQUE (email);


--
-- Name: users users_email_key165; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key165 UNIQUE (email);


--
-- Name: users users_email_key166; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key166 UNIQUE (email);


--
-- Name: users users_email_key167; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key167 UNIQUE (email);


--
-- Name: users users_email_key168; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key168 UNIQUE (email);


--
-- Name: users users_email_key169; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key169 UNIQUE (email);


--
-- Name: users users_email_key17; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key17 UNIQUE (email);


--
-- Name: users users_email_key170; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key170 UNIQUE (email);


--
-- Name: users users_email_key171; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key171 UNIQUE (email);


--
-- Name: users users_email_key172; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key172 UNIQUE (email);


--
-- Name: users users_email_key173; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key173 UNIQUE (email);


--
-- Name: users users_email_key174; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key174 UNIQUE (email);


--
-- Name: users users_email_key175; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key175 UNIQUE (email);


--
-- Name: users users_email_key176; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key176 UNIQUE (email);


--
-- Name: users users_email_key177; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key177 UNIQUE (email);


--
-- Name: users users_email_key178; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key178 UNIQUE (email);


--
-- Name: users users_email_key179; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key179 UNIQUE (email);


--
-- Name: users users_email_key18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key18 UNIQUE (email);


--
-- Name: users users_email_key180; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key180 UNIQUE (email);


--
-- Name: users users_email_key181; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key181 UNIQUE (email);


--
-- Name: users users_email_key182; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key182 UNIQUE (email);


--
-- Name: users users_email_key183; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key183 UNIQUE (email);


--
-- Name: users users_email_key184; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key184 UNIQUE (email);


--
-- Name: users users_email_key185; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key185 UNIQUE (email);


--
-- Name: users users_email_key186; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key186 UNIQUE (email);


--
-- Name: users users_email_key187; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key187 UNIQUE (email);


--
-- Name: users users_email_key188; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key188 UNIQUE (email);


--
-- Name: users users_email_key189; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key189 UNIQUE (email);


--
-- Name: users users_email_key19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key19 UNIQUE (email);


--
-- Name: users users_email_key190; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key190 UNIQUE (email);


--
-- Name: users users_email_key191; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key191 UNIQUE (email);


--
-- Name: users users_email_key192; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key192 UNIQUE (email);


--
-- Name: users users_email_key193; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key193 UNIQUE (email);


--
-- Name: users users_email_key194; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key194 UNIQUE (email);


--
-- Name: users users_email_key195; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key195 UNIQUE (email);


--
-- Name: users users_email_key196; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key196 UNIQUE (email);


--
-- Name: users users_email_key197; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key197 UNIQUE (email);


--
-- Name: users users_email_key198; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key198 UNIQUE (email);


--
-- Name: users users_email_key199; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key199 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key20; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key20 UNIQUE (email);


--
-- Name: users users_email_key200; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key200 UNIQUE (email);


--
-- Name: users users_email_key201; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key201 UNIQUE (email);


--
-- Name: users users_email_key202; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key202 UNIQUE (email);


--
-- Name: users users_email_key203; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key203 UNIQUE (email);


--
-- Name: users users_email_key204; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key204 UNIQUE (email);


--
-- Name: users users_email_key205; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key205 UNIQUE (email);


--
-- Name: users users_email_key206; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key206 UNIQUE (email);


--
-- Name: users users_email_key207; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key207 UNIQUE (email);


--
-- Name: users users_email_key208; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key208 UNIQUE (email);


--
-- Name: users users_email_key209; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key209 UNIQUE (email);


--
-- Name: users users_email_key21; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key21 UNIQUE (email);


--
-- Name: users users_email_key210; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key210 UNIQUE (email);


--
-- Name: users users_email_key211; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key211 UNIQUE (email);


--
-- Name: users users_email_key212; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key212 UNIQUE (email);


--
-- Name: users users_email_key213; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key213 UNIQUE (email);


--
-- Name: users users_email_key214; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key214 UNIQUE (email);


--
-- Name: users users_email_key215; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key215 UNIQUE (email);


--
-- Name: users users_email_key216; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key216 UNIQUE (email);


--
-- Name: users users_email_key217; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key217 UNIQUE (email);


--
-- Name: users users_email_key218; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key218 UNIQUE (email);


--
-- Name: users users_email_key219; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key219 UNIQUE (email);


--
-- Name: users users_email_key22; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key22 UNIQUE (email);


--
-- Name: users users_email_key220; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key220 UNIQUE (email);


--
-- Name: users users_email_key221; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key221 UNIQUE (email);


--
-- Name: users users_email_key222; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key222 UNIQUE (email);


--
-- Name: users users_email_key223; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key223 UNIQUE (email);


--
-- Name: users users_email_key224; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key224 UNIQUE (email);


--
-- Name: users users_email_key225; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key225 UNIQUE (email);


--
-- Name: users users_email_key226; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key226 UNIQUE (email);


--
-- Name: users users_email_key227; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key227 UNIQUE (email);


--
-- Name: users users_email_key228; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key228 UNIQUE (email);


--
-- Name: users users_email_key229; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key229 UNIQUE (email);


--
-- Name: users users_email_key23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key23 UNIQUE (email);


--
-- Name: users users_email_key230; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key230 UNIQUE (email);


--
-- Name: users users_email_key231; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key231 UNIQUE (email);


--
-- Name: users users_email_key232; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key232 UNIQUE (email);


--
-- Name: users users_email_key233; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key233 UNIQUE (email);


--
-- Name: users users_email_key234; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key234 UNIQUE (email);


--
-- Name: users users_email_key235; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key235 UNIQUE (email);


--
-- Name: users users_email_key236; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key236 UNIQUE (email);


--
-- Name: users users_email_key24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key24 UNIQUE (email);


--
-- Name: users users_email_key25; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key25 UNIQUE (email);


--
-- Name: users users_email_key26; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key26 UNIQUE (email);


--
-- Name: users users_email_key27; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key27 UNIQUE (email);


--
-- Name: users users_email_key28; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key28 UNIQUE (email);


--
-- Name: users users_email_key29; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key29 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_email_key30; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key30 UNIQUE (email);


--
-- Name: users users_email_key31; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key31 UNIQUE (email);


--
-- Name: users users_email_key32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key32 UNIQUE (email);


--
-- Name: users users_email_key33; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key33 UNIQUE (email);


--
-- Name: users users_email_key34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key34 UNIQUE (email);


--
-- Name: users users_email_key35; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key35 UNIQUE (email);


--
-- Name: users users_email_key36; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key36 UNIQUE (email);


--
-- Name: users users_email_key37; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key37 UNIQUE (email);


--
-- Name: users users_email_key38; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key38 UNIQUE (email);


--
-- Name: users users_email_key39; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key39 UNIQUE (email);


--
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- Name: users users_email_key40; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key40 UNIQUE (email);


--
-- Name: users users_email_key41; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key41 UNIQUE (email);


--
-- Name: users users_email_key42; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key42 UNIQUE (email);


--
-- Name: users users_email_key43; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key43 UNIQUE (email);


--
-- Name: users users_email_key44; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key44 UNIQUE (email);


--
-- Name: users users_email_key45; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key45 UNIQUE (email);


--
-- Name: users users_email_key46; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key46 UNIQUE (email);


--
-- Name: users users_email_key47; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key47 UNIQUE (email);


--
-- Name: users users_email_key48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key48 UNIQUE (email);


--
-- Name: users users_email_key49; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key49 UNIQUE (email);


--
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- Name: users users_email_key50; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key50 UNIQUE (email);


--
-- Name: users users_email_key51; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key51 UNIQUE (email);


--
-- Name: users users_email_key52; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key52 UNIQUE (email);


--
-- Name: users users_email_key53; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key53 UNIQUE (email);


--
-- Name: users users_email_key54; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key54 UNIQUE (email);


--
-- Name: users users_email_key55; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key55 UNIQUE (email);


--
-- Name: users users_email_key56; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key56 UNIQUE (email);


--
-- Name: users users_email_key57; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key57 UNIQUE (email);


--
-- Name: users users_email_key58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key58 UNIQUE (email);


--
-- Name: users users_email_key59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key59 UNIQUE (email);


--
-- Name: users users_email_key6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key6 UNIQUE (email);


--
-- Name: users users_email_key60; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key60 UNIQUE (email);


--
-- Name: users users_email_key61; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key61 UNIQUE (email);


--
-- Name: users users_email_key62; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key62 UNIQUE (email);


--
-- Name: users users_email_key63; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key63 UNIQUE (email);


--
-- Name: users users_email_key64; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key64 UNIQUE (email);


--
-- Name: users users_email_key65; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key65 UNIQUE (email);


--
-- Name: users users_email_key66; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key66 UNIQUE (email);


--
-- Name: users users_email_key67; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key67 UNIQUE (email);


--
-- Name: users users_email_key68; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key68 UNIQUE (email);


--
-- Name: users users_email_key69; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key69 UNIQUE (email);


--
-- Name: users users_email_key7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key7 UNIQUE (email);


--
-- Name: users users_email_key70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key70 UNIQUE (email);


--
-- Name: users users_email_key71; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key71 UNIQUE (email);


--
-- Name: users users_email_key72; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key72 UNIQUE (email);


--
-- Name: users users_email_key73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key73 UNIQUE (email);


--
-- Name: users users_email_key74; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key74 UNIQUE (email);


--
-- Name: users users_email_key75; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key75 UNIQUE (email);


--
-- Name: users users_email_key76; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key76 UNIQUE (email);


--
-- Name: users users_email_key77; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key77 UNIQUE (email);


--
-- Name: users users_email_key78; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key78 UNIQUE (email);


--
-- Name: users users_email_key79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key79 UNIQUE (email);


--
-- Name: users users_email_key8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key8 UNIQUE (email);


--
-- Name: users users_email_key80; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key80 UNIQUE (email);


--
-- Name: users users_email_key81; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key81 UNIQUE (email);


--
-- Name: users users_email_key82; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key82 UNIQUE (email);


--
-- Name: users users_email_key83; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key83 UNIQUE (email);


--
-- Name: users users_email_key84; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key84 UNIQUE (email);


--
-- Name: users users_email_key85; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key85 UNIQUE (email);


--
-- Name: users users_email_key86; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key86 UNIQUE (email);


--
-- Name: users users_email_key87; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key87 UNIQUE (email);


--
-- Name: users users_email_key88; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key88 UNIQUE (email);


--
-- Name: users users_email_key89; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key89 UNIQUE (email);


--
-- Name: users users_email_key9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key9 UNIQUE (email);


--
-- Name: users users_email_key90; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key90 UNIQUE (email);


--
-- Name: users users_email_key91; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key91 UNIQUE (email);


--
-- Name: users users_email_key92; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key92 UNIQUE (email);


--
-- Name: users users_email_key93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key93 UNIQUE (email);


--
-- Name: users users_email_key94; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key94 UNIQUE (email);


--
-- Name: users users_email_key95; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key95 UNIQUE (email);


--
-- Name: users users_email_key96; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key96 UNIQUE (email);


--
-- Name: users users_email_key97; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key97 UNIQUE (email);


--
-- Name: users users_email_key98; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key98 UNIQUE (email);


--
-- Name: users users_email_key99; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key99 UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users users_username_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key1 UNIQUE (username);


--
-- Name: users users_username_key10; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key10 UNIQUE (username);


--
-- Name: users users_username_key100; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key100 UNIQUE (username);


--
-- Name: users users_username_key101; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key101 UNIQUE (username);


--
-- Name: users users_username_key102; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key102 UNIQUE (username);


--
-- Name: users users_username_key103; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key103 UNIQUE (username);


--
-- Name: users users_username_key104; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key104 UNIQUE (username);


--
-- Name: users users_username_key105; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key105 UNIQUE (username);


--
-- Name: users users_username_key106; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key106 UNIQUE (username);


--
-- Name: users users_username_key107; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key107 UNIQUE (username);


--
-- Name: users users_username_key108; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key108 UNIQUE (username);


--
-- Name: users users_username_key109; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key109 UNIQUE (username);


--
-- Name: users users_username_key11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key11 UNIQUE (username);


--
-- Name: users users_username_key110; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key110 UNIQUE (username);


--
-- Name: users users_username_key111; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key111 UNIQUE (username);


--
-- Name: users users_username_key112; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key112 UNIQUE (username);


--
-- Name: users users_username_key113; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key113 UNIQUE (username);


--
-- Name: users users_username_key114; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key114 UNIQUE (username);


--
-- Name: users users_username_key115; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key115 UNIQUE (username);


--
-- Name: users users_username_key116; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key116 UNIQUE (username);


--
-- Name: users users_username_key117; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key117 UNIQUE (username);


--
-- Name: users users_username_key118; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key118 UNIQUE (username);


--
-- Name: users users_username_key119; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key119 UNIQUE (username);


--
-- Name: users users_username_key12; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key12 UNIQUE (username);


--
-- Name: users users_username_key120; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key120 UNIQUE (username);


--
-- Name: users users_username_key121; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key121 UNIQUE (username);


--
-- Name: users users_username_key122; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key122 UNIQUE (username);


--
-- Name: users users_username_key123; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key123 UNIQUE (username);


--
-- Name: users users_username_key124; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key124 UNIQUE (username);


--
-- Name: users users_username_key125; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key125 UNIQUE (username);


--
-- Name: users users_username_key126; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key126 UNIQUE (username);


--
-- Name: users users_username_key127; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key127 UNIQUE (username);


--
-- Name: users users_username_key128; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key128 UNIQUE (username);


--
-- Name: users users_username_key129; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key129 UNIQUE (username);


--
-- Name: users users_username_key13; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key13 UNIQUE (username);


--
-- Name: users users_username_key130; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key130 UNIQUE (username);


--
-- Name: users users_username_key131; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key131 UNIQUE (username);


--
-- Name: users users_username_key132; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key132 UNIQUE (username);


--
-- Name: users users_username_key133; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key133 UNIQUE (username);


--
-- Name: users users_username_key134; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key134 UNIQUE (username);


--
-- Name: users users_username_key135; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key135 UNIQUE (username);


--
-- Name: users users_username_key136; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key136 UNIQUE (username);


--
-- Name: users users_username_key137; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key137 UNIQUE (username);


--
-- Name: users users_username_key138; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key138 UNIQUE (username);


--
-- Name: users users_username_key139; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key139 UNIQUE (username);


--
-- Name: users users_username_key14; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key14 UNIQUE (username);


--
-- Name: users users_username_key140; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key140 UNIQUE (username);


--
-- Name: users users_username_key141; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key141 UNIQUE (username);


--
-- Name: users users_username_key142; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key142 UNIQUE (username);


--
-- Name: users users_username_key143; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key143 UNIQUE (username);


--
-- Name: users users_username_key144; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key144 UNIQUE (username);


--
-- Name: users users_username_key145; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key145 UNIQUE (username);


--
-- Name: users users_username_key146; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key146 UNIQUE (username);


--
-- Name: users users_username_key147; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key147 UNIQUE (username);


--
-- Name: users users_username_key148; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key148 UNIQUE (username);


--
-- Name: users users_username_key149; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key149 UNIQUE (username);


--
-- Name: users users_username_key15; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key15 UNIQUE (username);


--
-- Name: users users_username_key150; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key150 UNIQUE (username);


--
-- Name: users users_username_key151; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key151 UNIQUE (username);


--
-- Name: users users_username_key152; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key152 UNIQUE (username);


--
-- Name: users users_username_key153; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key153 UNIQUE (username);


--
-- Name: users users_username_key154; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key154 UNIQUE (username);


--
-- Name: users users_username_key155; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key155 UNIQUE (username);


--
-- Name: users users_username_key156; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key156 UNIQUE (username);


--
-- Name: users users_username_key157; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key157 UNIQUE (username);


--
-- Name: users users_username_key158; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key158 UNIQUE (username);


--
-- Name: users users_username_key159; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key159 UNIQUE (username);


--
-- Name: users users_username_key16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key16 UNIQUE (username);


--
-- Name: users users_username_key160; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key160 UNIQUE (username);


--
-- Name: users users_username_key161; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key161 UNIQUE (username);


--
-- Name: users users_username_key162; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key162 UNIQUE (username);


--
-- Name: users users_username_key163; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key163 UNIQUE (username);


--
-- Name: users users_username_key164; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key164 UNIQUE (username);


--
-- Name: users users_username_key165; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key165 UNIQUE (username);


--
-- Name: users users_username_key166; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key166 UNIQUE (username);


--
-- Name: users users_username_key167; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key167 UNIQUE (username);


--
-- Name: users users_username_key168; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key168 UNIQUE (username);


--
-- Name: users users_username_key169; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key169 UNIQUE (username);


--
-- Name: users users_username_key17; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key17 UNIQUE (username);


--
-- Name: users users_username_key170; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key170 UNIQUE (username);


--
-- Name: users users_username_key171; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key171 UNIQUE (username);


--
-- Name: users users_username_key172; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key172 UNIQUE (username);


--
-- Name: users users_username_key173; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key173 UNIQUE (username);


--
-- Name: users users_username_key174; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key174 UNIQUE (username);


--
-- Name: users users_username_key175; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key175 UNIQUE (username);


--
-- Name: users users_username_key176; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key176 UNIQUE (username);


--
-- Name: users users_username_key177; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key177 UNIQUE (username);


--
-- Name: users users_username_key178; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key178 UNIQUE (username);


--
-- Name: users users_username_key179; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key179 UNIQUE (username);


--
-- Name: users users_username_key18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key18 UNIQUE (username);


--
-- Name: users users_username_key180; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key180 UNIQUE (username);


--
-- Name: users users_username_key181; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key181 UNIQUE (username);


--
-- Name: users users_username_key182; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key182 UNIQUE (username);


--
-- Name: users users_username_key183; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key183 UNIQUE (username);


--
-- Name: users users_username_key184; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key184 UNIQUE (username);


--
-- Name: users users_username_key185; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key185 UNIQUE (username);


--
-- Name: users users_username_key186; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key186 UNIQUE (username);


--
-- Name: users users_username_key187; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key187 UNIQUE (username);


--
-- Name: users users_username_key188; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key188 UNIQUE (username);


--
-- Name: users users_username_key189; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key189 UNIQUE (username);


--
-- Name: users users_username_key19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key19 UNIQUE (username);


--
-- Name: users users_username_key190; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key190 UNIQUE (username);


--
-- Name: users users_username_key191; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key191 UNIQUE (username);


--
-- Name: users users_username_key192; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key192 UNIQUE (username);


--
-- Name: users users_username_key193; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key193 UNIQUE (username);


--
-- Name: users users_username_key194; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key194 UNIQUE (username);


--
-- Name: users users_username_key195; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key195 UNIQUE (username);


--
-- Name: users users_username_key196; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key196 UNIQUE (username);


--
-- Name: users users_username_key197; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key197 UNIQUE (username);


--
-- Name: users users_username_key198; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key198 UNIQUE (username);


--
-- Name: users users_username_key199; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key199 UNIQUE (username);


--
-- Name: users users_username_key2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key2 UNIQUE (username);


--
-- Name: users users_username_key20; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key20 UNIQUE (username);


--
-- Name: users users_username_key200; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key200 UNIQUE (username);


--
-- Name: users users_username_key201; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key201 UNIQUE (username);


--
-- Name: users users_username_key202; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key202 UNIQUE (username);


--
-- Name: users users_username_key203; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key203 UNIQUE (username);


--
-- Name: users users_username_key204; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key204 UNIQUE (username);


--
-- Name: users users_username_key205; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key205 UNIQUE (username);


--
-- Name: users users_username_key206; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key206 UNIQUE (username);


--
-- Name: users users_username_key207; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key207 UNIQUE (username);


--
-- Name: users users_username_key208; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key208 UNIQUE (username);


--
-- Name: users users_username_key209; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key209 UNIQUE (username);


--
-- Name: users users_username_key21; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key21 UNIQUE (username);


--
-- Name: users users_username_key210; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key210 UNIQUE (username);


--
-- Name: users users_username_key211; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key211 UNIQUE (username);


--
-- Name: users users_username_key212; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key212 UNIQUE (username);


--
-- Name: users users_username_key213; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key213 UNIQUE (username);


--
-- Name: users users_username_key214; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key214 UNIQUE (username);


--
-- Name: users users_username_key215; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key215 UNIQUE (username);


--
-- Name: users users_username_key216; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key216 UNIQUE (username);


--
-- Name: users users_username_key217; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key217 UNIQUE (username);


--
-- Name: users users_username_key218; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key218 UNIQUE (username);


--
-- Name: users users_username_key219; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key219 UNIQUE (username);


--
-- Name: users users_username_key22; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key22 UNIQUE (username);


--
-- Name: users users_username_key220; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key220 UNIQUE (username);


--
-- Name: users users_username_key221; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key221 UNIQUE (username);


--
-- Name: users users_username_key222; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key222 UNIQUE (username);


--
-- Name: users users_username_key223; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key223 UNIQUE (username);


--
-- Name: users users_username_key224; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key224 UNIQUE (username);


--
-- Name: users users_username_key225; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key225 UNIQUE (username);


--
-- Name: users users_username_key226; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key226 UNIQUE (username);


--
-- Name: users users_username_key227; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key227 UNIQUE (username);


--
-- Name: users users_username_key228; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key228 UNIQUE (username);


--
-- Name: users users_username_key229; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key229 UNIQUE (username);


--
-- Name: users users_username_key23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key23 UNIQUE (username);


--
-- Name: users users_username_key230; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key230 UNIQUE (username);


--
-- Name: users users_username_key231; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key231 UNIQUE (username);


--
-- Name: users users_username_key232; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key232 UNIQUE (username);


--
-- Name: users users_username_key233; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key233 UNIQUE (username);


--
-- Name: users users_username_key234; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key234 UNIQUE (username);


--
-- Name: users users_username_key235; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key235 UNIQUE (username);


--
-- Name: users users_username_key236; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key236 UNIQUE (username);


--
-- Name: users users_username_key24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key24 UNIQUE (username);


--
-- Name: users users_username_key25; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key25 UNIQUE (username);


--
-- Name: users users_username_key26; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key26 UNIQUE (username);


--
-- Name: users users_username_key27; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key27 UNIQUE (username);


--
-- Name: users users_username_key28; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key28 UNIQUE (username);


--
-- Name: users users_username_key29; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key29 UNIQUE (username);


--
-- Name: users users_username_key3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key3 UNIQUE (username);


--
-- Name: users users_username_key30; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key30 UNIQUE (username);


--
-- Name: users users_username_key31; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key31 UNIQUE (username);


--
-- Name: users users_username_key32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key32 UNIQUE (username);


--
-- Name: users users_username_key33; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key33 UNIQUE (username);


--
-- Name: users users_username_key34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key34 UNIQUE (username);


--
-- Name: users users_username_key35; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key35 UNIQUE (username);


--
-- Name: users users_username_key36; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key36 UNIQUE (username);


--
-- Name: users users_username_key37; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key37 UNIQUE (username);


--
-- Name: users users_username_key38; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key38 UNIQUE (username);


--
-- Name: users users_username_key39; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key39 UNIQUE (username);


--
-- Name: users users_username_key4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key4 UNIQUE (username);


--
-- Name: users users_username_key40; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key40 UNIQUE (username);


--
-- Name: users users_username_key41; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key41 UNIQUE (username);


--
-- Name: users users_username_key42; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key42 UNIQUE (username);


--
-- Name: users users_username_key43; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key43 UNIQUE (username);


--
-- Name: users users_username_key44; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key44 UNIQUE (username);


--
-- Name: users users_username_key45; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key45 UNIQUE (username);


--
-- Name: users users_username_key46; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key46 UNIQUE (username);


--
-- Name: users users_username_key47; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key47 UNIQUE (username);


--
-- Name: users users_username_key48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key48 UNIQUE (username);


--
-- Name: users users_username_key49; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key49 UNIQUE (username);


--
-- Name: users users_username_key5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key5 UNIQUE (username);


--
-- Name: users users_username_key50; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key50 UNIQUE (username);


--
-- Name: users users_username_key51; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key51 UNIQUE (username);


--
-- Name: users users_username_key52; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key52 UNIQUE (username);


--
-- Name: users users_username_key53; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key53 UNIQUE (username);


--
-- Name: users users_username_key54; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key54 UNIQUE (username);


--
-- Name: users users_username_key55; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key55 UNIQUE (username);


--
-- Name: users users_username_key56; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key56 UNIQUE (username);


--
-- Name: users users_username_key57; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key57 UNIQUE (username);


--
-- Name: users users_username_key58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key58 UNIQUE (username);


--
-- Name: users users_username_key59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key59 UNIQUE (username);


--
-- Name: users users_username_key6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key6 UNIQUE (username);


--
-- Name: users users_username_key60; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key60 UNIQUE (username);


--
-- Name: users users_username_key61; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key61 UNIQUE (username);


--
-- Name: users users_username_key62; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key62 UNIQUE (username);


--
-- Name: users users_username_key63; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key63 UNIQUE (username);


--
-- Name: users users_username_key64; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key64 UNIQUE (username);


--
-- Name: users users_username_key65; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key65 UNIQUE (username);


--
-- Name: users users_username_key66; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key66 UNIQUE (username);


--
-- Name: users users_username_key67; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key67 UNIQUE (username);


--
-- Name: users users_username_key68; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key68 UNIQUE (username);


--
-- Name: users users_username_key69; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key69 UNIQUE (username);


--
-- Name: users users_username_key7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key7 UNIQUE (username);


--
-- Name: users users_username_key70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key70 UNIQUE (username);


--
-- Name: users users_username_key71; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key71 UNIQUE (username);


--
-- Name: users users_username_key72; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key72 UNIQUE (username);


--
-- Name: users users_username_key73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key73 UNIQUE (username);


--
-- Name: users users_username_key74; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key74 UNIQUE (username);


--
-- Name: users users_username_key75; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key75 UNIQUE (username);


--
-- Name: users users_username_key76; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key76 UNIQUE (username);


--
-- Name: users users_username_key77; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key77 UNIQUE (username);


--
-- Name: users users_username_key78; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key78 UNIQUE (username);


--
-- Name: users users_username_key79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key79 UNIQUE (username);


--
-- Name: users users_username_key8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key8 UNIQUE (username);


--
-- Name: users users_username_key80; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key80 UNIQUE (username);


--
-- Name: users users_username_key81; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key81 UNIQUE (username);


--
-- Name: users users_username_key82; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key82 UNIQUE (username);


--
-- Name: users users_username_key83; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key83 UNIQUE (username);


--
-- Name: users users_username_key84; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key84 UNIQUE (username);


--
-- Name: users users_username_key85; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key85 UNIQUE (username);


--
-- Name: users users_username_key86; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key86 UNIQUE (username);


--
-- Name: users users_username_key87; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key87 UNIQUE (username);


--
-- Name: users users_username_key88; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key88 UNIQUE (username);


--
-- Name: users users_username_key89; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key89 UNIQUE (username);


--
-- Name: users users_username_key9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key9 UNIQUE (username);


--
-- Name: users users_username_key90; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key90 UNIQUE (username);


--
-- Name: users users_username_key91; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key91 UNIQUE (username);


--
-- Name: users users_username_key92; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key92 UNIQUE (username);


--
-- Name: users users_username_key93; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key93 UNIQUE (username);


--
-- Name: users users_username_key94; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key94 UNIQUE (username);


--
-- Name: users users_username_key95; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key95 UNIQUE (username);


--
-- Name: users users_username_key96; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key96 UNIQUE (username);


--
-- Name: users users_username_key97; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key97 UNIQUE (username);


--
-- Name: users users_username_key98; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key98 UNIQUE (username);


--
-- Name: users users_username_key99; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key99 UNIQUE (username);


--
-- Name: vehicle_checklist_templates vehicle_checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checklist_templates
    ADD CONSTRAINT vehicle_checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: vehicle_checks vehicle_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_pkey PRIMARY KEY (id);


--
-- Name: vehicle_deadlines vehicle_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_deadlines
    ADD CONSTRAINT vehicle_deadlines_pkey PRIMARY KEY (id);


--
-- Name: vehicle_fuel_logs vehicle_fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_pkey PRIMARY KEY (id);


--
-- Name: vehicle_inventories vehicle_inventories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_inventories
    ADD CONSTRAINT vehicle_inventories_pkey PRIMARY KEY (id);


--
-- Name: vehicle_maintenances vehicle_maintenances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_pkey PRIMARY KEY (id);


--
-- Name: vehicle_missions vehicle_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_missions
    ADD CONSTRAINT vehicle_missions_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: workflow_comments workflow_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_comments
    ADD CONSTRAINT workflow_comments_pkey PRIMARY KEY (id);


--
-- Name: workflow_templates workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_tenant_id_idx ON public.audit_logs USING btree (tenant_id);


--
-- Name: category_access_rules_tenant_category; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX category_access_rules_tenant_category ON public.category_access_rules USING btree (tenant_id, category);


--
-- Name: chat_conversations_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_conversations_tenant_id_idx ON public.chat_conversations USING btree (tenant_id);


--
-- Name: compta_docs_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compta_docs_tenant_id_idx ON public.compta_docs USING btree (tenant_id);


--
-- Name: demandes_achats_da_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX demandes_achats_da_number ON public.demandes_achats USING btree (da_number);


--
-- Name: demandes_achats_requester_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX demandes_achats_requester_id ON public.demandes_achats USING btree (requester_id);


--
-- Name: demandes_achats_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX demandes_achats_status ON public.demandes_achats USING btree (status);


--
-- Name: demandes_achats_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX demandes_achats_tenant_id_idx ON public.demandes_achats USING btree (tenant_id);


--
-- Name: departments_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX departments_tenant_id_idx ON public.departments USING btree (tenant_id);


--
-- Name: departments_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX departments_type_idx ON public.departments USING btree (type);


--
-- Name: document_transmissions_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_transmissions_document_id ON public.document_transmissions USING btree (document_id);


--
-- Name: document_transmissions_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_transmissions_to_user_id ON public.document_transmissions USING btree (to_user_id);


--
-- Name: documents_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_category ON public.documents USING btree (category);


--
-- Name: documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_created_at ON public.documents USING btree (created_at);


--
-- Name: documents_date_debut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_date_debut ON public.documents USING btree (date_debut);


--
-- Name: documents_date_fin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_date_fin ON public.documents USING btree (date_fin);


--
-- Name: documents_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_service_id ON public.documents USING btree (service_id);


--
-- Name: documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_status ON public.documents USING btree (status);


--
-- Name: documents_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_tenant_id_idx ON public.documents USING btree (tenant_id);


--
-- Name: documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_user_id ON public.documents USING btree (user_id);


--
-- Name: documents_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_visibility ON public.documents USING btree (visibility);


--
-- Name: employees_is_active_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_is_active_index ON public.employees USING btree (is_active);


--
-- Name: employees_matricule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_matricule ON public.employees USING btree (matricule);


--
-- Name: employees_matricule_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_matricule_index ON public.employees USING btree (matricule);


--
-- Name: employees_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_name_index ON public.employees USING btree (last_name, first_name);


--
-- Name: employees_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_service_id ON public.employees USING btree (service_id);


--
-- Name: employees_service_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_service_id_index ON public.employees USING btree (service_id);


--
-- Name: employees_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_tenant_id_idx ON public.employees USING btree (tenant_id);


--
-- Name: employees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_user_id ON public.employees USING btree (user_id);


--
-- Name: equipements_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX equipements_tenant_id_idx ON public.equipements USING btree (tenant_id);


--
-- Name: form_responses_workflow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX form_responses_workflow_status ON public.form_responses USING btree (workflow_status);


--
-- Name: forms_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forms_tenant_id_idx ON public.forms USING btree (tenant_id);


--
-- Name: gmao_acquisitions_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_acquisitions_tenant_id_idx ON public.gmao_acquisitions USING btree (tenant_id);


--
-- Name: gmao_budget_depenses_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_budget_depenses_tenant_id_idx ON public.gmao_budget_depenses USING btree (tenant_id);


--
-- Name: gmao_budget_lignes_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_budget_lignes_tenant_id_idx ON public.gmao_budget_lignes USING btree (tenant_id);


--
-- Name: gmao_contrats_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_contrats_tenant_id_idx ON public.gmao_contrats USING btree (tenant_id);


--
-- Name: gmao_mouvements_pieces_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_mouvements_pieces_tenant_id_idx ON public.gmao_mouvements_pieces USING btree (tenant_id);


--
-- Name: gmao_pieces_rechange_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gmao_pieces_rechange_tenant_id_idx ON public.gmao_pieces_rechange USING btree (tenant_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_bons_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bons_date ON public.php_bons_prise_en_charge USING btree (date_emission);


--
-- Name: idx_bons_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bons_patient ON public.php_bons_prise_en_charge USING btree (patient_id);


--
-- Name: idx_bons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bons_status ON public.php_bons_prise_en_charge USING btree (status);


--
-- Name: idx_chat_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_members_user ON public.chat_conversation_members USING btree (user_id);


--
-- Name: idx_chat_messages_conv_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conv_id ON public.chat_messages USING btree (conversation_id, created_at);


--
-- Name: idx_chat_reactions_msg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_reactions_msg ON public.chat_reactions USING btree (message_id);


--
-- Name: idx_compta_docs_date_reception; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compta_docs_date_reception ON public.compta_docs USING btree (date_reception);


--
-- Name: idx_compta_docs_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compta_docs_group_id ON public.compta_docs USING btree (group_id);


--
-- Name: idx_compta_docs_numero_ordre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compta_docs_numero_ordre ON public.compta_docs USING btree (numero_ordre);


--
-- Name: idx_compta_docs_saisi_par; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compta_docs_saisi_par ON public.compta_docs USING btree (saisi_par);


--
-- Name: idx_form_permissions_form_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_permissions_form_id ON public.form_permissions USING btree (form_id);


--
-- Name: idx_form_permissions_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_permissions_target ON public.form_permissions USING btree (target_type, target_id);


--
-- Name: idx_form_responses_form_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_responses_form_id ON public.form_responses USING btree (form_id);


--
-- Name: idx_form_responses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_responses_status ON public.form_responses USING btree (status);


--
-- Name: idx_form_responses_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_responses_submitted_at ON public.form_responses USING btree (submitted_at);


--
-- Name: idx_form_responses_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_responses_submitted_by ON public.form_responses USING btree (submitted_by);


--
-- Name: idx_form_responses_workflow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_responses_workflow_status ON public.form_responses USING btree (workflow_status);


--
-- Name: idx_forms_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_created_at ON public.forms USING btree (created_at);


--
-- Name: idx_forms_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_created_by ON public.forms USING btree (created_by);


--
-- Name: idx_forms_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_status ON public.forms USING btree (status);


--
-- Name: idx_forms_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_type ON public.forms USING btree (type);


--
-- Name: idx_php_consult_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_consult_date ON public.php_consultations USING btree (date_consultation);


--
-- Name: idx_php_consult_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_consult_patient ON public.php_consultations USING btree (patient_id);


--
-- Name: idx_php_consult_resultat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_consult_resultat ON public.php_consultations USING btree (resultat);


--
-- Name: idx_php_hosp_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_hosp_date ON public.php_hospitalisations USING btree (date_entree);


--
-- Name: idx_php_hosp_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_hosp_patient ON public.php_hospitalisations USING btree (patient_id);


--
-- Name: idx_php_ops_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_ops_patient ON public.php_operations USING btree (patient_id);


--
-- Name: idx_php_patients_infirmerie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_patients_infirmerie ON public.php_patients USING btree (infirmerie_id);


--
-- Name: idx_php_patients_matricule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_patients_matricule ON public.php_patients USING btree (matricule);


--
-- Name: idx_php_patients_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_patients_nom ON public.php_patients USING btree (nom);


--
-- Name: idx_php_rdv_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_rdv_date ON public.php_rendez_vous USING btree (date_rdv);


--
-- Name: idx_php_rdv_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_rdv_patient ON public.php_rendez_vous USING btree (patient_id);


--
-- Name: idx_php_rdv_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_rdv_status ON public.php_rendez_vous USING btree (status);


--
-- Name: idx_php_repos_datefin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_repos_datefin ON public.php_repos USING btree (date_fin);


--
-- Name: idx_php_repos_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_repos_patient ON public.php_repos USING btree (patient_id);


--
-- Name: idx_php_repos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_php_repos_status ON public.php_repos USING btree (status);


--
-- Name: idx_workflow_comments_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_comments_document_id ON public.workflow_comments USING btree (document_id);


--
-- Name: interventions_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interventions_tenant_id_idx ON public.interventions USING btree (tenant_id);


--
-- Name: invoice_folders_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_folders_tenant_id_idx ON public.invoice_folders USING btree (tenant_id);


--
-- Name: licenses_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licenses_tenant_id_idx ON public.licenses USING btree (tenant_id);


--
-- Name: mission_meal_rates_tenant_id_categorie; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mission_meal_rates_tenant_id_categorie ON public.mission_meal_rates USING btree (tenant_id, categorie);


--
-- Name: motifs_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX motifs_tenant_id_idx ON public.motifs USING btree (tenant_id);


--
-- Name: notification_preferences_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_preferences_tenant_id_idx ON public.notification_preferences USING btree (tenant_id);


--
-- Name: ordre_mission_types_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ordre_mission_types_tenant_id_idx ON public.ordre_mission_types USING btree (tenant_id);


--
-- Name: php_factures_fournisseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_factures_fournisseur ON public.php_factures USING btree (fournisseur);


--
-- Name: php_factures_numero_ordre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_factures_numero_ordre ON public.php_factures USING btree (numero_ordre);


--
-- Name: php_factures_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_factures_tenant_id_idx ON public.php_factures USING btree (tenant_id);


--
-- Name: php_infirmeries_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_infirmeries_tenant_id_idx ON public.php_infirmeries USING btree (tenant_id);


--
-- Name: php_patients_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_patients_tenant_id_idx ON public.php_patients USING btree (tenant_id);


--
-- Name: php_secteurs_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX php_secteurs_tenant_id_idx ON public.php_secteurs USING btree (tenant_id);


--
-- Name: plans_maintenance_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plans_maintenance_tenant_id_idx ON public.plans_maintenance USING btree (tenant_id);


--
-- Name: positions_queue_position_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX positions_queue_position_unique ON public.positions USING btree (queue_type, position_number);


--
-- Name: positions_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX positions_tenant_id_idx ON public.positions USING btree (tenant_id);


--
-- Name: postes_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postes_tenant_id_idx ON public.postes USING btree (tenant_id);


--
-- Name: push_subscriptions_user_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_active_idx ON public.push_subscriptions USING btree (user_id, active);


--
-- Name: push_subscriptions_user_endpoint_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX push_subscriptions_user_endpoint_unique ON public.push_subscriptions USING btree (user_id, endpoint);


--
-- Name: queue_positions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queue_positions_status_idx ON public.queue_positions USING btree (status);


--
-- Name: queue_positions_type_position_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX queue_positions_type_position_unique ON public.queue_positions USING btree (queue_type, position_number);


--
-- Name: queue_positions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queue_positions_user_id_idx ON public.queue_positions USING btree (user_id);


--
-- Name: release_notes_tenant_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_notes_tenant_id_status ON public.release_notes USING btree (tenant_id, status);


--
-- Name: sage_facture_imports_encounter_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sage_facture_imports_encounter_key ON public.sage_facture_imports USING btree (encounter_key);


--
-- Name: sage_facture_imports_sage_client_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sage_facture_imports_sage_client_num ON public.sage_facture_imports USING btree (sage_client_num);


--
-- Name: sage_facture_imports_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sage_facture_imports_tenant_id ON public.sage_facture_imports USING btree (tenant_id);


--
-- Name: sage_facture_imports_tenant_piece; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sage_facture_imports_tenant_piece ON public.sage_facture_imports USING btree (tenant_id, sage_doc_piece);


--
-- Name: schedule_assignments_employee_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_assignments_employee_date_idx ON public.schedule_assignments USING btree (employee_id, assignment_date);


--
-- Name: schedule_assignments_notification_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_assignments_notification_idx ON public.schedule_assignments USING btree (notification_sent, assignment_date);


--
-- Name: schedule_assignments_reminder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_assignments_reminder_idx ON public.schedule_assignments USING btree (reminder_sent, assignment_date);


--
-- Name: schedule_assignments_schedule_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_assignments_schedule_date_idx ON public.schedule_assignments USING btree (schedule_id, assignment_date);


--
-- Name: schedule_assignments_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_assignments_user_date_idx ON public.schedule_assignments USING btree (user_id, assignment_date);


--
-- Name: schedule_changes_log_schedule_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_changes_log_schedule_date_idx ON public.schedule_changes_log USING btree (schedule_id, created_at);


--
-- Name: schedule_changes_log_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_changes_log_type_idx ON public.schedule_changes_log USING btree (change_type);


--
-- Name: schedule_changes_log_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_changes_log_user_date_idx ON public.schedule_changes_log USING btree (changed_by_user_id, created_at);


--
-- Name: schedule_validations_schedule_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_validations_schedule_order_idx ON public.schedule_validations USING btree (schedule_id, validation_order);


--
-- Name: schedule_validations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_validations_status_idx ON public.schedule_validations USING btree (status);


--
-- Name: schedule_validations_validator_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedule_validations_validator_status_idx ON public.schedule_validations USING btree (validator_user_id, status);


--
-- Name: schedules_dates_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedules_dates_idx ON public.schedules USING btree (start_date, end_date);


--
-- Name: schedules_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedules_status_idx ON public.schedules USING btree (status);


--
-- Name: schedules_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedules_tenant_id_idx ON public.schedules USING btree (tenant_id);


--
-- Name: schedules_type_year_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schedules_type_year_month_idx ON public.schedules USING btree (schedule_type, year, month);


--
-- Name: service_members_fonction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_members_fonction ON public.service_members USING btree (fonction);


--
-- Name: service_members_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_members_service_id ON public.service_members USING btree (service_id);


--
-- Name: service_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_members_user_id ON public.service_members USING btree (user_id);


--
-- Name: services_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_tenant_id_idx ON public.services USING btree (tenant_id);


--
-- Name: shift_types_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shift_types_tenant_id_idx ON public.shift_types USING btree (tenant_id);


--
-- Name: template_permissions_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX template_permissions_tenant_id_idx ON public.template_permissions USING btree (tenant_id);


--
-- Name: tenant_integrations_tenant_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_integrations_tenant_kind ON public.tenant_integrations USING btree (tenant_id, kind);


--
-- Name: ticket_history_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_history_action_idx ON public.ticket_history USING btree (action);


--
-- Name: ticket_history_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_history_created_at_idx ON public.ticket_history USING btree (created_at);


--
-- Name: ticket_history_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_history_ticket_id_idx ON public.ticket_history USING btree (ticket_id);


--
-- Name: tickets_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_created_at_idx ON public.tickets USING btree (created_at);


--
-- Name: tickets_queue_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_queue_type_idx ON public.tickets USING btree (queue_type);


--
-- Name: tickets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_status_idx ON public.tickets USING btree (status);


--
-- Name: tickets_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_tenant_id_idx ON public.tickets USING btree (tenant_id);


--
-- Name: tickets_ticket_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tickets_ticket_number_unique ON public.tickets USING btree (ticket_number);


--
-- Name: trello_activity_logs_action_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_activity_logs_action_type_idx ON public.trello_activity_logs USING btree (action_type);


--
-- Name: trello_activity_logs_card_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_activity_logs_card_date_idx ON public.trello_activity_logs USING btree (card_id, created_at);


--
-- Name: trello_attachments_card_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_attachments_card_idx ON public.trello_attachments USING btree (card_id);


--
-- Name: trello_boards_service_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_boards_service_type_idx ON public.trello_boards USING btree (service_type);


--
-- Name: trello_boards_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_boards_tenant_id_idx ON public.trello_boards USING btree (tenant_id);


--
-- Name: trello_cards_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_assigned_to_idx ON public.trello_cards USING btree (assigned_to);


--
-- Name: trello_cards_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_due_date_idx ON public.trello_cards USING btree (due_date);


--
-- Name: trello_cards_list_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_list_position_idx ON public.trello_cards USING btree (list_id, "position");


--
-- Name: trello_cards_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_priority_idx ON public.trello_cards USING btree (priority);


--
-- Name: trello_cards_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_status_idx ON public.trello_cards USING btree (status);


--
-- Name: trello_cards_work_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_cards_work_request_idx ON public.trello_cards USING btree (linked_work_request_id);


--
-- Name: trello_comments_card_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_comments_card_date_idx ON public.trello_comments USING btree (card_id, created_at);


--
-- Name: trello_lists_board_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trello_lists_board_position_idx ON public.trello_lists USING btree (board_id, "position");


--
-- Name: users_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_tenant_id_idx ON public.users USING btree (tenant_id);


--
-- Name: vehicle_checks_mission_phase_section_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vehicle_checks_mission_phase_section_uq ON public.vehicle_checks USING btree (mission_id, phase, section_key);


--
-- Name: vehicle_checks_vehicle_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_checks_vehicle_date ON public.vehicle_checks USING btree (vehicle_id, performed_at);


--
-- Name: vehicle_deadlines_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_deadlines_vehicle ON public.vehicle_deadlines USING btree (vehicle_id);


--
-- Name: vehicle_fuel_logs_vehicle_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_fuel_logs_vehicle_date ON public.vehicle_fuel_logs USING btree (vehicle_id, date);


--
-- Name: vehicle_inventories_tenant_id_inventory_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_inventories_tenant_id_inventory_date ON public.vehicle_inventories USING btree (tenant_id, inventory_date);


--
-- Name: vehicle_inventories_vehicle_id_inventory_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_inventories_vehicle_id_inventory_date ON public.vehicle_inventories USING btree (vehicle_id, inventory_date);


--
-- Name: vehicle_maintenances_vehicle_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_maintenances_vehicle_date ON public.vehicle_maintenances USING btree (vehicle_id, date);


--
-- Name: vehicle_missions_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_missions_document ON public.vehicle_missions USING btree (document_id);


--
-- Name: vehicle_missions_vehicle_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicle_missions_vehicle_status ON public.vehicle_missions USING btree (vehicle_id, status);


--
-- Name: vehicles_tenant_immat_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vehicles_tenant_immat_uq ON public.vehicles USING btree (tenant_id, immatriculation);


--
-- Name: workflow_templates_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_templates_tenant_id_idx ON public.workflow_templates USING btree (tenant_id);


--
-- Name: workflows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_created_at ON public.workflows USING btree (created_at);


--
-- Name: workflows_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_document_id ON public.workflows USING btree (document_id);


--
-- Name: workflows_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_status ON public.workflows USING btree (status);


--
-- Name: workflows_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_step ON public.workflows USING btree (step);


--
-- Name: workflows_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_tenant_id_idx ON public.workflows USING btree (tenant_id);


--
-- Name: workflows_validator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflows_validator_id ON public.workflows USING btree (validator_id);


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: category_access_rules category_access_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_access_rules
    ADD CONSTRAINT category_access_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: category_access_rules category_access_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_access_rules
    ADD CONSTRAINT category_access_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_conversation_members chat_conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_members
    ADD CONSTRAINT chat_conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_conversation_members chat_conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_members
    ADD CONSTRAINT chat_conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: compta_docs compta_docs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compta_docs
    ADD CONSTRAINT compta_docs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: compta_docs compta_docs_saisi_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compta_docs
    ADD CONSTRAINT compta_docs_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: compta_docs compta_docs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compta_docs
    ADD CONSTRAINT compta_docs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: demandes_achats demandes_achats_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: demandes_achats demandes_achats_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: departments departments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: document_transmissions document_transmissions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_transmissions
    ADD CONSTRAINT document_transmissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_transmissions document_transmissions_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_transmissions
    ADD CONSTRAINT document_transmissions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_transmissions document_transmissions_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_transmissions
    ADD CONSTRAINT document_transmissions_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_invoice_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_invoice_folder_id_fkey FOREIGN KEY (invoice_folder_id) REFERENCES public.invoice_folders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE;


--
-- Name: employees employees_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: equipements equipements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: form_permissions form_permissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_permissions
    ADD CONSTRAINT form_permissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forms forms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forms forms_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: forms forms_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_workflow_template_id_fkey FOREIGN KEY (workflow_template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;


--
-- Name: gmao_acquisitions gmao_acquisitions_demandeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_acquisitions
    ADD CONSTRAINT gmao_acquisitions_demandeur_id_fkey FOREIGN KEY (demandeur_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gmao_acquisitions gmao_acquisitions_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_acquisitions
    ADD CONSTRAINT gmao_acquisitions_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE SET NULL;


--
-- Name: gmao_acquisitions gmao_acquisitions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_acquisitions
    ADD CONSTRAINT gmao_acquisitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gmao_budget_depenses gmao_budget_depenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_depenses
    ADD CONSTRAINT gmao_budget_depenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gmao_budget_depenses gmao_budget_depenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_depenses
    ADD CONSTRAINT gmao_budget_depenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gmao_budget_lignes gmao_budget_lignes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_lignes
    ADD CONSTRAINT gmao_budget_lignes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gmao_budget_lignes gmao_budget_lignes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_budget_lignes
    ADD CONSTRAINT gmao_budget_lignes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gmao_contrats gmao_contrats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_contrats
    ADD CONSTRAINT gmao_contrats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gmao_contrats gmao_contrats_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_contrats
    ADD CONSTRAINT gmao_contrats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gmao_mouvements_pieces gmao_mouvements_pieces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces
    ADD CONSTRAINT gmao_mouvements_pieces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gmao_mouvements_pieces gmao_mouvements_pieces_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces
    ADD CONSTRAINT gmao_mouvements_pieces_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE SET NULL;


--
-- Name: gmao_mouvements_pieces gmao_mouvements_pieces_piece_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces
    ADD CONSTRAINT gmao_mouvements_pieces_piece_id_fkey FOREIGN KEY (piece_id) REFERENCES public.gmao_pieces_rechange(id) ON DELETE CASCADE;


--
-- Name: gmao_mouvements_pieces gmao_mouvements_pieces_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_mouvements_pieces
    ADD CONSTRAINT gmao_mouvements_pieces_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gmao_pieces_rechange gmao_pieces_rechange_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmao_pieces_rechange
    ADD CONSTRAINT gmao_pieces_rechange_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: interventions interventions_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE CASCADE;


--
-- Name: interventions interventions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans_maintenance(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_technicien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_folders invoice_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_folders
    ADD CONSTRAINT invoice_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.invoice_folders(id) ON DELETE CASCADE;


--
-- Name: invoice_folders invoice_folders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_folders
    ADD CONSTRAINT invoice_folders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: licenses licenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: motifs motifs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motifs
    ADD CONSTRAINT motifs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ordre_mission_types ordre_mission_types_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordre_mission_types
    ADD CONSTRAINT ordre_mission_types_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: ordre_mission_types ordre_mission_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordre_mission_types
    ADD CONSTRAINT ordre_mission_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: php_bons_prise_en_charge php_bons_prise_en_charge_agent_emetteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_bons_prise_en_charge
    ADD CONSTRAINT php_bons_prise_en_charge_agent_emetteur_id_fkey FOREIGN KEY (agent_emetteur_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: php_bons_prise_en_charge php_bons_prise_en_charge_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_bons_prise_en_charge
    ADD CONSTRAINT php_bons_prise_en_charge_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_bons_prise_en_charge php_bons_prise_en_charge_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_bons_prise_en_charge
    ADD CONSTRAINT php_bons_prise_en_charge_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;


--
-- Name: php_consultations php_consultations_agent_accueil_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_consultations
    ADD CONSTRAINT php_consultations_agent_accueil_id_fkey FOREIGN KEY (agent_accueil_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_consultations php_consultations_bon_prise_en_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_consultations
    ADD CONSTRAINT php_consultations_bon_prise_en_charge_id_fkey FOREIGN KEY (bon_prise_en_charge_id) REFERENCES public.php_bons_prise_en_charge(id) ON DELETE SET NULL;


--
-- Name: php_consultations php_consultations_medecin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_consultations
    ADD CONSTRAINT php_consultations_medecin_id_fkey FOREIGN KEY (medecin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_consultations php_consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_consultations
    ADD CONSTRAINT php_consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_deces_transferts php_deces_transferts_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_deces_transferts
    ADD CONSTRAINT php_deces_transferts_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.php_consultations(id) ON DELETE SET NULL;


--
-- Name: php_deces_transferts php_deces_transferts_enregistre_par_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_deces_transferts
    ADD CONSTRAINT php_deces_transferts_enregistre_par_id_fkey FOREIGN KEY (enregistre_par_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_deces_transferts php_deces_transferts_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_deces_transferts
    ADD CONSTRAINT php_deces_transferts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_factures php_factures_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_factures
    ADD CONSTRAINT php_factures_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: php_factures php_factures_saisi_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_factures
    ADD CONSTRAINT php_factures_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_factures php_factures_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_factures
    ADD CONSTRAINT php_factures_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: php_hospitalisations php_hospitalisations_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_hospitalisations
    ADD CONSTRAINT php_hospitalisations_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.php_consultations(id) ON DELETE SET NULL;


--
-- Name: php_hospitalisations php_hospitalisations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_hospitalisations
    ADD CONSTRAINT php_hospitalisations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_infirmeries php_infirmeries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_infirmeries
    ADD CONSTRAINT php_infirmeries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: php_operations php_operations_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_operations
    ADD CONSTRAINT php_operations_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.php_consultations(id) ON DELETE SET NULL;


--
-- Name: php_operations php_operations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_operations
    ADD CONSTRAINT php_operations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_patients php_patients_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_patients php_patients_infirmerie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_infirmerie_id_fkey FOREIGN KEY (infirmerie_id) REFERENCES public.php_infirmeries(id) ON DELETE SET NULL;


--
-- Name: php_patients php_patients_secteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_secteur_id_fkey FOREIGN KEY (secteur_id) REFERENCES public.php_secteurs(id) ON DELETE SET NULL;


--
-- Name: php_patients php_patients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_patients
    ADD CONSTRAINT php_patients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: php_rendez_vous php_rendez_vous_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_rendez_vous
    ADD CONSTRAINT php_rendez_vous_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.php_consultations(id) ON DELETE SET NULL;


--
-- Name: php_rendez_vous php_rendez_vous_cree_par_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_rendez_vous
    ADD CONSTRAINT php_rendez_vous_cree_par_id_fkey FOREIGN KEY (cree_par_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_rendez_vous php_rendez_vous_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_rendez_vous
    ADD CONSTRAINT php_rendez_vous_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_repos php_repos_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_repos
    ADD CONSTRAINT php_repos_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.php_consultations(id) ON DELETE SET NULL;


--
-- Name: php_repos php_repos_medecin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_repos
    ADD CONSTRAINT php_repos_medecin_id_fkey FOREIGN KEY (medecin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: php_repos php_repos_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_repos
    ADD CONSTRAINT php_repos_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.php_patients(id) ON DELETE CASCADE;


--
-- Name: php_secteurs php_secteurs_infirmerie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_secteurs
    ADD CONSTRAINT php_secteurs_infirmerie_id_fkey FOREIGN KEY (infirmerie_id) REFERENCES public.php_infirmeries(id) ON DELETE SET NULL;


--
-- Name: php_secteurs php_secteurs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.php_secteurs
    ADD CONSTRAINT php_secteurs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: plans_maintenance plans_maintenance_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_maintenance
    ADD CONSTRAINT plans_maintenance_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE CASCADE;


--
-- Name: plans_maintenance plans_maintenance_technicien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_maintenance
    ADD CONSTRAINT plans_maintenance_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: plans_maintenance plans_maintenance_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans_maintenance
    ADD CONSTRAINT plans_maintenance_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: positions positions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: positions positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: postes postes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: queue_positions queue_positions_current_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_current_ticket_id_fkey FOREIGN KEY (current_ticket_id) REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: queue_positions queue_positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: release_notes release_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_notes
    ADD CONSTRAINT release_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sage_facture_imports sage_facture_imports_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sage_facture_imports
    ADD CONSTRAINT sage_facture_imports_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: schedule_assignments schedule_assignments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: schedule_assignments schedule_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: schedule_assignments schedule_assignments_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_assignments schedule_assignments_shift_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_shift_type_id_fkey FOREIGN KEY (shift_type_id) REFERENCES public.shift_types(id) ON DELETE RESTRICT;


--
-- Name: schedule_assignments schedule_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_changes_log schedule_changes_log_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: schedule_changes_log schedule_changes_log_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_validations schedule_validations_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_validations schedule_validations_validator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_validator_user_id_fkey FOREIGN KEY (validator_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: schedules schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_published_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_published_by_user_id_fkey FOREIGN KEY (published_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: service_members service_members_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_members service_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: services services_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: shift_types shift_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_types
    ADD CONSTRAINT shift_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: template_fields template_fields_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT template_fields_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_permissions template_permissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_permissions
    ADD CONSTRAINT template_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_integrations tenant_integrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_integrations tenant_integrations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tenant_mail_settings tenant_mail_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_mail_settings
    ADD CONSTRAINT tenant_mail_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_mail_settings tenant_mail_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_mail_settings
    ADD CONSTRAINT tenant_mail_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ticket_history ticket_history_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_history ticket_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tickets tickets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: trello_activity_logs trello_activity_logs_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_activity_logs trello_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_attachments trello_attachments_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_attachments trello_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_boards trello_boards_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_boards
    ADD CONSTRAINT trello_boards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: trello_cards trello_cards_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trello_cards trello_cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trello_cards trello_cards_linked_work_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_linked_work_request_id_fkey FOREIGN KEY (linked_work_request_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trello_cards trello_cards_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.trello_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_comments trello_comments_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_comments trello_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_lists trello_lists_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trello_lists
    ADD CONSTRAINT trello_lists_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.trello_boards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_postes user_postes_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_postes
    ADD CONSTRAINT user_postes_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_postes user_postes_poste_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_postes
    ADD CONSTRAINT user_postes_poste_id_fkey FOREIGN KEY (poste_id) REFERENCES public.postes(id) ON DELETE CASCADE;


--
-- Name: user_postes user_postes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_postes
    ADD CONSTRAINT user_postes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_substitute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_substitute_id_fkey FOREIGN KEY (substitute_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_checklist_templates vehicle_checklist_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checklist_templates
    ADD CONSTRAINT vehicle_checklist_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_checklist_templates vehicle_checklist_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checklist_templates
    ADD CONSTRAINT vehicle_checklist_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_checks vehicle_checks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: vehicle_checks vehicle_checks_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.vehicle_missions(id) ON DELETE CASCADE;


--
-- Name: vehicle_checks vehicle_checks_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_checks vehicle_checks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_checks vehicle_checks_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_checks
    ADD CONSTRAINT vehicle_checks_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_deadlines vehicle_deadlines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_deadlines
    ADD CONSTRAINT vehicle_deadlines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_deadlines vehicle_deadlines_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_deadlines
    ADD CONSTRAINT vehicle_deadlines_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_fuel_logs vehicle_fuel_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_fuel_logs vehicle_fuel_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_fuel_logs vehicle_fuel_logs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_inventories vehicle_inventories_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_inventories
    ADD CONSTRAINT vehicle_inventories_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: vehicle_inventories vehicle_inventories_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_inventories
    ADD CONSTRAINT vehicle_inventories_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_inventories vehicle_inventories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_inventories
    ADD CONSTRAINT vehicle_inventories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_inventories vehicle_inventories_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_inventories
    ADD CONSTRAINT vehicle_inventories_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_maintenances vehicle_maintenances_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_check_id_fkey FOREIGN KEY (check_id) REFERENCES public.vehicle_checks(id) ON DELETE SET NULL;


--
-- Name: vehicle_maintenances vehicle_maintenances_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_maintenances vehicle_maintenances_deadline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_deadline_id_fkey FOREIGN KEY (deadline_id) REFERENCES public.vehicle_deadlines(id) ON DELETE SET NULL;


--
-- Name: vehicle_maintenances vehicle_maintenances_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_maintenances vehicle_maintenances_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenances
    ADD CONSTRAINT vehicle_maintenances_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_missions vehicle_missions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_missions
    ADD CONSTRAINT vehicle_missions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vehicle_missions vehicle_missions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_missions
    ADD CONSTRAINT vehicle_missions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: vehicle_missions vehicle_missions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_missions
    ADD CONSTRAINT vehicle_missions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vehicle_missions vehicle_missions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_missions
    ADD CONSTRAINT vehicle_missions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_checklist_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_checklist_template_id_fkey FOREIGN KEY (checklist_template_id) REFERENCES public.vehicle_checklist_templates(id) ON DELETE SET NULL;


--
-- Name: vehicles vehicles_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: vehicles vehicles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: workflow_comments workflow_comments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_comments
    ADD CONSTRAINT workflow_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: workflow_comments workflow_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_comments
    ADD CONSTRAINT workflow_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: workflow_templates workflow_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: workflow_templates workflow_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflows workflows_original_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_original_validator_id_fkey FOREIGN KEY (original_validator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workflows workflows_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."SequelizeMeta" VALUES ('20250131000000-add-work-request-features.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20250131000001-add-position-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251030153000-update-documents-table-for-workflows.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251030155500-create-motifs-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251030155501-create-services-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251030192600-update-workflow-status-enum.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20250131000006-create-service-members.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251031151000-add-in-progress-to-document-status.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251105161100-add-assigned-at-to-workflows.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251110134900-add-position-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251110150000-force-add-position-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251110200000-force-add-position-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251113160000-force-add-position-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251115160000-create-template-tables.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251115180000-seed-demande-permission.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251201000000-create-employees-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241121100000-create-push-subscriptions.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241121130000-create-tickets.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241121130100-create-queue-positions.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241121130200-create-ticket-history.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241122000000-add-queue-roles.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241123000000-create-positions.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000000-create-departments.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000100-create-shift-types.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000200-create-schedules.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000300-create-schedule-assignments.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000400-create-schedule-validations.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241124000500-create-schedule-changes-log.cjs20241124000500-create-schedule-changes-log.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241202000000-create-trello-system.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251202093000-add-date-history-to-trello-cards.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251202120000-create-license.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251203000000-create-invoice-system.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251203140000-fix-invoice-folders.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251209100000-add-new-fields-to-trello-cards.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251215160000-create-demande-achat.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20251217000000-fix-demande-achat.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260612120000-create-postes.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260612120100-create-ordre-mission-types.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260617120000-create-php-factures.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241121200000-create-services-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20241122100000-create-employees-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628000000-create-tenants-table.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628000001-add-tenant-id-to-all-tables.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628000002-update-tenants-and-superadmin.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628000003-add-missing-tenant-id.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628000004-add-2fa-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260628100001-add-workflow-to-forms.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260716120000-add-primary-color-to-tenants.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260729120000-add-tenant-id-to-gmao-phase4-tables.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260729120100-seed-gmao-poste.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260729140000-create-gmao-phase4-tables.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260917000000-add-document-visibility.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260917010000-add-ro-sau-mission-type.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260917020000-add-employee-user-link-and-om-service.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260917030000-create-mission-meal-rate-tables.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260918000000-add-absence-substitute.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260918010000-extend-mission-meal-rules.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260918020000-add-additional-domains-to-tenants.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260919150000-create-sage-facture-import.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260919160000-add-tenant-id-to-compta-docs.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260919170000-add-tenant-id-to-chat-conversations.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260920000000-add-lang-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260922130000-add-informatique-to-motifs-type.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260929120000-add-seen-release-notes-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260929140000-create-release-notes.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20260930100000-create-document-transmissions.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001100000-create-tenant-mail-settings.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001120000-create-tenant-settings.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001140000-create-tenant-integrations.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001140100-sage-facture-imports-unique-per-tenant.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001160000-add-email-otp-to-users.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261001160100-create-category-access-rules.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261002100000-add-stamp-size.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261002120000-sage-bl-php.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261002140000-seed-circuits-php.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261025100000-create-parc-vehicules.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261025120000-fleet-admin-access.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261025140000-parc-vehicules-suivi.cjs');
INSERT INTO public."SequelizeMeta" VALUES ('20261026120000-inventaire-ambulance.cjs');


--
-- PostgreSQL database dump complete
--

