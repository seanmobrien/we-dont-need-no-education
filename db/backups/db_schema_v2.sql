--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 17.4

-- Started on 2025-04-05 02:14:33

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 33325)
-- Name: accounts; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type character varying(255) NOT NULL,
    provider character varying(255) NOT NULL,
    "providerAccountId" character varying(255) NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public.accounts OWNER TO dog;

--
-- TOC entry 222 (class 1259 OID 33330)
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO dog;

--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 222
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- TOC entry 223 (class 1259 OID 33331)
-- Name: call_to_action_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.call_to_action_details (
    property_id uuid NOT NULL,
    opened_date date,
    closed_date date,
    compliancy_close_date date,
    completion_percentage numeric(5,2) DEFAULT 0.0,
    policy_id integer,
    compliance_message double precision DEFAULT 100,
    compliance_message_reasons text
);


ALTER TABLE public.call_to_action_details OWNER TO dog;

--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN call_to_action_details.compliance_message; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_details.compliance_message IS 'Compliance Rating towards this CTA from 0-100.  Note in most cases it will be 100, but when the CTA is a subsequent request for which the district is already out of compliance that may not be the case';


--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN call_to_action_details.compliance_message_reasons; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_details.compliance_message_reasons IS 'A description of the factors that went into the compliance rating applied to the current message';


--
-- TOC entry 224 (class 1259 OID 33335)
-- Name: call_to_action_response_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.call_to_action_response_details (
    property_id uuid NOT NULL,
    action_property_id uuid NOT NULL,
    completion_percentage numeric(5,2) DEFAULT 0.0,
    response_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    compliance_message double precision,
    compliance_message_reasons text,
    compliance_aggregate double precision,
    compliance_aggregate_reasons text
);


ALTER TABLE public.call_to_action_response_details OWNER TO dog;

--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN call_to_action_response_details.compliance_message; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_response_details.compliance_message IS 'Compliance rating applied specifically to this message';


--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN call_to_action_response_details.compliance_message_reasons; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_response_details.compliance_message_reasons IS 'Description as to the reasoning behind the message compliance rating';


--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN call_to_action_response_details.compliance_aggregate; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_response_details.compliance_aggregate IS 'Compliance rating applied to all aggregated entries for this call to action';


--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN call_to_action_response_details.compliance_aggregate_reasons; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.call_to_action_response_details.compliance_aggregate_reasons IS 'Description as to the reasoning behind the call to action aggregate compliance rating';


--
-- TOC entry 225 (class 1259 OID 33340)
-- Name: compliance_scores_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.compliance_scores_details (
    property_id uuid NOT NULL,
    action_property_id uuid,
    compliance_score integer,
    violations_found integer DEFAULT 0,
    response_delay_days integer DEFAULT 0,
    overall_grade character varying(10),
    evaluated_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attachment_id integer
);


ALTER TABLE public.compliance_scores_details OWNER TO dog;

--
-- TOC entry 226 (class 1259 OID 33346)
-- Name: contacts; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.contacts (
    contact_id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role_dscr character varying(100),
    is_district_staff boolean DEFAULT false,
    phone character varying(30)
);


ALTER TABLE public.contacts OWNER TO dog;

--
-- TOC entry 227 (class 1259 OID 33352)
-- Name: contacts_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.contacts_contact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_contact_id_seq OWNER TO dog;

--
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 227
-- Name: contacts_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.contacts_contact_id_seq OWNED BY public.contacts.contact_id;


--
-- TOC entry 258 (class 1259 OID 33867)
-- Name: document_units; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.document_units (
    unit_id integer NOT NULL,
    email_id uuid,
    attachment_id integer,
    email_property_id uuid,
    content text,
    document_type character varying(50),
    created_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    embedding_model character varying(255),
    embedded_on timestamp without time zone,
    CONSTRAINT document_type_allowed_values_check CHECK (((document_type)::text = ANY ((ARRAY['email'::character varying, 'attachment'::character varying, 'note'::character varying, 'key_point'::character varying, 'cta_response'::character varying, 'cta'::character varying, 'sentiment'::character varying, 'compliance'::character varying])::text[])))
);


ALTER TABLE public.document_units OWNER TO dog;

--
-- TOC entry 257 (class 1259 OID 33866)
-- Name: document_units_unit_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.document_units_unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_units_unit_id_seq OWNER TO dog;

--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 257
-- Name: document_units_unit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.document_units_unit_id_seq OWNED BY public.document_units.unit_id;


--
-- TOC entry 228 (class 1259 OID 33353)
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_attachments (
    attachment_id integer NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    extracted_text text,
    extracted_text_tsv tsvector,
    policy_id integer,
    summary text,
    email_id uuid NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL
);


ALTER TABLE public.email_attachments OWNER TO dog;

--
-- TOC entry 229 (class 1259 OID 33358)
-- Name: email_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.email_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_attachments_attachment_id_seq OWNER TO dog;

--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 229
-- Name: email_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.email_attachments_attachment_id_seq OWNED BY public.email_attachments.attachment_id;


--
-- TOC entry 230 (class 1259 OID 33359)
-- Name: email_property; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_property (
    property_value text,
    email_property_type_id integer NOT NULL,
    property_id uuid NOT NULL,
    email_id uuid NOT NULL,
    created_on timestamp without time zone
);


ALTER TABLE public.email_property OWNER TO dog;

--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN email_property.property_value; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.email_property.property_value IS 'Property value';


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN email_property.email_property_type_id; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.email_property.email_property_type_id IS 'Foriegn key to the PropertyType table';


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN email_property.property_id; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON COLUMN public.email_property.property_id IS 'Primary key to Property table';


--
-- TOC entry 231 (class 1259 OID 33364)
-- Name: email_property_category; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_property_category (
    email_property_category_id integer NOT NULL,
    description character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_property_category OWNER TO dog;

--
-- TOC entry 232 (class 1259 OID 33368)
-- Name: email_property_category_email_property_category_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.email_property_category_email_property_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_property_category_email_property_category_id_seq OWNER TO dog;

--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 232
-- Name: email_property_category_email_property_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.email_property_category_email_property_category_id_seq OWNED BY public.email_property_category.email_property_category_id;


--
-- TOC entry 233 (class 1259 OID 33369)
-- Name: email_property_type; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_property_type (
    email_property_type_id integer NOT NULL,
    email_property_category_id integer NOT NULL,
    property_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_property_type OWNER TO dog;

--
-- TOC entry 234 (class 1259 OID 33373)
-- Name: email_property_type_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.email_property_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_property_type_id_seq OWNER TO dog;

--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 234
-- Name: email_property_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.email_property_type_id_seq OWNED BY public.email_property_type.email_property_type_id;


--
-- TOC entry 235 (class 1259 OID 33374)
-- Name: email_recipients; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_recipients (
    recipient_id integer NOT NULL,
    email_id uuid NOT NULL,
    recipient_type public.recipient_type DEFAULT 'to'::public.recipient_type NOT NULL
);


ALTER TABLE public.email_recipients OWNER TO dog;

--
-- TOC entry 236 (class 1259 OID 33378)
-- Name: email_sentiment_analysis_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.email_sentiment_analysis_details (
    property_id uuid NOT NULL,
    sentiment_score integer,
    detected_hostility boolean DEFAULT false,
    flagged_phrases text,
    detected_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attachment_id bigint
);


ALTER TABLE public.email_sentiment_analysis_details OWNER TO dog;

--
-- TOC entry 237 (class 1259 OID 33385)
-- Name: emails; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.emails (
    sender_id integer NOT NULL,
    thread_id integer,
    subject text NOT NULL,
    email_contents text NOT NULL,
    sent_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    imported_from_id character varying(20),
    global_message_id character varying(255),
    email_id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid
);


ALTER TABLE public.emails OWNER TO dog;

--
-- TOC entry 238 (class 1259 OID 33392)
-- Name: key_points_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.key_points_details (
    property_id uuid NOT NULL,
    policy_id integer,
    relevance double precision NOT NULL,
    compliance double precision NOT NULL
);


ALTER TABLE public.key_points_details OWNER TO dog;

--
-- TOC entry 239 (class 1259 OID 33395)
-- Name: legal_references; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.legal_references (
    reference_id integer NOT NULL,
    case_name character varying(255) NOT NULL,
    source character varying(255) NOT NULL,
    policy_id integer,
    summary text NOT NULL,
    url text
);


ALTER TABLE public.legal_references OWNER TO dog;

--
-- TOC entry 240 (class 1259 OID 33400)
-- Name: legal_references_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.legal_references_reference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.legal_references_reference_id_seq OWNER TO dog;

--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 240
-- Name: legal_references_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.legal_references_reference_id_seq OWNED BY public.legal_references.reference_id;


--
-- TOC entry 241 (class 1259 OID 33401)
-- Name: policies_statutes; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.policies_statutes (
    policy_id integer NOT NULL,
    policy_type_id integer NOT NULL,
    chapter character varying(50),
    section character varying(50),
    paragraph text,
    description text,
    indexed_file_id text
);


ALTER TABLE public.policies_statutes OWNER TO dog;

--
-- TOC entry 242 (class 1259 OID 33406)
-- Name: policies_statutes_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.policies_statutes_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.policies_statutes_policy_id_seq OWNER TO dog;

--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 242
-- Name: policies_statutes_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.policies_statutes_policy_id_seq OWNED BY public.policies_statutes.policy_id;


--
-- TOC entry 243 (class 1259 OID 33407)
-- Name: policy_types; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.policy_types (
    policy_type_id integer NOT NULL,
    type_name character varying(50) NOT NULL
);


ALTER TABLE public.policy_types OWNER TO dog;

--
-- TOC entry 244 (class 1259 OID 33410)
-- Name: policy_types_policy_type_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.policy_types_policy_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.policy_types_policy_type_id_seq OWNER TO dog;

--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 244
-- Name: policy_types_policy_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.policy_types_policy_type_id_seq OWNED BY public.policy_types.policy_type_id;


--
-- TOC entry 245 (class 1259 OID 33411)
-- Name: sessions; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    "sessionToken" character varying(255) NOT NULL,
    "userId" integer NOT NULL,
    expires timestamp with time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO dog;

--
-- TOC entry 246 (class 1259 OID 33414)
-- Name: sessions_ext; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.sessions_ext (
    session_id integer NOT NULL,
    token_gmail character varying(255)
);


ALTER TABLE public.sessions_ext OWNER TO dog;

--
-- TOC entry 247 (class 1259 OID 33422)
-- Name: sessions_ext_session_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

ALTER TABLE public.sessions_ext ALTER COLUMN session_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sessions_ext_session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 248 (class 1259 OID 33423)
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO dog;

--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 248
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 249 (class 1259 OID 33424)
-- Name: staging_attachment; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.staging_attachment (
    staging_message_id uuid NOT NULL,
    "partId" numeric(4,2) NOT NULL,
    "mimeType" character varying(255),
    "storageId" character varying(2048),
    imported boolean DEFAULT false NOT NULL,
    size integer DEFAULT 0 NOT NULL,
    "attachmentId" text,
    filename text
);


ALTER TABLE public.staging_attachment OWNER TO dog;

--
-- TOC entry 250 (class 1259 OID 33431)
-- Name: staging_message; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.staging_message (
    external_id character varying(20),
    stage public.import_stage_type,
    id uuid NOT NULL,
    message public.email_message_type,
    "userId" integer
);


ALTER TABLE public.staging_message OWNER TO dog;

--
-- TOC entry 251 (class 1259 OID 33436)
-- Name: threads; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.threads (
    thread_id integer NOT NULL,
    subject text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    external_id character varying(255)
);


ALTER TABLE public.threads OWNER TO dog;

--
-- TOC entry 252 (class 1259 OID 33442)
-- Name: threads_thread_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.threads_thread_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.threads_thread_id_seq OWNER TO dog;

--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 252
-- Name: threads_thread_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.threads_thread_id_seq OWNED BY public.threads.thread_id;


--
-- TOC entry 253 (class 1259 OID 33443)
-- Name: users; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255),
    "emailVerified" timestamp with time zone,
    image text
);


ALTER TABLE public.users OWNER TO dog;

--
-- TOC entry 254 (class 1259 OID 33448)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: dog
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO dog;

--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 254
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dog
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 255 (class 1259 OID 33449)
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp with time zone NOT NULL
);


ALTER TABLE public.verification_tokens OWNER TO dog;

--
-- TOC entry 256 (class 1259 OID 33454)
-- Name: violation_details; Type: TABLE; Schema: public; Owner: dog
--

CREATE TABLE public.violation_details (
    property_id uuid NOT NULL,
    attachment_id integer,
    key_point_property_id uuid,
    action_property_id uuid,
    violation_type character varying(255) NOT NULL,
    severity_level integer,
    detected_by character varying(255) DEFAULT 'AI-System'::character varying,
    detected_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.violation_details OWNER TO dog;

--
-- TOC entry 4033 (class 2604 OID 33461)
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- TOC entry 4041 (class 2604 OID 33462)
-- Name: contacts contact_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.contacts ALTER COLUMN contact_id SET DEFAULT nextval('public.contacts_contact_id_seq'::regclass);


--
-- TOC entry 4064 (class 2604 OID 33870)
-- Name: document_units unit_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.document_units ALTER COLUMN unit_id SET DEFAULT nextval('public.document_units_unit_id_seq'::regclass);


--
-- TOC entry 4043 (class 2604 OID 33463)
-- Name: email_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.email_attachments_attachment_id_seq'::regclass);


--
-- TOC entry 4044 (class 2604 OID 33464)
-- Name: email_property_category email_property_category_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property_category ALTER COLUMN email_property_category_id SET DEFAULT nextval('public.email_property_category_email_property_category_id_seq'::regclass);


--
-- TOC entry 4046 (class 2604 OID 33465)
-- Name: email_property_type email_property_type_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property_type ALTER COLUMN email_property_type_id SET DEFAULT nextval('public.email_property_type_id_seq'::regclass);


--
-- TOC entry 4053 (class 2604 OID 33466)
-- Name: legal_references reference_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.legal_references ALTER COLUMN reference_id SET DEFAULT nextval('public.legal_references_reference_id_seq'::regclass);


--
-- TOC entry 4054 (class 2604 OID 33467)
-- Name: policies_statutes policy_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policies_statutes ALTER COLUMN policy_id SET DEFAULT nextval('public.policies_statutes_policy_id_seq'::regclass);


--
-- TOC entry 4055 (class 2604 OID 33468)
-- Name: policy_types policy_type_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policy_types ALTER COLUMN policy_type_id SET DEFAULT nextval('public.policy_types_policy_type_id_seq'::regclass);


--
-- TOC entry 4056 (class 2604 OID 33469)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 4059 (class 2604 OID 33470)
-- Name: threads thread_id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.threads ALTER COLUMN thread_id SET DEFAULT nextval('public.threads_thread_id_seq'::regclass);


--
-- TOC entry 4061 (class 2604 OID 33471)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4068 (class 2606 OID 33473)
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 4072 (class 2606 OID 33475)
-- Name: call_to_action_details call_to_action_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.call_to_action_details
    ADD CONSTRAINT call_to_action_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4075 (class 2606 OID 33477)
-- Name: call_to_action_response_details call_to_action_response_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.call_to_action_response_details
    ADD CONSTRAINT call_to_action_response_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4079 (class 2606 OID 33479)
-- Name: compliance_scores_details compliance_scores_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.compliance_scores_details
    ADD CONSTRAINT compliance_scores_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4070 (class 2606 OID 33481)
-- Name: accounts constraint_userId; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "constraint_userId" UNIQUE ("userId");


--
-- TOC entry 4083 (class 2606 OID 33483)
-- Name: contacts contacts_email_key; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_email_key UNIQUE (email);


--
-- TOC entry 4085 (class 2606 OID 33485)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (contact_id);


--
-- TOC entry 4148 (class 2606 OID 33878)
-- Name: document_units document_units_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.document_units
    ADD CONSTRAINT document_units_pkey PRIMARY KEY (unit_id);


--
-- TOC entry 4087 (class 2606 OID 33487)
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (attachment_id);


--
-- TOC entry 4095 (class 2606 OID 33489)
-- Name: email_property_category email_property_category_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property_category
    ADD CONSTRAINT email_property_category_pkey PRIMARY KEY (email_property_category_id);


--
-- TOC entry 4092 (class 2606 OID 33491)
-- Name: email_property email_property_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property
    ADD CONSTRAINT email_property_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4098 (class 2606 OID 33493)
-- Name: email_property_type email_property_type_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property_type
    ADD CONSTRAINT email_property_type_pkey PRIMARY KEY (email_property_type_id);


--
-- TOC entry 4100 (class 2606 OID 33495)
-- Name: email_recipients email_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_recipients
    ADD CONSTRAINT email_recipients_pkey PRIMARY KEY (email_id, recipient_id);


--
-- TOC entry 4103 (class 2606 OID 33497)
-- Name: email_sentiment_analysis_details email_sentiment_analysis_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_sentiment_analysis_details
    ADD CONSTRAINT email_sentiment_analysis_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4107 (class 2606 OID 33499)
-- Name: emails emails_new_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_new_pkey PRIMARY KEY (email_id);


--
-- TOC entry 4117 (class 2606 OID 33962)
-- Name: policies_statutes indexed_file_id_unique; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policies_statutes
    ADD CONSTRAINT indexed_file_id_unique UNIQUE (indexed_file_id) INCLUDE (indexed_file_id);


--
-- TOC entry 4113 (class 2606 OID 33501)
-- Name: key_points_details key_points_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.key_points_details
    ADD CONSTRAINT key_points_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4115 (class 2606 OID 33503)
-- Name: legal_references legal_references_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.legal_references
    ADD CONSTRAINT legal_references_pkey PRIMARY KEY (reference_id);


--
-- TOC entry 4129 (class 2606 OID 33505)
-- Name: staging_attachment pk_staging_attachment; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.staging_attachment
    ADD CONSTRAINT pk_staging_attachment PRIMARY KEY (staging_message_id, "partId");


--
-- TOC entry 4119 (class 2606 OID 33507)
-- Name: policies_statutes policies_statutes_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policies_statutes
    ADD CONSTRAINT policies_statutes_pkey PRIMARY KEY (policy_id);


--
-- TOC entry 4121 (class 2606 OID 33509)
-- Name: policy_types policy_types_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policy_types
    ADD CONSTRAINT policy_types_pkey PRIMARY KEY (policy_type_id);


--
-- TOC entry 4123 (class 2606 OID 33511)
-- Name: policy_types policy_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policy_types
    ADD CONSTRAINT policy_types_type_name_key UNIQUE (type_name);


--
-- TOC entry 4127 (class 2606 OID 33513)
-- Name: sessions_ext sessions_ext_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.sessions_ext
    ADD CONSTRAINT sessions_ext_pkey PRIMARY KEY (session_id);


--
-- TOC entry 4125 (class 2606 OID 33515)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4132 (class 2606 OID 33517)
-- Name: staging_message staging_message_external_id_key; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.staging_message
    ADD CONSTRAINT staging_message_external_id_key UNIQUE (external_id);


--
-- TOC entry 4134 (class 2606 OID 33519)
-- Name: staging_message staging_message_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.staging_message
    ADD CONSTRAINT staging_message_pkey PRIMARY KEY (id);


--
-- TOC entry 4136 (class 2606 OID 33521)
-- Name: threads threads_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.threads
    ADD CONSTRAINT threads_pkey PRIMARY KEY (thread_id);


--
-- TOC entry 4138 (class 2606 OID 33523)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4140 (class 2606 OID 33525)
-- Name: verification_tokens verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT verification_tokens_pkey PRIMARY KEY (identifier, token);


--
-- TOC entry 4146 (class 2606 OID 33527)
-- Name: violation_details violation_details_pkey; Type: CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.violation_details
    ADD CONSTRAINT violation_details_pkey PRIMARY KEY (property_id);


--
-- TOC entry 4096 (class 1259 OID 33528)
-- Name: email_property_category_property_type_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE UNIQUE INDEX email_property_category_property_type_id ON public.email_property_type USING btree (email_property_category_id, email_property_type_id);


--
-- TOC entry 4093 (class 1259 OID 33529)
-- Name: email_property_unique_idx; Type: INDEX; Schema: public; Owner: dog
--

CREATE UNIQUE INDEX email_property_unique_idx ON public.email_property USING btree (email_id, email_property_type_id, property_id);


--
-- TOC entry 4088 (class 1259 OID 33530)
-- Name: fki_email_attachments_email_fkey; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX fki_email_attachments_email_fkey ON public.email_attachments USING btree (email_id);


--
-- TOC entry 4101 (class 1259 OID 33531)
-- Name: fki_email_recipients_email_id_fkey; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX fki_email_recipients_email_id_fkey ON public.email_recipients USING btree (email_id);


--
-- TOC entry 4108 (class 1259 OID 33532)
-- Name: fki_fk_emails_parent_email; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX fki_fk_emails_parent_email ON public.emails USING btree (parent_id);


--
-- TOC entry 4130 (class 1259 OID 33533)
-- Name: fki_fk_staging_message_users; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX fki_fk_staging_message_users ON public.staging_message USING btree ("userId");


--
-- TOC entry 4089 (class 1259 OID 33534)
-- Name: idx_attachment_search; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_attachment_search ON public.email_attachments USING gin (extracted_text_tsv);


--
-- TOC entry 4073 (class 1259 OID 33535)
-- Name: idx_call_to_action_details_policy_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_call_to_action_details_policy_id ON public.call_to_action_details USING btree (policy_id);


--
-- TOC entry 4076 (class 1259 OID 33536)
-- Name: idx_call_to_action_response_action_property_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_call_to_action_response_action_property_id ON public.call_to_action_response_details USING btree (action_property_id);


--
-- TOC entry 4077 (class 1259 OID 33537)
-- Name: idx_call_to_action_response_timestamp; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_call_to_action_response_timestamp ON public.call_to_action_response_details USING btree (response_timestamp);


--
-- TOC entry 4080 (class 1259 OID 33538)
-- Name: idx_compliance_scores_action_property_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_compliance_scores_action_property_id ON public.compliance_scores_details USING btree (action_property_id);


--
-- TOC entry 4081 (class 1259 OID 33539)
-- Name: idx_compliance_scores_evaluated_on; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_compliance_scores_evaluated_on ON public.compliance_scores_details USING btree (evaluated_on);


--
-- TOC entry 4149 (class 1259 OID 33895)
-- Name: idx_document_units_attachment; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_document_units_attachment ON public.document_units USING btree (attachment_id);


--
-- TOC entry 4150 (class 1259 OID 33894)
-- Name: idx_document_units_email; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_document_units_email ON public.document_units USING btree (email_id);


--
-- TOC entry 4090 (class 1259 OID 33540)
-- Name: idx_email_attachments_email_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_email_attachments_email_id ON public.email_attachments USING btree (email_id);


--
-- TOC entry 4104 (class 1259 OID 33541)
-- Name: idx_email_sentiment_analysis_detected_on; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_email_sentiment_analysis_detected_on ON public.email_sentiment_analysis_details USING btree (detected_on);


--
-- TOC entry 4105 (class 1259 OID 33542)
-- Name: idx_email_sentiment_analysis_sentiment_score; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_email_sentiment_analysis_sentiment_score ON public.email_sentiment_analysis_details USING btree (sentiment_score);


--
-- TOC entry 4109 (class 1259 OID 33543)
-- Name: idx_emails_parent; Type: INDEX; Schema: public; Owner: dog
--

CREATE UNIQUE INDEX idx_emails_parent ON public.emails USING btree (parent_id);


--
-- TOC entry 4110 (class 1259 OID 33544)
-- Name: idx_emails_unique_desc; Type: INDEX; Schema: public; Owner: dog
--

CREATE UNIQUE INDEX idx_emails_unique_desc ON public.emails USING btree (thread_id DESC, sender_id DESC, parent_id DESC, email_id DESC);


--
-- TOC entry 4111 (class 1259 OID 33545)
-- Name: idx_key_points_policy_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_key_points_policy_id ON public.key_points_details USING btree (policy_id);


--
-- TOC entry 4141 (class 1259 OID 33546)
-- Name: idx_violation_details_action_property_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_violation_details_action_property_id ON public.violation_details USING btree (action_property_id);


--
-- TOC entry 4142 (class 1259 OID 33547)
-- Name: idx_violation_details_attachment_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_violation_details_attachment_id ON public.violation_details USING btree (attachment_id);


--
-- TOC entry 4143 (class 1259 OID 33548)
-- Name: idx_violation_details_detected_on; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_violation_details_detected_on ON public.violation_details USING btree (detected_on);


--
-- TOC entry 4144 (class 1259 OID 33549)
-- Name: idx_violation_details_key_point_property_id; Type: INDEX; Schema: public; Owner: dog
--

CREATE INDEX idx_violation_details_key_point_property_id ON public.violation_details USING btree (key_point_property_id);


--
-- TOC entry 4182 (class 2620 OID 33907)
-- Name: email_attachments trigger_document_unit_on_attachment_insert; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_document_unit_on_attachment_insert AFTER INSERT ON public.email_attachments FOR EACH ROW EXECUTE FUNCTION public.insert_document_unit_from_attachment();


--
-- TOC entry 4186 (class 2620 OID 33903)
-- Name: emails trigger_document_unit_on_email_insert; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_document_unit_on_email_insert AFTER INSERT ON public.emails FOR EACH ROW EXECUTE FUNCTION public.insert_document_unit_from_email();


--
-- TOC entry 4184 (class 2620 OID 33913)
-- Name: email_property trigger_document_unit_on_property_insert; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_document_unit_on_property_insert AFTER INSERT ON public.email_property FOR EACH ROW EXECUTE FUNCTION public.insert_document_unit_from_property();


--
-- TOC entry 4183 (class 2620 OID 33909)
-- Name: email_attachments trigger_update_document_unit_on_attachment_update; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_update_document_unit_on_attachment_update AFTER UPDATE ON public.email_attachments FOR EACH ROW EXECUTE FUNCTION public.update_document_unit_from_attachment();


--
-- TOC entry 4187 (class 2620 OID 33905)
-- Name: emails trigger_update_document_unit_on_email_update; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_update_document_unit_on_email_update AFTER UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_document_unit_on_email_update();


--
-- TOC entry 4185 (class 2620 OID 33915)
-- Name: email_property trigger_update_document_unit_on_property_update; Type: TRIGGER; Schema: public; Owner: dog
--

CREATE TRIGGER trigger_update_document_unit_on_property_update AFTER UPDATE ON public.email_property FOR EACH ROW EXECUTE FUNCTION public.update_document_unit_from_property();


--
-- TOC entry 4171 (class 2606 OID 33550)
-- Name: sessions FK_account; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "FK_account" FOREIGN KEY ("userId") REFERENCES public.accounts("userId");


--
-- TOC entry 4172 (class 2606 OID 33555)
-- Name: sessions_ext FK_sessions_ext_sessions; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.sessions_ext
    ADD CONSTRAINT "FK_sessions_ext_sessions" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4151 (class 2606 OID 33999)
-- Name: call_to_action_details call_to_action_details_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.call_to_action_details
    ADD CONSTRAINT call_to_action_details_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4152 (class 2606 OID 34004)
-- Name: call_to_action_response_details call_to_action_response_action_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.call_to_action_response_details
    ADD CONSTRAINT call_to_action_response_action_fk FOREIGN KEY (action_property_id) REFERENCES public.call_to_action_details(property_id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4153 (class 2606 OID 34009)
-- Name: call_to_action_response_details call_to_action_response_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.call_to_action_response_details
    ADD CONSTRAINT call_to_action_response_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4154 (class 2606 OID 33575)
-- Name: compliance_scores_details compliance_scores_action_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.compliance_scores_details
    ADD CONSTRAINT compliance_scores_action_fk FOREIGN KEY (action_property_id) REFERENCES public.email_property(property_id) ON DELETE SET NULL;


--
-- TOC entry 4155 (class 2606 OID 33822)
-- Name: compliance_scores_details compliance_scores_attachment_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.compliance_scores_details
    ADD CONSTRAINT compliance_scores_attachment_fk FOREIGN KEY (attachment_id) REFERENCES public.email_attachments(attachment_id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4156 (class 2606 OID 33580)
-- Name: compliance_scores_details compliance_scores_details_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.compliance_scores_details
    ADD CONSTRAINT compliance_scores_details_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE;


--
-- TOC entry 4179 (class 2606 OID 33884)
-- Name: document_units document_units_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.document_units
    ADD CONSTRAINT document_units_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.email_attachments(attachment_id) ON DELETE CASCADE;


--
-- TOC entry 4180 (class 2606 OID 33879)
-- Name: document_units document_units_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.document_units
    ADD CONSTRAINT document_units_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(email_id) ON DELETE CASCADE;


--
-- TOC entry 4181 (class 2606 OID 33889)
-- Name: document_units document_units_email_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.document_units
    ADD CONSTRAINT document_units_email_property_id_fkey FOREIGN KEY (email_property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE;


--
-- TOC entry 4157 (class 2606 OID 33585)
-- Name: email_attachments email_attachments_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_email_fkey FOREIGN KEY (email_id) REFERENCES public.emails(email_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 4157
-- Name: CONSTRAINT email_attachments_email_fkey ON email_attachments; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON CONSTRAINT email_attachments_email_fkey ON public.email_attachments IS 'Foreign Key into the email table';


--
-- TOC entry 4158 (class 2606 OID 33590)
-- Name: email_attachments email_attachments_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies_statutes(policy_id) ON DELETE SET NULL;


--
-- TOC entry 4159 (class 2606 OID 33595)
-- Name: email_property email_property_email_property_type; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property
    ADD CONSTRAINT email_property_email_property_type FOREIGN KEY (email_property_type_id) REFERENCES public.email_property_type(email_property_type_id);


--
-- TOC entry 4160 (class 2606 OID 33600)
-- Name: email_property email_property_emails; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property
    ADD CONSTRAINT email_property_emails FOREIGN KEY (email_id) REFERENCES public.emails(email_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4161 (class 2606 OID 33605)
-- Name: email_property_type email_property_type_email_property_category; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_property_type
    ADD CONSTRAINT email_property_type_email_property_category FOREIGN KEY (email_property_category_id) REFERENCES public.email_property_category(email_property_category_id) ON DELETE SET NULL;


--
-- TOC entry 4162 (class 2606 OID 33610)
-- Name: email_recipients email_recipients_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_recipients
    ADD CONSTRAINT email_recipients_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(email_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 4162
-- Name: CONSTRAINT email_recipients_email_id_fkey ON email_recipients; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON CONSTRAINT email_recipients_email_id_fkey ON public.email_recipients IS 'Foreign Key into emails table';


--
-- TOC entry 4163 (class 2606 OID 33615)
-- Name: email_recipients email_recipients_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_recipients
    ADD CONSTRAINT email_recipients_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.contacts(contact_id) ON DELETE CASCADE;


--
-- TOC entry 4164 (class 2606 OID 33827)
-- Name: email_sentiment_analysis_details email_sentiment_analysis_attachment; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_sentiment_analysis_details
    ADD CONSTRAINT email_sentiment_analysis_attachment FOREIGN KEY (attachment_id) REFERENCES public.email_attachments(attachment_id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4165 (class 2606 OID 33620)
-- Name: email_sentiment_analysis_details email_sentiment_analysis_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.email_sentiment_analysis_details
    ADD CONSTRAINT email_sentiment_analysis_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE;


--
-- TOC entry 4166 (class 2606 OID 33625)
-- Name: emails emails_relation_1; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_relation_1 FOREIGN KEY (sender_id) REFERENCES public.contacts(contact_id);


--
-- TOC entry 4167 (class 2606 OID 33630)
-- Name: emails fk_emails_parent_email; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT fk_emails_parent_email FOREIGN KEY (parent_id) REFERENCES public.emails(email_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 4167
-- Name: CONSTRAINT fk_emails_parent_email ON emails; Type: COMMENT; Schema: public; Owner: dog
--

COMMENT ON CONSTRAINT fk_emails_parent_email ON public.emails IS 'Attaches an email to it''s parent';


--
-- TOC entry 4173 (class 2606 OID 33635)
-- Name: staging_attachment fk_staging_attachment_staging_message; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.staging_attachment
    ADD CONSTRAINT fk_staging_attachment_staging_message FOREIGN KEY (staging_message_id) REFERENCES public.staging_message(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4174 (class 2606 OID 33640)
-- Name: staging_message fk_staging_message_users; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.staging_message
    ADD CONSTRAINT fk_staging_message_users FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4168 (class 2606 OID 33645)
-- Name: key_points_details key_points_details_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.key_points_details
    ADD CONSTRAINT key_points_details_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE;


--
-- TOC entry 4169 (class 2606 OID 33650)
-- Name: legal_references legal_references_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.legal_references
    ADD CONSTRAINT legal_references_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies_statutes(policy_id) ON DELETE CASCADE;


--
-- TOC entry 4170 (class 2606 OID 33655)
-- Name: policies_statutes policies_statutes_policy_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.policies_statutes
    ADD CONSTRAINT policies_statutes_policy_type_id_fkey FOREIGN KEY (policy_type_id) REFERENCES public.policy_types(policy_type_id) ON DELETE CASCADE;


--
-- TOC entry 4175 (class 2606 OID 33660)
-- Name: violation_details violation_details_action_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.violation_details
    ADD CONSTRAINT violation_details_action_fk FOREIGN KEY (action_property_id) REFERENCES public.call_to_action_details(property_id) ON DELETE SET NULL;


--
-- TOC entry 4176 (class 2606 OID 33665)
-- Name: violation_details violation_details_attachment_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.violation_details
    ADD CONSTRAINT violation_details_attachment_fk FOREIGN KEY (attachment_id) REFERENCES public.email_attachments(attachment_id) ON DELETE SET NULL;


--
-- TOC entry 4177 (class 2606 OID 33670)
-- Name: violation_details violation_details_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.violation_details
    ADD CONSTRAINT violation_details_fk FOREIGN KEY (property_id) REFERENCES public.email_property(property_id) ON DELETE CASCADE;


--
-- TOC entry 4178 (class 2606 OID 33675)
-- Name: violation_details violation_details_key_point_fk; Type: FK CONSTRAINT; Schema: public; Owner: dog
--

ALTER TABLE ONLY public.violation_details
    ADD CONSTRAINT violation_details_key_point_fk FOREIGN KEY (key_point_property_id) REFERENCES public.key_points_details(property_id) ON DELETE SET NULL;


-- Completed on 2025-04-05 02:14:43

--
-- PostgreSQL database dump complete
--

