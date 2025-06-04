--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: atlas; Type: SCHEMA; Schema: -; Owner: bgcadmin
--

CREATE SCHEMA atlas;


ALTER SCHEMA atlas OWNER TO bgcadmin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: antismash_runs; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.antismash_runs (
    assembly text NOT NULL,
    antismash_version text,
    pipeline_version text,
    run_timestamp timestamp without time zone,
    run_server text,
    res_path text,
    status text,
    queue text
);


ALTER TABLE public.antismash_runs OWNER TO bgcadmin;

--
-- Name: antismash_runs_bk; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.antismash_runs_bk (
    assembly text,
    antismash_version text,
    pipeline_version text,
    run_timestamp timestamp without time zone,
    run_server text,
    res_path text,
    status text,
    queue text
);


ALTER TABLE public.antismash_runs_bk OWNER TO bgcadmin;

--
-- Name: assembly2biome; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.assembly2biome (
    assembly text,
    biome text
);


ALTER TABLE public.assembly2biome OWNER TO bgcadmin;

--
-- Name: assembly2longestbiome; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.assembly2longestbiome (
    assembly text,
    longest_biome text
);


ALTER TABLE public.assembly2longestbiome OWNER TO bgcadmin;

--
-- Name: assembly2longestbiome_copy; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.assembly2longestbiome_copy (
    assembly text,
    longest_biome text,
    level_1 text,
    level_2 text,
    level_3 text,
    level_4 text,
    level_5 text
);


ALTER TABLE public.assembly2longestbiome_copy OWNER TO talamas;

--
-- Name: bgc_taxonomy; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.bgc_taxonomy (
    assembly text,
    contig_name text,
    tax_id integer
);


ALTER TABLE public.bgc_taxonomy OWNER TO talamas;

--
-- Name: bigscape_clustering; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigscape_clustering (
    bgc_name text,
    bgc_type text,
    family_number integer,
    clustering_threshold numeric,
    assembly text
);


ALTER TABLE public.bigscape_clustering OWNER TO bgcadmin;

--
-- Name: bigscape_networks; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigscape_networks (
    clustername1 text,
    clustername2 text,
    raw_distance real,
    squared_similarity real,
    jaccard_index real,
    dss_index real,
    adjacency_index real,
    dss_non_anchor real,
    raw_dss_anchor real,
    non_anchor_domains integer,
    anchor_domains integer,
    combined_group text,
    shared_group text,
    bgc_type text,
    clustering_threshold real
);


ALTER TABLE public.bigscape_networks OWNER TO bgcadmin;

--
-- Name: bigslice_gcf; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigslice_gcf (
    gcf_id integer,
    num_core_regions integer,
    core_products text,
    core_biomes text,
    num_all_regions integer,
    all_products text,
    all_biomes text
);


ALTER TABLE public.bigslice_gcf OWNER TO bgcadmin;

--
-- Name: bigslice_gcf_bk; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigslice_gcf_bk (
    gcf_id integer,
    num_regions bigint,
    products text,
    biomes text
);


ALTER TABLE public.bigslice_gcf_bk OWNER TO bgcadmin;

--
-- Name: bigslice_gcf_membership; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigslice_gcf_membership (
    gcf_id integer,
    bgc_id integer,
    region_id integer,
    membership_value double precision,
    threshold double precision,
    gcf_from_search boolean
);


ALTER TABLE public.bigslice_gcf_membership OWNER TO bgcadmin;

--
-- Name: bigslice_gcf_membership_bk; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.bigslice_gcf_membership_bk (
    gcf_id integer NOT NULL,
    bgc_id integer NOT NULL,
    region_id integer,
    membership_value numeric,
    threshold numeric
);


ALTER TABLE public.bigslice_gcf_membership_bk OWNER TO bgcadmin;

--
-- Name: biomes; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.biomes (
    id character varying NOT NULL,
    samplescount integer,
    biomename text,
    lineage text,
    sampleslink text,
    genomeslink text,
    childrenlink text,
    studieslink text
);


ALTER TABLE public.biomes OWNER TO bgcadmin;

--
-- Name: biomes_id_seq; Type: SEQUENCE; Schema: public; Owner: bgcadmin
--

CREATE SEQUENCE public.biomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.biomes_id_seq OWNER TO bgcadmin;

--
-- Name: biomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bgcadmin
--

ALTER SEQUENCE public.biomes_id_seq OWNED BY public.biomes.id;


--
-- Name: complete_taxdump; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.complete_taxdump (
    tax_id integer,
    parent text,
    rank text,
    name text,
    family_id text,
    genus_id text,
    species_id text
);


ALTER TABLE public.complete_taxdump OWNER TO talamas;

--
-- Name: mgnify_asms; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.mgnify_asms (
    assembly text,
    sampleacc text,
    submittedseqs integer,
    envmat text,
    longitude real,
    latitude real,
    envbiome text,
    collectdate date,
    species text,
    geoloc text,
    biosample text,
    hosttaxid text,
    envfeat text,
    downloadlink text
);


ALTER TABLE public.mgnify_asms OWNER TO bgcadmin;

--
-- Name: mgnify_asms_old; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.mgnify_asms_old (
    assembly text,
    sampleacc text,
    submittedseqs integer,
    envmat text,
    longitude real,
    latitude real,
    envbiome text,
    collectdate date,
    species text,
    geoloc text,
    biosample text,
    hosttaxid text,
    envfeat text,
    downloadlink text
);


ALTER TABLE public.mgnify_asms_old OWNER TO bgcadmin;

--
-- Name: mibig_membership; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.mibig_membership (
    mibig character varying,
    gcf_id integer
);


ALTER TABLE public.mibig_membership OWNER TO bgcadmin;

--
-- Name: protoclusters; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.protoclusters (
    assembly text,
    region text,
    protocluster_num integer,
    category text,
    product text,
    contig_edge text,
    contig text,
    gbk_file text,
    id integer NOT NULL,
    bigslice_bgc_id integer,
    bigslice_gcf_id integer,
    longest_biome character varying
);


ALTER TABLE public.protoclusters OWNER TO bgcadmin;

--
-- Name: protoclusters_bk; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.protoclusters_bk (
    assembly text,
    region text,
    protocluster_num integer,
    category text,
    product text,
    contig_edge text,
    contig text,
    gbk_file text,
    id integer,
    bigslice_bgc_id integer,
    bigslice_gcf_id integer,
    longest_biome character varying
);


ALTER TABLE public.protoclusters_bk OWNER TO bgcadmin;

--
-- Name: protoclusters_id_seq; Type: SEQUENCE; Schema: public; Owner: bgcadmin
--

CREATE SEQUENCE public.protoclusters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.protoclusters_id_seq OWNER TO bgcadmin;

--
-- Name: protoclusters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bgcadmin
--

ALTER SEQUENCE public.protoclusters_id_seq OWNED BY public.protoclusters.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.regions (
    region_id integer NOT NULL,
    assembly character varying(255),
    contig_name character varying(255),
    contig_len integer,
    product_categories text[],
    anchor character varying(255),
    start integer,
    "end" integer,
    contig_edge boolean,
    type character varying(255),
    products text[],
    region_num integer,
    bigslice_region_id integer,
    bigslice_gcf_id integer,
    longest_biome character varying(255),
    membership_value double precision,
    gcf_from_search boolean
);


ALTER TABLE public.regions OWNER TO bgcadmin;

--
-- Name: regions_bk; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.regions_bk (
    region_id integer NOT NULL,
    assembly character varying,
    contig_name character varying,
    contig_len integer,
    product_categories character varying[],
    anchor character varying,
    start integer,
    "end" integer,
    contig_edge boolean,
    type character varying,
    products character varying[],
    region_num integer,
    bigslice_region_id integer,
    bigslice_gcf_id integer,
    longest_biome character varying,
    membership_value numeric
);


ALTER TABLE public.regions_bk OWNER TO bgcadmin;

--
-- Name: regions_new_region_id_seq; Type: SEQUENCE; Schema: public; Owner: bgcadmin
--

CREATE SEQUENCE public.regions_new_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.regions_new_region_id_seq OWNER TO bgcadmin;

--
-- Name: regions_new_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bgcadmin
--

ALTER SEQUENCE public.regions_new_region_id_seq OWNED BY public.regions.region_id;


--
-- Name: regions_regionID_seq; Type: SEQUENCE; Schema: public; Owner: bgcadmin
--

ALTER TABLE public.regions_bk ALTER COLUMN region_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."regions_regionID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: regions_taxonomy; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.regions_taxonomy (
    region_id integer,
    assembly character varying(255),
    contig_name character varying(255),
    contig_len integer,
    product_categories text[],
    anchor character varying(255),
    start integer,
    "end" integer,
    contig_edge boolean,
    type character varying(255),
    products text[],
    region_num integer,
    bigslice_region_id integer,
    bigslice_gcf_id integer,
    longest_biome character varying(255),
    membership_value double precision,
    gcf_from_search boolean,
    tax_id integer
);


ALTER TABLE public.regions_taxonomy OWNER TO talamas;

--
-- Name: sample_metadata; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.sample_metadata (
    sample text,
    meta_key text,
    meta_value text
);


ALTER TABLE public.sample_metadata OWNER TO bgcadmin;

--
-- Name: sample_metadata_old; Type: TABLE; Schema: public; Owner: bgcadmin
--

CREATE TABLE public.sample_metadata_old (
    sample text,
    meta_key text,
    meta_value text
);


ALTER TABLE public.sample_metadata_old OWNER TO bgcadmin;

--
-- Name: taxdump_map; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.taxdump_map (
    tax_id integer NOT NULL,
    parent text,
    rank text,
    name text
);


ALTER TABLE public.taxdump_map OWNER TO talamas;

--
-- Name: taxdump_map_tax_id_seq; Type: SEQUENCE; Schema: public; Owner: talamas
--

CREATE SEQUENCE public.taxdump_map_tax_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.taxdump_map_tax_id_seq OWNER TO talamas;

--
-- Name: taxdump_map_tax_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talamas
--

ALTER SEQUENCE public.taxdump_map_tax_id_seq OWNED BY public.taxdump_map.tax_id;


--
-- Name: taxonomy; Type: TABLE; Schema: public; Owner: talamas
--

CREATE TABLE public.taxonomy (
    assembly text,
    contig_name text,
    tax_id integer
);


ALTER TABLE public.taxonomy OWNER TO talamas;

--
-- Name: protoclusters id; Type: DEFAULT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.protoclusters ALTER COLUMN id SET DEFAULT nextval('public.protoclusters_id_seq'::regclass);


--
-- Name: regions region_id; Type: DEFAULT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.regions ALTER COLUMN region_id SET DEFAULT nextval('public.regions_new_region_id_seq'::regclass);


--
-- Name: taxdump_map tax_id; Type: DEFAULT; Schema: public; Owner: talamas
--

ALTER TABLE ONLY public.taxdump_map ALTER COLUMN tax_id SET DEFAULT nextval('public.taxdump_map_tax_id_seq'::regclass);


--
-- Name: antismash_runs antismash_runs_pk; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.antismash_runs
    ADD CONSTRAINT antismash_runs_pk PRIMARY KEY (assembly);


--
-- Name: regions regions_new_pkey; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_new_pkey PRIMARY KEY (region_id);


--
-- Name: regions_bk regions_pk; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.regions_bk
    ADD CONSTRAINT regions_pk PRIMARY KEY (region_id);


--
-- Name: taxdump_map taxdump_map_pkey; Type: CONSTRAINT; Schema: public; Owner: talamas
--

ALTER TABLE ONLY public.taxdump_map
    ADD CONSTRAINT taxdump_map_pkey PRIMARY KEY (tax_id);


--
-- Name: mgnify_asms unique_assembly; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.mgnify_asms
    ADD CONSTRAINT unique_assembly UNIQUE (assembly);


--
-- Name: biomes unique_id; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.biomes
    ADD CONSTRAINT unique_id UNIQUE (id);


--
-- Name: sample_metadata unique_sample_meta; Type: CONSTRAINT; Schema: public; Owner: bgcadmin
--

ALTER TABLE ONLY public.sample_metadata
    ADD CONSTRAINT unique_sample_meta UNIQUE (sample, meta_key, meta_value);


--
-- Name: asm_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX asm_index ON public.regions USING btree (assembly);


--
-- Name: assembly2biome_assembly_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX assembly2biome_assembly_index ON public.assembly2biome USING btree (assembly);


--
-- Name: assembly2longestbiome_assembly_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX assembly2longestbiome_assembly_index ON public.assembly2longestbiome USING btree (assembly);


--
-- Name: bigslice_gcf_gcf_id_idx; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX bigslice_gcf_gcf_id_idx ON public.bigslice_gcf_bk USING btree (gcf_id);


--
-- Name: bigslice_gcf_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX bigslice_gcf_index ON public.bigslice_gcf_bk USING btree (gcf_id);


--
-- Name: bigslice_gcf_membership_bgc_id_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX bigslice_gcf_membership_bgc_id_index ON public.bigslice_gcf_membership_bk USING btree (bgc_id);


--
-- Name: bigslice_gcf_membership_gcf_id_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX bigslice_gcf_membership_gcf_id_index ON public.bigslice_gcf_membership_bk USING btree (gcf_id);


--
-- Name: idx_assembly_biome; Type: INDEX; Schema: public; Owner: talamas
--

CREATE INDEX idx_assembly_biome ON public.assembly2longestbiome_copy USING btree (assembly);


--
-- Name: idx_assembly_taxonomy; Type: INDEX; Schema: public; Owner: talamas
--

CREATE INDEX idx_assembly_taxonomy ON public.taxonomy USING btree (assembly);


--
-- Name: idx_contig_taxonomy; Type: INDEX; Schema: public; Owner: talamas
--

CREATE INDEX idx_contig_taxonomy ON public.taxonomy USING btree (contig_name);


--
-- Name: idx_taxa_taxonomy; Type: INDEX; Schema: public; Owner: talamas
--

CREATE INDEX idx_taxa_taxonomy ON public.taxonomy USING btree (tax_id);


--
-- Name: idx_taxonomy; Type: INDEX; Schema: public; Owner: talamas
--

CREATE INDEX idx_taxonomy ON public.complete_taxdump USING btree (tax_id);


--
-- Name: protoclusters_assembly_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX protoclusters_assembly_index ON public.protoclusters USING btree (assembly);


--
-- Name: protoclusters_bigslice_bgc_id_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX protoclusters_bigslice_bgc_id_index ON public.protoclusters USING btree (bigslice_bgc_id);


--
-- Name: protoclusters_bigslice_gcf_id_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX protoclusters_bigslice_gcf_id_index ON public.protoclusters USING btree (bigslice_gcf_id);


--
-- Name: region_contig_name_index; Type: INDEX; Schema: public; Owner: bgcadmin
--

CREATE INDEX region_contig_name_index ON public.regions USING btree (contig_name);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON SCHEMA public TO talamas;


--
-- Name: TABLE antismash_runs; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.antismash_runs TO talamas;


--
-- Name: TABLE antismash_runs_bk; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.antismash_runs_bk TO talamas;


--
-- Name: TABLE assembly2biome; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.assembly2biome TO talamas;


--
-- Name: TABLE assembly2longestbiome; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.assembly2longestbiome TO talamas;


--
-- Name: TABLE bigscape_clustering; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigscape_clustering TO talamas;


--
-- Name: TABLE bigscape_networks; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigscape_networks TO talamas;


--
-- Name: TABLE bigslice_gcf; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigslice_gcf TO talamas;


--
-- Name: TABLE bigslice_gcf_bk; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigslice_gcf_bk TO talamas;


--
-- Name: TABLE bigslice_gcf_membership; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigslice_gcf_membership TO talamas;


--
-- Name: TABLE bigslice_gcf_membership_bk; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.bigslice_gcf_membership_bk TO talamas;


--
-- Name: TABLE biomes; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.biomes TO talamas;


--
-- Name: TABLE mgnify_asms; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.mgnify_asms TO talamas;


--
-- Name: TABLE mgnify_asms_old; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.mgnify_asms_old TO talamas;


--
-- Name: TABLE mibig_membership; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.mibig_membership TO talamas;


--
-- Name: TABLE protoclusters; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.protoclusters TO talamas;


--
-- Name: TABLE protoclusters_bk; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.protoclusters_bk TO talamas;


--
-- Name: TABLE regions; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.regions TO talamas;


--
-- Name: TABLE regions_bk; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.regions_bk TO talamas;


--
-- Name: TABLE sample_metadata; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sample_metadata TO talamas;


--
-- Name: TABLE sample_metadata_old; Type: ACL; Schema: public; Owner: bgcadmin
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sample_metadata_old TO talamas;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: bgcadmin
--

ALTER DEFAULT PRIVILEGES FOR ROLE bgcadmin IN SCHEMA public GRANT SELECT,INSERT,UPDATE ON TABLES  TO talamas;


--
-- PostgreSQL database dump complete
--

