--
-- PostgreSQL database dump
--

\restrict b17BujgCHmUL3LAnPxTRe4WZzuIJ7aV8tkAwTDh9QdF9IQgZkw2btPZAbnsuGbH

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: refresh_all_election_statuses(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_all_election_statuses() RETURNS TABLE(election_id integer, old_status character varying, new_status character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_timestamp TIMESTAMP := NOW();
BEGIN
    RETURN QUERY
    UPDATE elections e
    SET status = CASE
        -- Don't change cancelled elections
        WHEN e.status = 'Cancelled' THEN 'Cancelled'
        
        -- Election hasn't started yet
        WHEN current_timestamp < e.start_time THEN 'Scheduled'
        
        -- Election is currently active
        WHEN current_timestamp >= e.start_time AND current_timestamp <= e.end_time THEN 'Active'
        
        -- Election has ended
        WHEN current_timestamp > e.end_time THEN 'Completed'
        
        ELSE e.status
    END,
    updated_at = current_timestamp
    WHERE e.status != CASE
        WHEN e.status = 'Cancelled' THEN 'Cancelled'
        WHEN current_timestamp < e.start_time THEN 'Scheduled'
        WHEN current_timestamp >= e.start_time AND current_timestamp <= e.end_time THEN 'Active'
        WHEN current_timestamp > e.end_time THEN 'Completed'
        ELSE e.status
    END
    RETURNING e.id, 
              (SELECT status FROM elections WHERE id = e.id) as old_status,
              e.status as new_status;
END;
$$;


ALTER FUNCTION public.refresh_all_election_statuses() OWNER TO postgres;

--
-- Name: update_election_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_election_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        
        IF NOW() < NEW.start_time THEN
            NEW.status := 'Scheduled';
        
        ELSIF NOW() BETWEEN NEW.start_time AND NEW.end_time THEN
            NEW.status := 'Ongoing';
        
        ELSIF NOW() > NEW.end_time THEN
            NEW.status := 'Completed';
        
        END IF;
    
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_election_status() OWNER TO postgres;

--
-- Name: update_election_ward_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_election_ward_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE elections 
        SET total_wards = (SELECT COUNT(*) FROM wards WHERE election_id = NEW.election_id)
        WHERE id = NEW.election_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE elections 
        SET total_wards = (SELECT COUNT(*) FROM wards WHERE election_id = OLD.election_id)
        WHERE id = OLD.election_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_election_ward_count() OWNER TO postgres;

--
-- Name: update_ward_voter_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ward_voter_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE wards 
        SET registered_voters_count = (SELECT COUNT(*) FROM voters WHERE ward_id = NEW.ward_id)
        WHERE id = NEW.ward_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE wards 
        SET registered_voters_count = (SELECT COUNT(*) FROM voters WHERE ward_id = OLD.ward_id)
        WHERE id = OLD.ward_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.ward_id != OLD.ward_id THEN
        -- Update both old and new wards
        UPDATE wards 
        SET registered_voters_count = (SELECT COUNT(*) FROM voters WHERE ward_id = OLD.ward_id)
        WHERE id = OLD.ward_id;
        UPDATE wards 
        SET registered_voters_count = (SELECT COUNT(*) FROM voters WHERE ward_id = NEW.ward_id)
        WHERE id = NEW.ward_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_ward_voter_count() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    party character varying(255) NOT NULL,
    symbol text,
    ward_id integer,
    election_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    votes integer DEFAULT 0 NOT NULL,
    updated_by integer
);


ALTER TABLE public.candidates OWNER TO postgres;

--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidates_id_seq OWNER TO postgres;

--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: election_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_admins (
    id integer NOT NULL,
    election_id integer NOT NULL,
    admin_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.election_admins OWNER TO postgres;

--
-- Name: election_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.election_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.election_admins_id_seq OWNER TO postgres;

--
-- Name: election_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.election_admins_id_seq OWNED BY public.election_admins.id;


--
-- Name: elections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.elections (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    election_date date NOT NULL,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    status character varying(50) DEFAULT 'Scheduled'::character varying,
    total_wards integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


ALTER TABLE public.elections OWNER TO postgres;

--
-- Name: elections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.elections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.elections_id_seq OWNER TO postgres;

--
-- Name: elections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.elections_id_seq OWNED BY public.elections.id;


--
-- Name: feedback_and_issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback_and_issues (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    mobile_number character varying(20),
    issue_subject character varying(255) NOT NULL,
    issue text NOT NULL,
    issue_seen boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'open'::character varying,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.feedback_and_issues OWNER TO postgres;

--
-- Name: feedback_and_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_and_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_and_issues_id_seq OWNER TO postgres;

--
-- Name: feedback_and_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_and_issues_id_seq OWNED BY public.feedback_and_issues.id;


--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_verifications (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    otp text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.otp_verifications OWNER TO postgres;

--
-- Name: otp_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.otp_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otp_verifications_id_seq OWNER TO postgres;

--
-- Name: otp_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.otp_verifications_id_seq OWNED BY public.otp_verifications.id;


--
-- Name: password_otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_otp_verifications (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    otp text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_otp_verifications OWNER TO postgres;

--
-- Name: password_otp_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_otp_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_otp_verifications_id_seq OWNER TO postgres;

--
-- Name: password_otp_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_otp_verifications_id_seq OWNED BY public.password_otp_verifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    temp_password text,
    updated_by integer,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['super_admin'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voter_list_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voter_list_uploads (
    id integer NOT NULL,
    ward_id integer,
    election_id integer,
    file_name character varying(255),
    file_path character varying(500),
    total_voters integer DEFAULT 0,
    successful_imports integer DEFAULT 0,
    failed_imports integer DEFAULT 0,
    upload_status character varying(50) DEFAULT 'pending'::character varying,
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone
);


ALTER TABLE public.voter_list_uploads OWNER TO postgres;

--
-- Name: voter_list_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voter_list_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voter_list_uploads_id_seq OWNER TO postgres;

--
-- Name: voter_list_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voter_list_uploads_id_seq OWNED BY public.voter_list_uploads.id;


--
-- Name: voter_login_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voter_login_otps (
    id integer NOT NULL,
    otp text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    verified boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    login_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.voter_login_otps OWNER TO postgres;

--
-- Name: voter_login_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voter_login_otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voter_login_otps_id_seq OWNER TO postgres;

--
-- Name: voter_login_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voter_login_otps_id_seq OWNED BY public.voter_login_otps.id;


--
-- Name: voters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voters (
    id integer NOT NULL,
    voter_id character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    mobile character varying(20) NOT NULL,
    address text,
    ward_id integer,
    election_id integer,
    login_id character varying(255),
    has_voted boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    otp_requests integer DEFAULT 0
);


ALTER TABLE public.voters OWNER TO postgres;

--
-- Name: voters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voters_id_seq OWNER TO postgres;

--
-- Name: voters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voters_id_seq OWNED BY public.voters.id;


--
-- Name: votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.votes (
    id integer NOT NULL,
    election_id integer,
    ward_id integer,
    voter_id character varying(255),
    candidate_id integer,
    blockchain_hash character varying(255) NOT NULL,
    transaction_hash character varying(255),
    voted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.votes OWNER TO postgres;

--
-- Name: votes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.votes_id_seq OWNER TO postgres;

--
-- Name: votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.votes_id_seq OWNED BY public.votes.id;


--
-- Name: wards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wards (
    id integer NOT NULL,
    ward_number character varying(50) NOT NULL,
    ward_name character varying(255) NOT NULL,
    election_id integer,
    constituency character varying(255),
    registered_voters_count integer DEFAULT 0,
    separate_voter_list boolean DEFAULT false,
    description text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    boundary_polygon public.geometry(Polygon,4326),
    votes_cast_count integer DEFAULT 0,
    updated_by integer
);


ALTER TABLE public.wards OWNER TO postgres;

--
-- Name: wards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wards_id_seq OWNER TO postgres;

--
-- Name: wards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wards_id_seq OWNED BY public.wards.id;


--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Name: election_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_admins ALTER COLUMN id SET DEFAULT nextval('public.election_admins_id_seq'::regclass);


--
-- Name: elections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elections ALTER COLUMN id SET DEFAULT nextval('public.elections_id_seq'::regclass);


--
-- Name: feedback_and_issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_and_issues ALTER COLUMN id SET DEFAULT nextval('public.feedback_and_issues_id_seq'::regclass);


--
-- Name: otp_verifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications ALTER COLUMN id SET DEFAULT nextval('public.otp_verifications_id_seq'::regclass);


--
-- Name: password_otp_verifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_otp_verifications ALTER COLUMN id SET DEFAULT nextval('public.password_otp_verifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: voter_list_uploads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_list_uploads ALTER COLUMN id SET DEFAULT nextval('public.voter_list_uploads_id_seq'::regclass);


--
-- Name: voter_login_otps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_login_otps ALTER COLUMN id SET DEFAULT nextval('public.voter_login_otps_id_seq'::regclass);


--
-- Name: voters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters ALTER COLUMN id SET DEFAULT nextval('public.voters_id_seq'::regclass);


--
-- Name: votes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes ALTER COLUMN id SET DEFAULT nextval('public.votes_id_seq'::regclass);


--
-- Name: wards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards ALTER COLUMN id SET DEFAULT nextval('public.wards_id_seq'::regclass);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: election_admins election_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_admins
    ADD CONSTRAINT election_admins_pkey PRIMARY KEY (id);


--
-- Name: elections elections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elections
    ADD CONSTRAINT elections_pkey PRIMARY KEY (id);


--
-- Name: feedback_and_issues feedback_and_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_and_issues
    ADD CONSTRAINT feedback_and_issues_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: password_otp_verifications password_otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_otp_verifications
    ADD CONSTRAINT password_otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: votes unique_vote_per_voter; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT unique_vote_per_voter UNIQUE (election_id, ward_id, voter_id);


--
-- Name: voters unique_voter_election; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT unique_voter_election UNIQUE (voter_id, election_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voter_list_uploads voter_list_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_list_uploads
    ADD CONSTRAINT voter_list_uploads_pkey PRIMARY KEY (id);


--
-- Name: voter_login_otps voter_login_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_login_otps
    ADD CONSTRAINT voter_login_otps_pkey PRIMARY KEY (id);


--
-- Name: voters voters_login_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_login_id_key UNIQUE (login_id);


--
-- Name: voters voters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_pkey PRIMARY KEY (id);


--
-- Name: votes votes_blockchain_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_blockchain_hash_key UNIQUE (blockchain_hash);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- Name: wards wards_election_id_ward_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_election_id_ward_number_key UNIQUE (election_id, ward_number);


--
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- Name: idx_candidates_election; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_election ON public.candidates USING btree (election_id);


--
-- Name: idx_candidates_ward; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidates_ward ON public.candidates USING btree (ward_id);


--
-- Name: idx_issue_seen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_seen ON public.feedback_and_issues USING btree (issue_seen);


--
-- Name: idx_otp_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_email ON public.otp_verifications USING btree (email);


--
-- Name: idx_password_otp_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_otp_email ON public.password_otp_verifications USING btree (email);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_voter_login_otp_login; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voter_login_otp_login ON public.voter_login_otps USING btree (login_id);


--
-- Name: idx_voters_election; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voters_election ON public.voters USING btree (election_id);


--
-- Name: idx_voters_login_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voters_login_id ON public.voters USING btree (login_id);


--
-- Name: idx_voters_ward; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voters_ward ON public.voters USING btree (ward_id);


--
-- Name: idx_votes_blockchain_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_blockchain_hash ON public.votes USING btree (blockchain_hash);


--
-- Name: idx_votes_election; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_election ON public.votes USING btree (election_id);


--
-- Name: idx_votes_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_ip_address ON public.votes USING btree (ip_address);


--
-- Name: idx_votes_ward; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_ward ON public.votes USING btree (ward_id);


--
-- Name: idx_wards_boundary_polygon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wards_boundary_polygon ON public.wards USING gist (boundary_polygon);


--
-- Name: idx_wards_election; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wards_election ON public.wards USING btree (election_id);


--
-- Name: elections trigger_update_election_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_election_status BEFORE INSERT OR UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION public.update_election_status();


--
-- Name: voters trigger_update_voter_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_voter_count AFTER INSERT OR DELETE OR UPDATE ON public.voters FOR EACH ROW EXECUTE FUNCTION public.update_ward_voter_count();


--
-- Name: wards trigger_update_ward_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_ward_count AFTER INSERT OR DELETE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.update_election_ward_count();


--
-- Name: candidates candidates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: candidates candidates_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;


--
-- Name: candidates candidates_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE SET NULL;


--
-- Name: elections elections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elections
    ADD CONSTRAINT elections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: election_admins fk_admin; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_admins
    ADD CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: election_admins fk_election; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_admins
    ADD CONSTRAINT fk_election FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;


--
-- Name: voter_list_uploads voter_list_uploads_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_list_uploads
    ADD CONSTRAINT voter_list_uploads_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;


--
-- Name: voter_list_uploads voter_list_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_list_uploads
    ADD CONSTRAINT voter_list_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: voter_list_uploads voter_list_uploads_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voter_list_uploads
    ADD CONSTRAINT voter_list_uploads_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE CASCADE;


--
-- Name: voters voters_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: voters voters_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;


--
-- Name: voters voters_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE SET NULL;


--
-- Name: votes votes_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: votes votes_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id);


--
-- Name: votes votes_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- Name: wards wards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: wards wards_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO voting_admin;


--
-- Name: TABLE candidates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.candidates TO voting_admin;


--
-- Name: SEQUENCE candidates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.candidates_id_seq TO voting_admin;


--
-- Name: TABLE election_admins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.election_admins TO voting_admin;


--
-- Name: SEQUENCE election_admins_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.election_admins_id_seq TO voting_admin;


--
-- Name: TABLE elections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.elections TO voting_admin;


--
-- Name: SEQUENCE elections_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.elections_id_seq TO voting_admin;


--
-- Name: TABLE feedback_and_issues; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback_and_issues TO voting_admin;


--
-- Name: SEQUENCE feedback_and_issues_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.feedback_and_issues_id_seq TO voting_admin;


--
-- Name: TABLE geography_columns; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.geography_columns TO voting_admin;


--
-- Name: TABLE geometry_columns; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.geometry_columns TO voting_admin;


--
-- Name: TABLE otp_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.otp_verifications TO voting_admin;


--
-- Name: SEQUENCE otp_verifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.otp_verifications_id_seq TO voting_admin;


--
-- Name: TABLE password_otp_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_otp_verifications TO voting_admin;


--
-- Name: SEQUENCE password_otp_verifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_otp_verifications_id_seq TO voting_admin;


--
-- Name: TABLE spatial_ref_sys; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.spatial_ref_sys TO voting_admin;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO voting_admin;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO voting_admin;


--
-- Name: TABLE voter_list_uploads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.voter_list_uploads TO voting_admin;


--
-- Name: SEQUENCE voter_list_uploads_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.voter_list_uploads_id_seq TO voting_admin;


--
-- Name: TABLE voter_login_otps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.voter_login_otps TO voting_admin;


--
-- Name: SEQUENCE voter_login_otps_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.voter_login_otps_id_seq TO voting_admin;


--
-- Name: TABLE voters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.voters TO voting_admin;


--
-- Name: SEQUENCE voters_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.voters_id_seq TO voting_admin;


--
-- Name: TABLE votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.votes TO voting_admin;


--
-- Name: SEQUENCE votes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.votes_id_seq TO voting_admin;


--
-- Name: TABLE wards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wards TO voting_admin;


--
-- Name: SEQUENCE wards_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.wards_id_seq TO voting_admin;


--
-- PostgreSQL database dump complete
--

\unrestrict b17BujgCHmUL3LAnPxTRe4WZzuIJ7aV8tkAwTDh9QdF9IQgZkw2btPZAbnsuGbH

