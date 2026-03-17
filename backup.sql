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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_DemandesAchats_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public."enum_DemandesAchats_status" AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'in_progress',
    'completed'
);


ALTER TYPE public."enum_DemandesAchats_status" OWNER TO ged_user;

--
-- Name: enum_demandes_achats_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_demandes_achats_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'in_progress',
    'completed'
);


ALTER TYPE public.enum_demandes_achats_status OWNER TO ged_user;

--
-- Name: enum_departments_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_departments_type AS ENUM (
    'medical',
    'paramedical',
    'administrative',
    'support',
    'pharmacy'
);


ALTER TYPE public.enum_departments_type OWNER TO ged_user;

--
-- Name: enum_documents_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_documents_status AS ENUM (
    'draft',
    'pending_validation',
    'approved',
    'rejected',
    'en_attente_dependance',
    'in_progress'
);


ALTER TYPE public.enum_documents_status OWNER TO ged_user;

--
-- Name: enum_employees_gender; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_employees_gender AS ENUM (
    'M',
    'F'
);


ALTER TYPE public.enum_employees_gender OWNER TO ged_user;

--
-- Name: enum_employees_marital_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_employees_marital_status AS ENUM (
    'C├®libataire',
    'Mari├®(e)',
    'Divorc├®(e)',
    'Célibataire',
    'Marié(e)',
    'Divorcé(e)',
    'Veuf(ve)'
);


ALTER TYPE public.enum_employees_marital_status OWNER TO ged_user;

--
-- Name: enum_invoice_folders_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_invoice_folders_type AS ENUM (
    'inbox',
    'custom',
    'archive',
    'container'
);


ALTER TYPE public.enum_invoice_folders_type OWNER TO ged_user;

--
-- Name: enum_motifs_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_motifs_type AS ENUM (
    'MG',
    'Biomedical'
);


ALTER TYPE public.enum_motifs_type OWNER TO ged_user;

--
-- Name: enum_positions_queue_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_positions_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


ALTER TYPE public.enum_positions_queue_type OWNER TO ged_user;

--
-- Name: enum_positions_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_positions_status AS ENUM (
    'offline',
    'available',
    'busy'
);


ALTER TYPE public.enum_positions_status OWNER TO ged_user;

--
-- Name: enum_queue_positions_queue_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_queue_positions_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


ALTER TYPE public.enum_queue_positions_queue_type OWNER TO ged_user;

--
-- Name: enum_queue_positions_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_queue_positions_status AS ENUM (
    'available',
    'busy',
    'offline'
);


ALTER TYPE public.enum_queue_positions_status OWNER TO ged_user;

--
-- Name: enum_schedule_changes_log_change_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_schedule_changes_log_change_type AS ENUM (
    'create',
    'update',
    'delete',
    'status_change',
    'validation',
    'publish'
);


ALTER TYPE public.enum_schedule_changes_log_change_type OWNER TO ged_user;

--
-- Name: enum_schedule_validations_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_schedule_validations_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.enum_schedule_validations_status OWNER TO ged_user;

--
-- Name: enum_schedule_validations_validator_role; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_schedule_validations_validator_role AS ENUM (
    'dds',
    'medical_chief',
    'dg'
);


ALTER TYPE public.enum_schedule_validations_validator_role OWNER TO ged_user;

--
-- Name: enum_schedules_schedule_type; Type: TYPE; Schema: public; Owner: ged_user
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


ALTER TYPE public.enum_schedules_schedule_type OWNER TO ged_user;

--
-- Name: enum_schedules_status; Type: TYPE; Schema: public; Owner: ged_user
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


ALTER TYPE public.enum_schedules_status OWNER TO ged_user;

--
-- Name: enum_template_fields_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_template_fields_type AS ENUM (
    'text',
    'number',
    'date',
    'select',
    'textarea'
);


ALTER TYPE public.enum_template_fields_type OWNER TO ged_user;

--
-- Name: enum_ticket_history_action; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_ticket_history_action AS ENUM (
    'created',
    'called',
    'started',
    'transferred',
    'completed',
    'cancelled'
);


ALTER TYPE public.enum_ticket_history_action OWNER TO ged_user;

--
-- Name: enum_tickets_patient_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_tickets_patient_type AS ENUM (
    'php',
    'normal'
);


ALTER TYPE public.enum_tickets_patient_type OWNER TO ged_user;

--
-- Name: enum_tickets_queue_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_tickets_queue_type AS ENUM (
    'accueil_php',
    'accueil_normal',
    'caisse'
);


ALTER TYPE public.enum_tickets_queue_type OWNER TO ged_user;

--
-- Name: enum_tickets_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_tickets_status AS ENUM (
    'waiting',
    'called',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.enum_tickets_status OWNER TO ged_user;

--
-- Name: enum_tickets_visit_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_tickets_visit_type AS ENUM (
    'consultation',
    'visite',
    'garde_malade'
);


ALTER TYPE public.enum_tickets_visit_type OWNER TO ged_user;

--
-- Name: enum_trello_activity_logs_action_type; Type: TYPE; Schema: public; Owner: ged_user
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


ALTER TYPE public.enum_trello_activity_logs_action_type OWNER TO ged_user;

--
-- Name: enum_trello_attachments_attachment_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_trello_attachments_attachment_type AS ENUM (
    'photo_before',
    'photo_after',
    'document',
    'other'
);


ALTER TYPE public.enum_trello_attachments_attachment_type OWNER TO ged_user;

--
-- Name: enum_trello_boards_service_type; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_trello_boards_service_type AS ENUM (
    'MG',
    'Biomedical',
    'Informatique'
);


ALTER TYPE public.enum_trello_boards_service_type OWNER TO ged_user;

--
-- Name: enum_trello_cards_priority; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_trello_cards_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public.enum_trello_cards_priority OWNER TO ged_user;

--
-- Name: enum_trello_cards_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_trello_cards_status AS ENUM (
    'todo',
    'in_progress',
    'blocked',
    'completed',
    'cancelled'
);


ALTER TYPE public.enum_trello_cards_status OWNER TO ged_user;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: ged_user
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
    'chef_de_service'
);


ALTER TYPE public.enum_users_role OWNER TO ged_user;

--
-- Name: enum_workflows_status; Type: TYPE; Schema: public; Owner: ged_user
--

CREATE TYPE public.enum_workflows_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'queued',
    'en_pause'
);


ALTER TYPE public.enum_workflows_status OWNER TO ged_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


ALTER TABLE public."SequelizeMeta" OWNER TO ged_user;

--
-- Name: demandes_achats; Type: TABLE; Schema: public; Owner: ged_user
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
    non_ref_articles jsonb DEFAULT '"[]"'::jsonb,
    total_ref_value numeric(10,2) DEFAULT 0,
    total_non_ref_value numeric(10,2) DEFAULT 0,
    attached_documents jsonb DEFAULT '"[]"'::jsonb,
    supplier_id uuid,
    status public.enum_demandes_achats_status DEFAULT 'draft'::public.enum_demandes_achats_status,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.demandes_achats OWNER TO ged_user;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type public.enum_departments_type NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.departments OWNER TO ged_user;

--
-- Name: COLUMN departments.code; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.departments.code IS 'Code du département (ex: SAU, CHIR, MED)';


--
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.departments.name IS 'Nom complet du département';


--
-- Name: COLUMN departments.type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.departments.type IS 'Type de département';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: ged_user
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
    invoice_folder_id uuid
);


ALTER TABLE public.documents OWNER TO ged_user;

--
-- Name: COLUMN documents.metadata; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.documents.metadata IS 'Stocke des informations supplÔö£┬«mentaires comme l''Ôö£┬«tat de la signature (hasSignature, signaturesCount)';


--
-- Name: COLUMN documents.date_debut; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.documents.date_debut IS 'Date de dÔö£┬«but de la permission';


--
-- Name: COLUMN documents.date_fin; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.documents.date_fin IS 'Date de fin de la permission';


--
-- Name: employees; Type: TABLE; Schema: public; Owner: ged_user
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
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.employees OWNER TO ged_user;

--
-- Name: invoice_folders; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.invoice_folders (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type public.enum_invoice_folders_type DEFAULT 'custom'::public.enum_invoice_folders_type,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    parent_id uuid
);


ALTER TABLE public.invoice_folders OWNER TO ged_user;

--
-- Name: licenses; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    key text NOT NULL,
    client_name character varying(255),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.licenses OWNER TO ged_user;

--
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: ged_user
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.licenses_id_seq OWNER TO ged_user;

--
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ged_user
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- Name: motifs; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.motifs (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.motifs OWNER TO ged_user;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.positions (
    id uuid NOT NULL,
    queue_type public.enum_positions_queue_type NOT NULL,
    position_number integer NOT NULL,
    user_id uuid,
    status public.enum_positions_status DEFAULT 'offline'::public.enum_positions_status,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.positions OWNER TO ged_user;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.push_subscriptions OWNER TO ged_user;

--
-- Name: COLUMN push_subscriptions.subscription; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.push_subscriptions.subscription IS 'JSON stringifié de la souscription push complète';


--
-- Name: queue_positions; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.queue_positions OWNER TO ged_user;

--
-- Name: schedule_assignments; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.schedule_assignments OWNER TO ged_user;

--
-- Name: COLUMN schedule_assignments.schedule_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.schedule_id IS 'Planning parent';


--
-- Name: COLUMN schedule_assignments.user_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.user_id IS 'Utilisateur assigné (si dans users)';


--
-- Name: COLUMN schedule_assignments.employee_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.employee_id IS 'Employé assigné (si dans employees)';


--
-- Name: COLUMN schedule_assignments.employee_name; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.employee_name IS 'Nom de l''employé (pour référence rapide)';


--
-- Name: COLUMN schedule_assignments.assignment_date; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.assignment_date IS 'Date de l''affectation';


--
-- Name: COLUMN schedule_assignments.shift_type_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.shift_type_id IS 'Type de shift';


--
-- Name: COLUMN schedule_assignments.shift_code; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.shift_code IS 'Code du shift pour référence rapide (P, R, J, N, etc.)';


--
-- Name: COLUMN schedule_assignments.department_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.department_id IS 'Département pour ce jour (si applicable)';


--
-- Name: COLUMN schedule_assignments."position"; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments."position" IS 'Position/poste spécifique (ex: Poste 1, SAU, etc.)';


--
-- Name: COLUMN schedule_assignments.notes; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.notes IS 'Notes spécifiques pour cette affectation';


--
-- Name: COLUMN schedule_assignments.notification_sent; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.notification_sent IS 'Notification envoyée';


--
-- Name: COLUMN schedule_assignments.notification_sent_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.notification_sent_at IS 'Date d''envoi de la notification';


--
-- Name: COLUMN schedule_assignments.reminder_sent; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.reminder_sent IS 'Rappel envoyé';


--
-- Name: COLUMN schedule_assignments.reminder_sent_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_assignments.reminder_sent_at IS 'Date d''envoi du rappel';


--
-- Name: schedule_changes_log; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.schedule_changes_log OWNER TO ged_user;

--
-- Name: COLUMN schedule_changes_log.schedule_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.schedule_id IS 'Planning modifié';


--
-- Name: COLUMN schedule_changes_log.assignment_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.assignment_id IS 'ID de l''affectation modifiée (peut être null si supprimée)';


--
-- Name: COLUMN schedule_changes_log.changed_by_user_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.changed_by_user_id IS 'Utilisateur ayant effectué la modification';


--
-- Name: COLUMN schedule_changes_log.change_type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.change_type IS 'Type de modification';


--
-- Name: COLUMN schedule_changes_log.affected_date; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.affected_date IS 'Date affectée par le changement';


--
-- Name: COLUMN schedule_changes_log.affected_employee; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.affected_employee IS 'Nom de l''employé affecté';


--
-- Name: COLUMN schedule_changes_log.old_value; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.old_value IS 'Ancienne valeur (JSON)';


--
-- Name: COLUMN schedule_changes_log.new_value; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.new_value IS 'Nouvelle valeur (JSON)';


--
-- Name: COLUMN schedule_changes_log.description; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.description IS 'Description du changement';


--
-- Name: COLUMN schedule_changes_log.ip_address; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.ip_address IS 'Adresse IP de l''utilisateur';


--
-- Name: COLUMN schedule_changes_log.user_agent; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_changes_log.user_agent IS 'User agent du navigateur';


--
-- Name: schedule_validations; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.schedule_validations OWNER TO ged_user;

--
-- Name: COLUMN schedule_validations.schedule_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.schedule_id IS 'Planning à valider';


--
-- Name: COLUMN schedule_validations.validator_role; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.validator_role IS 'Rôle du validateur';


--
-- Name: COLUMN schedule_validations.validator_user_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.validator_user_id IS 'Utilisateur validateur';


--
-- Name: COLUMN schedule_validations.validation_order; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.validation_order IS 'Ordre de validation (1, 2, 3...)';


--
-- Name: COLUMN schedule_validations.status; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.status IS 'Statut de la validation';


--
-- Name: COLUMN schedule_validations.validated_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.validated_at IS 'Date de validation/rejet';


--
-- Name: COLUMN schedule_validations.comments; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.comments IS 'Commentaires du validateur';


--
-- Name: COLUMN schedule_validations.rejection_reason; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.rejection_reason IS 'Raison du rejet';


--
-- Name: COLUMN schedule_validations.notification_sent; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedule_validations.notification_sent IS 'Notification envoyée au validateur';


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: ged_user
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
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.schedules OWNER TO ged_user;

--
-- Name: COLUMN schedules.title; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.title IS 'Titre du planning (ex: Planning Novembre 2025)';


--
-- Name: COLUMN schedules.schedule_type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.schedule_type IS 'Type de planning';


--
-- Name: COLUMN schedules.department_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.department_id IS 'Département concerné (si applicable)';


--
-- Name: COLUMN schedules.month; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.month IS 'Mois du planning (1-12)';


--
-- Name: COLUMN schedules.year; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.year IS 'Année du planning';


--
-- Name: COLUMN schedules.start_date; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.start_date IS 'Date de début du planning';


--
-- Name: COLUMN schedules.end_date; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.end_date IS 'Date de fin du planning';


--
-- Name: COLUMN schedules.created_by_user_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.created_by_user_id IS 'Utilisateur créateur';


--
-- Name: COLUMN schedules.status; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.status IS 'Statut du planning';


--
-- Name: COLUMN schedules.validation_workflow; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.validation_workflow IS 'Workflow de validation requis selon le type';


--
-- Name: COLUMN schedules.notes; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.notes IS 'Notes ou commentaires';


--
-- Name: COLUMN schedules.published_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.published_at IS 'Date de publication';


--
-- Name: COLUMN schedules.pdf_path; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.schedules.pdf_path IS 'Chemin vers le PDF généré';


--
-- Name: service_members; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.service_members OWNER TO ged_user;

--
-- Name: services; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.services (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.services OWNER TO ged_user;

--
-- Name: shift_types; Type: TABLE; Schema: public; Owner: ged_user
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
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.shift_types OWNER TO ged_user;

--
-- Name: COLUMN shift_types.code; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.code IS 'Code du shift (P, R, J, N, A, etc.)';


--
-- Name: COLUMN shift_types.name; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.name IS 'Nom du shift';


--
-- Name: COLUMN shift_types.color; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.color IS 'Couleur hexadécimale pour affichage (#RRGGBB)';


--
-- Name: COLUMN shift_types.start_time; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.start_time IS 'Heure de début (si applicable)';


--
-- Name: COLUMN shift_types.end_time; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.end_time IS 'Heure de fin (si applicable)';


--
-- Name: COLUMN shift_types.is_work_day; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.is_work_day IS 'Indique si c''est un jour de travail';


--
-- Name: COLUMN shift_types.is_night_shift; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.is_night_shift IS 'Indique si c''est une garde de nuit';


--
-- Name: COLUMN shift_types.requires_notification; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.requires_notification IS 'Nécessite une notification de rappel';


--
-- Name: COLUMN shift_types.notification_hours_before; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.shift_types.notification_hours_before IS 'Heures avant le shift pour notifier';


--
-- Name: template_fields; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.template_fields OWNER TO ged_user;

--
-- Name: template_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: ged_user
--

CREATE SEQUENCE public.template_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.template_fields_id_seq OWNER TO ged_user;

--
-- Name: template_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ged_user
--

ALTER SEQUENCE public.template_fields_id_seq OWNED BY public.template_fields.id;


--
-- Name: templates; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.templates OWNER TO ged_user;

--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: ged_user
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.templates_id_seq OWNER TO ged_user;

--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ged_user
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: ticket_history; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.ticket_history OWNER TO ged_user;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: ged_user
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tickets OWNER TO ged_user;

--
-- Name: trello_activity_logs; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.trello_activity_logs (
    id uuid NOT NULL,
    card_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type public.enum_trello_activity_logs_action_type NOT NULL,
    action_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.trello_activity_logs OWNER TO ged_user;

--
-- Name: COLUMN trello_activity_logs.action_data; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_activity_logs.action_data IS 'Données de l''action (old_value, new_value, etc.)';


--
-- Name: trello_attachments; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.trello_attachments OWNER TO ged_user;

--
-- Name: COLUMN trello_attachments.file_path; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_attachments.file_path IS 'Chemin du fichier';


--
-- Name: COLUMN trello_attachments.file_type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_attachments.file_type IS 'MIME type';


--
-- Name: COLUMN trello_attachments.file_size; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_attachments.file_size IS 'Taille en octets';


--
-- Name: COLUMN trello_attachments.attachment_type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_attachments.attachment_type IS 'Type de pièce jointe';


--
-- Name: trello_boards; Type: TABLE; Schema: public; Owner: ged_user
--

CREATE TABLE public.trello_boards (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    service_type public.enum_trello_boards_service_type NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.trello_boards OWNER TO ged_user;

--
-- Name: COLUMN trello_boards.name; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_boards.name IS 'Nom du tableau (ex: Moyens Généraux, Biomédical, Informatique)';


--
-- Name: COLUMN trello_boards.service_type; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_boards.service_type IS 'Type de service technique';


--
-- Name: COLUMN trello_boards.settings; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_boards.settings IS 'Paramètres du tableau (couleurs, règles, etc.)';


--
-- Name: trello_cards; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.trello_cards OWNER TO ged_user;

--
-- Name: COLUMN trello_cards.title; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.title IS 'Titre de la tâche';


--
-- Name: COLUMN trello_cards.description; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.description IS 'Description détaillée';


--
-- Name: COLUMN trello_cards."position"; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards."position" IS 'Ordre dans la colonne';


--
-- Name: COLUMN trello_cards.priority; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.priority IS 'Priorité de la tâche';


--
-- Name: COLUMN trello_cards.due_date; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.due_date IS 'Date d''échéance';


--
-- Name: COLUMN trello_cards.assigned_to; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.assigned_to IS 'Technicien assigné';


--
-- Name: COLUMN trello_cards.created_by; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.created_by IS 'Créateur de la tâche';


--
-- Name: COLUMN trello_cards.linked_work_request_id; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.linked_work_request_id IS 'Lien vers la Demande de Travaux';


--
-- Name: COLUMN trello_cards.labels; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.labels IS 'Étiquettes (électrique, plomberie, urgent, etc.)';


--
-- Name: COLUMN trello_cards.estimated_hours; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.estimated_hours IS 'Temps estimé en heures';


--
-- Name: COLUMN trello_cards.actual_hours; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.actual_hours IS 'Temps réel passé';


--
-- Name: COLUMN trello_cards.location; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.location IS 'Localisation (service, salle, etc.)';


--
-- Name: COLUMN trello_cards.equipment; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.equipment IS 'Équipement concerné';


--
-- Name: COLUMN trello_cards.parts_used; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.parts_used IS 'Pièces utilisées [{name, quantity, ref}]';


--
-- Name: COLUMN trello_cards.completed_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.completed_at IS 'Date de complétion';


--
-- Name: COLUMN trello_cards.date_history; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_cards.date_history IS 'Historique des reports de dates';


--
-- Name: trello_comments; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.trello_comments OWNER TO ged_user;

--
-- Name: COLUMN trello_comments.content; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_comments.content IS 'Contenu du commentaire';


--
-- Name: trello_lists; Type: TABLE; Schema: public; Owner: ged_user
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


ALTER TABLE public.trello_lists OWNER TO ged_user;

--
-- Name: COLUMN trello_lists.name; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_lists.name IS 'Nom de la colonne (ex: À faire, En cours, Terminé)';


--
-- Name: COLUMN trello_lists."position"; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_lists."position" IS 'Ordre d''affichage';


--
-- Name: COLUMN trello_lists.color; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.trello_lists.color IS 'Couleur hex de la colonne';


--
-- Name: users; Type: TABLE; Schema: public; Owner: ged_user
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
    "position" character varying(255)
);


ALTER TABLE public.users OWNER TO ged_user;

--
-- Name: COLUMN users.signature_path; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.users.signature_path IS 'Chemin vers l''image de la signature de l''utilisateur';


--
-- Name: COLUMN users.stamp_path; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.users.stamp_path IS 'Chemin vers l''image du cachet de l''utilisateur';


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: ged_user
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
    assigned_at timestamp with time zone
);


ALTER TABLE public.workflows OWNER TO ged_user;

--
-- Name: COLUMN workflows.step; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.workflows.step IS 'L''ordre de cette étape dans le workflow';


--
-- Name: COLUMN workflows.assigned_at; Type: COMMENT; Schema: public; Owner: ged_user
--

COMMENT ON COLUMN public.workflows.assigned_at IS 'Date à laquelle la tâche a été assignée au validateur';


--
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- Name: template_fields id; Type: DEFAULT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.template_fields ALTER COLUMN id SET DEFAULT nextval('public.template_fields_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public."SequelizeMeta" (name) FROM stdin;
20250131000000-add-work-request-features.cjs
20250131000001-add-position-to-users.cjs
20251030153000-update-documents-table-for-workflows.cjs
20251030155500-create-motifs-table.cjs
20251030155501-create-services-table.cjs
20251030192600-update-workflow-status-enum.cjs
20250131000006-create-service-members.cjs
20251031151000-add-in-progress-to-document-status.cjs
20251105161100-add-assigned-at-to-workflows.cjs
20251110134900-add-position-to-users.cjs
20251110150000-force-add-position-to-users.cjs
20251110200000-force-add-position-to-users.cjs
20251113160000-force-add-position-to-users.cjs
20251115160000-create-template-tables.cjs
20251115180000-seed-demande-permission.cjs
20251201000000-create-employees-table.cjs
20241121100000-create-push-subscriptions.cjs
20241121130000-create-tickets.cjs
20241121130100-create-queue-positions.cjs
20241121130200-create-ticket-history.cjs
20241122000000-add-queue-roles.cjs
20241123000000-create-positions.cjs
20241124000000-create-departments.cjs
20241124000100-create-shift-types.cjs
20241124000200-create-schedules.cjs
20241124000300-create-schedule-assignments.cjs
20241124000400-create-schedule-validations.cjs
20241124000500-create-schedule-changes-log.cjs20241124000500-create-schedule-changes-log.cjs
20241202000000-create-trello-system.cjs
20251202093000-add-date-history-to-trello-cards.cjs
20251202120000-create-license.cjs
20251203000000-create-invoice-system.cjs
20251203140000-fix-invoice-folders.cjs
20251209100000-add-new-fields-to-trello-cards.cjs
20251215160000-create-demande-achat.cjs
20251217000000-fix-demande-achat.cjs
\.


--
-- Data for Name: demandes_achats; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.demandes_achats (id, da_number, requester_id, da_date, domain, domain_description, delivery_date, purchase_type, article_nature, request_description, beneficiary_name, beneficiary_email, beneficiary_phone, is_magasin_output, linked_doc_number, is_for_works, non_ref_articles, total_ref_value, total_non_ref_value, attached_documents, supplier_id, status, created_at, updated_at) FROM stdin;
4d05b7e9-fafe-4f5c-91de-d0aa9ba86b58	DAI-2025-0001	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	2025-12-16	Accueil		2025-12-17	Référencé	Ordinateur	pc test	Franck YANKEU	aureleyankeu@gmail.com	656287658	f	Demande de travaux - Chirurgie	t	[{"total": 0, "quantity": 1, "unitPrice": 0, "designation": ""}]	0.00	0.00	[]	\N	in_progress	2025-12-16 12:52:42.044+00	2026-01-07 07:03:40.558+00
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.departments (id, code, name, type, description, is_active, created_at, updated_at) FROM stdin;
8a36d47f-63a8-43e4-b1d9-0d486f84ed1a	SAU	Service d'Accueil des Urgences	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
b119aad7-c841-4fc0-a522-0158756baf07	CHIR	Chirurgie	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
d747d76d-56bd-4c5b-90ee-306f8b552630	MED	Médecine Interne	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
7958521c-9d9a-469b-98fd-2132cb90a57a	PEDIATRIE	Pédiatrie	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
cc282057-27ef-434a-a5bb-1eb50175e670	GYNECO	Gynécologie	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
a0d5a04e-f275-46f6-8827-21ba27b556f3	MATERNITE	Maternité	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
324e6545-437c-471f-9254-8176c932507d	BLOC_OP	Bloc Opératoire	medical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
f0158dc4-83ee-467e-b326-f609676751f5	LABO	Laboratoire	paramedical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
40bda6ca-f832-40cf-816c-d45d423cb573	RADIO	Radiologie	paramedical	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
14df6445-d2f3-4b57-8b75-76b457997633	PHCIE	Pharmacie	pharmacy	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
4a27e576-5c38-445c-b87b-6a825f4d7eaa	ADMIN	Administration	administrative	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
3c97598e-f0f3-4b9a-983a-d64cb84d8aa4	ACCUEIL	Accueil	administrative	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
e68c75ee-7339-4edc-b456-b7d52edf1e2f	CONDUCTEURS	Conducteurs	support	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
e1354790-1d11-47f4-b354-8643e85bc70b	GARDIENS	Gardiens	support	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
d32e2f6a-3d95-4b25-808d-0e4f46c7aaf1	JARDINIERS	Jardiniers	support	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
0f51977f-9a06-4acc-87e3-621230a68a3b	MAINTENANCE	Maintenance	support	\N	t	2025-11-24 10:00:03.715+00	2025-11-24 10:00:03.715+00
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.documents (id, title, file_name, original_name, file_path, file_size, file_type, user_id, category, metadata, extracted_text, status, created_at, updated_at, date_debut, date_fin, linked_document_id, invoice_folder_id) FROM stdin;
095209a4-5d60-4ca4-b6ec-7388a3305f50	Demande d'explications	1762512888403-791619603_v1762513165336.pdf	Demande d'explications.pdf	uploads/1762512888403-791619603_v1762513165336.pdf	365226	application/pdf	1f36f978-8531-4312-9ed0-e32a6388a5e4	RH	{"has_signature": true}	\N	approved	2025-11-07 10:54:48.411+00	2025-11-07 10:59:25.642+00	\N	\N	\N	\N
28a584cf-098e-41b7-9314-bf03f3b8e83a	Demande d'explications KWIN	1762513212898-139074381_v1762513499826.pdf	Demande d'explications KWIN.pdf	uploads/1762513212898-139074381_v1762513499826.pdf	482860	application/pdf	1f36f978-8531-4312-9ed0-e32a6388a5e4	RH	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-07 11:00:12.908+00	2025-11-07 11:05:00.179+00	\N	\N	\N	\N
756f6100-e75c-4e57-9828-8a9f1bc454c4	Demande de permission - Direction	1763656299750-482766935_v1763656349750.pdf	Demande_de_permission_1763656299726.pdf	uploads/1763656299750-482766935_v1763656349750.pdf	209412	application/pdf	9b830fef-fa07-4e26-9a27-20de41685acb	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 20/11/2025", "date_debut": "", "noms_prenoms": "", "has_signature": true, "motif_exceptionnel": ""}	\N	approved	2025-11-20 16:31:39.754+00	2025-11-20 16:32:29.867+00	\N	\N	\N	\N
2a0793d2-20d3-4485-89fe-73ebbc3ad550	Demande de permission - Direction	1763028313485-748183887_v1763028334801.pdf	Demande_de_permission_1763028313433.pdf	uploads/1763028313485-748183887_v1763028334801.pdf	223208	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njomb├® le 13/11/2025", "has_stamp": true, "date_debut": "", "noms_prenoms": "", "has_signature": true, "motif_exceptionnel": ""}	\N	approved	2025-11-13 10:05:13.49+00	2025-11-13 10:11:15.649+00	\N	\N	\N	\N
d1762be7-0139-4ace-9a49-ef6bb5c14d99	Personnel Administratif - Janvier 2025	1764144288363-813108019_v1764144351028.pdf	planning-administrative-1-2025-1764144288244.pdf	uploads/1764144288363-813108019_v1764144351028.pdf	5144131	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"year": 2025, "month": 1, "has_stamp": true, "scheduleId": "fa443494-ad9f-436a-b900-93b9e5e62989", "scheduleType": "administrative", "has_signature": true}	\N	approved	2025-11-26 08:04:48.395+00	2025-11-26 08:05:51.492+00	\N	\N	\N	\N
02c1e0a2-a641-4e06-b589-a26f1e35446a	Demande de permission - Direction	1763028717978-989177316_v1763028850562.pdf	Demande_de_permission_1763028717923.pdf	uploads/1763028717978-989177316_v1763028850562.pdf	223208	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njomb├® le 13/11/2025", "has_stamp": true, "date_debut": "", "noms_prenoms": "", "has_signature": true, "motif_exceptionnel": ""}	\N	approved	2025-11-13 10:11:57.982+00	2025-11-13 10:14:29.213+00	\N	\N	\N	\N
a06bd654-7ac1-49b6-8713-530a180f6693	Ordre de mission	1763020030265-70365386_v1763020057831.pdf	Ordre_de_mission_1763020030162.pdf	uploads/1763020030265-70365386_v1763020057831.pdf	318230	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-13", "date_retour": "2025-11-13", "numero_ordre": "HSJM-13112025", "frais_mission": true, "has_signature": true, "objet_mission": "SD", "immat_vehicule": "AMBULANCE", "nom_conducteur": "NDOM JEAN", "nom_missionnaire": "MOUNCHILI", "service_demandeur": "CHIRURGIE"}	\N	approved	2025-11-13 07:47:10.276+00	2025-11-13 07:48:01.209+00	\N	\N	\N	\N
a9488445-9de9-4976-b650-d8a8e6085c88	Ordre de mission	1763051752753-628163119_v1763051768148.pdf	Ordre_de_mission_1763051752728.pdf	uploads/1763051752753-628163119_v1763051768148.pdf	248932	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-13", "date_retour": "", "numero_ordre": "", "frais_mission": false, "has_signature": true, "objet_mission": "", "immat_vehicule": "", "nom_conducteur": "", "nom_missionnaire": "", "service_demandeur": ""}	\N	in_progress	2025-11-13 16:35:52.763+00	2025-11-13 16:36:08.457+00	\N	\N	\N	\N
f944c619-f280-496c-8325-1bb6233b02c7	Ordre de mission	1763020949757-623661340_v1763020963881.pdf	Ordre_de_mission_1763020949698.pdf	uploads/1763020949757-623661340_v1763020963881.pdf	320125	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-13", "date_retour": "2025-11-13", "numero_ordre": "HSJM-13112025", "frais_mission": true, "has_signature": true, "objet_mission": "sqdq", "immat_vehicule": "AMBULANCE", "nom_conducteur": "NDOM JEAN", "nom_missionnaire": "MOUNCHILI", "service_demandeur": "CHIRURGIE"}	\N	approved	2025-11-13 08:02:29.763+00	2025-11-13 08:03:16.585+00	\N	\N	\N	\N
1db3f71e-1454-4644-a278-48f45b2c3af6	Demande d'explication - YANKEU Aurele Franck	1763219057135-641115198_v1763219160045.pdf	Demande_d'explication_1763219057050.pdf	uploads/1763219057135-641115198_v1763219160045.pdf	317964	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande d'explication	{"objet": "Demande d'explication", "service": "Accueil", "date_lieu": "Njomb├® le 15/11/2025", "has_stamp": true, "noms_prenoms": "YANKEU Aurele Franck", "date_incident": "2025-11-15", "delai_reponse": "2", "has_signature": true, "lieu_incident": "sau", "type_incident": "comportement", "heure_incident": "18:03", "motifs_explication": "test", "description_incident": "test"}	\N	approved	2025-11-15 15:04:17.144+00	2025-11-15 15:06:00.372+00	\N	\N	\N	\N
1c3dc888-07c7-4247-a44a-2e1c8a939f30	Ordre de mission	1763021088059-541861333_v1763021099739.pdf	Ordre_de_mission_1763021088019.pdf	uploads/1763021088059-541861333_v1763021099739.pdf	318792	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-13", "date_retour": "2025-11-13", "numero_ordre": "HSJM-13112025", "frais_mission": true, "has_signature": true, "objet_mission": "sqs", "immat_vehicule": "AMBULANCE", "nom_conducteur": "NDOM JEAN", "nom_missionnaire": "MOUNCHILI", "service_demandeur": "CHIRURGIE"}	\N	approved	2025-11-13 08:04:48.063+00	2025-11-13 08:06:05.632+00	\N	\N	\N	\N
fc65859b-1583-42a7-b59e-ec1fe726d840	Ordre de mission	1763732983802-575174559_v1763732999661.pdf	Ordre_de_mission_1763732983787.pdf	uploads/1763732983802-575174559_v1763732999661.pdf	296412	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-21", "date_retour": "", "numero_ordre": "", "frais_mission": false, "has_signature": true, "objet_mission": "", "immat_vehicule": "", "nom_conducteur": "", "nom_missionnaire": "", "service_demandeur": ""}	\N	in_progress	2025-11-21 13:49:43.806+00	2025-11-21 13:50:00.093+00	\N	\N	\N	\N
6e92b681-eba7-40bd-956e-de9c393cece1	Planning Opératoire - Chirurgie	1763926363056-471789809_v1763926382320.pdf	Planning_OpÃ©ratoire_1763926362962.pdf	uploads/1763926363056-471789809_v1763926382320.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:32:43.065+00	2025-11-23 19:33:02.828+00	\N	\N	\N	\N
2c539c90-77fe-4e57-b57f-43ef98a9e781	Planning Opératoire - Chirurgie	1763926671850-171389741_v1763926733948.pdf	Planning_OpÃ©ratoire_1763926671821.pdf	uploads/1763926671850-171389741_v1763926733948.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:37:51.859+00	2025-11-23 19:38:54.365+00	\N	\N	\N	\N
b8917433-bb2d-4d1d-85c9-3f7a65595d4c	Demande de permission - Direction	1762845748294-391336672_v1762847089809.pdf	Demande_de_permission_1762845748241.pdf	uploads/1762845748294-391336672_v1762847089809.pdf	223385	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-11 07:22:28.296+00	2025-11-11 07:44:50.161+00	\N	\N	\N	\N
bb37fe88-b78c-48ad-b94b-18afec7a9db6	Demande de permission - Direction	1762847103364-818426396_v1762847170403.pdf	Demande_de_permission_1762847103306.pdf	uploads/1762847103364-818426396_v1762847170403.pdf	224796	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-11 07:45:03.369+00	2025-11-11 07:46:10.641+00	\N	\N	\N	\N
436c2a2a-4a29-4e26-b196-a76e000326cb	Planning Opératoire - Chirurgie	1763927460518-800070339_v1764145165068.pdf	Planning_OpÃ©ratoire_1763927460423.pdf	uploads/1763927460518-800070339_v1764145165068.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:51:00.522+00	2025-11-26 08:19:25.518+00	\N	\N	\N	\N
6886b2cb-0080-44e5-8b9d-11706a02750d	Personnel Administratif - Février 2025	1764145224577-530363248_v1764145264266.pdf	planning-administrative-2-2025-1764145224319.pdf	uploads/1764145224577-530363248_v1764145264266.pdf	13056933	application/pdf	c3a95b48-fac5-43f6-b58c-23566a08f5b8	\N	{"year": 2025, "month": 2, "has_stamp": true, "scheduleId": "523a8562-2ac3-45cc-b7ee-dde875a8c32f", "scheduleType": "administrative", "has_signature": true, "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	approved	2025-11-26 08:20:24.643+00	2025-11-26 08:21:04.68+00	\N	\N	\N	\N
13fdab12-20ef-4f5f-a303-7963cd44a4eb	Personnel Administratif - Mars 2025	1764145524996-139963924.pdf	planning-administrative-3-2025-1764145524703.pdf	uploads/1764145524996-139963924.pdf	13056933	application/pdf	c3a95b48-fac5-43f6-b58c-23566a08f5b8	\N	{"year": 2025, "month": 3, "scheduleId": "8fd3ba2b-17c9-41a8-82f7-ffc50009efe0", "scheduleType": "administrative", "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	draft	2025-11-26 08:25:25.07+00	2025-11-26 08:25:25.07+00	\N	\N	\N	\N
275f74d4-52b3-4edc-9c1a-2fde56775727	Demande de permission - Direction	1762852630618-645886633_v1762855298155.pdf	Demande_de_permission_1762852630601.pdf	uploads/1762852630618-645886633_v1762855298155.pdf	223385	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-11 09:17:10.622+00	2025-11-11 10:01:38.427+00	\N	\N	\N	\N
32946633-5d17-40a7-bc55-d20bb12d246c	Demande de permission - Direction	1763656168790-761061763_v1763656271258.pdf	Demande_de_permission_1763656168766.pdf	uploads/1763656168790-761061763_v1763656271258.pdf	232951	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 20/11/2025", "has_stamp": true, "date_debut": "", "noms_prenoms": "", "has_signature": true, "motif_exceptionnel": ""}	\N	approved	2025-11-20 16:29:28.808+00	2025-11-20 16:31:12.259+00	\N	\N	\N	\N
bb916a82-7772-48d0-b6e9-c4544bf46ab3	Demande de permission - Direction	1762778832881-798501327.pdf	Demande_de_permission_1762778832862.pdf	uploads/1762778832881-798501327.pdf	224005	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{}	\N	draft	2025-11-10 12:47:12.886+00	2025-11-10 12:47:12.886+00	\N	\N	\N	\N
afeaa33f-a71b-44dc-bbb3-7d6eae5e74b8	ROY - DEPOT ECHANTILLONS A DOUALA	1764774585721-889492643_v1768678581819.pdf	DEPOT ECHANTILLONS A DOUALA.pdf	uploads/1764774585721-889492643_v1768678581819.pdf	187917	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Factures	{"has_stamp": true, "has_signature": true}	\N	approved	2025-12-03 15:09:45.728+00	2026-01-17 19:36:22.43+00	\N	\N	\N	6d3a0f5e-87b4-44c5-9685-32ef85c6e66e
4d047ccb-5bf9-45d6-8974-de2bf7eefb7f	Personnel Administratif - Décembre 2025	1764851336855-736316000.pdf	planning-administrative-12-2025-1764851336513.pdf	uploads/1764851336855-736316000.pdf	13056933	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"year": 2025, "month": 12, "scheduleId": "ea37712c-a42f-419f-9e76-9cfbd26821bd", "scheduleType": "administrative", "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	draft	2025-12-04 12:28:56.926+00	2025-12-04 12:28:56.926+00	\N	\N	\N	\N
f2661c0e-1926-477c-80ac-f831dc4ec00c	Personnel Administratif - Décembre 2025	1764852716317-376446663_v1764852745210.pdf	planning-administrative-12-2025-1764852716072.pdf	uploads/1764852716317-376446663_v1764852745210.pdf	13056933	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"year": 2025, "month": 12, "has_stamp": true, "scheduleId": "ea37712c-a42f-419f-9e76-9cfbd26821bd", "scheduleType": "administrative", "has_signature": true, "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	approved	2025-12-04 12:51:56.379+00	2025-12-04 12:52:25.637+00	\N	\N	\N	\N
f91f60d9-6ffc-4859-a170-7f680db41d61	Demande de permission - Direction	1764077865005-580771577_v1764077879702.pdf	Demande_de_permission_1764077864970.pdf	uploads/1764077865005-580771577_v1764077879702.pdf	232401	application/pdf	c3a95b48-fac5-43f6-b58c-23566a08f5b8	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 25/11/2025", "has_stamp": true, "date_debut": "", "noms_prenoms": "", "has_signature": true, "motif_exceptionnel": ""}	\N	approved	2025-11-25 13:37:45.017+00	2025-11-25 13:38:00.255+00	\N	\N	\N	\N
d4bdd1dd-3c4e-492f-8c6f-6972f8f7cbe9	ACHAT COUCHE	1764766681806-391913029.pdf	ACHAT COUCHE.pdf	uploads/1764766681806-391913029.pdf	105266	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Factures	{}	\N	pending_validation	2025-12-03 12:58:01.817+00	2025-12-03 12:58:43.321+00	\N	\N	\N	\N
8082a2fc-2c6f-4cd4-a69e-4511b0211b9a	Personnel Administratif - Décembre 2025	1764850906478-330505448.pdf	planning-administrative-12-2025-1764850906172.pdf	uploads/1764850906478-330505448.pdf	13056933	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"year": 2025, "month": 12, "scheduleId": "ea37712c-a42f-419f-9e76-9cfbd26821bd", "scheduleType": "administrative", "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	draft	2025-12-04 12:21:46.574+00	2025-12-04 12:21:46.574+00	\N	\N	\N	\N
ce1c03e6-893f-446d-b474-6b2606408a51	Demande de travaux - Chirurgie	1764600385723-383122876_v1764600645470.pdf	Demande_Travaux_Chirurgie_1764600385525.pdf	uploads/1764600385723-383122876_v1764600645470.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "MG", "motif": "new workflow", "service": "Chirurgie", "demandeur": "Franck YANKEU", "has_stamp": true, "has_signature": true, "last_merged_at": "2025-12-01T14:48:03.542Z", "demande_besoin_id": "5c3343fe-5cfb-4afc-a96a-b0b0c530942f", "has_demande_besoin": true, "merged_document_category": "Demande de besoin"}	\N	approved	2025-12-01 14:46:25.795+00	2025-12-01 14:50:46.186+00	\N	\N	\N	\N
977f162b-d011-40b9-a6ae-04d579b3aa9b	Demande de permission - SUH COLETTE MANKA AFANWI	1762416257176-67773498_v1762530890263.pdf	Demande_de_permission_1762416257094.pdf	uploads/1762416257176-67773498_v1762530890263.pdf	235901	application/pdf	44e84f32-5e3f-4c5b-8111-a51270fbc79d	Demande de permission	{"has_dater": true, "has_stamp": true, "has_signature": true}	\N	approved	2025-11-06 08:04:17.189+00	2025-11-07 15:54:50.533+00	\N	\N	\N	\N
3ce8acfe-fc1e-4e5e-b4f8-74166f9bd215	Demande de permutation - Direction	1764865593303-967620620.pdf	Demande_de_permutation_1764865593193.pdf	uploads/1764865593303-967620620.pdf	273655	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permutation	{"service": "Direction", "permute_id": "", "demandeur_id": "dfe693f7-c4e8-4ca6-aa91-fa972253ef18", "signatureZones": [{"x": 40, "y": 200, "page": 1, "role": "requester", "label": "Le Demandeur", "width": 60, "height": 20}, {"x": 110, "y": 200, "page": 1, "role": "substitute", "label": "Le Remplaçant", "width": 60, "height": 20}], "date_permutation": "2025-12-18", "plage_horaire_fin": "", "validationWorkflow": ["requester", "substitute", "major", "chef_service", "dds"], "plage_horaire_debut": "", "date_permutation_fin": "2025-12-20", "permute_noms_prenoms": "SIMENI", "demandeur_noms_prenoms": "Franck YANKEU"}	\N	draft	2025-12-04 16:26:33.312+00	2025-12-04 16:26:33.312+00	\N	\N	\N	\N
f69cc92c-5a40-4804-aa1c-46bd66a46ad6	Demande de permutation - Direction	1764866402801-951320061.pdf	Demande_de_permutation_1764866402690.pdf	uploads/1764866402801-951320061.pdf	256559	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permutation	{"service": "Direction", "permute_id": "", "demandeur_id": "dfe693f7-c4e8-4ca6-aa91-fa972253ef18", "signatureZones": [{"x": 40, "y": 200, "page": 1, "role": "requester", "label": "Le Demandeur", "width": 60, "height": 20}, {"x": 110, "y": 200, "page": 1, "role": "substitute", "label": "Le Remplaçant", "width": 60, "height": 20}], "date_permutation": "2025-12-04", "plage_horaire_fin": "", "validationWorkflow": ["requester", "substitute", "major", "chef_service", "dds"], "plage_horaire_debut": "", "permute_noms_prenoms": "SIM", "demandeur_noms_prenoms": "Franck YANKEU"}	\N	draft	2025-12-04 16:40:02.81+00	2025-12-04 16:40:02.81+00	\N	\N	\N	\N
61ae51ab-54a6-4f65-b680-35f3e0f5890c	Demande de permutation - Direction	1764866850466-283413803.pdf	Demande_de_permutation_1764866850358.pdf	uploads/1764866850466-283413803.pdf	257237	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permutation	{"service": "Direction", "permute_id": "", "demandeur_id": "dfe693f7-c4e8-4ca6-aa91-fa972253ef18", "signatureZones": [{"x": 40, "y": 200, "page": 1, "role": "requester", "label": "Le Demandeur", "width": 60, "height": 20}, {"x": 110, "y": 200, "page": 1, "role": "substitute", "label": "Le Remplaçant", "width": 60, "height": 20}], "date_permutation": "2025-12-16", "plage_horaire_fin": "", "validationWorkflow": ["requester", "substitute", "major", "chef_service", "dds"], "plage_horaire_debut": "", "date_permutation_fin": "2025-12-18", "permute_noms_prenoms": "", "demandeur_noms_prenoms": "Franck YANKEU"}	\N	draft	2025-12-04 16:47:30.477+00	2025-12-04 16:47:30.477+00	\N	\N	\N	\N
dabaca98-f10e-404c-9e20-6d86b8c1f6d9	Demande de permission - YANKEU Aurele Franck	1765808627622-340113131_v1765808651229.pdf	Demande_de_permission_1765808627607.pdf	uploads/1765808627622-340113131_v1765808651229.pdf	110425	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "2025-12-18", "startDate": "2025-12-17"}], "service": "Direction", "date_fin": "2025-12-18", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 2, "date_debut": "2025-12-17", "remplacant": "", "noms_prenoms": "YANKEU Aurele Franck", "has_signature": true, "interimYRatio": 0.8486328125, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:23:47.633+00	2025-12-15 14:24:11.716+00	2025-12-17 00:00:00+00	2025-12-18 00:00:00+00	\N	\N
d2ae0371-866a-4654-bf27-feaae6940465	Demande de travaux - Chirurgie	1767697955596-531086422.pdf	Demande_Travaux_Chirurgie_1767697955360.pdf	uploads/1767697955596-531086422.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "MG", "motif": "4 LAMPES GRILLEES DANS LA SALLA DES URGENCES\\nCLIMATISEUR SALLE DES URGENCES DERRIERE LE BUREAU DU PERSONNEL DEFECTIEUSE", "service": "Chirurgie", "demandeur": "Franck YANKEU"}	\N	pending_validation	2026-01-06 11:12:35.659+00	2026-01-06 11:12:35.749+00	\N	\N	\N	\N
2a2e288c-a61d-4b3e-a205-30dfb3f7d4bc	Demande de permission - YANKEU Franck	1768318131844-926382658_v1768318144537.pdf	Demande_de_permission_1768318131824.pdf	uploads/1768318131844-926382658_v1768318144537.pdf	109997	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 13/01/2026", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "YANKEU Franck", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2026-01-13 15:28:51.855+00	2026-01-13 15:29:04.97+00	\N	\N	\N	\N
4aad214f-f318-4466-bee5-e7d9800ae5b1	Demande de permission - Inconnu	1768509583084-396078461.pdf	Demande_de_permission_1768509583062.pdf	uploads/1768509583084-396078461.pdf	109564	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/01/2026", "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	pending_validation	2026-01-15 20:39:43.097+00	2026-01-15 20:39:54.306+00	\N	\N	\N	\N
e9160455-e50f-484f-8a0b-abd6f4dd0146	Demande de permutation - Direction	1764866460677-617537385.pdf	Demande_de_permutation_1764866460580.pdf	uploads/1764866460677-617537385.pdf	256262	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permutation	{"service": "Direction", "permute_id": "", "demandeur_id": "dfe693f7-c4e8-4ca6-aa91-fa972253ef18", "signatureZones": [{"x": 40, "y": 200, "page": 1, "role": "requester", "label": "Le Demandeur", "width": 60, "height": 20}, {"x": 110, "y": 200, "page": 1, "role": "substitute", "label": "Le Remplaçant", "width": 60, "height": 20}], "date_permutation": "2025-12-09", "plage_horaire_fin": "", "validationWorkflow": ["requester", "substitute", "major", "chef_service", "dds"], "plage_horaire_debut": "", "date_permutation_fin": "2025-12-11", "permute_noms_prenoms": "sim", "demandeur_noms_prenoms": "Franck YANKEU"}	\N	draft	2025-12-04 16:41:00.681+00	2025-12-04 16:41:00.681+00	\N	\N	\N	\N
4d6ea1c2-48a3-4be6-8687-88747581ee1d	Demande de permission - YANKEU Aurele Franck	1765808683635-798605560_v1765808699855.pdf	Demande_de_permission_1765808683619.pdf	uploads/1765808683635-798605560_v1765808699855.pdf	109798	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "YANKEU Aurele Franck", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:24:43.638+00	2025-12-15 14:25:00.166+00	\N	\N	\N	\N
dbba294c-46a9-4626-a4e5-85663cb27d0a	1762424142393-427158078_v1762511092270	1768678513150-830986116.pdf	1762424142393-427158078_v1762511092270.pdf	uploads/1768678513150-830986116.pdf	338700	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{}	\N	draft	2026-01-17 19:35:13.192+00	2026-01-17 19:35:13.192+00	\N	\N	\N	\N
5fb67dd9-9d91-4efd-8cf2-718e6635d245	Ordre de mission	1762776895929-866069057_v1762777489448.pdf	Ordre_de_mission_1762776896316.pdf	uploads/1762776895929-866069057_v1762777489448.pdf	331912	application/pdf	c6bf9eaa-73cc-4f01-ac3c-770764928554	Ordre de mission	{"has_stamp": true, "has_signature": true}	\N	in_progress	2025-11-10 12:14:55.937+00	2025-11-10 12:24:51.629+00	\N	\N	\N	\N
d766bd17-24b4-43e7-a7f7-4c16e105a4b0	Demande de permission - Inconnu	1765809165843-842709983_v1765809177983.pdf	Demande_de_permission_1765809165826.pdf	uploads/1765809165843-842709983_v1765809177983.pdf	109401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:32:45.852+00	2025-12-15 14:32:58.484+00	\N	\N	\N	\N
b699872c-2d4b-4ca9-9efd-81b4d02f1231	Personnel Administratif - Mars 2025	1764145542191-121700016.pdf	planning-administrative-3-2025-1764145541981.pdf	uploads/1764145542191-121700016.pdf	13056933	application/pdf	c3a95b48-fac5-43f6-b58c-23566a08f5b8	\N	{"year": 2025, "month": 3, "scheduleId": "8fd3ba2b-17c9-41a8-82f7-ffc50009efe0", "scheduleType": "administrative", "signatureZones": [{"x": 50, "y": 180, "role": "dds", "label": "Directrice des Soins", "width": 100, "height": 30}, {"x": 200, "y": 180, "role": "dg", "label": "Directeur Général", "width": 100, "height": 30}]}	\N	draft	2025-11-26 08:25:42.262+00	2025-11-26 08:25:42.262+00	\N	\N	\N	\N
86c6c2b1-8127-4541-a195-8d4f09884ef5	Demande de permission - Inconnu	1765809271616-65964608_v1765809283778.pdf	Demande_de_permission_1765809271600.pdf	uploads/1765809271616-65964608_v1765809283778.pdf	109401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:34:31.63+00	2025-12-15 14:34:44.281+00	\N	\N	\N	\N
65ec9e87-f3e2-4304-a382-17c9f9c265e2	Demande de permission - SAWO Odette Epse NNANGA	1762770394744-22568636_v1762774032895.pdf	Demande_de_permission_1762770498225.pdf	uploads/1762770394744-22568636_v1762774032895.pdf	251946	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	rejected	2025-11-10 10:26:34.747+00	2025-11-17 09:14:37.996+00	\N	\N	\N	\N
7e5162c0-2b22-486b-a458-abf3b83999e4	Demande de permission - Inconnu	1765809402703-983924292_v1765809416384.pdf	Demande_de_permission_1765809402687.pdf	uploads/1765809402703-983924292_v1765809416384.pdf	109401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:36:42.714+00	2025-12-15 14:36:56.861+00	\N	\N	\N	\N
b09ec2c9-092d-49b6-b13c-f74509204b69	Planning Opératoire - Chirurgie	1763925659670-825040829_v1763925685078.pdf	Planning_OpÃ©ratoire_1763925659587.pdf	uploads/1763925659670-825040829_v1763925685078.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:20:59.673+00	2025-11-23 19:21:25.486+00	\N	\N	\N	\N
d295e72c-b8d0-4ca1-bcb3-7ecffd842201	Planning Opératoire - Chirurgie	1763926244476-479338461_v1763926264851.pdf	Planning_OpÃ©ratoire_1763926244446.pdf	uploads/1763926244476-479338461_v1763926264851.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:30:44.487+00	2025-11-23 19:31:05.246+00	\N	\N	\N	\N
31c59889-e4f2-463a-867f-41fb28b813b7	Planning Opératoire - Chirurgie	1763925866551-964752360_v1763925913889.pdf	Planning_OpÃ©ratoire_1763925866530.pdf	uploads/1763925866551-964752360_v1763925913889.pdf	149945	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:24:26.56+00	2025-11-23 19:25:14.323+00	\N	\N	\N	\N
b48e419d-b445-48fe-b650-b3cd9f882ccf	Demande de permission - Inconnu	1765809521188-674806584_v1765809535295.pdf	Demande_de_permission_1765809521161.pdf	uploads/1765809521188-674806584_v1765809535295.pdf	109401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:38:41.198+00	2025-12-15 14:38:55.817+00	\N	\N	\N	\N
a30e8f63-3de9-43a6-a104-df365ad9e05c	Demande de permission - Inconnu	1765809571043-19563786_v1765809598649.pdf	Demande_de_permission_1765809571031.pdf	uploads/1765809571043-19563786_v1765809598649.pdf	109401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:39:31.046+00	2025-12-15 14:39:59.012+00	\N	\N	\N	\N
9755d89f-a1ba-4bd7-a773-ef91a4388b1b	DEPOT ECHANTILLONS A DOUALA	1763734293326-968488396_v1763734374395.pdf	DEPOT ECHANTILLONS A DOUALA.pdf	uploads/1763734293326-968488396_v1763734374395.pdf	187917	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-21 14:11:33.333+00	2025-11-21 14:12:54.718+00	\N	\N	\N	\N
ffe55bc4-089b-41d0-aed0-635376ca2ece	Demande de permission - Inconnu	1765809724898-860796342_v1765809737839.pdf	Demande_de_permission_1765809724872.pdf	uploads/1765809724898-860796342_v1765809737839.pdf	109401	application/pdf	c3a95b48-fac5-43f6-b58c-23566a08f5b8	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:42:04.912+00	2025-12-15 14:42:18.381+00	\N	\N	\N	\N
e960bc0d-0ded-4181-bc75-adffb64c066c	Ordre de mission	1762782981862-67360319_v1762783978646.pdf	Ordre_de_mission_1762782981842.pdf	uploads/1762782981862-67360319_v1762783978646.pdf	275819	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 13:56:21.867+00	2025-11-13 09:33:43.524+00	\N	\N	\N	\N
f77e3d92-fe32-4791-808d-d17d338023c9	Ordre de mission	1762769173013-94096848_v1762769251908.pdf	Ordre_de_mission_1762769276473.pdf	uploads/1762769173013-94096848_v1762769251908.pdf	337626	application/pdf	edec9222-faa9-4923-ae22-f74155da20a5	Ordre de mission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 10:06:13.017+00	2025-11-13 09:33:50.861+00	\N	\N	\N	\N
a1cdad12-0dda-4231-8964-10893ad39f3b	Demande de permission - Chirurgie	1762783259055-230822983_v1762783342684.pdf	Demande_de_permission_1762783259037.pdf	uploads/1762783259055-230822983_v1762783342684.pdf	223944	application/pdf	10ef834f-0663-4b0c-9643-6f700324ec8b	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 14:00:59.059+00	2025-11-10 14:02:22.761+00	\N	\N	\N	\N
46925a53-3e87-46bb-9fa6-92ddff8293e8	Demande de permission - Inconnu	1765809799719-288668173_v1765809902839.pdf	Demande_de_permission_1765809799708.pdf	uploads/1765809799719-288668173_v1765809902839.pdf	109348	application/pdf	1f36f978-8531-4312-9ed0-e32a6388a5e4	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.845958480565371, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:43:19.723+00	2025-12-15 14:45:03.373+00	\N	\N	\N	\N
2a8aae56-b77b-43a7-8341-8054cd38ba76	DEPOT ECHANTILLONS A DOUALA	1764763234256-646802514.pdf	DEPOT ECHANTILLONS A DOUALA.pdf	uploads/1764763234256-646802514.pdf	187917	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Factures	{}	\N	pending_validation	2025-12-03 12:00:34.265+00	2025-12-03 12:58:43.323+00	\N	\N	\N	\N
93ab436d-f522-41a0-9d71-235d12a8e198	Demande de permission - Inconnu	1765809940699-302781882_v1765809954799.pdf	Demande_de_permission_1765809940683.pdf	uploads/1765809940699-302781882_v1765809954799.pdf	109401	application/pdf	9b830fef-fa07-4e26-9a27-20de41685acb	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "periods": [{"endDate": "", "startDate": ""}], "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 15/12/2025", "has_stamp": true, "totalDays": 0, "date_debut": "", "remplacant": "", "noms_prenoms": "", "has_signature": true, "interimYRatio": 0.8473073555166375, "interimSpanHeight": 16.5, "motif_exceptionnel": ""}	\N	approved	2025-12-15 14:45:40.706+00	2025-12-15 14:45:55.434+00	\N	\N	\N	\N
e757df43-ffc0-4146-97d7-b0cf0b40267e	Pi├¿ce de caisse - Pi├¿ce justificative - Demande de permission: Demande de permission - Direction	PC_Demande_de_permission_fusionn├®_1763028675581.pdf	Piece_Caisse_Demande_de_permission_2a0793d2_1763028675314.pdf	uploads/PC_Demande_de_permission_fusionn├®_1763028675581.pdf	11499759	application/pdf	744d93f7-af0d-481d-9a97-39cbcbd05d68	Pi├¿ce de caisse	{"nom": "", "concerne": "Pi├¿ce justificative - Demande de permission: Demande de permission - Direction", "fusionDate": "2025-11-13T10:11:15.601Z", "fusionn├®": true, "linkedDocumentId": "2a0793d2-20d3-4485-89fe-73ebbc3ad550", "linkedDocumentTitle": "Demande de permission - Direction", "linkedDocumentCategory": "Demande de permission"}	\N	draft	2025-11-13 10:11:15.602+00	2025-11-13 10:11:15.602+00	\N	\N	2a0793d2-20d3-4485-89fe-73ebbc3ad550	\N
f3182782-8dff-4d83-ab13-23a892760fb9	Demande de permission - Direction	1764681452077-257934606.pdf	Demande_de_permission_1764681452057.pdf	uploads/1764681452077-257934606.pdf	232746	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"motif": "Personnel", "objet": "Demande de permission d'absence", "service": "Direction", "date_fin": "", "date_lieu": "Njombé le 02/12/2025", "date_debut": "", "noms_prenoms": "", "motif_exceptionnel": ""}	\N	draft	2025-12-02 13:17:32.087+00	2025-12-02 13:17:32.087+00	\N	\N	\N	\N
bd1a3906-3d65-4dba-9f07-a782e9bcedd0	Ordre de mission	1762504598071-26534030_v1762511009576.pdf	Ordre_de_mission_1762504598228.pdf	uploads/1762504598071-26534030_v1762511009576.pdf	380013	application/pdf	711dc16a-364b-4b46-b581-7697b32125de	Ordre de mission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-07 08:36:38.081+00	2025-11-07 13:37:47.507+00	\N	\N	\N	\N
a6f62b48-187e-42fc-95b7-e08b0020dfe1	PLANNING WE	1762525828115-681936231_v1762527716162.pdf	PLANNING WE.pdf	uploads/1762525828115-681936231_v1762527716162.pdf	522228	application/pdf	4830d5f7-9ebb-4640-8f07-91b8c710e254	\N	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-07 14:30:28.122+00	2025-11-07 15:01:56.46+00	\N	\N	\N	\N
b99d01e9-2fc1-4fcd-8490-704f53d2ad11	Ordre de mission	1762526660418-283033114_v1762527645320.pdf	Ordre_de_mission_1762526759294.pdf	uploads/1762526660418-283033114_v1762527645320.pdf	376907	application/pdf	c6bf9eaa-73cc-4f01-ac3c-770764928554	Ordre de mission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-07 14:44:20.422+00	2025-11-13 09:33:56.344+00	\N	\N	\N	\N
764d46ab-9873-4196-9114-4640306799ed	Fiche de suivi - H├®mato	1762787330166-327356668_v1762787374355.pdf	Fiche_Suivi_Gyn├â┬®cologie_1762787330091.pdf	uploads/1762787330166-327356668_v1762787374355.pdf	10817585	application/pdf	701c20bb-3007-45c1-8a3c-b682d49e8842	Fiche de suivi d'├®quipements	{"service": "Gyn├®cologie", "has_stamp": true, "equipement": "H├®mato", "has_signature": true, "linkedWorkRequestId": "85f2f2ec-3245-4e79-a03e-b361e1ba1386"}	\N	approved	2025-11-10 15:08:50.199+00	2025-11-10 15:09:34.505+00	\N	\N	\N	\N
85f2f2ec-3245-4e79-a03e-b361e1ba1386	Demande de travaux - Gyn├®cologie	1762787090592-167963640_v1762787436682.pdf	Demande_Travaux_Gyn├â┬®cologie_1762787090509.pdf	uploads/1762787090592-167963640_v1762787436682.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "Biomedical", "motif": "H├®mato", "service": "Gyn├®cologie", "demandeur": "Franck YANKEU", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 15:04:50.659+00	2025-11-10 15:10:36.924+00	\N	\N	\N	\N
61cb188d-e535-41ff-915a-4731f6b9cfc2	demande_permission	1762789894462-709190768_v1762789907388.pdf	demande_permission.pdf	uploads/1762789894462-709190768_v1762789907388.pdf	100566	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 15:51:34.466+00	2025-11-10 15:51:47.556+00	\N	\N	\N	\N
08dedde8-f816-4f5d-bfe9-fe2880f583f5	Demande de permission - Direction	1762809253556-459584849_v1762809303624.pdf	Demande_de_permission_1762809253524.pdf	uploads/1762809253556-459584849_v1762809303624.pdf	225315	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de permission	{"has_stamp": true, "has_signature": true}	\N	approved	2025-11-10 21:14:13.56+00	2025-11-10 21:15:03.848+00	\N	\N	\N	\N
ca2b7a20-df27-42f2-a3a2-9a131ef81380	Pi├¿ce de caisse - Pi├¿ce justificative - Demande de permission: Demande de permission - Direction	PC_Demande_de_permission_fusionn├®_1763028869144.pdf	Piece_Caisse_Demande_de_permission_02c1e0a2_1763028868890.pdf	uploads/PC_Demande_de_permission_fusionn├®_1763028869144.pdf	14447573	application/pdf	744d93f7-af0d-481d-9a97-39cbcbd05d68	Pi├¿ce de caisse	{"nom": "", "concerne": "Pi├¿ce justificative - Demande de permission: Demande de permission - Direction", "fusionDate": "2025-11-13T10:14:29.164Z", "fusionn├®": true, "linkedDocumentId": "02c1e0a2-a641-4e06-b589-a26f1e35446a", "linkedDocumentTitle": "Demande de permission - Direction", "linkedDocumentCategory": "Demande de permission"}	\N	draft	2025-11-13 10:14:29.165+00	2025-11-13 10:14:29.165+00	\N	\N	02c1e0a2-a641-4e06-b589-a26f1e35446a	\N
d4a55e6a-86e2-46f8-ae32-2187907f34b7	Demande de travaux - Chirurgie	1764578035566-855073924.pdf	Demande_Travaux_Chirurgie_1764578035343.pdf	uploads/1764578035566-855073924.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "MG", "motif": "test", "service": "Chirurgie", "demandeur": "Franck YANKEU"}	\N	pending_validation	2025-12-01 08:33:55.631+00	2025-12-01 08:33:55.741+00	\N	\N	\N	\N
ab2f41bb-7388-4c25-9aa8-7e48a59cdca4	Demande de besoin - Chirurgie	1764599624184-229790280_v1764599920541.pdf	Demande_Besoin_Chirurgie_1764599623881.pdf	uploads/1764599624184-229790280_v1764599920541.pdf	10703249	application/pdf	c4311098-40f2-4289-af7b-76e503b220c5	Demande de besoin	{"service": "Chirurgie", "has_stamp": true, "reference": "DT-e41be226", "has_signature": true, "linkedWorkRequestId": "e41be226-ce40-4dd7-81fe-3e1cfad6ebe8"}	\N	approved	2025-12-01 14:33:44.237+00	2025-12-01 14:38:41.053+00	\N	\N	\N	\N
0ed0fe25-f89e-48c4-8727-a5417cc03dbb	Fiche de suivi - test	1764598988088-56126895_v1764599134782.pdf	Fiche_Suivi_Chirurgie_1764598987820.pdf	uploads/1764598988088-56126895_v1764599134782.pdf	10712777	application/pdf	701c20bb-3007-45c1-8a3c-b682d49e8842	Fiche de suivi d'équipements	{"service": "Chirurgie", "has_stamp": true, "equipement": "test", "has_signature": true, "linkedWorkRequestId": "01d798c4-b20c-49ea-8a35-8c7009c893be"}	\N	approved	2025-12-01 14:23:08.186+00	2025-12-01 14:25:35.055+00	\N	\N	\N	\N
01d798c4-b20c-49ea-8a35-8c7009c893be	Demande de travaux - Chirurgie	1764598493840-688997853_v1764599261407.pdf	Demande_Travaux_Chirurgie_1764598493643.pdf	uploads/1764598493840-688997853_v1764599261407.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "Biomedical", "motif": "test", "service": "Chirurgie", "demandeur": "Franck YANKEU", "has_stamp": true, "has_signature": true, "fiche_suivi_id": "0ed0fe25-f89e-48c4-8727-a5417cc03dbb", "last_merged_at": "2025-12-01T14:25:35.381Z", "has_fiche_suivi": true}	\N	approved	2025-12-01 14:14:54.307+00	2025-12-01 14:27:41.898+00	\N	\N	\N	\N
a5e269c4-6697-46fa-a27c-631c114f3f47	ACHAT COUCHE	1764595740400-972654415_v1764599345070.pdf	ACHAT COUCHE.pdf	uploads/1764595740400-972654415_v1764599345070.pdf	105266	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	{"has_stamp": true, "has_signature": true}	\N	approved	2025-12-01 13:29:00.403+00	2025-12-01 14:29:05.294+00	\N	\N	\N	\N
5c3343fe-5cfb-4afc-a96a-b0b0c530942f	Demande de besoin - Chirurgie	1764600411871-824918027_v1764600482763.pdf	Demande_Besoin_Chirurgie_1764600411431.pdf	uploads/1764600411871-824918027_v1764600482763.pdf	10703249	application/pdf	c4311098-40f2-4289-af7b-76e503b220c5	Demande de besoin	{"service": "Chirurgie", "has_stamp": true, "reference": "DT-ce1c03e6", "has_signature": true, "linkedWorkRequestId": "ce1c03e6-893f-446d-b474-6b2606408a51"}	\N	approved	2025-12-01 14:46:51.958+00	2025-12-01 14:48:03.243+00	\N	\N	\N	\N
736315d3-55c0-4612-afba-0ff32649d27c	Demande de nouveaux Ordinateurs	1762424142393-427158078_v1762511092270.pdf	demande.pdf	uploads/1762424142393-427158078_v1762511092270.pdf	101401	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Technique	{"has_signature": true}	\N	approved	2025-11-06 10:15:42.398+00	2025-11-07 10:24:52.534+00	\N	\N	\N	\N
bf8654a8-73a0-43c8-96c2-c19c526b196e	Demande de travaux - Chirurgie	1764680770529-161035358_v1764680786449.pdf	Demande_Travaux_Chirurgie_1764680770263.pdf	uploads/1764680770529-161035358_v1764680786449.pdf	10703249	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande de travaux	{"type": "Biomedical", "motif": "test", "service": "Chirurgie", "demandeur": "Franck YANKEU", "has_stamp": true, "has_signature": true}	\N	en_attente_dependance	2025-12-02 13:06:10.61+00	2025-12-02 13:07:38.328+00	\N	\N	\N	\N
89817ebc-0c84-4f20-974f-e9a555f79a74	Planning Opératoire - Chirurgie	1763926050699-8654650_v1763926072662.pdf	Planning_OpÃ©ratoire_1763926050680.pdf	uploads/1763926050699-8654650_v1763926072662.pdf	153850	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Planning Opératoire	{"lignes": [{"age": "", "jour": "LUNDI", "nomPatient": "", "intervenant": "", "numeroSalle": "", "natureIntervention": ""}], "periode": "", "service": "Chirurgie", "has_stamp": true, "has_signature": true}	\N	approved	2025-11-23 19:27:30.707+00	2025-11-23 19:27:53.088+00	\N	\N	\N	\N
f26a162c-355b-4b2f-ab6c-f9c38b96acbb	Ordre de mission	1763021728473-107548512_v1763021770541.pdf	Ordre_de_mission_1763021728408.pdf	uploads/1763021728473-107548512_v1763021770541.pdf	276140	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-13", "date_retour": "", "numero_ordre": "", "frais_mission": false, "has_signature": true, "objet_mission": "", "immat_vehicule": "", "nom_conducteur": "", "nom_missionnaire": "", "service_demandeur": ""}	\N	approved	2025-11-13 08:15:28.484+00	2025-11-13 08:16:42.097+00	\N	\N	\N	\N
171d2c49-3e07-472f-af46-8158046dd016	Demande d'explication	1763222184672-258219669_v1763223422276.pdf	Demande_d'explication_1763222184651.pdf	uploads/1763222184672-258219669_v1763223422276.pdf	289020	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Demande d'explication	{"objet": "Demande d'explication", "service": "", "date_lieu": "Njomb├® le 15/11/2025", "has_stamp": true, "noms_prenoms": "", "date_incident": "", "delai_reponse": 7, "has_signature": true, "lieu_incident": "", "type_incident": "", "heure_incident": "", "motifs_explication": "", "description_incident": ""}	\N	approved	2025-11-15 15:56:24.681+00	2025-11-15 16:17:02.623+00	\N	\N	\N	\N
696b05c2-440a-4380-a6ef-17fb9a3ee17c	Ordre de mission	1763732633765-386233736_v1763732669471.pdf	Ordre_de_mission_1763732633747.pdf	uploads/1763732633765-386233736_v1763732669471.pdf	296412	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-21", "date_retour": "", "numero_ordre": "", "frais_mission": false, "has_signature": true, "objet_mission": "", "immat_vehicule": "", "nom_conducteur": "", "nom_missionnaire": "", "service_demandeur": ""}	\N	in_progress	2025-11-21 13:43:53.768+00	2025-11-21 13:44:29.755+00	\N	\N	\N	\N
079129a6-33c6-4ff8-a66f-416d99b18e05	Ordre de mission	1763732776297-263343004_v1763732846452.pdf	Ordre_de_mission_1763732776276.pdf	uploads/1763732776297-263343004_v1763732846452.pdf	296412	application/pdf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Ordre de mission	{"has_stamp": true, "date_depart": "2025-11-21", "date_retour": "", "numero_ordre": "", "frais_mission": false, "has_signature": true, "objet_mission": "", "immat_vehicule": "", "nom_conducteur": "", "nom_missionnaire": "", "service_demandeur": ""}	\N	in_progress	2025-11-21 13:46:16.307+00	2025-11-21 13:47:26.902+00	\N	\N	\N	\N
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.employees (id, first_name, last_name, birth_date, birth_place, gender, children_count, matricule, marital_status, service_id, is_active, created_at, updated_at) FROM stdin;
9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck	YANKEU	1998-09-17	NKONGSAMBA	M	1	110607	C├®libataire	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	t	2025-11-17 10:25:47.523+00	2025-11-17 10:25:47.523+00
\.


--
-- Data for Name: invoice_folders; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.invoice_folders (id, name, type, "position", created_at, updated_at, parent_id) FROM stdin;
e60dcc30-00a9-4e71-abab-7872ec921ae2	Boîte de réception	inbox	0	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
9e52ff80-e563-4293-9266-2de0c69932bf	TISSERIN	custom	1	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
e773b4b7-b4f7-42d5-ba1e-343ffbd06e1f	DIOCESE	custom	2	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
60039ce6-c059-4841-a5e7-51a094ef227e	WILLISTOWER	custom	3	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
684b01d6-ff09-42ea-bab9-5d31d49d5352	CHANAS	custom	4	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
a2d5c0ce-8e3e-48f2-be30-fa04c61ae3d5	ASCOMA	custom	5	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
dd886d11-8d2a-42ee-a740-0f3e083e893d	C’ESTDBM	custom	6	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
6d3a0f5e-87b4-44c5-9685-32ef85c6e66e	ROYAL ONYX	custom	7	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
57b20fa6-c437-4255-b00a-07a9ce8c1e6b	DANGOTE	custom	8	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
10b63e59-c92e-4772-a64e-78475ade1bdd	PHP (Groupe)	container	9	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	\N
ce7f10af-41cd-4c6e-9ed9-1534c5892bd9	MUTEULLE PHP	custom	10	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	10b63e59-c92e-4772-a64e-78475ade1bdd
15672535-51a9-45c0-a9f7-ff62471c80fd	VISITE SYSTEMATIQUE	custom	11	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	10b63e59-c92e-4772-a64e-78475ade1bdd
db606d61-26eb-4564-a377-6ad6b9eb83a9	MEDICAMENTS	custom	12	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	10b63e59-c92e-4772-a64e-78475ade1bdd
09aa4b81-4a6f-45be-9003-f87d4f3552c1	SOUS COUVERT PHP	custom	13	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	10b63e59-c92e-4772-a64e-78475ade1bdd
553f0bbd-dd56-43bc-b311-b0162c16b81f	FAMILLE PHP	custom	14	2025-12-03 13:57:55.614+00	2025-12-03 13:57:55.614+00	10b63e59-c92e-4772-a64e-78475ade1bdd
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.licenses (id, key, client_name, expires_at, created_at, updated_at) FROM stdin;
2	eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnROYW1lIjoiSMO0cGl0YWwgU2FpbnQgSmVhbiBkZSBNYWx0ZSIsImdlbmVyYXRlZEF0IjoiMjAyNS0xMi0wMlQxNzo1MDoyNS40MTBaIiwiZXhwaXJlc0F0IjoiMjAyNi0xMi0zMSIsImZlYXR1cmVzIjpbInRyZWxsbyIsInNpZ25hdHVyZSIsImV4cG9ydF9yaCJdLCJpYXQiOjE3NjQ2OTc4MjV9.iaj9Zvu19v_DPb8a2KMECHiXfZSfAlgvS2Jjxc63dAsy3bt_elzVIrm5CBH98UHfPuNPxqy5L37tZT-Wai929dKAqZEuBvv1EgphF4aqSa3ymt-zWmTzShoI7h0pSHr7dLVtUUQxkZHhlkMI9z2IMlO3mykgTeEPErCYPH7-wQWQj-RdGCmvjzReSZ7_vFclaKK5CqsYjs29oFniWnxzZWP9pwTNhT67MxabJyXFQ5lYzfY_DGKHyc2y04z6d0-mbm6-HwpYCqV7jHY2om1muGuCu2njqIi8sm75dnoiNY-4cbHJ0uK1tctkTV6cW8s_BgIDqOTAIg_S3fOuCMjQRA	Hôpital Saint Jean de Malte	2026-12-31 00:00:00+00	2025-12-02 17:50:34.335+00	2025-12-02 17:50:34.335+00
\.


--
-- Data for Name: motifs; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.motifs (id, name, type, created_at, updated_at) FROM stdin;
157f1e76-e96d-4de7-a8e0-dbe97e0940b0	H├®mato	Biomedical	2025-10-31 10:05:30.487+00	2025-10-31 10:05:30.487+00
165f4e76-3360-4369-a844-086c9cf74626	test	MG	2025-11-07 09:24:39.048+00	2025-11-07 09:24:39.048+00
50761c61-74cf-4ca7-8141-929d4ddc73ae	4 LAMPES GRILLEES DANS LA SALLA DES URGENCES\nCLIMATISEUR SALLE DES URGENCES DERRIERE LE BUREAU DU PERSONNEL DEFECTIEUSE	MG	2025-11-07 09:33:01.027+00	2025-11-07 09:33:01.027+00
5311bcd8-39ae-48e2-b180-6fec34c6017a	test	Biomedical	2025-12-01 14:14:52.845+00	2025-12-01 14:14:52.845+00
97436011-2b0f-4a98-9d89-881538b62a11	new workflow	MG	2025-12-01 14:29:41.154+00	2025-12-01 14:29:41.154+00
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.positions (id, queue_type, position_number, user_id, status, last_active_at, created_at, updated_at) FROM stdin;
28004d9b-fa7c-4c19-8481-5f6420687faf	accueil_php	1	\N	offline	\N	2025-11-23 20:32:28.117+00	2025-11-23 20:32:28.117+00
3c6a23b9-c715-4ac9-95a3-f82590fb622d	accueil_php	2	\N	offline	\N	2025-11-23 20:32:28.117+00	2025-11-23 20:32:28.117+00
18c9d874-9036-4261-b52f-a2e1ee40ad5d	accueil_normal	2	\N	offline	\N	2025-11-23 20:32:28.117+00	2025-11-23 20:32:28.117+00
4c77a425-0d3a-4a23-bb5f-80089278ad6b	caisse	1	\N	offline	\N	2025-11-23 20:32:28.117+00	2025-11-23 20:32:28.117+00
b3191099-e8c2-411f-b51d-8bcd5a315193	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	available	2025-11-23 20:54:07.708+00	2025-11-23 20:32:28.117+00	2025-11-23 20:54:07.709+00
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.push_subscriptions (id, user_id, endpoint, subscription, active, created_at, updated_at) FROM stdin;
7c7c52bc-9667-4fd9-89fd-4310a5bc5e67	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://web.push.apple.com/QI_nwQjDJ4mp2vyRxmnULuTJhAys41BaJvt7QqAQlZf-T2aUh7UGSSUYN5-0e8JbRM_EeI5lltwKQhVLrxFYayIBEidL-YCZ4iaqP9dchWJjm35Bm1ilwf6f23HoOsXnbXI9VRBtw9wUxGExvbDZxsSYSVxaw4PU43KFMq83mTg	{"endpoint":"https://web.push.apple.com/QI_nwQjDJ4mp2vyRxmnULuTJhAys41BaJvt7QqAQlZf-T2aUh7UGSSUYN5-0e8JbRM_EeI5lltwKQhVLrxFYayIBEidL-YCZ4iaqP9dchWJjm35Bm1ilwf6f23HoOsXnbXI9VRBtw9wUxGExvbDZxsSYSVxaw4PU43KFMq83mTg","keys":{"p256dh":"BIJrBtk2TN85pgMhrXvU9Cufm8MH5a0jJ00UzPVKitbxQxmck7UPymKN0DjhRnz9R3OmH3b_t7jtdJHCYGmZIHw","auth":"LXrhUw_hftjsKZC84nWkow"}}	t	2025-11-21 10:33:31.045+00	2025-11-21 10:33:31.045+00
052b05ac-c9d7-4a95-ab59-64c70ee5000d	9b830fef-fa07-4e26-9a27-20de41685acb	https://fcm.googleapis.com/fcm/send/csoLrQ1IRS0:APA91bGpugMah3NbvuAUAtVEkJd47LUPb_MApRr1EbOeys5KuEa77UCUQaKd3WK6f4SS36lMZWXuGJUNmtYlz5CZfF1YWOiCEh4Oy2HRI-9mLI2tQaEXuFa53iP6JK3mnbSdMPw3VXMu	{"endpoint":"https://fcm.googleapis.com/fcm/send/csoLrQ1IRS0:APA91bGpugMah3NbvuAUAtVEkJd47LUPb_MApRr1EbOeys5KuEa77UCUQaKd3WK6f4SS36lMZWXuGJUNmtYlz5CZfF1YWOiCEh4Oy2HRI-9mLI2tQaEXuFa53iP6JK3mnbSdMPw3VXMu","expirationTime":null,"keys":{"p256dh":"BDKRGn5zbivTitPmdKmJ07CwOWljkiGKGTRhIq8A2x_io3-24zVNp3cXb-UCWuRRgNfTsCAkIMSGANFQzsGbkeo","auth":"mR4eV7KTcL5oQd-rfFu4NQ"}}	t	2025-11-21 10:41:13.176+00	2025-11-21 10:41:13.176+00
dab00897-270c-495e-b970-dff32313c11e	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://fcm.googleapis.com/fcm/send/fdSmvOmHkvg:APA91bGn1PBTeXiUCP8SfjXqsk0zuHHgsk4OQiNuu5JPlEXOzlJ5xec_bunMvtSBz_yLL1MV94GiGyUKVfrFaDoXWGEAf-3jlD6OO67nkFy0lr_F-zZiISjm2mezg8xBl3o6N8oJMnTM	{"endpoint":"https://fcm.googleapis.com/fcm/send/fdSmvOmHkvg:APA91bGn1PBTeXiUCP8SfjXqsk0zuHHgsk4OQiNuu5JPlEXOzlJ5xec_bunMvtSBz_yLL1MV94GiGyUKVfrFaDoXWGEAf-3jlD6OO67nkFy0lr_F-zZiISjm2mezg8xBl3o6N8oJMnTM","expirationTime":null,"keys":{"p256dh":"BDyPop6_SgcNYnh80gEIigyypQl6jlO3dInYI3O5J4bwZNMmF7xzVV53-7rIuJc3oFkYXZ1gWc6xE0kuPPh-LH8","auth":"EhNNIBF45-Kk_r5qTXaHbg"}}	t	2025-11-21 10:57:29.834+00	2025-11-21 10:57:29.834+00
675f6071-8c6e-4290-9aa6-7bd09681d35b	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://fcm.googleapis.com/fcm/send/cQfsCx7I6zE:APA91bGFIp7BcELGZUbmh5Nkik02iWYK_Nu5qFeh7CxfCGuuSNFBJLoNtZuENpW8DoaLDAUGQ2HnTG48qf16Za7BpMzgTT6KARAK7xFq_CyJSDaUMG19u8nppvidK6I0F8iuZE9AU2Tt	{"endpoint":"https://fcm.googleapis.com/fcm/send/cQfsCx7I6zE:APA91bGFIp7BcELGZUbmh5Nkik02iWYK_Nu5qFeh7CxfCGuuSNFBJLoNtZuENpW8DoaLDAUGQ2HnTG48qf16Za7BpMzgTT6KARAK7xFq_CyJSDaUMG19u8nppvidK6I0F8iuZE9AU2Tt","expirationTime":null,"keys":{"p256dh":"BEIL2FIjUd80dfBwH8uCmYG2bx7YP4Xcf_rowfZJaiol2xtIco-Vj6JKU9ESXlCn6pzdRjjzchI8d4VBfjiTCpI","auth":"n6na05d_5b1NajtxBd7Ofg"}}	t	2025-11-28 09:55:58.699+00	2025-11-28 09:55:58.699+00
3432acf7-670e-480f-a4a0-9d4217298eb7	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://web.push.apple.com/QC1DT9a4e6robmAv4FLoLxkIkcmW1ngwMBQ_vECMp5QOgobrwS5_aGN_wrovFUEBtn4Hdt5jl3XBdshP5QGCie0I3rUBQ5pM89BRiU22Rd1faJ0Lmtb_fs9GLg8mzk7-9kZiMTVz1QCfMY_EfQhBsxEJaN_I-bmK6JNb8WfQQiE	{"endpoint":"https://web.push.apple.com/QC1DT9a4e6robmAv4FLoLxkIkcmW1ngwMBQ_vECMp5QOgobrwS5_aGN_wrovFUEBtn4Hdt5jl3XBdshP5QGCie0I3rUBQ5pM89BRiU22Rd1faJ0Lmtb_fs9GLg8mzk7-9kZiMTVz1QCfMY_EfQhBsxEJaN_I-bmK6JNb8WfQQiE","keys":{"p256dh":"BBNGuyPCTCqjU7eoONpa_t8RYK9xOWUTd9pVg4pSEyJpYzMPw5DLuHoKcBagbv0VVS44VSkbReDpFaQmNEnJIK8","auth":"GpW4jBmohcexkLmtb2Sauw"}}	t	2025-12-04 12:47:12.553+00	2025-12-04 12:47:12.553+00
dca7a013-de43-434c-b96d-f25a86db0c0f	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://web.push.apple.com/QPxjCPXqIyltWxjKpmMOH7SfrpjOT8fEhQSrFHzNpsBDy3kZNiNISf9sm3VPPGlJeoWImVA9imUqTAq4rxa_RhSNehDSziC_wegqri6MKZQMlCCI8-o5jctr1LZHvmluIjvhGWcvlbjpoceSkwmQmmfN2CaSYs5RdTAgzO2vDxs	{"endpoint":"https://web.push.apple.com/QPxjCPXqIyltWxjKpmMOH7SfrpjOT8fEhQSrFHzNpsBDy3kZNiNISf9sm3VPPGlJeoWImVA9imUqTAq4rxa_RhSNehDSziC_wegqri6MKZQMlCCI8-o5jctr1LZHvmluIjvhGWcvlbjpoceSkwmQmmfN2CaSYs5RdTAgzO2vDxs","keys":{"p256dh":"BH8yuVWqbv2BILIWXogL_nqtyxMXhqbsyJdLFYlYWwWxrGXRokW1EUxOJIugFUF8o0RyetDzfAgXWOw79E_aZ9w","auth":"bpSQmKlAnlRHHeW5AeiFOA"}}	t	2025-12-09 09:52:17.061+00	2025-12-09 09:52:17.061+00
9ef35f98-ee1a-4f95-b253-a1f0076a3e86	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	https://web.push.apple.com/QH8QbQJWFQaA2yQyJrFsReYxTXwH53JF04Wzsoh_pXSbLoUXK4_COHIDYM8kn_FM1eRGWYAA85EZsT8onFk5F7gqpYT9QRWjI_QDumfEoDGmPTW7omIIR2QCPFIB4qQgPYqqAJErEWXTPopX2k2UlaGlAP_OywSHY2iSBGKBBA0	{"endpoint":"https://web.push.apple.com/QH8QbQJWFQaA2yQyJrFsReYxTXwH53JF04Wzsoh_pXSbLoUXK4_COHIDYM8kn_FM1eRGWYAA85EZsT8onFk5F7gqpYT9QRWjI_QDumfEoDGmPTW7omIIR2QCPFIB4qQgPYqqAJErEWXTPopX2k2UlaGlAP_OywSHY2iSBGKBBA0","keys":{"p256dh":"BBaihYGqAmwjbiEGl4xCrqTE7-KxU0599q66LpDuDocuHderP7EYvXh7BhvhaW8oZ3LDRrNT8gxx8fdc1jGTTW0","auth":"CCDqxnvTaHmDD-io8ZtVaw"}}	t	2026-01-06 14:21:54.02+00	2026-01-06 14:21:54.02+00
\.


--
-- Data for Name: queue_positions; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.queue_positions (id, queue_type, position_number, user_id, current_ticket_id, status, created_at, updated_at) FROM stdin;
b3f167d2-df88-414a-aab9-348a8da2f853	accueil_php	1	d029298c-2acc-4227-90e1-8eb402a98ec9	6332b97f-9761-44a2-a57b-cb42c81d6a34	busy	2025-11-21 22:18:39.695+00	2025-11-21 23:53:18.106+00
30c01274-7340-4b8c-a779-c5bd9cd969ea	caisse	1	\N	\N	offline	2025-11-21 22:18:39.695+00	2025-11-22 00:05:20.902+00
6714edd2-e36b-4a5c-9d80-cf8b86652099	accueil_normal	2	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	c26a7fd9-41b6-4642-94a4-a2da4182946a	busy	2025-11-21 22:18:39.695+00	2025-11-23 20:10:13.265+00
4323586e-3c81-40fe-9b5f-e771609bd944	accueil_php	2	d029298c-2acc-4227-90e1-8eb402a98ec9	dfcd60e0-c4b9-4f43-b826-a28b72d03886	busy	2025-11-21 22:18:39.695+00	2025-11-23 20:21:13.809+00
edfa041c-7310-411b-a49b-2bf044a3c566	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	7fb5269a-7871-4111-8ae8-a087e091c88d	busy	2025-11-21 22:18:39.695+00	2025-11-23 20:54:10.579+00
\.


--
-- Data for Name: schedule_assignments; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.schedule_assignments (id, schedule_id, user_id, employee_id, employee_name, assignment_date, shift_type_id, shift_code, department_id, "position", notes, notification_sent, notification_sent_at, reminder_sent, reminder_sent_at, created_at, updated_at) FROM stdin;
364c4b1d-3519-45f8-b8a0-4d13a7585919	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-11-30	65c4601f-de27-4a1f-83be-ef2bbb05240c	P	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:47.975+00	2025-12-04 12:51:47.975+00
0323a731-c556-4d4f-97d2-129d0588d530	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-01	65c4601f-de27-4a1f-83be-ef2bbb05240c	P	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:47.997+00	2025-12-04 12:51:47.997+00
2cb41f43-9746-46e2-915c-b957f0ec9ee3	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-02	65c4601f-de27-4a1f-83be-ef2bbb05240c	P	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:48.005+00	2025-12-04 12:51:48.005+00
01c0d96b-e159-4acb-b649-1df525451819	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-03	65c4601f-de27-4a1f-83be-ef2bbb05240c	P	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:48.014+00	2025-12-04 12:51:48.014+00
c14d15db-ba9f-4fbf-ba87-9077fd5e3cae	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-04	65c4601f-de27-4a1f-83be-ef2bbb05240c	P	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:48.022+00	2025-12-04 12:51:48.022+00
bfac30db-3d5b-461b-9a38-77d52b40ab54	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-05	a4b465cb-38c6-4363-8660-737ad5c106bb	R	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:48.029+00	2025-12-04 12:51:48.029+00
423a4be2-fe31-4004-9ff4-fb8da69edbea	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	9288f28a-43c8-421b-8994-422f302f0d5e	Aurele Franck YANKEU	2025-12-06	a4b465cb-38c6-4363-8660-737ad5c106bb	R	4a27e576-5c38-445c-b87b-6a825f4d7eaa	\N	\N	f	\N	f	\N	2025-12-04 12:51:48.036+00	2025-12-04 12:51:48.036+00
\.


--
-- Data for Name: schedule_changes_log; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.schedule_changes_log (id, schedule_id, assignment_id, changed_by_user_id, change_type, affected_date, affected_employee, old_value, new_value, description, ip_address, user_agent, created_at) FROM stdin;
81cfae0b-f0a7-4d61-8ae9-7a018be0de71	b03b3dc6-db8d-4c47-91ba-84048cdd58e0	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Personnel Administratif - Décembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-11-24 13:52:32.924+00
76b13b7f-c628-49d5-a5e0-af55f8e165d7	0f2ea16f-7449-4efb-b259-87fa90245a2e	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Paramédical - Services Hospitaliers - Décembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-11-24 13:53:28.494+00
9a6ad45c-37ab-4823-b1e3-44fa79baaa98	34d80849-d93c-4a06-aa39-850128863e06	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Médecins - Astreintes et Consultations - Novembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-11-24 14:05:19.561+00
e9dae09b-0d16-4693-89fa-c1c7dcb20dca	e55fc81c-b88e-46f6-8f12-a7aa6ea2b3ec	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Agents Services Hospitaliers - Novembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-11-24 14:28:19.425+00
bd6decd1-e5d4-48ba-a30b-b46b210b69c7	7b26941b-cdd5-478c-ba14-50770a6b1715	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Paramédical - Services Hospitaliers - Novembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-11-24 14:29:53.72+00
7c8993c7-8b86-45b1-b188-1c11c86f9172	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Personnel Administratif - Décembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:15:23.618+00
58544217-0d9b-4c7e-8027-35f3e6b736c9	ea37712c-a42f-419f-9e76-9cfbd26821bd	364c4b1d-3519-45f8-b8a0-4d13a7585919	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-11-30	Aurele Franck YANKEU	\N	{"shiftCode":"P"}	Affectation créée: P	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:47.988+00
395bdabf-0cd7-4cdb-8e57-bf52291eea53	ea37712c-a42f-419f-9e76-9cfbd26821bd	0323a731-c556-4d4f-97d2-129d0588d530	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-01	Aurele Franck YANKEU	\N	{"shiftCode":"P"}	Affectation créée: P	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48+00
6c12cf17-0bfd-4930-97f0-28e2b7ed7168	ea37712c-a42f-419f-9e76-9cfbd26821bd	2cb41f43-9746-46e2-915c-b957f0ec9ee3	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-02	Aurele Franck YANKEU	\N	{"shiftCode":"P"}	Affectation créée: P	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48.009+00
ffb953ee-8a07-42a9-88cd-2ccb9965ad9e	ea37712c-a42f-419f-9e76-9cfbd26821bd	01c0d96b-e159-4acb-b649-1df525451819	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-03	Aurele Franck YANKEU	\N	{"shiftCode":"P"}	Affectation créée: P	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48.018+00
f445ee73-4408-4264-ae2d-02dc8337dbef	ea37712c-a42f-419f-9e76-9cfbd26821bd	c14d15db-ba9f-4fbf-ba87-9077fd5e3cae	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-04	Aurele Franck YANKEU	\N	{"shiftCode":"P"}	Affectation créée: P	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48.024+00
8844be25-91f9-45ca-89e2-f4e86f6cb3d1	ea37712c-a42f-419f-9e76-9cfbd26821bd	bfac30db-3d5b-461b-9a38-77d52b40ab54	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-05	Aurele Franck YANKEU	\N	{"shiftCode":"R"}	Affectation créée: R	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48.031+00
2cabf754-a994-46d1-9637-32f118a89710	ea37712c-a42f-419f-9e76-9cfbd26821bd	423a4be2-fe31-4004-9ff4-fb8da69edbea	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	2025-12-06	Aurele Franck YANKEU	\N	{"shiftCode":"R"}	Affectation créée: R	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:48.039+00
fe96a82d-75e7-46cd-9819-377a7840063c	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	status_change	\N	\N	{"status":"draft"}	{"status":"pending_dg"}	Planning soumis pour validation	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:51:56.432+00
c0c21eb1-bfda-4670-a243-6cd3f663e243	ea37712c-a42f-419f-9e76-9cfbd26821bd	\N	c3a95b48-fac5-43f6-b58c-23566a08f5b8	publish	\N	\N	\N	\N	Planning validé et publié	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-12-04 12:55:30.735+00
885f46cd-0287-419d-8f0b-b7c1adb4b5e7	feb8c3ec-d382-44a5-b67e-99111d8f1d06	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	create	\N	\N	\N	\N	Planning créé: Paramédical - Services Hospitaliers - Novembre 2025	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-11-25 10:18:53.024+00
6843d55e-e277-41fc-aac0-e8c8330d217f	375be67a-351d-4a4d-ad78-6d7c0392c11c	\N	c3a95b48-fac5-43f6-b58c-23566a08f5b8	create	\N	\N	\N	\N	Planning créé: Personnel Administratif - Novembre 2024	172.18.0.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	2025-11-26 09:00:14.704+00
\.


--
-- Data for Name: schedule_validations; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.schedule_validations (id, schedule_id, validator_role, validator_user_id, validation_order, status, validated_at, comments, rejection_reason, notification_sent, notification_sent_at, created_at, updated_at) FROM stdin;
4a2a32c5-c2bf-47ba-86a5-b08ff3c556ce	b03b3dc6-db8d-4c47-91ba-84048cdd58e0	dg	\N	1	pending	\N	\N	\N	f	\N	2025-11-24 13:52:32.919+00	2025-11-24 13:52:32.919+00
346f9e9e-c8e7-4215-8a0f-703c20933ec2	0f2ea16f-7449-4efb-b259-87fa90245a2e	dds	\N	1	pending	\N	\N	\N	f	\N	2025-11-24 13:53:28.484+00	2025-11-24 13:53:28.484+00
01c506e6-7d52-4447-9659-abe2a1b115df	0f2ea16f-7449-4efb-b259-87fa90245a2e	dg	\N	2	pending	\N	\N	\N	f	\N	2025-11-24 13:53:28.49+00	2025-11-24 13:53:28.49+00
9d879b86-87fd-4fb4-92cc-7bf43b801ce0	34d80849-d93c-4a06-aa39-850128863e06	medical_chief	\N	1	pending	\N	\N	\N	f	\N	2025-11-24 14:05:19.553+00	2025-11-24 14:05:19.553+00
242b13ae-824e-4884-9f85-907f40f5941d	34d80849-d93c-4a06-aa39-850128863e06	dg	\N	2	pending	\N	\N	\N	f	\N	2025-11-24 14:05:19.556+00	2025-11-24 14:05:19.556+00
a713309e-637b-42cd-a738-8fb8d2ebb58e	e55fc81c-b88e-46f6-8f12-a7aa6ea2b3ec	dds	\N	1	pending	\N	\N	\N	f	\N	2025-11-24 14:28:19.417+00	2025-11-24 14:28:19.417+00
45b9bbb9-7326-477b-93e5-7d63e134c8aa	e55fc81c-b88e-46f6-8f12-a7aa6ea2b3ec	dg	\N	2	pending	\N	\N	\N	f	\N	2025-11-24 14:28:19.421+00	2025-11-24 14:28:19.421+00
d9e0fad4-3dc5-4f72-ad48-071f461c35e2	7b26941b-cdd5-478c-ba14-50770a6b1715	dds	\N	1	pending	\N	\N	\N	f	\N	2025-11-24 14:29:53.7+00	2025-11-24 14:29:53.7+00
0622d3fb-5101-428f-948c-c45dac4ded31	7b26941b-cdd5-478c-ba14-50770a6b1715	dg	\N	2	pending	\N	\N	\N	f	\N	2025-11-24 14:29:53.711+00	2025-11-24 14:29:53.711+00
6fd5a0a6-cd70-4fd9-808d-4ae89c98b261	feb8c3ec-d382-44a5-b67e-99111d8f1d06	dds	\N	1	pending	\N	\N	\N	f	\N	2025-11-25 10:18:53.018+00	2025-11-25 10:18:53.018+00
0225dd0b-010a-4aa8-9ef4-bd65711946fd	feb8c3ec-d382-44a5-b67e-99111d8f1d06	dg	\N	2	pending	\N	\N	\N	f	\N	2025-11-25 10:18:53.022+00	2025-11-25 10:18:53.022+00
0e7f0c5c-25ed-4dac-8f12-ec033bd94966	375be67a-351d-4a4d-ad78-6d7c0392c11c	dg	\N	1	pending	\N	\N	\N	f	\N	2025-11-26 09:00:14.701+00	2025-11-26 09:00:14.701+00
52e6434c-c575-470d-93bb-caf8347eac90	ea37712c-a42f-419f-9e76-9cfbd26821bd	dg	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	2025-12-04 12:55:30.726+00		\N	f	\N	2025-12-04 12:15:23.614+00	2025-12-04 12:55:30.727+00
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.schedules (id, title, schedule_type, department_id, month, year, start_date, end_date, created_by_user_id, status, validation_workflow, notes, published_at, published_by_user_id, pdf_path, is_active, created_at, updated_at) FROM stdin;
34d80849-d93c-4a06-aa39-850128863e06	Médecins - Astreintes et Consultations - Novembre 2025	medical_duties	4a27e576-5c38-445c-b87b-6a825f4d7eaa	11	2025	2025-10-31	2025-11-29	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["medical_chief","dg"]}		\N	\N	\N	f	2025-11-24 14:05:19.544+00	2025-11-24 14:18:53.156+00
b03b3dc6-db8d-4c47-91ba-84048cdd58e0	Personnel Administratif - Décembre 2025	administrative	4a27e576-5c38-445c-b87b-6a825f4d7eaa	12	2025	2025-11-30	2025-12-30	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["dg"]}		\N	\N	\N	f	2025-11-24 13:52:32.903+00	2025-11-24 14:36:35.279+00
0f2ea16f-7449-4efb-b259-87fa90245a2e	Paramédical - Services Hospitaliers - Décembre 2025	paramedical_services	4a27e576-5c38-445c-b87b-6a825f4d7eaa	12	2025	2025-11-30	2025-12-30	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["dds","dg"]}		\N	\N	\N	f	2025-11-24 13:53:28.475+00	2025-11-24 14:52:43.349+00
7b26941b-cdd5-478c-ba14-50770a6b1715	Paramédical - Services Hospitaliers - Novembre 2025	paramedical_services	\N	11	2025	2025-10-31	2025-11-29	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["dds","dg"]}		\N	\N	\N	f	2025-11-24 14:29:53.657+00	2025-11-24 14:52:46.229+00
e55fc81c-b88e-46f6-8f12-a7aa6ea2b3ec	Agents Services Hospitaliers - Novembre 2025	hospital_services_agents	4a27e576-5c38-445c-b87b-6a825f4d7eaa	11	2025	2025-10-31	2025-11-29	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["dds","dg"]}		\N	\N	\N	f	2025-11-24 14:28:19.403+00	2025-11-24 14:52:50.86+00
feb8c3ec-d382-44a5-b67e-99111d8f1d06	Paramédical - Services Hospitaliers - Novembre 2025	paramedical_services	4a27e576-5c38-445c-b87b-6a825f4d7eaa	11	2025	2025-10-31	2025-11-29	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	draft	{"roles":["dds","dg"]}		\N	\N	\N	f	2025-11-25 10:18:53.009+00	2025-11-25 13:52:47.063+00
375be67a-351d-4a4d-ad78-6d7c0392c11c	Personnel Administratif - Novembre 2024	administrative	4a27e576-5c38-445c-b87b-6a825f4d7eaa	11	2024	2024-10-31	2024-11-29	c3a95b48-fac5-43f6-b58c-23566a08f5b8	draft	{"roles":["dg"]}		\N	\N	\N	t	2025-11-26 09:00:14.691+00	2025-11-26 09:00:14.691+00
ea37712c-a42f-419f-9e76-9cfbd26821bd	Personnel Administratif - Décembre 2025	administrative	4a27e576-5c38-445c-b87b-6a825f4d7eaa	12	2025	2025-11-30	2025-12-30	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	approved	{"roles":["dg"]}		2025-12-04 12:55:30.731+00	c3a95b48-fac5-43f6-b58c-23566a08f5b8	\N	t	2025-12-04 12:15:23.607+00	2025-12-04 12:55:30.731+00
\.


--
-- Data for Name: service_members; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.service_members (id, service_id, user_id, fonction, is_active, created_at, updated_at) FROM stdin;
80759e51-0af9-4059-b2d6-9c8a776a1fad	b6a6744b-066a-4cd1-947a-c81c9e0ce202	259a277b-f549-4459-a876-578fadeb957c	Chef de Service	t	2025-11-05 14:19:05.015+00	2025-11-05 14:19:05.015+00
d59335ca-626e-4ad8-a8a2-d3878a6865f3	b6a6744b-066a-4cd1-947a-c81c9e0ce202	25fb2445-64e2-4784-b8cf-14bddd08aae2	Major	t	2025-11-05 14:19:27.782+00	2025-11-05 14:19:27.782+00
32abb90f-bbcd-419b-804e-f19259b9114e	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	9b830fef-fa07-4e26-9a27-20de41685acb	Directeur du Soutien	t	2025-11-05 14:19:55.592+00	2025-11-05 14:19:55.592+00
fd59901a-3c33-4238-a1b7-5adabd6c5704	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	R├®f├®rent informaticien(e)	t	2025-11-05 14:20:09.411+00	2025-11-05 14:20:09.411+00
745aaa60-315a-4da2-9860-d5372dd0d56c	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	c36f077d-3148-496b-8d0c-fc4c5e433111	Informaticien(ne)	t	2025-11-05 14:20:16.83+00	2025-11-05 14:20:16.83+00
a535f620-a76d-4edf-bdeb-23c7d23ca12b	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	744d93f7-af0d-481d-9a97-39cbcbd05d68	Comptable	t	2025-11-05 14:20:42.826+00	2025-11-05 14:20:42.826+00
d978087b-a5bd-44e8-99d8-6106f8f976c7	70d5aa34-bf5e-4274-857a-e8e5cdf67608	cd0e7e19-af74-43cb-9755-5c0df1eb63a0	Chef de Service	t	2025-11-05 14:22:42.719+00	2025-11-05 14:22:42.719+00
ba19ee3f-784b-4bd6-969c-cbcf661408be	f40fd360-6e39-4a5c-ae45-95115c53cfb2	701c20bb-3007-45c1-8a3c-b682d49e8842	Chef de Service	t	2025-11-05 14:23:02.492+00	2025-11-05 14:23:02.492+00
d29ae912-9ab9-4a3c-8e55-ce809fa14329	ab938a37-cfb7-4587-bbb7-d37ce72f3f89	10ef834f-0663-4b0c-9643-6f700324ec8b	Chef de Service	t	2025-11-05 14:23:27.398+00	2025-11-05 14:23:27.398+00
582ae5a0-3d30-4026-8523-025ee5bc501b	10cc218f-438f-40ea-9e86-f27456dde342	ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	Chef de Service	t	2025-11-05 14:23:42.519+00	2025-11-05 14:23:42.519+00
a3ba1276-23f8-4456-907b-54b60ad49b29	196f7504-e110-41b7-8ace-e2e8c07b0ee7	06bb965d-f1e8-4fb1-8a44-2179bf519837	Chef de Service	t	2025-11-06 07:59:38.277+00	2025-11-06 07:59:38.277+00
63803789-ac21-4d4b-a0f1-94b572f2d8ff	196f7504-e110-41b7-8ace-e2e8c07b0ee7	c6bf9eaa-73cc-4f01-ac3c-770764928554	Major	t	2025-11-06 08:00:05.966+00	2025-11-06 08:00:05.966+00
03c74197-d219-4eff-b120-adba72a02880	196f7504-e110-41b7-8ace-e2e8c07b0ee7	44e84f32-5e3f-4c5b-8111-a51270fbc79d	Secr├®taire	t	2025-11-06 08:01:37.555+00	2025-11-06 08:01:37.555+00
943a8fd0-ffd6-4e1b-b0ee-c32025e79deb	35c95f51-390c-4089-a27f-b8e891f84d3a	c4311098-40f2-4289-af7b-76e503b220c5	Chef de Service	t	2025-11-07 08:16:02.472+00	2025-11-07 08:16:02.472+00
aa2bace8-9238-4851-a0d3-25aa442a0f15	5ed2a50b-c2ad-4e4d-858b-5a7549745876	d01488ba-2895-4b4b-ae41-4530641d1281	Major	t	2025-11-07 08:16:55.687+00	2025-11-07 08:16:55.687+00
5b3977ba-db12-4bc8-8f4f-a316952c6b0f	3e28e8d5-9142-4124-8796-92d01a2ae8b2	c09402cc-989e-4216-92e7-b7326334c441	Chef de Service	t	2025-11-07 08:18:24.725+00	2025-11-07 08:18:24.725+00
72e09e46-e592-40c7-abd6-e67407fcd7cd	3e28e8d5-9142-4124-8796-92d01a2ae8b2	dfff8397-33ca-4147-96e7-2a50e263f70d	Major	t	2025-11-07 08:18:36.163+00	2025-11-07 08:18:36.163+00
275e9181-c0c5-4c01-a7d4-94cefa824573	e4fabc7e-ec79-453f-a3e5-f660fa6f3413	8e6b3ff3-f190-4900-8f14-55f81023879e	Chef de Service	t	2025-11-07 08:18:47.058+00	2025-11-07 08:18:47.058+00
4d0691aa-9a24-4eda-ad56-bd4b8ac78f11	e4fabc7e-ec79-453f-a3e5-f660fa6f3413	e434543a-68bf-4052-bcd8-f0c127d6d3cf	Major	t	2025-11-07 08:19:01.593+00	2025-11-07 08:19:01.593+00
5e1bd288-40a1-4344-b041-c3e1f4c704fa	f1cbce66-2695-4cfa-ba4c-5f0fb01cfa81	21f453f0-68e9-47a1-aa5c-8599d17617a6	Chef de Service	t	2025-11-07 08:19:34.314+00	2025-11-07 08:19:34.314+00
31d72715-b44c-44c5-a4e3-8a3fb72d1080	f1cbce66-2695-4cfa-ba4c-5f0fb01cfa81	4c9fe9b5-28cd-462b-902e-8fdd44565c4b	Major	t	2025-11-07 08:19:48.707+00	2025-11-07 08:19:48.707+00
c64b6279-5c71-4273-b30e-63b8adcdeb4a	c7fc483e-0a88-49fd-81b8-4e53d95b1798	ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	Chef de Service	t	2025-11-07 08:20:01.624+00	2025-11-07 08:20:01.624+00
02111196-961e-422b-9ac0-8c24f068f9bc	c7fc483e-0a88-49fd-81b8-4e53d95b1798	4cd73a0f-2f00-4bff-89a6-3c6c169cb4a1	Major	t	2025-11-07 08:20:20.69+00	2025-11-07 08:20:20.69+00
fbd6176f-3ded-4b8c-b719-0327b5b70cd9	c6ea02b6-d3fd-475b-b3f2-2c7b0e8e5796	21f453f0-68e9-47a1-aa5c-8599d17617a6	Chef de Service	t	2025-11-07 08:20:38.276+00	2025-11-07 08:20:38.276+00
9f198e0f-7703-4562-a519-b19c0f2128bd	c6ea02b6-d3fd-475b-b3f2-2c7b0e8e5796	9f1781b5-e287-4e45-9f3f-0cc5da40ddd2	Major	t	2025-11-07 08:21:00.475+00	2025-11-07 08:21:00.475+00
8b5db24c-7e98-41c5-95ee-f6456b1e3e27	d246f2c3-2dd5-4153-9855-9ffd2c0514b6	06bb965d-f1e8-4fb1-8a44-2179bf519837	Chef de Service	t	2025-11-07 08:21:16.594+00	2025-11-07 08:21:16.594+00
35e3d20a-3338-41f8-9577-610f34c78b31	d246f2c3-2dd5-4153-9855-9ffd2c0514b6	c6bf9eaa-73cc-4f01-ac3c-770764928554	Major	t	2025-11-07 08:21:26.179+00	2025-11-07 08:21:26.179+00
bb0c5c82-bef6-461a-b838-922fbc91756f	5ed2a50b-c2ad-4e4d-858b-5a7549745876	e60d65d2-ba00-4ffd-a4fe-496dce9dd667	Chef de Service	t	2025-11-07 08:21:45.793+00	2025-11-07 08:21:45.793+00
0af65d9e-e573-4fd6-b3b6-e1a59afa5878	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	711dc16a-364b-4b46-b581-7697b32125de	Responsable Achats	t	2025-11-07 08:26:09.773+00	2025-11-07 08:26:09.773+00
d4a1d00a-9705-4544-8092-6e1c34dc1620	f13f50d9-6998-4c03-abf9-7a81c8b06bb8	c3a95b48-fac5-43f6-b58c-23566a08f5b8	Directeur Général	t	2025-11-05 14:19:47.134+00	2025-11-05 14:19:47.134+00
42f50123-eed6-49f6-b182-e8392e3acc1b	ffc8fd95-b438-4e84-b603-a6d8da41ba29	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Chef de Service	t	2025-12-01 12:28:52.759+00	2025-12-01 12:28:52.759+00
419ed38c-f209-4ec2-a51e-6d09c497e433	ffc8fd95-b438-4e84-b603-a6d8da41ba29	c36f077d-3148-496b-8d0c-fc4c5e433111	Major	t	2025-12-01 12:29:03.205+00	2025-12-01 12:29:03.205+00
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.services (id, name, created_at, updated_at) FROM stdin;
10cc218f-438f-40ea-9e86-f27456dde342	Gyn├®cologie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
c7fc483e-0a88-49fd-81b8-4e53d95b1798	PMI	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
f13f50d9-6998-4c03-abf9-7a81c8b06bb8	Direction	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
b6a6744b-066a-4cd1-947a-c81c9e0ce202	Pharmacie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
e4fabc7e-ec79-453f-a3e5-f660fa6f3413	M├®decine	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
c6ea02b6-d3fd-475b-b3f2-2c7b0e8e5796	P├®diatrie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
f1cbce66-2695-4cfa-ba4c-5f0fb01cfa81	N├®onatalogie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
5ed2a50b-c2ad-4e4d-858b-5a7549745876	Bloc Op├®ratoire	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
70d5aa34-bf5e-4274-857a-e8e5cdf67608	Anesth├®sie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
ab938a37-cfb7-4587-bbb7-d37ce72f3f89	Chirurgie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
196f7504-e110-41b7-8ace-e2e8c07b0ee7	SAU	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
316b155a-67ff-49c2-b0ef-2990c748342c	Accueil	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
1f7e4b34-2058-4763-a993-7e52e77e8012	Lingerie	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
0b72401c-8a66-4abe-b2c1-ebc38a83acc8	Kin├®	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
8f51b4fb-eac2-4476-8e42-74166eaf86e0	Point Focal	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
f40fd360-6e39-4a5c-ae45-95115c53cfb2	Biom├®dical	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
d246f2c3-2dd5-4153-9855-9ffd2c0514b6	Param├¿tre SAU	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
35c95f51-390c-4089-a27f-b8e891f84d3a	MG	2025-10-31 09:14:36.377+00	2025-10-31 09:14:36.377+00
3e28e8d5-9142-4124-8796-92d01a2ae8b2	Laboratoire	2025-10-31 15:49:53.407+00	2025-10-31 15:49:53.407+00
ffc8fd95-b438-4e84-b603-a6d8da41ba29	Informatique	2025-12-01 12:28:37.104+00	2025-12-01 12:28:37.104+00
\.


--
-- Data for Name: shift_types; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.shift_types (id, code, name, description, color, start_time, end_time, is_work_day, is_night_shift, requires_notification, notification_hours_before, is_active, created_at, updated_at) FROM stdin;
65c4601f-de27-4a1f-83be-ef2bbb05240c	P	Présent	Journée de travail normale	#22c55e	07:30:00	16:30:00	t	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
a4b465cb-38c6-4363-8660-737ad5c106bb	R	Repos	Jour de repos	#94a3b8	\N	\N	f	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
bd868476-7723-4d66-a3b6-f1915324f352	J	Jour	Shift de jour (7h - 17h30)	#3b82f6	07:00:00	17:30:00	t	f	t	12	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
0b467604-5603-447b-81f8-bc11e76c8b9d	N	Nuit	Shift de nuit (17h - 7h30)	#1e293b	17:00:00	07:30:00	t	t	t	12	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
0c50c6e5-95be-4cf8-8c11-05e263927f51	A	Astreinte à domicile	Astreinte à domicile (7h - 7h)	#f59e0b	07:00:00	07:00:00	t	f	t	24	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
485c6458-290b-4802-8a95-871f9a646fcc	CA	Congé Annuel	Congé annuel	#8b5cf6	\N	\N	f	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
2f49c756-45ac-4b66-a28c-27437115b8e2	CM	Congé Maladie	Congé maladie	#ef4444	\N	\N	f	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
979e502c-36cc-4478-8e92-d580c356705d	F	Formation	Formation	#06b6d4	07:30:00	17:30:00	t	f	t	48	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
b87a196b-db0f-43aa-9293-492201864a14	H	Hors service	Hors service	#64748b	\N	\N	f	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
0f956718-cbbd-4a42-a563-07f27592f15f	ST	Service Technique	Service technique	#10b981	06:30:00	15:30:00	t	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
d697e264-11a7-4e15-b0e4-c0fda83b7dfe	JA	Journée Astreinte	Journée d'astreinte	#fb923c	07:00:00	07:00:00	t	f	t	24	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
5779b8d6-bac3-4296-9b4b-1226102bd7e7	RA	Repos après Astreinte	Repos après astreinte	#c084fc	\N	\N	f	f	f	\N	t	2025-11-24 10:00:03.751+00	2025-11-24 10:00:03.751+00
\.


--
-- Data for Name: template_fields; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.template_fields (id, template_id, field_name, label, type, options, "order", required, default_value, created_at, updated_at) FROM stdin;
1	9	noms_prenoms	Nom et Pr├®noms du demandeur	text	\N	10	t		2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
2	9	service	Service/D├®partement	text	\N	20	t		2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
3	9	date_debut	Date de d├®but	date	\N	30	t	\N	2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
4	9	date_fin	Date de fin	date	\N	40	t	\N	2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
5	9	motif	Motif de la demande	select	["Personnel","Cong├®s annuels","Maladie","Autre (├á sp├®cifier)"]	50	t	Personnel	2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
6	9	motif_exceptionnel	D├®tails (si Autre)	text	\N	60	f	\N	2025-11-15 14:07:39.108+00	2025-11-15 14:07:39.108+00
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.templates (id, name, slug, icon, description, created_at, updated_at) FROM stdin;
9	Demande de permission	DemandePermission	­ƒôä	Formulaire de demande de permission ou d'absence.	2025-11-15 14:07:39.101+00	2025-11-15 14:07:39.101+00
\.


--
-- Data for Name: ticket_history; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.ticket_history (id, ticket_id, action, queue_type, position_number, user_id, notes, created_at, updated_at) FROM stdin;
44280853-33e4-4e6a-8e14-81dadb688b25	6332b97f-9761-44a2-a57b-cb42c81d6a34	created	accueil_php	1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	2025-11-21 22:34:52.331+00	2025-11-21 22:34:52.331+00
59005186-bc94-4283-9cfb-bcd1c06f177a	6332b97f-9761-44a2-a57b-cb42c81d6a34	called	accueil_php	1	d029298c-2acc-4227-90e1-8eb402a98ec9	\N	2025-11-21 23:53:18.109+00	2025-11-21 23:53:18.109+00
eb0999b9-afe6-4259-96c6-cd20a51e3a76	6332b97f-9761-44a2-a57b-cb42c81d6a34	started	accueil_php	1	d029298c-2acc-4227-90e1-8eb402a98ec9	\N	2025-11-21 23:53:26.431+00	2025-11-21 23:53:26.431+00
5603cf95-24f0-4a7e-bbc8-4a0368722f4d	db0782ed-43ea-4ac6-8549-df9500604fd7	created	accueil_normal	1	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	2025-11-22 00:01:47.59+00	2025-11-22 00:01:47.59+00
b226b56a-14b4-4ded-9d1f-9db9650656ac	c26a7fd9-41b6-4642-94a4-a2da4182946a	created	accueil_normal	2	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	2025-11-22 00:01:53.619+00	2025-11-22 00:01:53.619+00
3b1bf6b9-e881-4c3e-b41a-b92743688837	7fb5269a-7871-4111-8ae8-a087e091c88d	created	accueil_normal	3	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	2025-11-22 00:02:11.445+00	2025-11-22 00:02:11.445+00
8a2b727f-b54c-4aed-ab96-faa47a70e8a1	db0782ed-43ea-4ac6-8549-df9500604fd7	called	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-22 00:04:13.721+00	2025-11-22 00:04:13.721+00
2ebf7074-434e-44b0-a62f-72824a62b8a2	db0782ed-43ea-4ac6-8549-df9500604fd7	started	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-22 00:04:19.81+00	2025-11-22 00:04:19.81+00
c83c2d36-6cac-4991-ac40-f0daaafa1fc3	db0782ed-43ea-4ac6-8549-df9500604fd7	cancelled	accueil_normal	\N	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	Annulé par l'agent	2025-11-22 00:04:34.405+00	2025-11-22 00:04:34.405+00
62d3433c-849e-49b5-91cd-08663fc9db47	dfcd60e0-c4b9-4f43-b826-a28b72d03886	created	accueil_php	2	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	2025-11-23 20:08:58.164+00	2025-11-23 20:08:58.164+00
624df26f-d6cb-4288-a460-2bdbc563c739	b3553802-24b8-4c2a-aee0-de3c262fce60	created	accueil_normal	4	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	2025-11-23 20:09:05.736+00	2025-11-23 20:09:05.736+00
3760ee12-3f93-4e12-9eda-c07cdf9bc336	c26a7fd9-41b6-4642-94a4-a2da4182946a	called	accueil_normal	2	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-23 20:10:13.267+00	2025-11-23 20:10:13.267+00
5a6b74b2-3b30-41b0-a4fa-bcb4cd0692a4	c26a7fd9-41b6-4642-94a4-a2da4182946a	started	accueil_normal	2	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-23 20:10:28.308+00	2025-11-23 20:10:28.308+00
8ddc0df5-d51a-4fd2-b726-d0dc18b82332	dfcd60e0-c4b9-4f43-b826-a28b72d03886	called	accueil_php	2	d029298c-2acc-4227-90e1-8eb402a98ec9	\N	2025-11-23 20:21:13.813+00	2025-11-23 20:21:13.813+00
fa96e103-2ffa-4df4-be44-baebf0d11639	dfcd60e0-c4b9-4f43-b826-a28b72d03886	started	accueil_php	2	d029298c-2acc-4227-90e1-8eb402a98ec9	\N	2025-11-23 20:21:30.387+00	2025-11-23 20:21:30.387+00
f7bbb467-1955-41dd-8ed8-bdfcf9a3fa26	7fb5269a-7871-4111-8ae8-a087e091c88d	called	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-23 20:54:10.582+00	2025-11-23 20:54:10.582+00
00b4bf69-ec5d-4003-bd86-7598221ef614	7fb5269a-7871-4111-8ae8-a087e091c88d	started	accueil_normal	1	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	\N	2025-11-23 20:54:24.273+00	2025-11-23 20:54:24.273+00
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.tickets (id, ticket_number, visit_type, patient_type, status, queue_type, position_number, patient_name, patient_phone, called_at, started_at, completed_at, created_by_user_id, assigned_to_user_id, assigned_position, notes, created_at, updated_at) FROM stdin;
6332b97f-9761-44a2-a57b-cb42c81d6a34	C-PHP-001	consultation	php	in_progress	accueil_php	1			2025-11-21 23:53:18.096+00	2025-11-21 23:53:26.428+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	d029298c-2acc-4227-90e1-8eb402a98ec9	1	\N	2025-11-21 22:34:52.323+00	2025-11-21 23:53:26.428+00
db0782ed-43ea-4ac6-8549-df9500604fd7	C-NOR-001	consultation	normal	cancelled	accueil_normal	1			2025-11-22 00:04:13.712+00	2025-11-22 00:04:19.809+00	\N	a33263ba-45df-4e6d-92bb-e30a6b8f254c	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	1	Annulé par l'agent	2025-11-22 00:01:47.583+00	2025-11-22 00:04:34.398+00
b3553802-24b8-4c2a-aee0-de3c262fce60	G-NOR-001	garde_malade	normal	waiting	accueil_normal	4			\N	\N	\N	a33263ba-45df-4e6d-92bb-e30a6b8f254c	\N	\N	\N	2025-11-23 20:09:05.731+00	2025-11-23 20:09:05.731+00
c26a7fd9-41b6-4642-94a4-a2da4182946a	C-NOR-002	consultation	normal	in_progress	accueil_normal	2			2025-11-23 20:10:13.26+00	2025-11-23 20:10:28.306+00	\N	a33263ba-45df-4e6d-92bb-e30a6b8f254c	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	2	\N	2025-11-22 00:01:53.615+00	2025-11-23 20:10:28.306+00
dfcd60e0-c4b9-4f43-b826-a28b72d03886	V-PHP-001	visite	php	in_progress	accueil_php	2			2025-11-23 20:21:13.804+00	2025-11-23 20:21:30.384+00	\N	a33263ba-45df-4e6d-92bb-e30a6b8f254c	d029298c-2acc-4227-90e1-8eb402a98ec9	2	\N	2025-11-23 20:08:58.159+00	2025-11-23 20:21:30.385+00
7fb5269a-7871-4111-8ae8-a087e091c88d	C-NOR-003	consultation	normal	in_progress	accueil_normal	3			2025-11-23 20:54:10.573+00	2025-11-23 20:54:24.268+00	\N	a33263ba-45df-4e6d-92bb-e30a6b8f254c	e4d0c8f8-ca9b-4347-9953-aab546cbcf64	1	\N	2025-11-22 00:02:11.441+00	2025-11-23 20:54:24.268+00
\.


--
-- Data for Name: trello_activity_logs; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_activity_logs (id, card_id, user_id, action_type, action_data, created_at) FROM stdin;
749c6a80-8998-4b6a-a6f7-7d255efca046	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_created	{"title": "Cablé le poste de Major Médécine"}	2025-12-01 08:21:11.182+00
f03f5b5a-d06f-40a3-ac06-a7d0218bfc21	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-01 08:21:13.515+00
38f8b061-2a83-42f3-9710-e8eb4c074821	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "006c981a-4c56-431e-818a-f8e295dd863b", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 08:21:14.978+00
47259b3d-d278-4db8-9f7d-e34e0567fd4f	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-01 08:21:41.627+00
4130754e-6f74-4983-8f4a-05208194f5d9	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 08:21:42.77+00
6e119b62-d91e-4ada-828f-cd366c15d9fe	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57", "fromList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5"}	2025-12-01 08:21:43.802+00
758f94b9-1328-47d9-85a6-27cd4bc57fb9	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5", "fromList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57"}	2025-12-01 08:21:46.443+00
75bedfbe-2f84-4b38-a6dd-c7d566607ec0	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5"}	2025-12-01 08:21:47.399+00
1b1d36d6-3770-4806-aa3b-fcd545ca820f	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "006c981a-4c56-431e-818a-f8e295dd863b", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 08:21:48.648+00
fe29abf6-cee5-4bff-b565-d56d1f498bca	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-01 09:16:11.434+00
b50fcfbd-f092-4802-b8be-3db568ea8f8f	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "006c981a-4c56-431e-818a-f8e295dd863b", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 09:16:12.754+00
e78d2c1d-7ba7-4b6a-a20f-33ce4fc888aa	1013e1b9-6234-442a-9680-fa53c1b2fd50	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_created	{"title": "Cablé le poste de Major Médécine"}	2025-12-01 12:27:14.972+00
83f61737-8fd8-48f7-931e-a7172b2b07b3	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-01 15:31:59.007+00
447263ce-5e14-4ed5-961d-24ed2a7e3a5f	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 15:32:01.262+00
51893520-9a89-47b6-970e-720fdc154d2a	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57", "fromList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5"}	2025-12-01 15:32:03.282+00
5dfd460d-9273-4c67-ac1f-a1fcfed30fb9	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57"}	2025-12-01 15:32:04.896+00
3b6e3003-9064-4cc9-848b-ea1a021abcd0	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "006c981a-4c56-431e-818a-f8e295dd863b", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-01 15:32:06.802+00
b3c53ebd-68fe-4790-8308-b9766992fe32	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-02 10:33:44.04+00
04b21523-decc-4f17-ad50-604f72a793c4	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-02 10:33:44.998+00
869b73e1-d74e-49a2-b14a-18c1e326a81c	412ef549-e262-4001-bc0a-f4fa1ecb41e1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "5a61166f-944f-4a52-a2e8-94af7f2a11e5", "fromList": "6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57"}	2025-12-04 15:43:39.636+00
3d5ef534-431e-4c6a-a232-92ad40e450c5	ee9b501d-d92f-4f73-98ee-80cf6e99e7bc	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_created	{"title": "yo"}	2025-12-05 13:10:52+00
e5a00b9c-8f93-4a4a-9c37-c10172e43849	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "dceb90af-3bda-4945-93a7-3c0464091df6", "fromList": "006c981a-4c56-431e-818a-f8e295dd863b"}	2025-12-05 13:44:10.835+00
d3db70d4-ea99-46fe-96ed-c89fb8f9d065	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_moved	{"toList": "006c981a-4c56-431e-818a-f8e295dd863b", "fromList": "dceb90af-3bda-4945-93a7-3c0464091df6"}	2025-12-05 13:44:12.659+00
08f3958e-7202-4973-8487-57503a6a0029	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	card_created	{"title": "bn"}	2025-12-07 06:02:42.043+00
\.


--
-- Data for Name: trello_attachments; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_attachments (id, card_id, uploaded_by, file_name, file_path, file_type, file_size, attachment_type, created_at, updated_at) FROM stdin;
f8c2c5aa-18d5-44f6-aca1-2759a4158613	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	Document Colette 2.pdf	/app/uploads/Document_Colette_2_1764589524134-383974574.pdf	application/pdf	936073	other	2025-12-01 11:45:24.147+00	2025-12-01 11:45:24.147+00
\.


--
-- Data for Name: trello_boards; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_boards (id, name, service_type, description, is_active, settings, created_at, updated_at) FROM stdin;
3f08ea06-e140-4425-835e-d4b0dc2a7ca5	Moyens Généraux	MG	Gestion des tâches de maintenance générale (plomberie, électricité, bâtiment)	t	{"default_labels": ["Électricité", "Plomberie", "Bâtiment", "Climatisation", "Urgent"]}	2025-12-01 06:33:53.821+00	2025-12-01 06:33:53.821+00
69f164c4-e2ab-4605-9e7b-cdd7886e4265	Biomédical	Biomedical	Gestion de la maintenance des équipements médicaux	t	{"default_labels": ["Réparation", "Maintenance préventive", "Calibration", "Pièces", "Urgent"]}	2025-12-01 06:33:53.821+00	2025-12-01 06:33:53.821+00
f49cfc63-90cc-4961-91f8-61a467b2990a	Informatique	Informatique	Gestion des interventions informatiques et réseau	t	{"default_labels": ["Matériel", "Logiciel", "Réseau", "Assistance", "Urgent"]}	2025-12-01 06:33:53.821+00	2025-12-01 06:33:53.821+00
\.


--
-- Data for Name: trello_cards; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_cards (id, list_id, title, description, "position", priority, due_date, assigned_to, created_by, linked_work_request_id, status, labels, estimated_hours, actual_hours, location, equipment, parts_used, completed_at, is_archived, created_at, updated_at, date_history, dates, checklists) FROM stdin;
6f097c62-9c8b-4a10-8672-7d41ab113527	7b6a935f-685b-4481-a8a6-75716f6f9942	Demande de travaux - Gyn├®cologie	\n                **Importé depuis l'historique**\n                Demandeur: Franck YANKEU\n                Service: Gyn├®cologie\n                Motif: H├®mato\n              	65535	medium	2025-11-10 15:04:50.659+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	85f2f2ec-3245-4e79-a03e-b361e1ba1386	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 09:15:44.349+00	2025-12-01 09:15:44.349+00	[]	\N	\N
1013e1b9-6234-442a-9680-fa53c1b2fd50	e67422fe-d62e-4de9-a6bd-936fb9867684	Cablé le poste de Major Médécine	Tâche créée manuellement	1000	medium	\N	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 12:27:14.962+00	2025-12-01 12:27:14.962+00	[]	\N	\N
d8da39ee-59e0-4333-8e14-cbbc5feb7e2b	7b6a935f-685b-4481-a8a6-75716f6f9942	Demande de travaux - Chirurgie	\n                **Importé depuis l'historique**\n                Demandeur: Franck YANKEU\n                Service: Chirurgie\n                Motif: test\n              	65535	medium	2025-12-01 14:14:54.307+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	01d798c4-b20c-49ea-8a35-8c7009c893be	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 14:29:48.377+00	2025-12-01 14:29:48.377+00	[]	\N	\N
48b37213-f705-4e6b-9248-33eb42189956	006c981a-4c56-431e-818a-f8e295dd863b	Demande de travaux - Chirurgie	\n                **Importé depuis l'historique**\n                Demandeur: Franck YANKEU\n                Service: Chirurgie\n                Motif: new workflow\n              	65535	medium	2025-12-01 14:29:42.137+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 14:29:48.391+00	2025-12-01 14:29:48.391+00	[]	\N	\N
5ce24553-6b13-48d1-9c9d-9249cf28bad1	006c981a-4c56-431e-818a-f8e295dd863b	Demande de travaux - Chirurgie	\n                **Importé depuis l'historique**\n                Demandeur: Franck YANKEU\n                Service: Chirurgie\n                Motif: new workflow\n              	65535	medium	2025-12-01 14:46:25.795+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	ce1c03e6-893f-446d-b474-6b2606408a51	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 15:31:32.057+00	2025-12-01 15:31:32.057+00	[]	\N	\N
412ef549-e262-4001-bc0a-f4fa1ecb41e1	5a61166f-944f-4a52-a2e8-94af7f2a11e5	Cablé le poste de Major Médécine	\N	500	medium	\N	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 08:21:11.169+00	2025-12-04 15:43:39.625+00	[]	\N	\N
ee9b501d-d92f-4f73-98ee-80cf6e99e7bc	6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57	yo		1000	medium	\N	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-05 13:10:51.991+00	2025-12-05 13:10:51.991+00	[]	\N	\N
920c33b8-709d-4b00-b2f1-f5351bdd78e5	006c981a-4c56-431e-818a-f8e295dd863b	Demande de travaux - Chirurgie	\n                **Importé depuis l'historique**\n                Demandeur: Franck YANKEU\n                Service: Chirurgie\n                Motif: test\n              	500	medium	2025-12-04 00:00:00+00	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	d4a55e6a-86e2-46f8-ae32-2187907f34b7	todo	[]	\N	\N	\N	\N	[]	\N	f	2025-12-01 09:15:44.369+00	2025-12-05 13:44:12.655+00	[{"previousDate":"2025-12-01T08:33:55.631Z","changedAt":"2025-12-02T10:33:28.270Z","changedBy":"dfe693f7-c4e8-4ca6-aa91-fa972253ef18"}]	\N	\N
bc89d82d-277e-46f6-9a75-d27515bce433	5a61166f-944f-4a52-a2e8-94af7f2a11e5	Test		1500	medium	\N	\N	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	\N	todo	["Vert", "{\\"color\\":\\"bg-green-500\\",\\"name\\":\\"Vert\\",\\"hex\\":\\"#61BD4F\\"}"]	\N	\N	\N	\N	[]	\N	f	2025-12-07 06:02:42.033+00	2025-12-09 09:53:22.747+00	[]	{"dueDate": "03/12/2025", "dueTime": "", "reminder": "none", "startDate": "", "recurrence": "never"}	[]
\.


--
-- Data for Name: trello_comments; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_comments (id, card_id, user_id, content, is_edited, created_at, updated_at) FROM stdin;
365a3f99-09e4-4fcc-9fd1-8d167bc765b1	920c33b8-709d-4b00-b2f1-f5351bdd78e5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	YES	f	2025-12-01 09:23:03.559+00	2025-12-01 09:23:03.559+00
f51b5cc6-eb60-4d30-986a-890d36c8bd17	920c33b8-709d-4b00-b2f1-f5351bdd78e5	c4311098-40f2-4289-af7b-76e503b220c5	ok	f	2025-12-01 12:06:16.427+00	2025-12-01 12:06:16.427+00
35567a4b-c577-4fad-8867-1846ba0d7acc	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 10:51:42.243+00	2025-12-09 10:51:42.243+00
69541169-9261-4665-8cac-aa10e1edfb30	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yoo	f	2025-12-09 10:51:48.992+00	2025-12-09 10:51:48.992+00
d2d3e7dc-8780-4af0-bcef-8beb5141d536	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 10:52:01.905+00	2025-12-09 10:52:01.905+00
bc2d8718-7872-4c23-8bd6-e53cd3021cbf	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 10:53:54.097+00	2025-12-09 10:53:54.097+00
be56e361-d220-48ae-86fe-2df3c4ac0a0f	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 11:00:17.225+00	2025-12-09 11:00:17.225+00
428e14b2-abe1-40d9-92ca-440a9058012f	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 11:02:44.769+00	2025-12-09 11:02:44.769+00
f89194b8-e255-492d-af9c-404becab311e	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 11:03:13.069+00	2025-12-09 11:03:13.069+00
e1a7dbec-7926-4ef7-812a-6f7d563982de	bc89d82d-277e-46f6-9a75-d27515bce433	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	yo	f	2025-12-09 11:03:34.644+00	2025-12-09 11:03:34.644+00
\.


--
-- Data for Name: trello_lists; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.trello_lists (id, board_id, name, "position", color, is_archived, created_at, updated_at) FROM stdin;
006c981a-4c56-431e-818a-f8e295dd863b	3f08ea06-e140-4425-835e-d4b0dc2a7ca5	📝 À faire	0	#E8E8E8	f	2025-12-01 06:33:53.832+00	2025-12-01 06:33:53.832+00
dceb90af-3bda-4945-93a7-3c0464091df6	3f08ea06-e140-4425-835e-d4b0dc2a7ca5	🚧 En cours	1	#FEF3C7	f	2025-12-01 06:33:53.836+00	2025-12-01 06:33:53.836+00
5a61166f-944f-4a52-a2e8-94af7f2a11e5	3f08ea06-e140-4425-835e-d4b0dc2a7ca5	⏸️ Bloqué	2	#FEE2E2	f	2025-12-01 06:33:53.838+00	2025-12-01 06:33:53.838+00
6ba16ae4-ea24-47ee-ac75-4cbf3a1d9a57	3f08ea06-e140-4425-835e-d4b0dc2a7ca5	✅ Terminé	3	#D1FAE5	f	2025-12-01 06:33:53.84+00	2025-12-01 06:33:53.84+00
7b6a935f-685b-4481-a8a6-75716f6f9942	69f164c4-e2ab-4605-9e7b-cdd7886e4265	📝 À faire	0	#E8E8E8	f	2025-12-01 06:33:53.841+00	2025-12-01 06:33:53.841+00
82fbd61e-473c-45e7-acae-d25cd965c34a	69f164c4-e2ab-4605-9e7b-cdd7886e4265	🚧 En cours	1	#FEF3C7	f	2025-12-01 06:33:53.843+00	2025-12-01 06:33:53.843+00
5fd8ffab-0514-488d-ae77-17aaf1965068	69f164c4-e2ab-4605-9e7b-cdd7886e4265	⏸️ Bloqué	2	#FEE2E2	f	2025-12-01 06:33:53.845+00	2025-12-01 06:33:53.845+00
d8ee0e67-20ce-419a-983c-c7c5866f6cd4	69f164c4-e2ab-4605-9e7b-cdd7886e4265	✅ Terminé	3	#D1FAE5	f	2025-12-01 06:33:53.847+00	2025-12-01 06:33:53.847+00
e67422fe-d62e-4de9-a6bd-936fb9867684	f49cfc63-90cc-4961-91f8-61a467b2990a	📝 À faire	0	#E8E8E8	f	2025-12-01 06:33:53.848+00	2025-12-01 06:33:53.848+00
cb4285a4-f7b4-4ad9-8b58-4b30285383a8	f49cfc63-90cc-4961-91f8-61a467b2990a	🚧 En cours	1	#FEF3C7	f	2025-12-01 06:33:53.85+00	2025-12-01 06:33:53.85+00
926155d9-71be-45ba-a023-d2ee1a0e0bbb	f49cfc63-90cc-4961-91f8-61a467b2990a	⏸️ Bloqué	2	#FEE2E2	f	2025-12-01 06:33:53.851+00	2025-12-01 06:33:53.851+00
9078e309-f383-42f9-b999-66ad720697e8	f49cfc63-90cc-4961-91f8-61a467b2990a	✅ Terminé	3	#D1FAE5	f	2025-12-01 06:33:53.853+00	2025-12-01 06:33:53.853+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.users (id, email, password, first_name, last_name, username, role, signature_path, stamp_path, is_active, last_login, created_at, updated_at, "position") FROM stdin;
4c9fe9b5-28cd-462b-902e-8fdd44565c4b	hsjm.majorneonat@gmail.com	$2a$10$4z.Zw9ol3quSSovYb/JzhObzZDTo2486c3tYnoJg/9s33WjEtXEMa	Sanddrine	DIBOUSSI	S-DIBOUSSI	validator	\N	\N	t	\N	2025-10-27 07:34:09.65+00	2025-10-27 07:34:09.65+00	\N
4cd73a0f-2f00-4bff-89a6-3c6c169cb4a1	hsjm.majorpmi@gmail.com	$2a$10$42mjO.1QyXKoaa0PQN7etu3xVSOyjpsOYipdo3rtSPxhg5xUdJ6fe	Hippolyte	TIWANG	H-TIWANG	validator	\N	\N	t	\N	2025-10-27 07:34:54.935+00	2025-10-27 07:34:54.935+00	\N
309fb732-2438-4287-8831-1ff0b4bac511	hsjm.majorgyneco@gmail.com	$2a$10$Ks2n1m5oUa0sEJ453uZXteGcCN2MWkPS0pMVmPXTeTCWN6x8MPnRq	Jacqueline	ABANGMO	J-ABANGMO	validator	\N	\N	t	2025-11-04 15:53:06.469+00	2025-10-27 07:24:12.618+00	2025-11-04 15:53:06.47+00	\N
edec9222-faa9-4923-ae22-f74155da20a5	hsjm.majorchir@gmail.com	$2a$10$rEln5OGahWcUQE5rMlqkyOT0Zhs6q8yjEpemryYxYXlKfZRFOs5tC	Alfred	MGBATOU	A-MGBATOU	validator	\N	\N	t	2025-11-10 10:04:46.943+00	2025-10-27 07:23:12.851+00	2025-11-10 10:04:46.943+00	\N
cd0e7e19-af74-43cb-9755-5c0df1eb63a0	hsjm.anesthesie@gmail.com	$2a$10$c9iCkiyRykSXEEMGsaVXl.qcB4yObGrrKyhWaV5oXjgO7lYJ6WwVG	Emmanuel	NJIWOUO	E-NJIWOUO	validator	\N	\N	t	\N	2025-10-27 07:10:40.453+00	2025-10-27 07:10:40.453+00	\N
ace05480-f395-4193-91e0-fb94c5bd253c	hsjm.gyneco2@gmail.com	$2a$10$gDEjuTpAVicrS1rbgwWBHudNyag2ZddCW71iN3KfLm0UZRhQZ7PXm	Marius	MBOUOPDA	M-MBOUOPDA	validator	\N	\N	t	\N	2025-10-27 07:13:22.304+00	2025-10-27 07:13:22.304+00	\N
c09402cc-989e-4216-92e7-b7326334c441	hsjm.labo@gmail.com	$2a$10$hkHaOfGR9UtSIVVljfZfvu9hJMfl5EPebS/e2JmJwH0t/BeIiGJcK	Paulin	ATEFACK	P-ATEFACK	validator	\N	\N	t	\N	2025-10-27 07:14:42.03+00	2025-10-27 07:14:42.03+00	\N
21f453f0-68e9-47a1-aa5c-8599d17617a6	hsjm.pediatrie@gmail.com	$2a$10$REijjyjsSA9ifOfAZ76vHuFqpGA1JYHecaKYF9eVJnwZz6Y5CDiNe	Rodrigue	DJEUMENE	R-DJEUMENE	validator	\N	\N	t	\N	2025-10-27 07:20:14.777+00	2025-10-27 07:20:14.777+00	\N
cc3e3cb6-f96c-443b-b7dc-4113a270f6e6	hsjm.majorkine@gmail.com	$2a$10$JQcOOioYHvZT.nySOWfqGO3UeW3qde/29oIAPHLnEAl/61y7AmlyG	Jean	BESSA	J-BESSA	validator	\N	\N	t	\N	2025-10-27 07:25:14.796+00	2025-10-27 07:25:14.796+00	\N
dfff8397-33ca-4147-96e7-2a50e263f70d	hsjm.majorlabo@gmail.com	$2a$10$xuuL.OyiuWNBSahgAf2AZuArGJS/td6Y0k2q3V14R.vrC.A9tivB.	Olivier	METHO'O	O-METHO'O	validator	\N	\N	t	\N	2025-10-27 07:26:13.862+00	2025-10-27 07:26:13.862+00	\N
9f1781b5-e287-4e45-9f3f-0cc5da40ddd2	hsjm.majorpedia@gmail.com	$2a$10$S9K8mZvbIMx7Kk5qobsSnenDO4EeaSJDQvMhvYODXp7tAA7xN6Q92	Victoire	EYANGO	V-EYANGO	validator	\N	\N	t	\N	2025-10-27 07:31:21.918+00	2025-10-27 07:31:21.918+00	\N
edb48aba-b6e1-4339-a8a4-0da926a0563c	hsjm.assistantededirection@gmail.com	$2a$10$9RMejCkhtH9ZAm3qVMyvcemX4GHR.ZvyeLmbck9yJZKyRNhtT3cQ6	Kellie	ESSOMBA	K-ESSOMBA	user	\N	\N	t	2025-10-27 10:28:37.137+00	2025-10-27 10:28:19.352+00	2025-10-27 10:28:37.137+00	\N
c36f077d-3148-496b-8d0c-fc4c5e433111	hsjm.celluleinformatique2@gmail.com	$2a$10$m7qLZeIL8w6skaYOfqDR4exCUfnxcKri9eJInKMbEFI3en81TNpp6	Franck	SIMENI	F-SIMENI	admin	\N	\N	t	2025-11-10 10:38:03.866+00	2025-10-27 08:58:51.463+00	2025-11-10 10:38:03.866+00	\N
44e84f32-5e3f-4c5b-8111-a51270fbc79d	hsjm.serviceurgence@gmail.com	$2a$10$6NNd57n0fiM9AVlBev64SezqQioRkTXhtJnVjdDvxsYm2YznFt5te	Service	URGENCE	S-URGENCE	user	\N	\N	t	2025-11-06 08:09:16.992+00	2025-11-06 07:59:02.981+00	2025-11-06 08:09:16.993+00	\N
06bb965d-f1e8-4fb1-8a44-2179bf519837	hsjm.urgences@gmail.com	$2a$10$AsQRz2Yz/lAdmn4ZakyNFODbcc/sY7upMFzA/QAB213YGEPWLwfeK	Gilbert	AKWA	G-AKWA	validator	uploads/signatures/06bb965d-f1e8-4fb1-8a44-2179bf519837-signature-1762421891143-398760932.png	uploads/signatures/06bb965d-f1e8-4fb1-8a44-2179bf519837-stamp-1762421841291-762014648.png	t	2025-11-07 14:45:20.994+00	2025-10-27 07:21:00.537+00	2025-11-07 14:45:20.994+00	\N
4830d5f7-9ebb-4640-8f07-91b8c710e254	hsjm.secdir@gmail.com	$2a$10$szojbG60XOBJ6dZbNvseNOxe.aP.tq62r8GyVwsS4sc0wuQ9i7Cm6	Elise	NYEMB	E-NYEMB	user	\N	\N	t	2025-11-07 14:29:44.84+00	2025-10-27 08:55:19.216+00	2025-11-07 14:29:44.84+00	\N
e434543a-68bf-4052-bcd8-f0c127d6d3cf	hsjm.majormed@gmail.com	$2a$10$MntsaKCeP78t9kv3IHYtuO/glJ6NDFa/VsOjh8TglPY5jo0QLVPcS	Julie	NYADA	J-NYADA	validator	uploads/signatures/e434543a-68bf-4052-bcd8-f0c127d6d3cf-signature-1762526832411-373573870.png	uploads/signatures/e434543a-68bf-4052-bcd8-f0c127d6d3cf-stamp-1762526845138-529992375.png	t	\N	2025-10-27 07:27:10.356+00	2025-11-07 14:47:25.148+00	\N
c6bf9eaa-73cc-4f01-ac3c-770764928554	hsjm.majorsau@gmail.com	$2a$10$IhfzBh6l4ifOomk.OUkcBeFGOq.he3N3vzhWidOhJ/BCfqBhZIC0e	Elisabeth	MPONGO	E-MPONGO	validator	uploads/signatures/c6bf9eaa-73cc-4f01-ac3c-770764928554-signature-1762421858226-67982753.png	uploads/signatures/c6bf9eaa-73cc-4f01-ac3c-770764928554-stamp-1762421876845-324462355.png	t	2025-11-10 12:13:01.086+00	2025-10-27 07:33:09.531+00	2025-11-10 12:13:01.087+00	\N
ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	hsjm.gyneco@gmail.com	$2a$10$TQ8yQI98XWTbi3h7k3buZeri6GksKl5TZfi.QIvDhghbtTuRPFply	Collince	TCHAKOUNTE	C-TCHAKOUNTE	director	uploads/signatures/ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc-signature-1762787148171-822572158.png	uploads/signatures/ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc-stamp-1762787157838-514861.png	t	2025-11-10 15:09:25.494+00	2025-10-27 07:08:51.411+00	2025-11-10 15:09:25.495+00	\N
744d93f7-af0d-481d-9a97-39cbcbd05d68	raoulwouapi2017@yahoo.com	$2a$10$Okzj0v8oEKwJCSCLx2OFS.oQqsmYf3OgzwXIZhZHrcSw0j46FQIj.	Raoul	WOUAPI	R-WOUAPI	validator	uploads/signatures/744d93f7-af0d-481d-9a97-39cbcbd05d68-signature-1762423351383-450048721.png	uploads/signatures/744d93f7-af0d-481d-9a97-39cbcbd05d68-stamp-1762423341755-95109148.png	t	2025-11-13 10:14:21.695+00	2025-10-27 08:57:17.603+00	2025-11-13 10:14:21.695+00	\N
42a9ef34-81e7-48e1-bc50-c6ff3ab4817a	hsjm.majoranesth@gmail.com	$2a$10$uSanWQ6eWhFaczXcVp1b2ePFShudBkvlKAcpel3/DO9hq.M6wElda	Eric	Tiati	E-TIATI	validator	\N	\N	t	2025-11-10 11:32:11.745+00	2025-11-10 09:30:55.471+00	2025-11-10 11:32:11.746+00	\N
d01488ba-2895-4b4b-ae41-4530641d1281	hsjm.majorbloc@gmail.com	$2a$10$cxeplFXetrBzIPs/1GjguuD/2mkmswTPWeMMLdT0yOnPm8sCSzRYG	Blériot	NDONGOUA	B-NDONGOUA	validator	\N	\N	t	\N	2025-10-27 07:22:16.501+00	2025-11-21 22:35:34.817+00	\N
9ec0cdcc-6e31-46d2-a0e3-c67978bde002	hsjm.controledegestion2@gmail.com	$2a$10$wSVepYOJn1mAJa74h2HvAesyKpvuuTk2QMjjIzkQIWXNShqB5uSRS	Contrôle	GESTION	C-GESTION	user	\N	\N	t	\N	2025-10-27 09:02:11.997+00	2025-11-21 22:35:59.531+00	\N
25fb2445-64e2-4784-b8cf-14bddd08aae2	hsjm.majorpharma@gmail.com	$2a$10$PMQc3N9Tp4z.KpcllaDJWexe9FZFOZlEyP61EBxes5zeLrmmZ32zy	Joséphine	MINKEU	F-MINKEU	validator	\N	\N	t	2025-11-05 14:40:23.539+00	2025-10-27 07:32:19.852+00	2025-11-21 22:36:14.556+00	\N
8e6b3ff3-f190-4900-8f14-55f81023879e	hsjm.medecine@gmail.com	$2a$10$ujx5B.xJn206jYlQVECzpOl1uf5ceyTnK48PG.sLHsUYkvirdWXmu	François	NDOUMBE	F-NDOUMBE	validator	\N	\N	t	2025-11-10 06:52:36.349+00	2025-10-27 07:15:50.562+00	2025-11-21 22:36:29.041+00	\N
701c20bb-3007-45c1-8a3c-b682d49e8842	hsjm.cellulebiomedicale@gmail.com	$2a$10$BETq4JIAxsGsPM5qSqNRM.81gIbbi.QQSqw.HDPu3JLq/6GUAcUGu	CELLULE	BIOMEDICALE	C-BIOMEDICALE	validator	uploads/signatures/701c20bb-3007-45c1-8a3c-b682d49e8842-signature-1764599088062-517015318.png	uploads/signatures/701c20bb-3007-45c1-8a3c-b682d49e8842-stamp-1764599097273-311060163.png	t	2025-12-02 13:12:50.252+00	2025-10-31 09:37:03.646+00	2025-12-02 13:12:50.253+00	\N
711dc16a-364b-4b46-b581-7697b32125de	hsjm.achat@gmail.com	$2a$10$T0hJnVzhtF.h2sCWrLdCWOVZ8Bvi64/VHHbpt67S6Yjwh4Kx7osGC	Pernod	NGOUMKWA	P-NGOUMKWA	validator	uploads/signatures/711dc16a-364b-4b46-b581-7697b32125de-signature-1764599722326-209768248.png	uploads/signatures/711dc16a-364b-4b46-b581-7697b32125de-stamp-1764599732156-297438236.png	t	2025-12-01 14:47:48.925+00	2025-11-07 08:24:55.522+00	2025-12-01 14:47:48.926+00	\N
c4311098-40f2-4289-af7b-76e503b220c5	hsjm.moyengeneraux@gmail.com	$2a$10$4UDK/P2DGYmFt5NuSDz4U.PCAeXY5QHsVDwWqbtYaY3Pf6HXtKRb.	Samuel	ESSOMBE	S-ESSOMBE	validator	uploads/signatures/c4311098-40f2-4289-af7b-76e503b220c5-signature-1764600533401-702365877.png	uploads/signatures/c4311098-40f2-4289-af7b-76e503b220c5-stamp-1764600546289-189626612.png	t	2026-01-06 11:12:59.114+00	2025-11-07 08:10:10.47+00	2026-01-06 11:12:59.115+00	\N
259a277b-f549-4459-a876-578fadeb957c	hsjm.pharma@gmail.com	$2a$10$IZrqN4jfbXNR3XfZCXdTkO3aB9olgkKnGQdNRrpi7UFpZI28X5QEC	Crescence	METOMO	C-METOMO	director	uploads/signatures/259a277b-f549-4459-a876-578fadeb957c-signature-1764599235678-675502348.png	uploads/signatures/259a277b-f549-4459-a876-578fadeb957c-stamp-1764599249753-508386777.png	t	2025-12-01 14:48:00.015+00	2025-10-27 07:05:22.778+00	2025-12-01 14:48:00.015+00	\N
1f36f978-8531-4312-9ed0-e32a6388a5e4	hsjm.rh@gmail.com	$2a$10$7QewS6I2N02jWWFJO927L.MgesY0nbOG04CdkBMtBHCJp69MN2MU6	Elvis	BIKEK	E-BIKEK	validator	uploads/signatures/1f36f978-8531-4312-9ed0-e32a6388a5e4-signature-1765809858980-218799314.png	uploads/signatures/1f36f978-8531-4312-9ed0-e32a6388a5e4-stamp-1765809874510-941018999.png	t	2025-12-15 14:44:59.622+00	2025-10-27 07:02:31.136+00	2025-12-15 14:44:59.622+00	\N
e60d65d2-ba00-4ffd-a4fe-496dce9dd667	hsjm.survge@gmail.com	$2a$10$NpxO91dqYDbSp.qBuvPZbu0uBY3PVtxzus2SWEG72FLVs8vxuJ3jC	Bertha	EOCK	B-EOCK	director	uploads/signatures/e60d65d2-ba00-4ffd-a4fe-496dce9dd667-signature-1762783803821-242997309.png	uploads/signatures/e60d65d2-ba00-4ffd-a4fe-496dce9dd667-stamp-1762783812691-443057352.png	t	2025-11-10 14:10:26.044+00	2025-10-27 07:08:08.133+00	2025-11-10 14:10:26.044+00	\N
d029298c-2acc-4227-90e1-8eb402a98ec9	accueil.php@hopital.com	$2a$10$F8RcnQ3ubUM/s7477sz66uK7fjEoG8dSdo6zu2rqwtvNfQLtfTw5K	Accueil	PHP	CAF_AccueilPHP	agent_accueil_php	\N	\N	t	2025-11-23 20:40:29.194+00	2025-11-21 23:52:38.318+00	2025-11-23 20:40:29.195+00	\N
e4d0c8f8-ca9b-4347-9953-aab546cbcf64	acceuil@gmail.com	$2a$10$le3NSur9q1x6C6tryQUUmev2hfeZ2Iw4jtx29XcuQ7bu1KycFtypW	Accueil1	HSJM	CAF_Accueil1	agent_accueil_normal	\N	\N	t	2025-11-23 20:53:11.042+00	2025-11-22 00:03:44.819+00	2025-11-23 20:53:11.043+00	\N
9b830fef-fa07-4e26-9a27-20de41685acb	hsjm.directeurdusoutien@gmail.com	$2a$10$/Upx5Wy3BJfI1TAZHsWwfu8tGmkMhV0hNZk/clv2LDHvhpfjF5L8i	Brillon	FONGUAING	B-FONGUAING	director	uploads/signatures/9b830fef-fa07-4e26-9a27-20de41685acb-signature-1764600594242-183568439.png	uploads/signatures/9b830fef-fa07-4e26-9a27-20de41685acb-stamp-1764600608071-999207244.png	t	2025-12-15 14:45:35.439+00	2025-10-27 07:06:40.571+00	2025-12-15 14:45:35.439+00	\N
dfe693f7-c4e8-4ca6-aa91-fa972253ef18	aureleyankeu@gmail.com	$2a$10$NBK1T9QfEVazWn4cumCsIOQJpkESqCAAWB9FiDl7G8e6W5touI.3y	Franck	YANKEU	F-YANKEU	admin	uploads/signatures/dfe693f7-c4e8-4ca6-aa91-fa972253ef18-signature-1763732340000-619292241.png	uploads/signatures/dfe693f7-c4e8-4ca6-aa91-fa972253ef18-stamp-1763732351656-579728136.png	t	2026-01-15 19:54:37.039+00	2025-10-27 06:47:11.899+00	2026-01-15 19:54:37.04+00	\N
10ef834f-0663-4b0c-9643-6f700324ec8b	hsjm.chirurgie@gmail.com	$2a$10$6SMWqjz7U92ssIfBLVSF7.nsv8RJIYgu.Zolilq1XdigZ0w1HlhBi	Thierry	YAOUBA	T-YAOUBA	validator	uploads/signatures/10ef834f-0663-4b0c-9643-6f700324ec8b-signature-1764598581916-269660914.png	uploads/signatures/10ef834f-0663-4b0c-9643-6f700324ec8b-stamp-1764598595546-687716755.png	t	2025-12-16 09:35:16.219+00	2025-10-27 07:12:10.639+00	2025-12-16 09:35:16.22+00	\N
22d5fb1c-a078-4da0-9856-0644e5489e67	caisse@hopital.com	$2a$10$e1u7kd.KDqJEE3Dqvq.o/eAaEq0w8tdKJZ/IOagyMRyEh3Qu9lym6	Caisse	HSJM	CAF_Caisse	caissier	\N	\N	t	2025-11-22 00:05:15.926+00	2025-11-22 00:00:41.289+00	2025-11-22 00:05:15.926+00	\N
2cf652e6-017d-494a-8a04-07226d5c21da	hsjm.econome@gmail.com	$2a$10$mEIjq3mevQDf.Zd/Bd7UDO83kV6XbKHfhjc4gqWvOTA8VAyT0Roji	Achille	EWELLE	A-EWELLE	validator	uploads/signatures/2cf652e6-017d-494a-8a04-07226d5c21da-signature-1764599695993-84736706.png	uploads/signatures/2cf652e6-017d-494a-8a04-07226d5c21da-stamp-1764599703705-728697727.png	t	2025-12-01 14:47:31.076+00	2025-10-27 08:58:00.698+00	2025-12-01 14:47:31.077+00	\N
a33263ba-45df-4e6d-92bb-e30a6b8f254c	hsjm.gardien@gmail.com	$2a$10$Sa7Uz6mVWqT0VslEabZ2Y.X5TAvxQTjuUPN86NtvNj3Jnd7BHbB9.	Gardien	HSJM	G-HSJM	gardien	\N	\N	t	2025-11-23 20:08:01.566+00	2025-11-21 23:20:29.364+00	2025-11-23 20:08:01.568+00	\N
c3a95b48-fac5-43f6-b58c-23566a08f5b8	hopitalcameroun@ordredemaltefrance.org	$2a$10$LP9OqBOnW3EBaasi.nh4fuHB9B4DI2d91RUIQIpRkMp4O99klVwJO	Michel	VAUTROT	M-VAUTROT	director	uploads/signatures/c3a95b48-fac5-43f6-b58c-23566a08f5b8-signature-1763734334291-135090145.png	uploads/signatures/c3a95b48-fac5-43f6-b58c-23566a08f5b8-stamp-1763734347392-664532125.png	t	2025-12-15 14:39:55.069+00	2025-10-27 07:04:43.276+00	2025-12-15 14:39:55.07+00	\N
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: ged_user
--

COPY public.workflows (id, document_id, validator_id, step, status, comment, validated_at, created_at, updated_at, assigned_at) FROM stdin;
4d8eab31-6ded-4c33-b4c5-e1f4c8112a8d	bd1a3906-3d65-4dba-9f07-a782e9bcedd0	c3a95b48-fac5-43f6-b58c-23566a08f5b8	2	approved		2025-11-07 10:23:29.831+00	2025-11-07 08:37:31.193+00	2025-11-07 10:23:29.831+00	2025-11-07 08:37:47.91+00
9d846bb4-38ee-45b8-9cb2-458faeafab38	736315d3-55c0-4612-afba-0ff32649d27c	c3a95b48-fac5-43f6-b58c-23566a08f5b8	2	approved		2025-11-07 10:24:52.528+00	2025-11-06 10:21:28.643+00	2025-11-07 10:24:52.529+00	\N
c55e6af6-fdae-4ffe-8f31-6528fc180da3	095209a4-5d60-4ca4-b6ec-7388a3305f50	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved		2025-11-07 10:59:25.638+00	2025-11-07 10:55:47.478+00	2025-11-07 10:59:25.638+00	2025-11-07 10:55:47.478+00
e667faf8-8dcd-44c2-ad45-1c06c61216a4	28a584cf-098e-41b7-9314-bf03f3b8e83a	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved		2025-11-07 11:04:57.272+00	2025-11-07 11:00:59.972+00	2025-11-07 11:04:57.272+00	2025-11-07 11:00:59.971+00
2703c60b-a28a-461d-b5ae-fcaa04d80918	bd1a3906-3d65-4dba-9f07-a782e9bcedd0	744d93f7-af0d-481d-9a97-39cbcbd05d68	3	approved	Pi├¿ce de caisse cr├®├®e (Piece_Caisse_OM_bd1a3906_1762522666921.pdf). Processus compl├®t├®.	2025-11-07 13:37:47.5+00	2025-11-07 08:37:31.193+00	2025-11-07 13:37:47.501+00	2025-11-07 10:23:29.837+00
04bb06b1-f305-4c0d-8f10-724b7dafef7c	b99d01e9-2fc1-4fcd-8490-704f53d2ad11	06bb965d-f1e8-4fb1-8a44-2179bf519837	1	approved		2025-11-07 14:45:28.632+00	2025-11-07 14:45:03.965+00	2025-11-07 14:45:28.632+00	2025-11-07 14:45:03.965+00
72b12ddc-c308-4b97-b70f-212770db402f	b99d01e9-2fc1-4fcd-8490-704f53d2ad11	e60d65d2-ba00-4ffd-a4fe-496dce9dd667	2	approved		2025-11-07 14:56:34.778+00	2025-11-07 14:45:03.965+00	2025-11-07 14:56:34.778+00	2025-11-07 14:45:28.638+00
6ce1ad4d-71e6-4290-8e31-5cd2f080c67d	b99d01e9-2fc1-4fcd-8490-704f53d2ad11	9b830fef-fa07-4e26-9a27-20de41685acb	3	approved		2025-11-07 14:57:14.967+00	2025-11-07 14:45:03.965+00	2025-11-07 14:57:14.967+00	2025-11-07 14:56:34.786+00
ab681984-0a20-436b-b5e3-74cd4ab83f2a	bf8654a8-73a0-43c8-96c2-c19c526b196e	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved	Validé par DG	2025-12-02 13:06:26.793+00	2025-12-02 13:06:10.666+00	2025-12-02 13:06:26.793+00	2025-12-02 13:06:10.665+00
25e170f3-4ecb-4aac-9988-03063f0eae2f	736315d3-55c0-4612-afba-0ff32649d27c	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-11-06 10:21:35.021+00	2025-11-06 10:21:28.642+00	2025-11-06 10:21:35.021+00	\N
db8a453d-c3fd-4f80-a0d2-47621d91fd07	b99d01e9-2fc1-4fcd-8490-704f53d2ad11	c3a95b48-fac5-43f6-b58c-23566a08f5b8	4	approved		2025-11-07 15:00:45.524+00	2025-11-07 14:45:03.965+00	2025-11-07 15:00:45.524+00	2025-11-07 14:57:14.973+00
6420bd0b-2eb1-4bd0-9c93-30528ed5c8f6	a6f62b48-187e-42fc-95b7-e08b0020dfe1	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved		2025-11-07 15:01:53.144+00	2025-11-07 14:30:46.943+00	2025-11-07 15:01:53.145+00	2025-11-07 14:30:46.943+00
6a289e5d-c98f-4bae-8877-d4e573e28d67	977f162b-d011-40b9-a6ae-04d579b3aa9b	ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	2	approved		2025-11-07 15:07:34.399+00	2025-11-06 08:05:37.153+00	2025-11-07 15:07:34.4+00	\N
38bb1df4-b53c-4ae9-9758-59e74310043c	977f162b-d011-40b9-a6ae-04d579b3aa9b	06bb965d-f1e8-4fb1-8a44-2179bf519837	1	approved		2025-11-06 09:10:26.112+00	2025-11-06 08:05:37.153+00	2025-11-06 09:10:26.113+00	\N
cd04542d-c682-413a-b0b9-e6ef556c44cc	977f162b-d011-40b9-a6ae-04d579b3aa9b	1f36f978-8531-4312-9ed0-e32a6388a5e4	3	approved		2025-11-07 15:44:16.387+00	2025-11-06 08:05:37.153+00	2025-11-07 15:44:16.387+00	2025-11-07 15:07:34.403+00
85338c10-7f3c-48eb-ae6b-251013a46711	977f162b-d011-40b9-a6ae-04d579b3aa9b	c3a95b48-fac5-43f6-b58c-23566a08f5b8	4	approved		2025-11-07 15:54:47.042+00	2025-11-06 08:05:37.153+00	2025-11-07 15:54:47.042+00	2025-11-07 15:44:16.392+00
f7524b4c-29ea-439d-a3a3-0bd18a8fa446	bd1a3906-3d65-4dba-9f07-a782e9bcedd0	711dc16a-364b-4b46-b581-7697b32125de	1	approved		2025-11-07 08:37:47.906+00	2025-11-07 08:37:31.193+00	2025-11-07 08:37:47.907+00	2025-11-07 08:37:31.193+00
dfe2b48c-29de-4146-b793-22881a475418	f77e3d92-fe32-4791-808d-d17d338023c9	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved		2025-11-10 10:06:51.254+00	2025-11-10 10:06:42.263+00	2025-11-10 10:06:51.254+00	2025-11-10 10:06:42.262+00
4cf7a416-98a1-4dd2-9bc1-9c7e1c002e6e	f77e3d92-fe32-4791-808d-d17d338023c9	e60d65d2-ba00-4ffd-a4fe-496dce9dd667	2	approved		2025-11-10 10:07:09.635+00	2025-11-10 10:06:42.264+00	2025-11-10 10:07:09.638+00	2025-11-10 10:06:51.257+00
848c646d-210f-437e-95a5-d4e00477d213	f77e3d92-fe32-4791-808d-d17d338023c9	9b830fef-fa07-4e26-9a27-20de41685acb	3	approved		2025-11-10 10:07:17.578+00	2025-11-10 10:06:42.264+00	2025-11-10 10:07:17.578+00	2025-11-10 10:07:09.663+00
0080738b-88e7-486b-a9b5-f78e48e2ec67	f77e3d92-fe32-4791-808d-d17d338023c9	c3a95b48-fac5-43f6-b58c-23566a08f5b8	4	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-10 10:07:32.337+00	2025-11-10 10:06:42.264+00	2025-11-10 10:07:32.337+00	2025-11-10 10:07:17.581+00
825ff17f-091e-4996-afae-9052e7859f51	65ec9e87-f3e2-4304-a382-17c9f9c265e2	9b830fef-fa07-4e26-9a27-20de41685acb	1	approved		2025-11-10 11:27:05.391+00	2025-11-10 10:26:53.588+00	2025-11-10 11:27:05.391+00	2025-11-10 10:26:53.588+00
431b18e3-7a89-45e0-a9fe-369574953110	5fb67dd9-9d91-4efd-8cf2-718e6635d245	9b830fef-fa07-4e26-9a27-20de41685acb	3	queued	\N	\N	2025-11-10 12:16:54.137+00	2025-11-10 12:16:54.137+00	\N
eb140192-cd46-4ae0-a0a2-827e1dbc49f8	5fb67dd9-9d91-4efd-8cf2-718e6635d245	c3a95b48-fac5-43f6-b58c-23566a08f5b8	4	queued	\N	\N	2025-11-10 12:16:54.137+00	2025-11-10 12:16:54.137+00	\N
b7031752-28bd-4b85-93b8-994b9a9974c7	5fb67dd9-9d91-4efd-8cf2-718e6635d245	744d93f7-af0d-481d-9a97-39cbcbd05d68	5	queued	\N	\N	2025-11-10 12:16:54.138+00	2025-11-10 12:16:54.138+00	\N
f8f3ac4a-9a2e-4663-8d32-eb01e96d2206	5fb67dd9-9d91-4efd-8cf2-718e6635d245	06bb965d-f1e8-4fb1-8a44-2179bf519837	1	approved		2025-11-10 12:20:31.614+00	2025-11-10 12:16:54.137+00	2025-11-10 12:20:31.614+00	2025-11-10 12:16:54.137+00
aa1e43f4-8074-4048-9477-64c3bd980dc8	5fb67dd9-9d91-4efd-8cf2-718e6635d245	e60d65d2-ba00-4ffd-a4fe-496dce9dd667	2	pending	\N	\N	2025-11-10 12:16:54.137+00	2025-11-10 12:20:31.621+00	2025-11-10 12:20:31.621+00
61884cf4-d5ac-4d96-8d09-0f03ba223b68	65ec9e87-f3e2-4304-a382-17c9f9c265e2	1f36f978-8531-4312-9ed0-e32a6388a5e4	2	rejected	S	2025-11-17 09:14:37.993+00	2025-11-10 10:26:53.588+00	2025-11-17 09:14:37.994+00	2025-11-10 11:27:05.394+00
edde6d03-620c-400e-81ee-a297030c11cf	65ec9e87-f3e2-4304-a382-17c9f9c265e2	c3a95b48-fac5-43f6-b58c-23566a08f5b8	3	rejected	\N	\N	2025-11-10 10:26:53.588+00	2025-11-17 09:14:37.998+00	\N
df41efde-6ee9-4d00-8d8c-dda98824c0c1	a1cdad12-0dda-4231-8964-10893ad39f3b	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved		2025-11-10 14:02:20.69+00	2025-11-10 14:01:04.611+00	2025-11-10 14:02:20.69+00	2025-11-10 14:01:04.611+00
216d8683-dc14-4de3-b706-2b3e06a8d309	e960bc0d-0ded-4181-bc75-adffb64c066c	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved		2025-11-10 14:02:38.205+00	2025-11-10 13:57:03.939+00	2025-11-10 14:02:38.205+00	2025-11-10 13:57:03.938+00
53244e56-8e92-4382-848d-1933d2e8a258	e960bc0d-0ded-4181-bc75-adffb64c066c	e60d65d2-ba00-4ffd-a4fe-496dce9dd667	2	approved		2025-11-10 14:10:44.323+00	2025-11-10 13:57:03.939+00	2025-11-10 14:10:44.323+00	2025-11-10 14:02:38.216+00
e47be5ee-b883-4668-894d-c2dd9282b6f0	e960bc0d-0ded-4181-bc75-adffb64c066c	9b830fef-fa07-4e26-9a27-20de41685acb	3	approved		2025-11-10 14:12:03.701+00	2025-11-10 13:57:03.939+00	2025-11-10 14:12:03.701+00	2025-11-10 14:10:44.327+00
93b4ee26-b11a-4507-9a98-eebdf9988ddb	a06bd654-7ac1-49b6-8713-530a180f6693	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 07:47:38.148+00	2025-11-13 07:47:31.119+00	2025-11-13 07:47:38.148+00	2025-11-13 07:47:31.118+00
b3d00b64-6be3-40f0-aeba-af36c3c9ac90	e960bc0d-0ded-4181-bc75-adffb64c066c	c3a95b48-fac5-43f6-b58c-23566a08f5b8	4	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-10 14:12:58.856+00	2025-11-10 13:57:03.939+00	2025-11-10 14:12:58.856+00	2025-11-10 14:12:03.703+00
f41c1152-11f6-4452-9a08-87cc690acf39	f944c619-f280-496c-8325-1bb6233b02c7	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 08:02:44.117+00	2025-11-13 08:02:39.366+00	2025-11-13 08:02:44.117+00	2025-11-13 08:02:39.365+00
31586bf6-40e8-4790-b58e-d6bb724473d1	85f2f2ec-3245-4e79-a03e-b361e1ba1386	ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	1	approved		2025-11-10 15:07:13.845+00	2025-11-10 15:04:50.731+00	2025-11-10 15:07:13.846+00	2025-11-10 15:04:50.73+00
605d88a7-20a5-4bd7-bc3b-8238ac7a6743	f77e3d92-fe32-4791-808d-d17d338023c9	744d93f7-af0d-481d-9a97-39cbcbd05d68	5	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e avec l'OM (Piece_Caisse_OM_f77e3d92_1763026430658.pdf). Processus compl├®t├®.	2025-11-13 09:33:50.858+00	2025-11-10 10:06:42.264+00	2025-11-13 09:33:50.858+00	2025-11-10 10:07:32.339+00
ea651cfa-2282-409d-8c99-1519a5a13df2	764d46ab-9873-4196-9114-4640306799ed	701c20bb-3007-45c1-8a3c-b682d49e8842	1	approved		2025-11-10 15:09:17.257+00	2025-11-10 15:09:12.719+00	2025-11-10 15:09:17.257+00	2025-11-10 15:09:12.719+00
d818b130-9de4-4002-9bad-680e9f4e7392	764d46ab-9873-4196-9114-4640306799ed	ce6ac08f-d2a0-497d-908c-b7ee4c28b3fc	2	approved		2025-11-10 15:09:32.712+00	2025-11-10 15:09:12.719+00	2025-11-10 15:09:32.712+00	2025-11-10 15:09:17.262+00
2b4037be-1b0f-4d70-92db-8a695ea961b9	85f2f2ec-3245-4e79-a03e-b361e1ba1386	701c20bb-3007-45c1-8a3c-b682d49e8842	2	approved	Fiche de Suivi valid├®e. Reprise du processus.	2025-11-10 15:10:00.176+00	2025-11-10 15:04:50.731+00	2025-11-10 15:10:00.176+00	2025-11-10 15:09:32.718+00
013561e0-c9b1-47f2-881b-9933ebff506c	85f2f2ec-3245-4e79-a03e-b361e1ba1386	259a277b-f549-4459-a876-578fadeb957c	3	approved		2025-11-10 15:10:35+00	2025-11-10 15:04:50.731+00	2025-11-10 15:10:35+00	2025-11-10 15:10:00.18+00
dd7e6622-7a37-466b-95e8-47d1ded7a146	61cb188d-e535-41ff-915a-4731f6b9cfc2	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-11-10 15:51:45.948+00	2025-11-10 15:51:41.905+00	2025-11-10 15:51:45.949+00	2025-11-10 15:51:41.905+00
97f01749-e1ad-42a2-8701-faea724dc1f2	08dedde8-f816-4f5d-bfe9-fe2880f583f5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-11-10 21:14:51.904+00	2025-11-10 21:14:24.946+00	2025-11-10 21:14:51.905+00	2025-11-10 21:14:24.946+00
cabedc55-7658-4d41-b4fc-580b5e7e13fa	08dedde8-f816-4f5d-bfe9-fe2880f583f5	c3a95b48-fac5-43f6-b58c-23566a08f5b8	2	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-10 21:15:03.846+00	2025-11-10 21:14:24.947+00	2025-11-10 21:15:03.846+00	2025-11-10 21:14:51.91+00
6c52f802-07fb-4543-a47f-e4f085db1475	b8917433-bb2d-4d1d-85c9-3f7a65595d4c	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 07:22:47.633+00	2025-11-11 07:22:42.005+00	2025-11-11 07:22:47.633+00	2025-11-11 07:22:42.005+00
55e78c1c-c835-44d2-99c4-a1ae0b4fa8d7	b8917433-bb2d-4d1d-85c9-3f7a65595d4c	9b830fef-fa07-4e26-9a27-20de41685acb	2	approved		2025-11-11 07:23:20.481+00	2025-11-11 07:22:42.005+00	2025-11-11 07:23:20.481+00	2025-11-11 07:22:47.64+00
9b72dbce-d0e5-4baa-ad98-a048f24a6062	b8917433-bb2d-4d1d-85c9-3f7a65595d4c	c3a95b48-fac5-43f6-b58c-23566a08f5b8	3	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 07:44:50.156+00	2025-11-11 07:22:42.005+00	2025-11-11 07:44:50.156+00	2025-11-11 07:23:20.486+00
32369caa-cc83-4391-ab8a-11ce33e0ba64	bb37fe88-b78c-48ad-b94b-18afec7a9db6	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 07:45:31.103+00	2025-11-11 07:45:23.707+00	2025-11-11 07:45:31.104+00	2025-11-11 07:45:23.707+00
676bd89c-b5cd-4242-a8e3-a3d5f7452a0b	bb37fe88-b78c-48ad-b94b-18afec7a9db6	9b830fef-fa07-4e26-9a27-20de41685acb	2	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 07:45:59.412+00	2025-11-11 07:45:23.707+00	2025-11-11 07:45:59.412+00	2025-11-11 07:45:31.107+00
27c41684-3214-456c-a98d-0fcf01ee0085	bb37fe88-b78c-48ad-b94b-18afec7a9db6	c3a95b48-fac5-43f6-b58c-23566a08f5b8	3	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 07:46:10.636+00	2025-11-11 07:45:23.707+00	2025-11-11 07:46:10.636+00	2025-11-11 07:45:59.415+00
9e2b0b18-4a80-474e-8e16-866ba6254811	275f74d4-52b3-4edc-9c1a-2fde56775727	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-11 10:01:38.422+00	2025-11-11 09:17:16.66+00	2025-11-11 10:01:38.423+00	2025-11-11 09:17:16.66+00
c923aaca-a08f-49aa-8801-2a955ebebdf4	02c1e0a2-a641-4e06-b589-a26f1e35446a	1f36f978-8531-4312-9ed0-e32a6388a5e4	2	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 10:13:58.641+00	2025-11-13 10:12:26.042+00	2025-11-13 10:13:58.642+00	2025-11-13 10:12:38.284+00
210477f1-0d1f-4a81-8ea9-d08b07665c30	d4bdd1dd-3c4e-492f-8c6f-6972f8f7cbe9	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	pending	\N	\N	2025-12-03 12:58:43.298+00	2025-12-03 12:58:43.298+00	2025-12-03 12:58:43.297+00
5a47e2c5-9eb8-49e2-83f1-b5b39d11ce43	f2661c0e-1926-477c-80ac-f831dc4ec00c	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Validé par DG	2025-12-04 12:52:25.632+00	2025-12-04 12:52:20.43+00	2025-12-04 12:52:25.632+00	2025-12-04 12:52:20.43+00
4f823dbf-957d-49cc-935c-f5de2223fee0	afeaa33f-a71b-44dc-bbb3-7d6eae5e74b8	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-16 10:40:45.815+00	2025-12-03 15:10:43.769+00	2025-12-16 10:40:45.815+00	2025-12-03 15:10:43.769+00
77b376f9-df4b-428e-98f6-dcf34eb68041	02c1e0a2-a641-4e06-b589-a26f1e35446a	c3a95b48-fac5-43f6-b58c-23566a08f5b8	3	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 10:14:10.765+00	2025-11-13 10:12:26.042+00	2025-11-13 10:14:10.765+00	2025-11-13 10:13:58.645+00
c1484c25-4451-41a4-82b0-e723049b0384	02c1e0a2-a641-4e06-b589-a26f1e35446a	744d93f7-af0d-481d-9a97-39cbcbd05d68	4	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e (Piece_Caisse_Demande_de_permission_02c1e0a2_1763028868890.pdf). Processus compl├®t├®.	2025-11-13 10:14:29.208+00	2025-11-13 10:12:26.042+00	2025-11-13 10:14:29.208+00	2025-11-13 10:14:10.769+00
cbedd628-e8f5-41b0-920a-4ab70bf7e7c5	a9488445-9de9-4976-b650-d8a8e6085c88	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 16:36:08.446+00	2025-11-13 16:36:03.294+00	2025-11-13 16:36:08.446+00	2025-11-13 16:36:03.293+00
cbba7c30-6653-47bb-bbaf-7ac112bad6ff	a9488445-9de9-4976-b650-d8a8e6085c88	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	pending	\N	\N	2025-11-13 16:36:03.294+00	2025-11-13 16:36:08.453+00	2025-11-13 16:36:08.453+00
cbeb48c9-6782-4ec1-992c-65879be6c5ff	1db3f71e-1454-4644-a278-48f45b2c3af6	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-15 15:06:00.366+00	2025-11-15 15:05:49.869+00	2025-11-15 15:06:00.366+00	2025-11-15 15:05:49.869+00
e1186013-db82-4e95-9fef-cabe5951309a	171d2c49-3e07-472f-af46-8158046dd016	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-15 16:17:02.611+00	2025-11-15 15:56:33.673+00	2025-11-15 16:17:02.611+00	2025-11-15 15:56:33.673+00
c39efe13-fabb-4fd0-a089-a6e9012dd859	a06bd654-7ac1-49b6-8713-530a180f6693	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	approved	Pi├¿ce de caisse cr├®├®e (Piece_Caisse_OM_a06bd654_1763020080948.pdf). Processus compl├®t├®.	2025-11-13 07:48:01.203+00	2025-11-13 07:47:31.119+00	2025-11-13 07:48:01.203+00	2025-11-13 07:47:38.152+00
c2e79d79-fc95-4c77-b265-39d0ad27e109	f944c619-f280-496c-8325-1bb6233b02c7	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	approved	Pi├¿ce de caisse cr├®├®e (Piece_Caisse_OM_f944c619_1763020996378.pdf). Processus compl├®t├®.	2025-11-13 08:03:16.582+00	2025-11-13 08:02:39.366+00	2025-11-13 08:03:16.582+00	2025-11-13 08:02:44.121+00
41f45d18-e599-4936-881e-31d79ea89860	1c3dc888-07c7-4247-a44a-2e1c8a939f30	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 08:04:59.922+00	2025-11-13 08:04:55.426+00	2025-11-13 08:04:59.923+00	2025-11-13 08:04:55.426+00
33c98e0b-f77e-4929-9cb6-c3509f48fffb	1c3dc888-07c7-4247-a44a-2e1c8a939f30	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	approved	Pi├¿ce de caisse cr├®├®e (Piece_Caisse_OM_1c3dc888_1763021165373.pdf). Processus compl├®t├®.	2025-11-13 08:06:05.623+00	2025-11-13 08:04:55.427+00	2025-11-13 08:06:05.624+00	2025-11-13 08:04:59.928+00
29aebfae-d119-49ab-989c-ad3f4ee3903a	f26a162c-355b-4b2f-ab6c-f9c38b96acbb	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 08:16:10.827+00	2025-11-13 08:16:03.336+00	2025-11-13 08:16:10.827+00	2025-11-13 08:16:03.336+00
5f4dfc80-87fa-462d-a4af-409d68c4e00d	f26a162c-355b-4b2f-ab6c-f9c38b96acbb	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e avec l'OM (Piece_Caisse_OM_f26a162c_1763021801743.pdf). Processus compl├®t├®.	2025-11-13 08:16:42.09+00	2025-11-13 08:16:03.337+00	2025-11-13 08:16:42.091+00	2025-11-13 08:16:10.83+00
c529a923-57dc-4ea0-8447-b6933447ce75	e960bc0d-0ded-4181-bc75-adffb64c066c	744d93f7-af0d-481d-9a97-39cbcbd05d68	5	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e avec l'OM (Piece_Caisse_OM_e960bc0d_1763026423319.pdf). Processus compl├®t├®.	2025-11-13 09:33:43.519+00	2025-11-10 13:57:03.939+00	2025-11-13 09:33:43.52+00	2025-11-10 14:12:58.86+00
bc8d01af-4f1c-4d57-83b3-b1c396f7a759	b99d01e9-2fc1-4fcd-8490-704f53d2ad11	744d93f7-af0d-481d-9a97-39cbcbd05d68	5	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e avec l'OM (Piece_Caisse_OM_b99d01e9_1763026436186.pdf). Processus compl├®t├®.	2025-11-13 09:33:56.338+00	2025-11-07 14:45:03.966+00	2025-11-13 09:33:56.338+00	2025-11-07 15:00:45.53+00
c2a1b2d2-4b30-49c8-8570-81050c684783	2a0793d2-20d3-4485-89fe-73ebbc3ad550	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 10:05:35.075+00	2025-11-13 10:05:25.69+00	2025-11-13 10:05:35.075+00	2025-11-13 10:05:25.689+00
18042d1d-8be3-44ea-8e2a-168d7851c09d	2a0793d2-20d3-4485-89fe-73ebbc3ad550	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	approved	Pi├¿ce de caisse cr├®├®e et fusionn├®e (Piece_Caisse_Demande_de_permission_2a0793d2_1763028675314.pdf). Processus compl├®t├®.	2025-11-13 10:11:15.645+00	2025-11-13 10:05:25.69+00	2025-11-13 10:11:15.645+00	2025-11-13 10:05:35.081+00
9ea905a4-f4a1-44ef-96c4-0953374ef9e9	02c1e0a2-a641-4e06-b589-a26f1e35446a	9b830fef-fa07-4e26-9a27-20de41685acb	1	approved	Approuv├®, sign├® et cachet├® par le DG	2025-11-13 10:12:38.279+00	2025-11-13 10:12:26.042+00	2025-11-13 10:12:38.279+00	2025-11-13 10:12:26.042+00
e17fccdd-8cc0-4395-ad77-d3c084f4890f	bf8654a8-73a0-43c8-96c2-c19c526b196e	259a277b-f549-4459-a876-578fadeb957c	3	queued	\N	\N	2025-12-02 13:06:10.666+00	2025-12-02 13:06:10.666+00	\N
c1eef28f-66c9-4e55-890c-eac7aaab5303	32946633-5d17-40a7-bc55-d20bb12d246c	9b830fef-fa07-4e26-9a27-20de41685acb	1	approved	Approuvé, signé et cacheté par le DG	2025-11-20 16:31:12.251+00	2025-11-20 16:29:37.468+00	2025-11-20 16:31:12.251+00	2025-11-20 16:29:37.468+00
734e9664-d600-445c-b781-d79282b77918	756f6100-e75c-4e57-9828-8a9f1bc454c4	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	[VALIDATION EN MASSE] ok	2025-11-20 16:32:29.853+00	2025-11-20 16:31:46.564+00	2025-11-20 16:32:29.854+00	2025-11-20 16:31:46.564+00
bbd0da9a-a884-461e-81dc-ffc4420de571	2a8aae56-b77b-43a7-8341-8054cd38ba76	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	pending	\N	\N	2025-12-03 12:58:43.304+00	2025-12-03 12:58:43.304+00	2025-12-03 12:58:43.304+00
4bfd5125-3c8f-4e7c-bf07-f4252ad73294	696b05c2-440a-4380-a6ef-17fb9a3ee17c	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-21 13:44:29.749+00	2025-11-21 13:44:04.593+00	2025-11-21 13:44:29.749+00	2025-11-21 13:44:04.593+00
f373fe53-a878-498a-8fda-2cca32bcffcd	696b05c2-440a-4380-a6ef-17fb9a3ee17c	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	pending	\N	\N	2025-11-21 13:44:04.594+00	2025-11-21 13:44:29.754+00	2025-11-21 13:44:29.753+00
16e10300-1333-4f31-84ab-952ac3eb624d	079129a6-33c6-4ff8-a66f-416d99b18e05	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-21 13:47:26.897+00	2025-11-21 13:47:13.894+00	2025-11-21 13:47:26.897+00	2025-11-21 13:47:13.894+00
44ea9310-c266-48fb-8de9-2d474d3ff061	079129a6-33c6-4ff8-a66f-416d99b18e05	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	pending	\N	\N	2025-11-21 13:47:13.894+00	2025-11-21 13:47:26.901+00	2025-11-21 13:47:26.9+00
abf8acee-2520-4ea9-8919-338df2397444	fc65859b-1583-42a7-b59e-ec1fe726d840	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-21 13:50:00.087+00	2025-11-21 13:49:54.656+00	2025-11-21 13:50:00.088+00	2025-11-21 13:49:54.656+00
956d2d66-cf15-49e9-b932-657d53cc4cc5	fc65859b-1583-42a7-b59e-ec1fe726d840	744d93f7-af0d-481d-9a97-39cbcbd05d68	2	pending	\N	\N	2025-11-21 13:49:54.656+00	2025-11-21 13:50:00.091+00	2025-11-21 13:50:00.091+00
ad827cd6-dc6f-4b68-9c1a-9b48918c4367	9755d89f-a1ba-4bd7-a773-ef91a4388b1b	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuvé, signé et cacheté par le DG	2025-11-21 14:12:54.715+00	2025-11-21 14:11:42.332+00	2025-11-21 14:12:54.715+00	2025-11-21 14:11:42.332+00
75d79175-a927-4eb7-a299-432fc0ec97da	b09ec2c9-092d-49b6-b13c-f74509204b69	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:21:25.483+00	2025-11-23 19:21:14.764+00	2025-11-23 19:21:25.484+00	2025-11-23 19:21:14.764+00
e0f1817a-23e1-42ac-8b1c-980895b12d9b	31c59889-e4f2-463a-867f-41fb28b813b7	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:25:14.318+00	2025-11-23 19:25:08.323+00	2025-11-23 19:25:14.319+00	2025-11-23 19:25:08.322+00
148d1814-e5dd-4c53-9f66-28de11d085c7	89817ebc-0c84-4f20-974f-e9a555f79a74	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:27:53.085+00	2025-11-23 19:27:42.291+00	2025-11-23 19:27:53.085+00	2025-11-23 19:27:42.291+00
f55dee24-8291-4351-a549-b10d221f1ddb	d295e72c-b8d0-4ca1-bcb3-7ecffd842201	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:31:05.241+00	2025-11-23 19:31:00.041+00	2025-11-23 19:31:05.241+00	2025-11-23 19:31:00.041+00
7a2ab62f-f312-423c-8665-9e6ad4123075	6e92b681-eba7-40bd-956e-de9c393cece1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:33:02.821+00	2025-11-23 19:32:55.665+00	2025-11-23 19:33:02.821+00	2025-11-23 19:32:55.665+00
d939740a-5527-439e-9535-e52bfac5ad17	2c539c90-77fe-4e57-b57f-43ef98a9e781	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:38:54.36+00	2025-11-23 19:38:47.223+00	2025-11-23 19:38:54.361+00	2025-11-23 19:38:47.223+00
f4f2dc01-5865-4d1a-a143-4d4d55a99a28	436c2a2a-4a29-4e26-b196-a76e000326cb	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Approuvé, signé et cacheté par le DG	2025-11-23 19:53:12.29+00	2025-11-23 19:51:14.78+00	2025-11-23 19:53:12.29+00	2025-11-23 19:51:14.78+00
628dd46d-5864-492b-af7f-64bd06499b2b	f91f60d9-6ffc-4859-a170-7f680db41d61	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuvé, signé et cacheté par le DG	2025-11-25 13:38:00.249+00	2025-11-25 13:37:53.413+00	2025-11-25 13:38:00.249+00	2025-11-25 13:37:53.413+00
d9e92fe1-fe8e-4e66-9c75-13c6ce7e72ea	d1762be7-0139-4ace-9a49-ef6bb5c14d99	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuvé, signé et cacheté par le DG	2025-11-26 08:05:51.489+00	2025-11-26 08:05:30.085+00	2025-11-26 08:05:51.49+00	2025-11-26 08:05:30.084+00
5ee1da82-5e80-4b23-8c09-36f5c4d8e2fc	436c2a2a-4a29-4e26-b196-a76e000326cb	c3a95b48-fac5-43f6-b58c-23566a08f5b8	2	approved	Approuvé, signé et cacheté par le DG	2025-11-26 08:19:25.513+00	2025-11-23 19:51:14.78+00	2025-11-26 08:19:25.513+00	2025-11-23 19:53:12.294+00
c5a89431-c864-4798-a3c6-148439ddfd7c	6886b2cb-0080-44e5-8b9d-11706a02750d	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved	Approuvé, signé et cacheté par le DG	2025-11-26 08:21:04.678+00	2025-11-26 08:20:57.671+00	2025-11-26 08:21:04.678+00	2025-11-26 08:20:57.67+00
a8b239de-d4a0-4c80-8d00-015a2dbbb1e4	d4a55e6a-86e2-46f8-ae32-2187907f34b7	10ef834f-0663-4b0c-9643-6f700324ec8b	1	pending	\N	\N	2025-12-01 08:33:55.678+00	2025-12-01 08:33:55.678+00	2025-12-01 08:33:55.678+00
32c71013-578f-4254-b417-63f551c45e68	d4a55e6a-86e2-46f8-ae32-2187907f34b7	c4311098-40f2-4289-af7b-76e503b220c5	2	queued	\N	\N	2025-12-01 08:33:55.678+00	2025-12-01 08:33:55.678+00	\N
4d5121e0-f608-4db3-a75a-13384df195f7	d4a55e6a-86e2-46f8-ae32-2187907f34b7	9b830fef-fa07-4e26-9a27-20de41685acb	3	queued	\N	\N	2025-12-01 08:33:55.679+00	2025-12-01 08:33:55.679+00	\N
53c2a243-d402-4c53-8d85-80af58293c95	01d798c4-b20c-49ea-8a35-8c7009c893be	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved	Validé par DG	2025-12-01 14:21:50.043+00	2025-12-01 14:14:54.362+00	2025-12-01 14:21:50.043+00	2025-12-01 14:14:54.362+00
9ac60ea5-4338-45d9-8dec-8ec773f09c0f	0ed0fe25-f89e-48c4-8727-a5417cc03dbb	10ef834f-0663-4b0c-9643-6f700324ec8b	2	approved	Validé par DG	2025-12-01 14:25:35.051+00	2025-12-01 14:23:46.815+00	2025-12-01 14:25:35.051+00	2025-12-01 14:25:13.696+00
f7b04058-1c3f-4fd2-9e83-4394165b50e1	01d798c4-b20c-49ea-8a35-8c7009c893be	259a277b-f549-4459-a876-578fadeb957c	3	approved	Validé par DG	2025-12-01 14:27:41.894+00	2025-12-01 14:14:54.363+00	2025-12-01 14:27:41.894+00	2025-12-01 14:25:57.913+00
41b778fe-3649-4ac3-ab16-d5d68a4b60b6	a5e269c4-6697-46fa-a27c-631c114f3f47	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved	Validé par DG	2025-12-01 14:29:05.29+00	2025-12-01 13:29:14.921+00	2025-12-01 14:29:05.29+00	2025-12-01 13:29:14.92+00
4db91a73-5daf-4f09-8b71-4400c4b32313	0ed0fe25-f89e-48c4-8727-a5417cc03dbb	701c20bb-3007-45c1-8a3c-b682d49e8842	1	approved	Validé par DG	2025-12-01 14:25:13.689+00	2025-12-01 14:23:46.815+00	2025-12-01 14:25:13.69+00	2025-12-01 14:23:46.814+00
61550127-f796-47f6-8c7b-46b3817d80e4	ce1c03e6-893f-446d-b474-6b2606408a51	c4311098-40f2-4289-af7b-76e503b220c5	2	approved	Demande de besoin validée. Document joint automatiquement. Reprise du processus.	2025-12-01 14:49:17.279+00	2025-12-01 14:46:25.826+00	2025-12-01 14:49:17.279+00	2025-12-01 14:48:03.549+00
b888fa90-1b25-42f6-83f5-a03f7f02aa49	01d798c4-b20c-49ea-8a35-8c7009c893be	701c20bb-3007-45c1-8a3c-b682d49e8842	2	approved	Fiche de Suivi validée. Document joint. Reprise du processus.	2025-12-01 14:25:57.91+00	2025-12-01 14:14:54.363+00	2025-12-01 14:25:57.91+00	2025-12-01 14:25:35.387+00
59953fde-4ea7-4f17-8513-ef007a698d1f	ce1c03e6-893f-446d-b474-6b2606408a51	9b830fef-fa07-4e26-9a27-20de41685acb	3	approved	Validé par DG	2025-12-01 14:50:46.179+00	2025-12-01 14:46:25.826+00	2025-12-01 14:50:46.179+00	2025-12-01 14:49:17.282+00
fcd88da4-f9ed-4ada-95ea-a3a4c0ea617f	bf8654a8-73a0-43c8-96c2-c19c526b196e	701c20bb-3007-45c1-8a3c-b682d49e8842	2	en_pause	Fiche de suivi créée. En attente de résolution.	2025-12-02 13:07:38.325+00	2025-12-02 13:06:10.666+00	2025-12-02 13:07:38.325+00	2025-12-02 13:06:26.796+00
5eabe175-7de1-4f33-b9bc-45d3a22647f1	ab2f41bb-7388-4c25-9aa8-7e48a59cdca4	2cf652e6-017d-494a-8a04-07226d5c21da	1	approved	Validé par DG	2025-12-01 14:37:03.629+00	2025-12-01 14:34:12.983+00	2025-12-01 14:37:03.629+00	2025-12-01 14:34:12.983+00
1bb6479a-0eeb-4342-b27e-6a379be5f166	ab2f41bb-7388-4c25-9aa8-7e48a59cdca4	711dc16a-364b-4b46-b581-7697b32125de	2	approved	Validé par DG	2025-12-01 14:38:19.724+00	2025-12-01 14:34:12.983+00	2025-12-01 14:38:19.724+00	2025-12-01 14:37:03.631+00
4ff449a1-c54e-4c8c-a08a-b5cef1a7f4d0	ab2f41bb-7388-4c25-9aa8-7e48a59cdca4	259a277b-f549-4459-a876-578fadeb957c	3	approved	Validé par DG	2025-12-01 14:38:41.046+00	2025-12-01 14:34:12.983+00	2025-12-01 14:38:41.046+00	2025-12-01 14:38:19.728+00
58e2b35d-3759-4b0d-96b6-5951cf23574f	ce1c03e6-893f-446d-b474-6b2606408a51	10ef834f-0663-4b0c-9643-6f700324ec8b	1	approved	Validé par DG	2025-12-01 14:46:39.272+00	2025-12-01 14:46:25.826+00	2025-12-01 14:46:39.272+00	2025-12-01 14:46:25.826+00
eca6329d-50b9-4cec-9d3f-659aa104f844	5c3343fe-5cfb-4afc-a96a-b0b0c530942f	2cf652e6-017d-494a-8a04-07226d5c21da	1	approved	Validé par DG	2025-12-01 14:47:35.054+00	2025-12-01 14:47:15.343+00	2025-12-01 14:47:35.054+00	2025-12-01 14:47:15.343+00
5a22a87a-ba75-4c1e-a3a9-8339360f1803	5c3343fe-5cfb-4afc-a96a-b0b0c530942f	711dc16a-364b-4b46-b581-7697b32125de	2	approved	Validé par DG	2025-12-01 14:47:52.094+00	2025-12-01 14:47:15.343+00	2025-12-01 14:47:52.094+00	2025-12-01 14:47:35.058+00
f5e53461-2b7b-4af2-9241-22a3406030b9	5c3343fe-5cfb-4afc-a96a-b0b0c530942f	259a277b-f549-4459-a876-578fadeb957c	3	approved	Validé par DG	2025-12-01 14:48:03.24+00	2025-12-01 14:47:15.344+00	2025-12-01 14:48:03.24+00	2025-12-01 14:47:52.096+00
e0a4be82-2a93-42ba-bfa6-b3a3c5ff79b9	dabaca98-f10e-404c-9e20-6d86b8c1f6d9	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:24:11.706+00	2025-12-15 14:24:00.171+00	2025-12-15 14:24:11.707+00	2025-12-15 14:24:00.17+00
c7f7108e-1601-4b41-8a9b-7e6546499b1b	4d6ea1c2-48a3-4be6-8687-88747581ee1d	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:25:00.153+00	2025-12-15 14:24:51.719+00	2025-12-15 14:25:00.153+00	2025-12-15 14:24:51.719+00
1d822e92-d7e5-4aa2-9133-3ded5da5c102	d766bd17-24b4-43e7-a7f7-4c16e105a4b0	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:32:58.476+00	2025-12-15 14:32:53.728+00	2025-12-15 14:32:58.477+00	2025-12-15 14:32:53.727+00
c9c8641f-2623-45ac-9381-4bc75c227d87	86c6c2b1-8127-4541-a195-8d4f09884ef5	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:34:44.273+00	2025-12-15 14:34:39.126+00	2025-12-15 14:34:44.273+00	2025-12-15 14:34:39.126+00
2a94940e-744f-4f99-b07f-cd55f5ca9ea2	7e5162c0-2b22-486b-a458-abf3b83999e4	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:36:56.854+00	2025-12-15 14:36:50.312+00	2025-12-15 14:36:56.854+00	2025-12-15 14:36:50.312+00
a9d62b4a-fd3d-4650-84ac-c6b06e4d1d78	b48e419d-b445-48fe-b650-b3cd9f882ccf	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2025-12-15 14:38:55.81+00	2025-12-15 14:38:50.382+00	2025-12-15 14:38:55.81+00	2025-12-15 14:38:50.382+00
d7298d30-b312-4d1f-93b2-9e6db2daefff	a30e8f63-3de9-43a6-a104-df365ad9e05c	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved		2025-12-15 14:39:59.008+00	2025-12-15 14:39:37.493+00	2025-12-15 14:39:59.008+00	2025-12-15 14:39:37.493+00
fba48f58-dc93-48aa-ad20-880735943ada	ffe55bc4-089b-41d0-aed0-635376ca2ece	c3a95b48-fac5-43f6-b58c-23566a08f5b8	1	approved		2025-12-15 14:42:18.375+00	2025-12-15 14:42:12.926+00	2025-12-15 14:42:18.375+00	2025-12-15 14:42:12.926+00
ffb420dd-7203-41ea-b303-3475acffd1c8	46925a53-3e87-46bb-9fa6-92ddff8293e8	1f36f978-8531-4312-9ed0-e32a6388a5e4	1	approved		2025-12-15 14:45:03.37+00	2025-12-15 14:43:29.107+00	2025-12-15 14:45:03.37+00	2025-12-15 14:43:29.106+00
d71d6c44-9153-46b3-bba7-5259df5aed92	93ab436d-f522-41a0-9d71-235d12a8e198	9b830fef-fa07-4e26-9a27-20de41685acb	1	approved		2025-12-15 14:45:55.428+00	2025-12-15 14:45:50.207+00	2025-12-15 14:45:55.428+00	2025-12-15 14:45:50.207+00
adcacdcf-3c69-421d-b3fe-7ab3a982cf11	d2ae0371-866a-4654-bf27-feaae6940465	c4311098-40f2-4289-af7b-76e503b220c5	1	pending	\N	\N	2026-01-06 11:12:35.733+00	2026-01-06 11:12:35.733+00	2026-01-06 11:12:35.733+00
1f2a9860-c47d-4541-9813-dc600680e73e	d2ae0371-866a-4654-bf27-feaae6940465	9b830fef-fa07-4e26-9a27-20de41685acb	2	queued	\N	\N	2026-01-06 11:12:35.733+00	2026-01-06 11:12:35.733+00	\N
55910054-b5f1-44f9-827d-d77bbe0daec5	2a2e288c-a61d-4b3e-a205-30dfb3f7d4bc	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2026-01-13 15:29:04.963+00	2026-01-13 15:28:59.774+00	2026-01-13 15:29:04.964+00	2026-01-13 15:28:59.773+00
ab728599-9663-49e0-a8ba-08e7cc40640b	4aad214f-f318-4466-bee5-e7d9800ae5b1	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	pending	\N	\N	2026-01-15 20:39:54.298+00	2026-01-15 20:39:54.298+00	2026-01-15 20:39:54.298+00
cf35d4e9-b448-4d54-84f2-f207416cd61f	afeaa33f-a71b-44dc-bbb3-7d6eae5e74b8	dfe693f7-c4e8-4ca6-aa91-fa972253ef18	1	approved		2026-01-17 19:36:22.406+00	2026-01-17 19:36:11.716+00	2026-01-17 19:36:22.406+00	2026-01-17 19:36:11.715+00
\.


--
-- Name: licenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ged_user
--

SELECT pg_catalog.setval('public.licenses_id_seq', 2, true);


--
-- Name: template_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ged_user
--

SELECT pg_catalog.setval('public.template_fields_id_seq', 6, true);


--
-- Name: templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ged_user
--

SELECT pg_catalog.setval('public.templates_id_seq', 9, true);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: demandes_achats demandes_achats_da_number_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_da_number_key UNIQUE (da_number);


--
-- Name: demandes_achats demandes_achats_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_matricule_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key UNIQUE (matricule);


--
-- Name: employees employees_matricule_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key1 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key10; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key10 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key11; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key11 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key12; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key12 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key13; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key13 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key14; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key14 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key15; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key15 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key16; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key16 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key17; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key17 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key18; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key18 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key19; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key19 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key2; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key2 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key20; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key20 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key21; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key21 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key22; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key22 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key23; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key23 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key24; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key24 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key25; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key25 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key26; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key26 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key27; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key27 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key28; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key28 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key29; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key29 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key3; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key3 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key30; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key30 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key31; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key31 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key32; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key32 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key33; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key33 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key34; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key34 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key35; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key35 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key4; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key4 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key5; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key5 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key6; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key6 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key7; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key7 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key8; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key8 UNIQUE (matricule);


--
-- Name: employees employees_matricule_key9; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricule_key9 UNIQUE (matricule);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: invoice_folders invoice_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.invoice_folders
    ADD CONSTRAINT invoice_folders_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: motifs motifs_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.motifs
    ADD CONSTRAINT motifs_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: queue_positions queue_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_pkey PRIMARY KEY (id);


--
-- Name: schedule_assignments schedule_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_pkey PRIMARY KEY (id);


--
-- Name: schedule_changes_log schedule_changes_log_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_pkey PRIMARY KEY (id);


--
-- Name: schedule_validations schedule_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: service_members service_members_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_pkey PRIMARY KEY (id);


--
-- Name: services services_name_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key UNIQUE (name);


--
-- Name: services services_name_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key1 UNIQUE (name);


--
-- Name: services services_name_key10; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key10 UNIQUE (name);


--
-- Name: services services_name_key100; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key100 UNIQUE (name);


--
-- Name: services services_name_key101; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key101 UNIQUE (name);


--
-- Name: services services_name_key102; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key102 UNIQUE (name);


--
-- Name: services services_name_key103; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key103 UNIQUE (name);


--
-- Name: services services_name_key104; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key104 UNIQUE (name);


--
-- Name: services services_name_key105; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key105 UNIQUE (name);


--
-- Name: services services_name_key106; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key106 UNIQUE (name);


--
-- Name: services services_name_key107; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key107 UNIQUE (name);


--
-- Name: services services_name_key108; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key108 UNIQUE (name);


--
-- Name: services services_name_key109; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key109 UNIQUE (name);


--
-- Name: services services_name_key11; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key11 UNIQUE (name);


--
-- Name: services services_name_key110; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key110 UNIQUE (name);


--
-- Name: services services_name_key111; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key111 UNIQUE (name);


--
-- Name: services services_name_key112; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key112 UNIQUE (name);


--
-- Name: services services_name_key113; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key113 UNIQUE (name);


--
-- Name: services services_name_key114; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key114 UNIQUE (name);


--
-- Name: services services_name_key115; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key115 UNIQUE (name);


--
-- Name: services services_name_key116; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key116 UNIQUE (name);


--
-- Name: services services_name_key117; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key117 UNIQUE (name);


--
-- Name: services services_name_key118; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key118 UNIQUE (name);


--
-- Name: services services_name_key119; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key119 UNIQUE (name);


--
-- Name: services services_name_key12; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key12 UNIQUE (name);


--
-- Name: services services_name_key120; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key120 UNIQUE (name);


--
-- Name: services services_name_key121; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key121 UNIQUE (name);


--
-- Name: services services_name_key122; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key122 UNIQUE (name);


--
-- Name: services services_name_key123; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key123 UNIQUE (name);


--
-- Name: services services_name_key124; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key124 UNIQUE (name);


--
-- Name: services services_name_key125; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key125 UNIQUE (name);


--
-- Name: services services_name_key13; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key13 UNIQUE (name);


--
-- Name: services services_name_key14; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key14 UNIQUE (name);


--
-- Name: services services_name_key15; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key15 UNIQUE (name);


--
-- Name: services services_name_key16; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key16 UNIQUE (name);


--
-- Name: services services_name_key17; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key17 UNIQUE (name);


--
-- Name: services services_name_key18; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key18 UNIQUE (name);


--
-- Name: services services_name_key19; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key19 UNIQUE (name);


--
-- Name: services services_name_key2; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key2 UNIQUE (name);


--
-- Name: services services_name_key20; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key20 UNIQUE (name);


--
-- Name: services services_name_key21; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key21 UNIQUE (name);


--
-- Name: services services_name_key22; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key22 UNIQUE (name);


--
-- Name: services services_name_key23; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key23 UNIQUE (name);


--
-- Name: services services_name_key24; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key24 UNIQUE (name);


--
-- Name: services services_name_key25; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key25 UNIQUE (name);


--
-- Name: services services_name_key26; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key26 UNIQUE (name);


--
-- Name: services services_name_key27; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key27 UNIQUE (name);


--
-- Name: services services_name_key28; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key28 UNIQUE (name);


--
-- Name: services services_name_key29; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key29 UNIQUE (name);


--
-- Name: services services_name_key3; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key3 UNIQUE (name);


--
-- Name: services services_name_key30; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key30 UNIQUE (name);


--
-- Name: services services_name_key31; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key31 UNIQUE (name);


--
-- Name: services services_name_key32; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key32 UNIQUE (name);


--
-- Name: services services_name_key33; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key33 UNIQUE (name);


--
-- Name: services services_name_key34; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key34 UNIQUE (name);


--
-- Name: services services_name_key35; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key35 UNIQUE (name);


--
-- Name: services services_name_key36; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key36 UNIQUE (name);


--
-- Name: services services_name_key37; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key37 UNIQUE (name);


--
-- Name: services services_name_key38; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key38 UNIQUE (name);


--
-- Name: services services_name_key39; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key39 UNIQUE (name);


--
-- Name: services services_name_key4; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key4 UNIQUE (name);


--
-- Name: services services_name_key40; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key40 UNIQUE (name);


--
-- Name: services services_name_key41; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key41 UNIQUE (name);


--
-- Name: services services_name_key42; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key42 UNIQUE (name);


--
-- Name: services services_name_key43; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key43 UNIQUE (name);


--
-- Name: services services_name_key44; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key44 UNIQUE (name);


--
-- Name: services services_name_key45; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key45 UNIQUE (name);


--
-- Name: services services_name_key46; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key46 UNIQUE (name);


--
-- Name: services services_name_key47; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key47 UNIQUE (name);


--
-- Name: services services_name_key48; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key48 UNIQUE (name);


--
-- Name: services services_name_key49; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key49 UNIQUE (name);


--
-- Name: services services_name_key5; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key5 UNIQUE (name);


--
-- Name: services services_name_key50; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key50 UNIQUE (name);


--
-- Name: services services_name_key51; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key51 UNIQUE (name);


--
-- Name: services services_name_key52; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key52 UNIQUE (name);


--
-- Name: services services_name_key53; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key53 UNIQUE (name);


--
-- Name: services services_name_key54; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key54 UNIQUE (name);


--
-- Name: services services_name_key55; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key55 UNIQUE (name);


--
-- Name: services services_name_key56; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key56 UNIQUE (name);


--
-- Name: services services_name_key57; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key57 UNIQUE (name);


--
-- Name: services services_name_key58; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key58 UNIQUE (name);


--
-- Name: services services_name_key59; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key59 UNIQUE (name);


--
-- Name: services services_name_key6; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key6 UNIQUE (name);


--
-- Name: services services_name_key60; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key60 UNIQUE (name);


--
-- Name: services services_name_key61; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key61 UNIQUE (name);


--
-- Name: services services_name_key62; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key62 UNIQUE (name);


--
-- Name: services services_name_key63; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key63 UNIQUE (name);


--
-- Name: services services_name_key64; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key64 UNIQUE (name);


--
-- Name: services services_name_key65; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key65 UNIQUE (name);


--
-- Name: services services_name_key66; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key66 UNIQUE (name);


--
-- Name: services services_name_key67; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key67 UNIQUE (name);


--
-- Name: services services_name_key68; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key68 UNIQUE (name);


--
-- Name: services services_name_key69; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key69 UNIQUE (name);


--
-- Name: services services_name_key7; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key7 UNIQUE (name);


--
-- Name: services services_name_key70; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key70 UNIQUE (name);


--
-- Name: services services_name_key71; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key71 UNIQUE (name);


--
-- Name: services services_name_key72; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key72 UNIQUE (name);


--
-- Name: services services_name_key73; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key73 UNIQUE (name);


--
-- Name: services services_name_key74; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key74 UNIQUE (name);


--
-- Name: services services_name_key75; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key75 UNIQUE (name);


--
-- Name: services services_name_key76; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key76 UNIQUE (name);


--
-- Name: services services_name_key77; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key77 UNIQUE (name);


--
-- Name: services services_name_key78; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key78 UNIQUE (name);


--
-- Name: services services_name_key79; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key79 UNIQUE (name);


--
-- Name: services services_name_key8; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key8 UNIQUE (name);


--
-- Name: services services_name_key80; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key80 UNIQUE (name);


--
-- Name: services services_name_key81; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key81 UNIQUE (name);


--
-- Name: services services_name_key82; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key82 UNIQUE (name);


--
-- Name: services services_name_key83; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key83 UNIQUE (name);


--
-- Name: services services_name_key84; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key84 UNIQUE (name);


--
-- Name: services services_name_key85; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key85 UNIQUE (name);


--
-- Name: services services_name_key86; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key86 UNIQUE (name);


--
-- Name: services services_name_key87; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key87 UNIQUE (name);


--
-- Name: services services_name_key88; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key88 UNIQUE (name);


--
-- Name: services services_name_key89; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key89 UNIQUE (name);


--
-- Name: services services_name_key9; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key9 UNIQUE (name);


--
-- Name: services services_name_key90; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key90 UNIQUE (name);


--
-- Name: services services_name_key91; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key91 UNIQUE (name);


--
-- Name: services services_name_key92; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key92 UNIQUE (name);


--
-- Name: services services_name_key93; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key93 UNIQUE (name);


--
-- Name: services services_name_key94; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key94 UNIQUE (name);


--
-- Name: services services_name_key95; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key95 UNIQUE (name);


--
-- Name: services services_name_key96; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key96 UNIQUE (name);


--
-- Name: services services_name_key97; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key97 UNIQUE (name);


--
-- Name: services services_name_key98; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key98 UNIQUE (name);


--
-- Name: services services_name_key99; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key99 UNIQUE (name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: shift_types shift_types_code_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.shift_types
    ADD CONSTRAINT shift_types_code_key UNIQUE (code);


--
-- Name: shift_types shift_types_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.shift_types
    ADD CONSTRAINT shift_types_pkey PRIMARY KEY (id);


--
-- Name: template_fields template_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT template_fields_pkey PRIMARY KEY (id);


--
-- Name: templates templates_name_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_name_key UNIQUE (name);


--
-- Name: templates templates_name_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_name_key1 UNIQUE (name);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: templates templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_slug_key UNIQUE (slug);


--
-- Name: templates templates_slug_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_slug_key1 UNIQUE (slug);


--
-- Name: ticket_history ticket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: trello_activity_logs trello_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: trello_attachments trello_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_pkey PRIMARY KEY (id);


--
-- Name: trello_boards trello_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_boards
    ADD CONSTRAINT trello_boards_pkey PRIMARY KEY (id);


--
-- Name: trello_boards trello_boards_service_type_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_boards
    ADD CONSTRAINT trello_boards_service_type_key UNIQUE (service_type);


--
-- Name: trello_cards trello_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_pkey PRIMARY KEY (id);


--
-- Name: trello_comments trello_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_pkey PRIMARY KEY (id);


--
-- Name: trello_lists trello_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_lists
    ADD CONSTRAINT trello_lists_pkey PRIMARY KEY (id);


--
-- Name: template_fields unique_template_field_name; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT unique_template_field_name UNIQUE (template_id, field_name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key10; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key10 UNIQUE (email);


--
-- Name: users users_email_key100; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key100 UNIQUE (email);


--
-- Name: users users_email_key101; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key101 UNIQUE (email);


--
-- Name: users users_email_key102; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key102 UNIQUE (email);


--
-- Name: users users_email_key103; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key103 UNIQUE (email);


--
-- Name: users users_email_key104; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key104 UNIQUE (email);


--
-- Name: users users_email_key105; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key105 UNIQUE (email);


--
-- Name: users users_email_key106; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key106 UNIQUE (email);


--
-- Name: users users_email_key107; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key107 UNIQUE (email);


--
-- Name: users users_email_key108; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key108 UNIQUE (email);


--
-- Name: users users_email_key109; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key109 UNIQUE (email);


--
-- Name: users users_email_key11; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key11 UNIQUE (email);


--
-- Name: users users_email_key110; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key110 UNIQUE (email);


--
-- Name: users users_email_key111; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key111 UNIQUE (email);


--
-- Name: users users_email_key112; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key112 UNIQUE (email);


--
-- Name: users users_email_key113; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key113 UNIQUE (email);


--
-- Name: users users_email_key114; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key114 UNIQUE (email);


--
-- Name: users users_email_key115; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key115 UNIQUE (email);


--
-- Name: users users_email_key116; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key116 UNIQUE (email);


--
-- Name: users users_email_key117; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key117 UNIQUE (email);


--
-- Name: users users_email_key118; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key118 UNIQUE (email);


--
-- Name: users users_email_key119; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key119 UNIQUE (email);


--
-- Name: users users_email_key12; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key12 UNIQUE (email);


--
-- Name: users users_email_key120; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key120 UNIQUE (email);


--
-- Name: users users_email_key121; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key121 UNIQUE (email);


--
-- Name: users users_email_key122; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key122 UNIQUE (email);


--
-- Name: users users_email_key123; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key123 UNIQUE (email);


--
-- Name: users users_email_key124; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key124 UNIQUE (email);


--
-- Name: users users_email_key125; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key125 UNIQUE (email);


--
-- Name: users users_email_key126; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key126 UNIQUE (email);


--
-- Name: users users_email_key127; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key127 UNIQUE (email);


--
-- Name: users users_email_key128; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key128 UNIQUE (email);


--
-- Name: users users_email_key129; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key129 UNIQUE (email);


--
-- Name: users users_email_key13; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key13 UNIQUE (email);


--
-- Name: users users_email_key130; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key130 UNIQUE (email);


--
-- Name: users users_email_key131; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key131 UNIQUE (email);


--
-- Name: users users_email_key132; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key132 UNIQUE (email);


--
-- Name: users users_email_key133; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key133 UNIQUE (email);


--
-- Name: users users_email_key134; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key134 UNIQUE (email);


--
-- Name: users users_email_key135; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key135 UNIQUE (email);


--
-- Name: users users_email_key136; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key136 UNIQUE (email);


--
-- Name: users users_email_key137; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key137 UNIQUE (email);


--
-- Name: users users_email_key138; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key138 UNIQUE (email);


--
-- Name: users users_email_key139; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key139 UNIQUE (email);


--
-- Name: users users_email_key14; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key14 UNIQUE (email);


--
-- Name: users users_email_key140; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key140 UNIQUE (email);


--
-- Name: users users_email_key141; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key141 UNIQUE (email);


--
-- Name: users users_email_key142; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key142 UNIQUE (email);


--
-- Name: users users_email_key143; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key143 UNIQUE (email);


--
-- Name: users users_email_key144; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key144 UNIQUE (email);


--
-- Name: users users_email_key145; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key145 UNIQUE (email);


--
-- Name: users users_email_key146; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key146 UNIQUE (email);


--
-- Name: users users_email_key147; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key147 UNIQUE (email);


--
-- Name: users users_email_key148; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key148 UNIQUE (email);


--
-- Name: users users_email_key149; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key149 UNIQUE (email);


--
-- Name: users users_email_key15; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key15 UNIQUE (email);


--
-- Name: users users_email_key150; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key150 UNIQUE (email);


--
-- Name: users users_email_key151; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key151 UNIQUE (email);


--
-- Name: users users_email_key152; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key152 UNIQUE (email);


--
-- Name: users users_email_key153; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key153 UNIQUE (email);


--
-- Name: users users_email_key154; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key154 UNIQUE (email);


--
-- Name: users users_email_key155; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key155 UNIQUE (email);


--
-- Name: users users_email_key156; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key156 UNIQUE (email);


--
-- Name: users users_email_key157; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key157 UNIQUE (email);


--
-- Name: users users_email_key158; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key158 UNIQUE (email);


--
-- Name: users users_email_key159; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key159 UNIQUE (email);


--
-- Name: users users_email_key16; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key16 UNIQUE (email);


--
-- Name: users users_email_key160; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key160 UNIQUE (email);


--
-- Name: users users_email_key161; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key161 UNIQUE (email);


--
-- Name: users users_email_key162; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key162 UNIQUE (email);


--
-- Name: users users_email_key163; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key163 UNIQUE (email);


--
-- Name: users users_email_key164; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key164 UNIQUE (email);


--
-- Name: users users_email_key165; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key165 UNIQUE (email);


--
-- Name: users users_email_key166; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key166 UNIQUE (email);


--
-- Name: users users_email_key167; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key167 UNIQUE (email);


--
-- Name: users users_email_key168; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key168 UNIQUE (email);


--
-- Name: users users_email_key169; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key169 UNIQUE (email);


--
-- Name: users users_email_key17; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key17 UNIQUE (email);


--
-- Name: users users_email_key170; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key170 UNIQUE (email);


--
-- Name: users users_email_key171; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key171 UNIQUE (email);


--
-- Name: users users_email_key172; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key172 UNIQUE (email);


--
-- Name: users users_email_key173; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key173 UNIQUE (email);


--
-- Name: users users_email_key174; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key174 UNIQUE (email);


--
-- Name: users users_email_key175; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key175 UNIQUE (email);


--
-- Name: users users_email_key176; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key176 UNIQUE (email);


--
-- Name: users users_email_key177; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key177 UNIQUE (email);


--
-- Name: users users_email_key178; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key178 UNIQUE (email);


--
-- Name: users users_email_key179; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key179 UNIQUE (email);


--
-- Name: users users_email_key18; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key18 UNIQUE (email);


--
-- Name: users users_email_key180; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key180 UNIQUE (email);


--
-- Name: users users_email_key181; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key181 UNIQUE (email);


--
-- Name: users users_email_key182; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key182 UNIQUE (email);


--
-- Name: users users_email_key183; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key183 UNIQUE (email);


--
-- Name: users users_email_key184; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key184 UNIQUE (email);


--
-- Name: users users_email_key185; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key185 UNIQUE (email);


--
-- Name: users users_email_key186; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key186 UNIQUE (email);


--
-- Name: users users_email_key187; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key187 UNIQUE (email);


--
-- Name: users users_email_key188; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key188 UNIQUE (email);


--
-- Name: users users_email_key189; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key189 UNIQUE (email);


--
-- Name: users users_email_key19; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key19 UNIQUE (email);


--
-- Name: users users_email_key190; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key190 UNIQUE (email);


--
-- Name: users users_email_key191; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key191 UNIQUE (email);


--
-- Name: users users_email_key192; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key192 UNIQUE (email);


--
-- Name: users users_email_key193; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key193 UNIQUE (email);


--
-- Name: users users_email_key194; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key194 UNIQUE (email);


--
-- Name: users users_email_key195; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key195 UNIQUE (email);


--
-- Name: users users_email_key196; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key196 UNIQUE (email);


--
-- Name: users users_email_key197; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key197 UNIQUE (email);


--
-- Name: users users_email_key198; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key198 UNIQUE (email);


--
-- Name: users users_email_key199; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key199 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key20; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key20 UNIQUE (email);


--
-- Name: users users_email_key200; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key200 UNIQUE (email);


--
-- Name: users users_email_key201; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key201 UNIQUE (email);


--
-- Name: users users_email_key202; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key202 UNIQUE (email);


--
-- Name: users users_email_key203; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key203 UNIQUE (email);


--
-- Name: users users_email_key204; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key204 UNIQUE (email);


--
-- Name: users users_email_key205; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key205 UNIQUE (email);


--
-- Name: users users_email_key206; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key206 UNIQUE (email);


--
-- Name: users users_email_key207; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key207 UNIQUE (email);


--
-- Name: users users_email_key208; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key208 UNIQUE (email);


--
-- Name: users users_email_key209; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key209 UNIQUE (email);


--
-- Name: users users_email_key21; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key21 UNIQUE (email);


--
-- Name: users users_email_key210; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key210 UNIQUE (email);


--
-- Name: users users_email_key211; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key211 UNIQUE (email);


--
-- Name: users users_email_key212; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key212 UNIQUE (email);


--
-- Name: users users_email_key213; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key213 UNIQUE (email);


--
-- Name: users users_email_key214; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key214 UNIQUE (email);


--
-- Name: users users_email_key215; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key215 UNIQUE (email);


--
-- Name: users users_email_key216; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key216 UNIQUE (email);


--
-- Name: users users_email_key217; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key217 UNIQUE (email);


--
-- Name: users users_email_key218; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key218 UNIQUE (email);


--
-- Name: users users_email_key219; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key219 UNIQUE (email);


--
-- Name: users users_email_key22; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key22 UNIQUE (email);


--
-- Name: users users_email_key220; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key220 UNIQUE (email);


--
-- Name: users users_email_key221; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key221 UNIQUE (email);


--
-- Name: users users_email_key222; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key222 UNIQUE (email);


--
-- Name: users users_email_key223; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key223 UNIQUE (email);


--
-- Name: users users_email_key224; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key224 UNIQUE (email);


--
-- Name: users users_email_key225; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key225 UNIQUE (email);


--
-- Name: users users_email_key226; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key226 UNIQUE (email);


--
-- Name: users users_email_key227; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key227 UNIQUE (email);


--
-- Name: users users_email_key228; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key228 UNIQUE (email);


--
-- Name: users users_email_key229; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key229 UNIQUE (email);


--
-- Name: users users_email_key23; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key23 UNIQUE (email);


--
-- Name: users users_email_key230; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key230 UNIQUE (email);


--
-- Name: users users_email_key231; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key231 UNIQUE (email);


--
-- Name: users users_email_key232; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key232 UNIQUE (email);


--
-- Name: users users_email_key233; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key233 UNIQUE (email);


--
-- Name: users users_email_key234; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key234 UNIQUE (email);


--
-- Name: users users_email_key235; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key235 UNIQUE (email);


--
-- Name: users users_email_key236; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key236 UNIQUE (email);


--
-- Name: users users_email_key24; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key24 UNIQUE (email);


--
-- Name: users users_email_key25; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key25 UNIQUE (email);


--
-- Name: users users_email_key26; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key26 UNIQUE (email);


--
-- Name: users users_email_key27; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key27 UNIQUE (email);


--
-- Name: users users_email_key28; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key28 UNIQUE (email);


--
-- Name: users users_email_key29; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key29 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_email_key30; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key30 UNIQUE (email);


--
-- Name: users users_email_key31; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key31 UNIQUE (email);


--
-- Name: users users_email_key32; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key32 UNIQUE (email);


--
-- Name: users users_email_key33; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key33 UNIQUE (email);


--
-- Name: users users_email_key34; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key34 UNIQUE (email);


--
-- Name: users users_email_key35; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key35 UNIQUE (email);


--
-- Name: users users_email_key36; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key36 UNIQUE (email);


--
-- Name: users users_email_key37; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key37 UNIQUE (email);


--
-- Name: users users_email_key38; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key38 UNIQUE (email);


--
-- Name: users users_email_key39; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key39 UNIQUE (email);


--
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- Name: users users_email_key40; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key40 UNIQUE (email);


--
-- Name: users users_email_key41; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key41 UNIQUE (email);


--
-- Name: users users_email_key42; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key42 UNIQUE (email);


--
-- Name: users users_email_key43; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key43 UNIQUE (email);


--
-- Name: users users_email_key44; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key44 UNIQUE (email);


--
-- Name: users users_email_key45; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key45 UNIQUE (email);


--
-- Name: users users_email_key46; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key46 UNIQUE (email);


--
-- Name: users users_email_key47; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key47 UNIQUE (email);


--
-- Name: users users_email_key48; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key48 UNIQUE (email);


--
-- Name: users users_email_key49; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key49 UNIQUE (email);


--
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- Name: users users_email_key50; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key50 UNIQUE (email);


--
-- Name: users users_email_key51; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key51 UNIQUE (email);


--
-- Name: users users_email_key52; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key52 UNIQUE (email);


--
-- Name: users users_email_key53; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key53 UNIQUE (email);


--
-- Name: users users_email_key54; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key54 UNIQUE (email);


--
-- Name: users users_email_key55; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key55 UNIQUE (email);


--
-- Name: users users_email_key56; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key56 UNIQUE (email);


--
-- Name: users users_email_key57; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key57 UNIQUE (email);


--
-- Name: users users_email_key58; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key58 UNIQUE (email);


--
-- Name: users users_email_key59; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key59 UNIQUE (email);


--
-- Name: users users_email_key6; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key6 UNIQUE (email);


--
-- Name: users users_email_key60; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key60 UNIQUE (email);


--
-- Name: users users_email_key61; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key61 UNIQUE (email);


--
-- Name: users users_email_key62; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key62 UNIQUE (email);


--
-- Name: users users_email_key63; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key63 UNIQUE (email);


--
-- Name: users users_email_key64; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key64 UNIQUE (email);


--
-- Name: users users_email_key65; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key65 UNIQUE (email);


--
-- Name: users users_email_key66; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key66 UNIQUE (email);


--
-- Name: users users_email_key67; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key67 UNIQUE (email);


--
-- Name: users users_email_key68; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key68 UNIQUE (email);


--
-- Name: users users_email_key69; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key69 UNIQUE (email);


--
-- Name: users users_email_key7; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key7 UNIQUE (email);


--
-- Name: users users_email_key70; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key70 UNIQUE (email);


--
-- Name: users users_email_key71; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key71 UNIQUE (email);


--
-- Name: users users_email_key72; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key72 UNIQUE (email);


--
-- Name: users users_email_key73; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key73 UNIQUE (email);


--
-- Name: users users_email_key74; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key74 UNIQUE (email);


--
-- Name: users users_email_key75; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key75 UNIQUE (email);


--
-- Name: users users_email_key76; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key76 UNIQUE (email);


--
-- Name: users users_email_key77; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key77 UNIQUE (email);


--
-- Name: users users_email_key78; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key78 UNIQUE (email);


--
-- Name: users users_email_key79; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key79 UNIQUE (email);


--
-- Name: users users_email_key8; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key8 UNIQUE (email);


--
-- Name: users users_email_key80; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key80 UNIQUE (email);


--
-- Name: users users_email_key81; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key81 UNIQUE (email);


--
-- Name: users users_email_key82; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key82 UNIQUE (email);


--
-- Name: users users_email_key83; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key83 UNIQUE (email);


--
-- Name: users users_email_key84; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key84 UNIQUE (email);


--
-- Name: users users_email_key85; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key85 UNIQUE (email);


--
-- Name: users users_email_key86; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key86 UNIQUE (email);


--
-- Name: users users_email_key87; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key87 UNIQUE (email);


--
-- Name: users users_email_key88; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key88 UNIQUE (email);


--
-- Name: users users_email_key89; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key89 UNIQUE (email);


--
-- Name: users users_email_key9; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key9 UNIQUE (email);


--
-- Name: users users_email_key90; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key90 UNIQUE (email);


--
-- Name: users users_email_key91; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key91 UNIQUE (email);


--
-- Name: users users_email_key92; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key92 UNIQUE (email);


--
-- Name: users users_email_key93; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key93 UNIQUE (email);


--
-- Name: users users_email_key94; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key94 UNIQUE (email);


--
-- Name: users users_email_key95; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key95 UNIQUE (email);


--
-- Name: users users_email_key96; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key96 UNIQUE (email);


--
-- Name: users users_email_key97; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key97 UNIQUE (email);


--
-- Name: users users_email_key98; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key98 UNIQUE (email);


--
-- Name: users users_email_key99; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key99 UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users users_username_key1; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key1 UNIQUE (username);


--
-- Name: users users_username_key10; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key10 UNIQUE (username);


--
-- Name: users users_username_key100; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key100 UNIQUE (username);


--
-- Name: users users_username_key101; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key101 UNIQUE (username);


--
-- Name: users users_username_key102; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key102 UNIQUE (username);


--
-- Name: users users_username_key103; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key103 UNIQUE (username);


--
-- Name: users users_username_key104; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key104 UNIQUE (username);


--
-- Name: users users_username_key105; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key105 UNIQUE (username);


--
-- Name: users users_username_key106; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key106 UNIQUE (username);


--
-- Name: users users_username_key107; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key107 UNIQUE (username);


--
-- Name: users users_username_key108; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key108 UNIQUE (username);


--
-- Name: users users_username_key109; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key109 UNIQUE (username);


--
-- Name: users users_username_key11; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key11 UNIQUE (username);


--
-- Name: users users_username_key110; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key110 UNIQUE (username);


--
-- Name: users users_username_key111; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key111 UNIQUE (username);


--
-- Name: users users_username_key112; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key112 UNIQUE (username);


--
-- Name: users users_username_key113; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key113 UNIQUE (username);


--
-- Name: users users_username_key114; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key114 UNIQUE (username);


--
-- Name: users users_username_key115; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key115 UNIQUE (username);


--
-- Name: users users_username_key116; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key116 UNIQUE (username);


--
-- Name: users users_username_key117; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key117 UNIQUE (username);


--
-- Name: users users_username_key118; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key118 UNIQUE (username);


--
-- Name: users users_username_key119; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key119 UNIQUE (username);


--
-- Name: users users_username_key12; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key12 UNIQUE (username);


--
-- Name: users users_username_key120; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key120 UNIQUE (username);


--
-- Name: users users_username_key121; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key121 UNIQUE (username);


--
-- Name: users users_username_key122; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key122 UNIQUE (username);


--
-- Name: users users_username_key123; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key123 UNIQUE (username);


--
-- Name: users users_username_key124; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key124 UNIQUE (username);


--
-- Name: users users_username_key125; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key125 UNIQUE (username);


--
-- Name: users users_username_key126; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key126 UNIQUE (username);


--
-- Name: users users_username_key127; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key127 UNIQUE (username);


--
-- Name: users users_username_key128; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key128 UNIQUE (username);


--
-- Name: users users_username_key129; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key129 UNIQUE (username);


--
-- Name: users users_username_key13; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key13 UNIQUE (username);


--
-- Name: users users_username_key130; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key130 UNIQUE (username);


--
-- Name: users users_username_key131; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key131 UNIQUE (username);


--
-- Name: users users_username_key132; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key132 UNIQUE (username);


--
-- Name: users users_username_key133; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key133 UNIQUE (username);


--
-- Name: users users_username_key134; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key134 UNIQUE (username);


--
-- Name: users users_username_key135; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key135 UNIQUE (username);


--
-- Name: users users_username_key136; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key136 UNIQUE (username);


--
-- Name: users users_username_key137; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key137 UNIQUE (username);


--
-- Name: users users_username_key138; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key138 UNIQUE (username);


--
-- Name: users users_username_key139; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key139 UNIQUE (username);


--
-- Name: users users_username_key14; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key14 UNIQUE (username);


--
-- Name: users users_username_key140; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key140 UNIQUE (username);


--
-- Name: users users_username_key141; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key141 UNIQUE (username);


--
-- Name: users users_username_key142; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key142 UNIQUE (username);


--
-- Name: users users_username_key143; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key143 UNIQUE (username);


--
-- Name: users users_username_key144; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key144 UNIQUE (username);


--
-- Name: users users_username_key145; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key145 UNIQUE (username);


--
-- Name: users users_username_key146; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key146 UNIQUE (username);


--
-- Name: users users_username_key147; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key147 UNIQUE (username);


--
-- Name: users users_username_key148; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key148 UNIQUE (username);


--
-- Name: users users_username_key149; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key149 UNIQUE (username);


--
-- Name: users users_username_key15; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key15 UNIQUE (username);


--
-- Name: users users_username_key150; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key150 UNIQUE (username);


--
-- Name: users users_username_key151; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key151 UNIQUE (username);


--
-- Name: users users_username_key152; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key152 UNIQUE (username);


--
-- Name: users users_username_key153; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key153 UNIQUE (username);


--
-- Name: users users_username_key154; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key154 UNIQUE (username);


--
-- Name: users users_username_key155; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key155 UNIQUE (username);


--
-- Name: users users_username_key156; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key156 UNIQUE (username);


--
-- Name: users users_username_key157; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key157 UNIQUE (username);


--
-- Name: users users_username_key158; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key158 UNIQUE (username);


--
-- Name: users users_username_key159; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key159 UNIQUE (username);


--
-- Name: users users_username_key16; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key16 UNIQUE (username);


--
-- Name: users users_username_key160; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key160 UNIQUE (username);


--
-- Name: users users_username_key161; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key161 UNIQUE (username);


--
-- Name: users users_username_key162; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key162 UNIQUE (username);


--
-- Name: users users_username_key163; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key163 UNIQUE (username);


--
-- Name: users users_username_key164; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key164 UNIQUE (username);


--
-- Name: users users_username_key165; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key165 UNIQUE (username);


--
-- Name: users users_username_key166; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key166 UNIQUE (username);


--
-- Name: users users_username_key167; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key167 UNIQUE (username);


--
-- Name: users users_username_key168; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key168 UNIQUE (username);


--
-- Name: users users_username_key169; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key169 UNIQUE (username);


--
-- Name: users users_username_key17; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key17 UNIQUE (username);


--
-- Name: users users_username_key170; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key170 UNIQUE (username);


--
-- Name: users users_username_key171; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key171 UNIQUE (username);


--
-- Name: users users_username_key172; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key172 UNIQUE (username);


--
-- Name: users users_username_key173; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key173 UNIQUE (username);


--
-- Name: users users_username_key174; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key174 UNIQUE (username);


--
-- Name: users users_username_key175; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key175 UNIQUE (username);


--
-- Name: users users_username_key176; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key176 UNIQUE (username);


--
-- Name: users users_username_key177; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key177 UNIQUE (username);


--
-- Name: users users_username_key178; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key178 UNIQUE (username);


--
-- Name: users users_username_key179; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key179 UNIQUE (username);


--
-- Name: users users_username_key18; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key18 UNIQUE (username);


--
-- Name: users users_username_key180; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key180 UNIQUE (username);


--
-- Name: users users_username_key181; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key181 UNIQUE (username);


--
-- Name: users users_username_key182; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key182 UNIQUE (username);


--
-- Name: users users_username_key183; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key183 UNIQUE (username);


--
-- Name: users users_username_key184; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key184 UNIQUE (username);


--
-- Name: users users_username_key185; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key185 UNIQUE (username);


--
-- Name: users users_username_key186; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key186 UNIQUE (username);


--
-- Name: users users_username_key187; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key187 UNIQUE (username);


--
-- Name: users users_username_key188; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key188 UNIQUE (username);


--
-- Name: users users_username_key189; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key189 UNIQUE (username);


--
-- Name: users users_username_key19; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key19 UNIQUE (username);


--
-- Name: users users_username_key190; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key190 UNIQUE (username);


--
-- Name: users users_username_key191; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key191 UNIQUE (username);


--
-- Name: users users_username_key192; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key192 UNIQUE (username);


--
-- Name: users users_username_key193; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key193 UNIQUE (username);


--
-- Name: users users_username_key194; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key194 UNIQUE (username);


--
-- Name: users users_username_key195; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key195 UNIQUE (username);


--
-- Name: users users_username_key196; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key196 UNIQUE (username);


--
-- Name: users users_username_key197; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key197 UNIQUE (username);


--
-- Name: users users_username_key198; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key198 UNIQUE (username);


--
-- Name: users users_username_key199; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key199 UNIQUE (username);


--
-- Name: users users_username_key2; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key2 UNIQUE (username);


--
-- Name: users users_username_key20; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key20 UNIQUE (username);


--
-- Name: users users_username_key200; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key200 UNIQUE (username);


--
-- Name: users users_username_key201; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key201 UNIQUE (username);


--
-- Name: users users_username_key202; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key202 UNIQUE (username);


--
-- Name: users users_username_key203; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key203 UNIQUE (username);


--
-- Name: users users_username_key204; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key204 UNIQUE (username);


--
-- Name: users users_username_key205; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key205 UNIQUE (username);


--
-- Name: users users_username_key206; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key206 UNIQUE (username);


--
-- Name: users users_username_key207; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key207 UNIQUE (username);


--
-- Name: users users_username_key208; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key208 UNIQUE (username);


--
-- Name: users users_username_key209; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key209 UNIQUE (username);


--
-- Name: users users_username_key21; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key21 UNIQUE (username);


--
-- Name: users users_username_key210; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key210 UNIQUE (username);


--
-- Name: users users_username_key211; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key211 UNIQUE (username);


--
-- Name: users users_username_key212; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key212 UNIQUE (username);


--
-- Name: users users_username_key213; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key213 UNIQUE (username);


--
-- Name: users users_username_key214; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key214 UNIQUE (username);


--
-- Name: users users_username_key215; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key215 UNIQUE (username);


--
-- Name: users users_username_key216; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key216 UNIQUE (username);


--
-- Name: users users_username_key217; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key217 UNIQUE (username);


--
-- Name: users users_username_key218; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key218 UNIQUE (username);


--
-- Name: users users_username_key219; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key219 UNIQUE (username);


--
-- Name: users users_username_key22; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key22 UNIQUE (username);


--
-- Name: users users_username_key220; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key220 UNIQUE (username);


--
-- Name: users users_username_key221; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key221 UNIQUE (username);


--
-- Name: users users_username_key222; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key222 UNIQUE (username);


--
-- Name: users users_username_key223; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key223 UNIQUE (username);


--
-- Name: users users_username_key224; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key224 UNIQUE (username);


--
-- Name: users users_username_key225; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key225 UNIQUE (username);


--
-- Name: users users_username_key226; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key226 UNIQUE (username);


--
-- Name: users users_username_key227; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key227 UNIQUE (username);


--
-- Name: users users_username_key228; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key228 UNIQUE (username);


--
-- Name: users users_username_key229; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key229 UNIQUE (username);


--
-- Name: users users_username_key23; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key23 UNIQUE (username);


--
-- Name: users users_username_key230; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key230 UNIQUE (username);


--
-- Name: users users_username_key231; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key231 UNIQUE (username);


--
-- Name: users users_username_key232; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key232 UNIQUE (username);


--
-- Name: users users_username_key233; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key233 UNIQUE (username);


--
-- Name: users users_username_key234; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key234 UNIQUE (username);


--
-- Name: users users_username_key235; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key235 UNIQUE (username);


--
-- Name: users users_username_key236; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key236 UNIQUE (username);


--
-- Name: users users_username_key24; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key24 UNIQUE (username);


--
-- Name: users users_username_key25; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key25 UNIQUE (username);


--
-- Name: users users_username_key26; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key26 UNIQUE (username);


--
-- Name: users users_username_key27; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key27 UNIQUE (username);


--
-- Name: users users_username_key28; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key28 UNIQUE (username);


--
-- Name: users users_username_key29; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key29 UNIQUE (username);


--
-- Name: users users_username_key3; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key3 UNIQUE (username);


--
-- Name: users users_username_key30; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key30 UNIQUE (username);


--
-- Name: users users_username_key31; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key31 UNIQUE (username);


--
-- Name: users users_username_key32; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key32 UNIQUE (username);


--
-- Name: users users_username_key33; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key33 UNIQUE (username);


--
-- Name: users users_username_key34; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key34 UNIQUE (username);


--
-- Name: users users_username_key35; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key35 UNIQUE (username);


--
-- Name: users users_username_key36; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key36 UNIQUE (username);


--
-- Name: users users_username_key37; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key37 UNIQUE (username);


--
-- Name: users users_username_key38; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key38 UNIQUE (username);


--
-- Name: users users_username_key39; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key39 UNIQUE (username);


--
-- Name: users users_username_key4; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key4 UNIQUE (username);


--
-- Name: users users_username_key40; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key40 UNIQUE (username);


--
-- Name: users users_username_key41; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key41 UNIQUE (username);


--
-- Name: users users_username_key42; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key42 UNIQUE (username);


--
-- Name: users users_username_key43; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key43 UNIQUE (username);


--
-- Name: users users_username_key44; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key44 UNIQUE (username);


--
-- Name: users users_username_key45; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key45 UNIQUE (username);


--
-- Name: users users_username_key46; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key46 UNIQUE (username);


--
-- Name: users users_username_key47; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key47 UNIQUE (username);


--
-- Name: users users_username_key48; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key48 UNIQUE (username);


--
-- Name: users users_username_key49; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key49 UNIQUE (username);


--
-- Name: users users_username_key5; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key5 UNIQUE (username);


--
-- Name: users users_username_key50; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key50 UNIQUE (username);


--
-- Name: users users_username_key51; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key51 UNIQUE (username);


--
-- Name: users users_username_key52; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key52 UNIQUE (username);


--
-- Name: users users_username_key53; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key53 UNIQUE (username);


--
-- Name: users users_username_key54; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key54 UNIQUE (username);


--
-- Name: users users_username_key55; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key55 UNIQUE (username);


--
-- Name: users users_username_key56; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key56 UNIQUE (username);


--
-- Name: users users_username_key57; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key57 UNIQUE (username);


--
-- Name: users users_username_key58; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key58 UNIQUE (username);


--
-- Name: users users_username_key59; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key59 UNIQUE (username);


--
-- Name: users users_username_key6; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key6 UNIQUE (username);


--
-- Name: users users_username_key60; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key60 UNIQUE (username);


--
-- Name: users users_username_key61; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key61 UNIQUE (username);


--
-- Name: users users_username_key62; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key62 UNIQUE (username);


--
-- Name: users users_username_key63; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key63 UNIQUE (username);


--
-- Name: users users_username_key64; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key64 UNIQUE (username);


--
-- Name: users users_username_key65; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key65 UNIQUE (username);


--
-- Name: users users_username_key66; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key66 UNIQUE (username);


--
-- Name: users users_username_key67; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key67 UNIQUE (username);


--
-- Name: users users_username_key68; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key68 UNIQUE (username);


--
-- Name: users users_username_key69; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key69 UNIQUE (username);


--
-- Name: users users_username_key7; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key7 UNIQUE (username);


--
-- Name: users users_username_key70; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key70 UNIQUE (username);


--
-- Name: users users_username_key71; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key71 UNIQUE (username);


--
-- Name: users users_username_key72; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key72 UNIQUE (username);


--
-- Name: users users_username_key73; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key73 UNIQUE (username);


--
-- Name: users users_username_key74; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key74 UNIQUE (username);


--
-- Name: users users_username_key75; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key75 UNIQUE (username);


--
-- Name: users users_username_key76; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key76 UNIQUE (username);


--
-- Name: users users_username_key77; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key77 UNIQUE (username);


--
-- Name: users users_username_key78; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key78 UNIQUE (username);


--
-- Name: users users_username_key79; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key79 UNIQUE (username);


--
-- Name: users users_username_key8; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key8 UNIQUE (username);


--
-- Name: users users_username_key80; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key80 UNIQUE (username);


--
-- Name: users users_username_key81; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key81 UNIQUE (username);


--
-- Name: users users_username_key82; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key82 UNIQUE (username);


--
-- Name: users users_username_key83; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key83 UNIQUE (username);


--
-- Name: users users_username_key84; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key84 UNIQUE (username);


--
-- Name: users users_username_key85; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key85 UNIQUE (username);


--
-- Name: users users_username_key86; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key86 UNIQUE (username);


--
-- Name: users users_username_key87; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key87 UNIQUE (username);


--
-- Name: users users_username_key88; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key88 UNIQUE (username);


--
-- Name: users users_username_key89; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key89 UNIQUE (username);


--
-- Name: users users_username_key9; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key9 UNIQUE (username);


--
-- Name: users users_username_key90; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key90 UNIQUE (username);


--
-- Name: users users_username_key91; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key91 UNIQUE (username);


--
-- Name: users users_username_key92; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key92 UNIQUE (username);


--
-- Name: users users_username_key93; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key93 UNIQUE (username);


--
-- Name: users users_username_key94; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key94 UNIQUE (username);


--
-- Name: users users_username_key95; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key95 UNIQUE (username);


--
-- Name: users users_username_key96; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key96 UNIQUE (username);


--
-- Name: users users_username_key97; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key97 UNIQUE (username);


--
-- Name: users users_username_key98; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key98 UNIQUE (username);


--
-- Name: users users_username_key99; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key99 UNIQUE (username);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: demandes_achats_da_number; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX demandes_achats_da_number ON public.demandes_achats USING btree (da_number);


--
-- Name: demandes_achats_requester_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX demandes_achats_requester_id ON public.demandes_achats USING btree (requester_id);


--
-- Name: demandes_achats_status; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX demandes_achats_status ON public.demandes_achats USING btree (status);


--
-- Name: departments_type_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX departments_type_idx ON public.departments USING btree (type);


--
-- Name: documents_category; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_category ON public.documents USING btree (category);


--
-- Name: documents_created_at; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_created_at ON public.documents USING btree (created_at);


--
-- Name: documents_date_debut; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_date_debut ON public.documents USING btree (date_debut);


--
-- Name: documents_date_fin; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_date_fin ON public.documents USING btree (date_fin);


--
-- Name: documents_status; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_status ON public.documents USING btree (status);


--
-- Name: documents_user_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX documents_user_id ON public.documents USING btree (user_id);


--
-- Name: employees_is_active_index; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_is_active_index ON public.employees USING btree (is_active);


--
-- Name: employees_matricule; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_matricule ON public.employees USING btree (matricule);


--
-- Name: employees_matricule_index; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_matricule_index ON public.employees USING btree (matricule);


--
-- Name: employees_name_index; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_name_index ON public.employees USING btree (last_name, first_name);


--
-- Name: employees_service_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_service_id ON public.employees USING btree (service_id);


--
-- Name: employees_service_id_index; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX employees_service_id_index ON public.employees USING btree (service_id);


--
-- Name: positions_queue_position_unique; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE UNIQUE INDEX positions_queue_position_unique ON public.positions USING btree (queue_type, position_number);


--
-- Name: push_subscriptions_user_active_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX push_subscriptions_user_active_idx ON public.push_subscriptions USING btree (user_id, active);


--
-- Name: push_subscriptions_user_endpoint_unique; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE UNIQUE INDEX push_subscriptions_user_endpoint_unique ON public.push_subscriptions USING btree (user_id, endpoint);


--
-- Name: queue_positions_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX queue_positions_status_idx ON public.queue_positions USING btree (status);


--
-- Name: queue_positions_type_position_unique; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE UNIQUE INDEX queue_positions_type_position_unique ON public.queue_positions USING btree (queue_type, position_number);


--
-- Name: queue_positions_user_id_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX queue_positions_user_id_idx ON public.queue_positions USING btree (user_id);


--
-- Name: schedule_assignments_employee_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_assignments_employee_date_idx ON public.schedule_assignments USING btree (employee_id, assignment_date);


--
-- Name: schedule_assignments_notification_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_assignments_notification_idx ON public.schedule_assignments USING btree (notification_sent, assignment_date);


--
-- Name: schedule_assignments_reminder_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_assignments_reminder_idx ON public.schedule_assignments USING btree (reminder_sent, assignment_date);


--
-- Name: schedule_assignments_schedule_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_assignments_schedule_date_idx ON public.schedule_assignments USING btree (schedule_id, assignment_date);


--
-- Name: schedule_assignments_user_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_assignments_user_date_idx ON public.schedule_assignments USING btree (user_id, assignment_date);


--
-- Name: schedule_changes_log_schedule_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_changes_log_schedule_date_idx ON public.schedule_changes_log USING btree (schedule_id, created_at);


--
-- Name: schedule_changes_log_type_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_changes_log_type_idx ON public.schedule_changes_log USING btree (change_type);


--
-- Name: schedule_changes_log_user_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_changes_log_user_date_idx ON public.schedule_changes_log USING btree (changed_by_user_id, created_at);


--
-- Name: schedule_validations_schedule_order_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_validations_schedule_order_idx ON public.schedule_validations USING btree (schedule_id, validation_order);


--
-- Name: schedule_validations_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_validations_status_idx ON public.schedule_validations USING btree (status);


--
-- Name: schedule_validations_validator_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedule_validations_validator_status_idx ON public.schedule_validations USING btree (validator_user_id, status);


--
-- Name: schedules_dates_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedules_dates_idx ON public.schedules USING btree (start_date, end_date);


--
-- Name: schedules_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedules_status_idx ON public.schedules USING btree (status);


--
-- Name: schedules_type_year_month_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX schedules_type_year_month_idx ON public.schedules USING btree (schedule_type, year, month);


--
-- Name: service_members_fonction; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX service_members_fonction ON public.service_members USING btree (fonction);


--
-- Name: service_members_service_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX service_members_service_id ON public.service_members USING btree (service_id);


--
-- Name: service_members_user_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX service_members_user_id ON public.service_members USING btree (user_id);


--
-- Name: ticket_history_action_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX ticket_history_action_idx ON public.ticket_history USING btree (action);


--
-- Name: ticket_history_created_at_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX ticket_history_created_at_idx ON public.ticket_history USING btree (created_at);


--
-- Name: ticket_history_ticket_id_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX ticket_history_ticket_id_idx ON public.ticket_history USING btree (ticket_id);


--
-- Name: tickets_created_at_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX tickets_created_at_idx ON public.tickets USING btree (created_at);


--
-- Name: tickets_queue_type_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX tickets_queue_type_idx ON public.tickets USING btree (queue_type);


--
-- Name: tickets_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX tickets_status_idx ON public.tickets USING btree (status);


--
-- Name: tickets_ticket_number_unique; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE UNIQUE INDEX tickets_ticket_number_unique ON public.tickets USING btree (ticket_number);


--
-- Name: trello_activity_logs_action_type_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_activity_logs_action_type_idx ON public.trello_activity_logs USING btree (action_type);


--
-- Name: trello_activity_logs_card_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_activity_logs_card_date_idx ON public.trello_activity_logs USING btree (card_id, created_at);


--
-- Name: trello_attachments_card_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_attachments_card_idx ON public.trello_attachments USING btree (card_id);


--
-- Name: trello_boards_service_type_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_boards_service_type_idx ON public.trello_boards USING btree (service_type);


--
-- Name: trello_cards_assigned_to_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_assigned_to_idx ON public.trello_cards USING btree (assigned_to);


--
-- Name: trello_cards_due_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_due_date_idx ON public.trello_cards USING btree (due_date);


--
-- Name: trello_cards_list_position_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_list_position_idx ON public.trello_cards USING btree (list_id, "position");


--
-- Name: trello_cards_priority_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_priority_idx ON public.trello_cards USING btree (priority);


--
-- Name: trello_cards_status_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_status_idx ON public.trello_cards USING btree (status);


--
-- Name: trello_cards_work_request_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_cards_work_request_idx ON public.trello_cards USING btree (linked_work_request_id);


--
-- Name: trello_comments_card_date_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_comments_card_date_idx ON public.trello_comments USING btree (card_id, created_at);


--
-- Name: trello_lists_board_position_idx; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX trello_lists_board_position_idx ON public.trello_lists USING btree (board_id, "position");


--
-- Name: workflows_created_at; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX workflows_created_at ON public.workflows USING btree (created_at);


--
-- Name: workflows_document_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX workflows_document_id ON public.workflows USING btree (document_id);


--
-- Name: workflows_status; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX workflows_status ON public.workflows USING btree (status);


--
-- Name: workflows_step; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX workflows_step ON public.workflows USING btree (step);


--
-- Name: workflows_validator_id; Type: INDEX; Schema: public; Owner: ged_user
--

CREATE INDEX workflows_validator_id ON public.workflows USING btree (validator_id);


--
-- Name: demandes_achats demandes_achats_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.demandes_achats
    ADD CONSTRAINT demandes_achats_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_invoice_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_invoice_folder_id_fkey FOREIGN KEY (invoice_folder_id) REFERENCES public.invoice_folders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE;


--
-- Name: invoice_folders invoice_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.invoice_folders
    ADD CONSTRAINT invoice_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.invoice_folders(id) ON DELETE CASCADE;


--
-- Name: positions positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: queue_positions queue_positions_current_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_current_ticket_id_fkey FOREIGN KEY (current_ticket_id) REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: queue_positions queue_positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: schedule_assignments schedule_assignments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: schedule_assignments schedule_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: schedule_assignments schedule_assignments_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_assignments schedule_assignments_shift_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_shift_type_id_fkey FOREIGN KEY (shift_type_id) REFERENCES public.shift_types(id) ON DELETE RESTRICT;


--
-- Name: schedule_assignments schedule_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_assignments
    ADD CONSTRAINT schedule_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_changes_log schedule_changes_log_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: schedule_changes_log schedule_changes_log_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_changes_log
    ADD CONSTRAINT schedule_changes_log_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_validations schedule_validations_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: schedule_validations schedule_validations_validator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedule_validations
    ADD CONSTRAINT schedule_validations_validator_user_id_fkey FOREIGN KEY (validator_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: schedules schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_published_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_published_by_user_id_fkey FOREIGN KEY (published_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_members service_members_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_members service_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.service_members
    ADD CONSTRAINT service_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_fields template_fields_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.template_fields
    ADD CONSTRAINT template_fields_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_history ticket_history_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_history ticket_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trello_activity_logs trello_activity_logs_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_activity_logs trello_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_activity_logs
    ADD CONSTRAINT trello_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_attachments trello_attachments_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_attachments trello_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_attachments
    ADD CONSTRAINT trello_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_cards trello_cards_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trello_cards trello_cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trello_cards trello_cards_linked_work_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_linked_work_request_id_fkey FOREIGN KEY (linked_work_request_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trello_cards trello_cards_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_cards
    ADD CONSTRAINT trello_cards_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.trello_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_comments trello_comments_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.trello_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_comments trello_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_comments
    ADD CONSTRAINT trello_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trello_lists trello_lists_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.trello_lists
    ADD CONSTRAINT trello_lists_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.trello_boards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflows workflows_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflows workflows_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ged_user
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

