--
-- PostgreSQL database dump
--

\restrict 1iFmwiheepslt5ZQkUjQ5cB5eOdwpzXe4PMvZT65tKfAJFgYw1sfXgxHU28y03f

-- Dumped from database version 17.8 (9c8634e)
-- Dumped by pg_dump version 18.4

-- Started on 2026-05-18 22:07:02 MSK

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
-- TOC entry 5 (class 2615 OID 394020)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- TOC entry 3579 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 394043)
-- Name: Book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Book" (
    id integer NOT NULL,
    title text NOT NULL,
    author text,
    cover_image_url text NOT NULL,
    description text,
    thoughts text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 394074)
-- Name: BookPlacement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookPlacement" (
    "tierListId" text NOT NULL,
    "bookId" integer NOT NULL,
    "tierId" integer,
    rank integer NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 394042)
-- Name: Book_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Book_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3580 (class 0 OID 0)
-- Dependencies: 220
-- Name: Book_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Book_id_seq" OWNED BY public."Book".id;


--
-- TOC entry 235 (class 1259 OID 394205)
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    "userId" integer NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 394204)
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PasswordResetToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3581 (class 0 OID 0)
-- Dependencies: 234
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PasswordResetToken_id_seq" OWNED BY public."PasswordResetToken".id;


--
-- TOC entry 233 (class 1259 OID 394184)
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 232 (class 1259 OID 394183)
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3582 (class 0 OID 0)
-- Dependencies: 232
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- TOC entry 226 (class 1259 OID 394079)
-- Name: Template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Template" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    tiers jsonb NOT NULL,
    default_books jsonb,
    is_public boolean DEFAULT false NOT NULL,
    author_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    type text,
    is_pro_only boolean DEFAULT false NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 394097)
-- Name: TemplateLike; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TemplateLike" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "templateId" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 394096)
-- Name: TemplateLike_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TemplateLike_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3583 (class 0 OID 0)
-- Dependencies: 229
-- Name: TemplateLike_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TemplateLike_id_seq" OWNED BY public."TemplateLike".id;


--
-- TOC entry 224 (class 1259 OID 394065)
-- Name: Tier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tier" (
    id integer NOT NULL,
    "tierListId" text NOT NULL,
    title text NOT NULL,
    color text DEFAULT '#808080'::text NOT NULL,
    rank integer NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 394089)
-- Name: TierListLike; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TierListLike" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "tierListId" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 394088)
-- Name: TierListLike_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TierListLike_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3584 (class 0 OID 0)
-- Dependencies: 227
-- Name: TierListLike_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TierListLike_id_seq" OWNED BY public."TierListLike".id;


--
-- TOC entry 223 (class 1259 OID 394064)
-- Name: Tier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Tier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3585 (class 0 OID 0)
-- Dependencies: 223
-- Name: Tier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Tier_id_seq" OWNED BY public."Tier".id;


--
-- TOC entry 219 (class 1259 OID 394031)
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    username text,
    avatar_url text,
    ai_avatars_generated integer DEFAULT 0 NOT NULL,
    last_avatar_reset_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role_id integer,
    is_pro boolean DEFAULT false NOT NULL,
    pro_expires_at timestamp(3) without time zone,
    xp integer DEFAULT 0 NOT NULL,
    title text DEFAULT 'Новичок'::text
);


--
-- TOC entry 218 (class 1259 OID 394030)
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3586 (class 0 OID 0)
-- Dependencies: 218
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- TOC entry 217 (class 1259 OID 394021)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 241 (class 1259 OID 394249)
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    icon_url text,
    xp_value integer DEFAULT 10 NOT NULL,
    is_secret boolean DEFAULT false NOT NULL,
    requirements jsonb
);


--
-- TOC entry 238 (class 1259 OID 394234)
-- Name: battle_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battle_participants (
    id integer NOT NULL,
    battle_id text NOT NULL,
    tier_list_id text NOT NULL,
    votes_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 237 (class 1259 OID 394233)
-- Name: battle_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.battle_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3587 (class 0 OID 0)
-- Dependencies: 237
-- Name: battle_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.battle_participants_id_seq OWNED BY public.battle_participants.id;


--
-- TOC entry 240 (class 1259 OID 394242)
-- Name: battle_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battle_votes (
    id integer NOT NULL,
    battle_id text NOT NULL,
    user_id integer NOT NULL,
    tier_list_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 239 (class 1259 OID 394241)
-- Name: battle_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.battle_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3588 (class 0 OID 0)
-- Dependencies: 239
-- Name: battle_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.battle_votes_id_seq OWNED BY public.battle_votes.id;


--
-- TOC entry 236 (class 1259 OID 394221)
-- Name: battles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battles (
    id text NOT NULL,
    template_id text NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'weekly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_time timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    winner_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 394107)
-- Name: news_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_articles (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    excerpt text NOT NULL,
    image_url text,
    tags text[],
    author_id integer,
    published_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 394053)
-- Name: tier_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tier_lists (
    id text NOT NULL,
    "userId" integer NOT NULL,
    title text NOT NULL,
    year integer,
    is_template boolean DEFAULT false NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    slug text
);


--
-- TOC entry 243 (class 1259 OID 394259)
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "achievementId" text NOT NULL,
    earned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 394258)
-- Name: user_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3589 (class 0 OID 0)
-- Dependencies: 242
-- Name: user_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_achievements_id_seq OWNED BY public.user_achievements.id;


--
-- TOC entry 3290 (class 2604 OID 394046)
-- Name: Book id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Book" ALTER COLUMN id SET DEFAULT nextval('public."Book_id_seq"'::regclass);


--
-- TOC entry 3310 (class 2604 OID 394208)
-- Name: PasswordResetToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken" ALTER COLUMN id SET DEFAULT nextval('public."PasswordResetToken_id_seq"'::regclass);


--
-- TOC entry 3308 (class 2604 OID 394187)
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- TOC entry 3303 (class 2604 OID 394100)
-- Name: TemplateLike id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLike" ALTER COLUMN id SET DEFAULT nextval('public."TemplateLike_id_seq"'::regclass);


--
-- TOC entry 3296 (class 2604 OID 394068)
-- Name: Tier id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tier" ALTER COLUMN id SET DEFAULT nextval('public."Tier_id_seq"'::regclass);


--
-- TOC entry 3301 (class 2604 OID 394092)
-- Name: TierListLike id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TierListLike" ALTER COLUMN id SET DEFAULT nextval('public."TierListLike_id_seq"'::regclass);


--
-- TOC entry 3283 (class 2604 OID 394034)
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- TOC entry 3316 (class 2604 OID 394237)
-- Name: battle_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_participants ALTER COLUMN id SET DEFAULT nextval('public.battle_participants_id_seq'::regclass);


--
-- TOC entry 3318 (class 2604 OID 394245)
-- Name: battle_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes ALTER COLUMN id SET DEFAULT nextval('public.battle_votes_id_seq'::regclass);


--
-- TOC entry 3322 (class 2604 OID 394262)
-- Name: user_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements ALTER COLUMN id SET DEFAULT nextval('public.user_achievements_id_seq'::regclass);


--
-- TOC entry 3551 (class 0 OID 394043)
-- Dependencies: 221
-- Data for Name: Book; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Book" (id, title, author, cover_image_url, description, thoughts, created_at) FROM stdin;
1	The Hobbit	Tolkien	url_1	\N	\N	2026-05-06 09:18:05.321
2	Harry Potter	J.K. Rowling	url_2	\N	\N	2026-05-06 09:18:06.423
3	Percy Jackson	Rick Riordan	url_3	\N	\N	2026-05-06 09:18:07.517
4	Dune	Frank Herbert	url_4	\N	\N	2026-05-06 09:18:08.605
5	Sherlock Holmes	Arthur Conan Doyle	url_5	\N	\N	2026-05-06 09:18:09.694
6	photo_2026-01-05_11-28-21	Неизвестен	https://res.cloudinary.com/dc3gungyh/image/upload/v1778064595/tiermaker-pro/book-covers/i2gtdnvat0yktgm6ds6y.jpg	\N	\N	2026-05-06 10:49:56.685
7	The Hobbit	Tolkien	url_1	\N	\N	2026-05-06 11:04:01.446
8	Harry Potter	J.K. Rowling	url_2	\N	\N	2026-05-06 11:04:02.717
9	Percy Jackson	Rick Riordan	url_3	\N	\N	2026-05-06 11:04:03.828
10	Dune	Frank Herbert	url_4	\N	\N	2026-05-06 11:04:04.941
11	Sherlock Holmes	Arthur Conan Doyle	url_5	\N	\N	2026-05-06 11:04:06.049
12	Осколки будущего	Светлана Скулкина	https://res.cloudinary.com/dc3gungyh/image/upload/v1778065707/tiermaker-pro/book-covers/zmuiwhjfhlv8ubjkrgzb.jpg	\N	\N	2026-05-06 11:08:29.074
13	Осколки. Сборник рассказов	Сергей Янин	https://res.cloudinary.com/dc3gungyh/image/upload/v1778065718/tiermaker-pro/book-covers/epzjcvflsz92vu8hhukq.jpg	\N	\N	2026-05-06 11:08:40.593
14	photo_2026-02-24_23-32-15	Неизвестен	https://res.cloudinary.com/dc3gungyh/image/upload/v1778153324/tiermaker-pro/book-covers/liw28gedokmxtmwv2mdh.jpg	\N	\N	2026-05-07 11:28:40.657
15	The Hobbit	Tolkien	url_1	\N	\N	2026-05-18 08:20:35.747
16	Harry Potter	J.K. Rowling	url_2	\N	\N	2026-05-18 08:20:37.026
17	Percy Jackson	Rick Riordan	url_3	\N	\N	2026-05-18 08:20:38.288
18	Dune	Frank Herbert	url_4	\N	\N	2026-05-18 08:20:39.547
19	Sherlock Holmes	Arthur Conan Doyle	url_5	\N	\N	2026-05-18 08:20:40.805
20	The Hobbit	Tolkien	url_1	\N	\N	2026-05-18 08:24:10.082
21	Harry Potter	J.K. Rowling	url_2	\N	\N	2026-05-18 08:24:11.421
22	Percy Jackson	Rick Riordan	url_3	\N	\N	2026-05-18 08:24:13.122
23	Dune	Frank Herbert	url_4	\N	\N	2026-05-18 08:24:16.791
24	Sherlock Holmes	Arthur Conan Doyle	url_5	\N	\N	2026-05-18 08:24:19.061
25	Магический Вор	Андрей Левицкий	https://res.cloudinary.com/dc3gungyh/image/upload/v1779097989/tiermaker-pro/book-covers/n2vvmvmuov6xb981rvmi.jpg	\N	\N	2026-05-18 09:53:10.511
26	Магический Вор	Андрей Левицкий	https://res.cloudinary.com/dc3gungyh/image/upload/v1779098000/tiermaker-pro/book-covers/ds0kjrgm7uzsvsg7li8b.jpg	\N	\N	2026-05-18 09:53:24.879
27	Код Эйфории. Или инструкция, как стать Богиней	Алёна Эйфория	https://res.cloudinary.com/dc3gungyh/image/upload/v1779104978/tiermaker-pro/book-covers/aptioodhmlqkiahehtey.jpg	\N	\N	2026-05-18 11:49:39.833
\.


--
-- TOC entry 3555 (class 0 OID 394074)
-- Dependencies: 225
-- Data for Name: BookPlacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BookPlacement" ("tierListId", "bookId", "tierId", rank) FROM stdin;
af1c473d-31b6-4908-8697-ee1f928cfec0	1	1	1
af1c473d-31b6-4908-8697-ee1f928cfec0	2	1	2
af1c473d-31b6-4908-8697-ee1f928cfec0	3	2	1
af1c473d-31b6-4908-8697-ee1f928cfec0	4	\N	1
1e61da73-0fce-4da3-b3ee-921de3a812bb	5	\N	1
ced4fe9a-3250-4de6-b608-9e868687fde6	6	\N	0
daa234ba-6f33-4b68-88e6-9b7bdcef9faa	7	12	1
daa234ba-6f33-4b68-88e6-9b7bdcef9faa	8	12	2
daa234ba-6f33-4b68-88e6-9b7bdcef9faa	9	13	1
daa234ba-6f33-4b68-88e6-9b7bdcef9faa	10	\N	1
0f3b3474-c09b-41d5-8557-113b36a1d38d	11	\N	1
109ea28e-1c51-4618-b2ab-2a96b604767b	13	20	0
c3895c7b-ebd3-4db9-8294-ded2922ed1a7	14	28	0
6fa4850c-cab0-408c-a320-71189e398aeb	15	34	1
6fa4850c-cab0-408c-a320-71189e398aeb	16	34	2
6fa4850c-cab0-408c-a320-71189e398aeb	17	35	1
6fa4850c-cab0-408c-a320-71189e398aeb	18	\N	1
718a6bc0-05f4-4b72-bbc9-bdfa60474220	19	\N	1
3143bcff-0a69-410f-8aee-a16a534ef657	20	40	1
3143bcff-0a69-410f-8aee-a16a534ef657	21	40	2
3143bcff-0a69-410f-8aee-a16a534ef657	22	41	1
3143bcff-0a69-410f-8aee-a16a534ef657	23	\N	1
39286d2f-c545-4a45-9a95-673f8eae6e6d	24	\N	1
71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	25	\N	0
71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	26	\N	0
452cc912-703b-4978-a8ab-a02cf7a72856	27	\N	0
\.


--
-- TOC entry 3565 (class 0 OID 394205)
-- Dependencies: 235
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordResetToken" (id, token, "userId", expires_at, created_at) FROM stdin;
\.


--
-- TOC entry 3563 (class 0 OID 394184)
-- Dependencies: 233
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, name, description, created_at) FROM stdin;
1	admin	Администратор платформы	2026-05-06 09:18:01.1
2	moderator	Модератор контента	2026-05-06 09:18:02.509
3	user	Обычный пользователь	2026-05-06 09:18:03.907
\.


--
-- TOC entry 3556 (class 0 OID 394079)
-- Dependencies: 226
-- Data for Name: Template; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Template" (id, title, description, tiers, default_books, is_public, author_id, created_at, updated_at, type, is_pro_only) FROM stdin;
\.


--
-- TOC entry 3560 (class 0 OID 394097)
-- Dependencies: 230
-- Data for Name: TemplateLike; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TemplateLike" (id, "userId", "templateId", created_at) FROM stdin;
\.


--
-- TOC entry 3554 (class 0 OID 394065)
-- Dependencies: 224
-- Data for Name: Tier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tier" (id, "tierListId", title, color, rank) FROM stdin;
1	af1c473d-31b6-4908-8697-ee1f928cfec0	S	#FFD700	1
2	af1c473d-31b6-4908-8697-ee1f928cfec0	A	#C0C0C0	2
3	74f57e87-8827-472a-b4fc-0878d629bd5c	S	#00FFFF	1
4	74f57e87-8827-472a-b4fc-0878d629bd5c	A	#00FF00	2
5	1e61da73-0fce-4da3-b3ee-921de3a812bb	S	#FF4500	1
6	1e61da73-0fce-4da3-b3ee-921de3a812bb	A	#FF8C00	2
7	ced4fe9a-3250-4de6-b608-9e868687fde6	S	#FF6B6B	0
8	ced4fe9a-3250-4de6-b608-9e868687fde6	A	#4ECDC4	1
9	ced4fe9a-3250-4de6-b608-9e868687fde6	B	#45B7D1	2
10	ced4fe9a-3250-4de6-b608-9e868687fde6	C	#96CEB4	3
11	ced4fe9a-3250-4de6-b608-9e868687fde6	D	#FFEAA7	4
12	daa234ba-6f33-4b68-88e6-9b7bdcef9faa	S	#FFD700	1
13	daa234ba-6f33-4b68-88e6-9b7bdcef9faa	A	#C0C0C0	2
14	2ca3284a-74dc-4594-9a2a-c99055365b59	S	#00FFFF	1
15	2ca3284a-74dc-4594-9a2a-c99055365b59	A	#00FF00	2
16	0f3b3474-c09b-41d5-8557-113b36a1d38d	S	#FF4500	1
17	0f3b3474-c09b-41d5-8557-113b36a1d38d	A	#FF8C00	2
18	109ea28e-1c51-4618-b2ab-2a96b604767b	S	#FF6B6B	0
19	109ea28e-1c51-4618-b2ab-2a96b604767b	A	#4ECDC4	1
20	109ea28e-1c51-4618-b2ab-2a96b604767b	B	#45B7D1	2
21	109ea28e-1c51-4618-b2ab-2a96b604767b	C	#96CEB4	3
22	109ea28e-1c51-4618-b2ab-2a96b604767b	D	#FFEAA7	4
23	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	S	#FF6B6B	0
24	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	A	#4ECDC4	1
25	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	B	#45B7D1	2
26	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	C	#96CEB4	3
27	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	D	#FFEAA7	4
28	c3895c7b-ebd3-4db9-8294-ded2922ed1a7	Новый тир	#008080	5
29	452cc912-703b-4978-a8ab-a02cf7a72856	S	#FF6B6B	0
30	452cc912-703b-4978-a8ab-a02cf7a72856	A	#4ECDC4	1
31	452cc912-703b-4978-a8ab-a02cf7a72856	B	#45B7D1	2
32	452cc912-703b-4978-a8ab-a02cf7a72856	C	#96CEB4	3
33	452cc912-703b-4978-a8ab-a02cf7a72856	D	#FFEAA7	4
46	71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	S	#FF6B6B	0
47	71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	A	#4ECDC4	1
48	71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	B	#45B7D1	2
49	71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	C	#96CEB4	3
50	71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	D	#FFEAA7	4
34	6fa4850c-cab0-408c-a320-71189e398aeb	S	#FFD700	1
35	6fa4850c-cab0-408c-a320-71189e398aeb	A	#C0C0C0	2
36	759ceafc-cf3e-4d5d-9de4-0d89c9976711	S	#00FFFF	1
37	759ceafc-cf3e-4d5d-9de4-0d89c9976711	A	#00FF00	2
38	718a6bc0-05f4-4b72-bbc9-bdfa60474220	S	#FF4500	1
39	718a6bc0-05f4-4b72-bbc9-bdfa60474220	A	#FF8C00	2
40	3143bcff-0a69-410f-8aee-a16a534ef657	S	#FFD700	1
41	3143bcff-0a69-410f-8aee-a16a534ef657	A	#C0C0C0	2
42	f044822e-552a-44ac-8a35-771b53490a18	S	#00FFFF	1
43	f044822e-552a-44ac-8a35-771b53490a18	A	#00FF00	2
44	39286d2f-c545-4a45-9a95-673f8eae6e6d	S	#FF4500	1
45	39286d2f-c545-4a45-9a95-673f8eae6e6d	A	#FF8C00	2
\.


--
-- TOC entry 3558 (class 0 OID 394089)
-- Dependencies: 228
-- Data for Name: TierListLike; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TierListLike" (id, "userId", "tierListId", created_at) FROM stdin;
\.


--
-- TOC entry 3549 (class 0 OID 394031)
-- Dependencies: 219
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, username, avatar_url, ai_avatars_generated, last_avatar_reset_at, password_hash, created_at, role_id, is_pro, pro_expires_at, xp, title) FROM stdin;
6	lifetime@example.com	LifetimePro	\N	0	2026-05-06 09:18:14.706	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:14.706	3	t	\N	0	Новичок
7	free1@example.com	FreeUser1	\N	0	2026-05-06 09:18:15.486	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:15.486	3	f	\N	0	Новичок
8	free2@example.com	FreeUser2	\N	0	2026-05-06 09:18:16.27	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:16.27	3	f	\N	0	Новичок
2	admin@example.com	admin	https://res.cloudinary.com/dc3gungyh/image/upload/v1779094038/tiermaker-pro/avatars/cwfegrlwkxfgvv4dzjo8.jpg	1	2026-05-18 08:47:01.969	$2b$10$a.j.eIejXQvHqn4szrD1JOnHes13WvInrIdeOW9z/qaE0J/1t6xSa	2026-05-06 09:18:11.579	1	t	\N	135	Начинающий книголюб
9	admin2@admin2.ru	admin2	\N	0	2026-05-06 10:47:16.925	$2b$10$..Ugi7.8bMXt85Oil3ARe.oEUa.TfzFrz1xbT4.31j3EHfg0j21q6	2026-05-06 10:47:16.925	3	f	\N	85	Начинающий книголюб
1	fedor@example.com	fedor	\N	0	2026-05-06 09:18:10.789	$2b$10$a.j.eIejXQvHqn4szrD1JOnHes13WvInrIdeOW9z/qaE0J/1t6xSa	2026-05-06 09:18:10.789	1	t	\N	30	Любопытный наблюдатель
3	alina@example.com	\N	\N	0	2026-05-06 09:18:12.358	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:12.358	3	f	\N	0	Новичок
4	pro1@example.com	ProUser1	\N	5	2026-05-06 09:18:13.138	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:13.138	3	t	2026-06-17 08:24:24.81	0	Новичок
5	pro2@example.com	ProUser2	\N	45	2026-05-06 09:18:13.925	$2b$10$3qZRKcv2ET8OxqfEkxLpZuxi7IbVVu8EU5ZWsUKuCS8jMHx6jj5/O	2026-05-06 09:18:13.925	3	t	2026-05-23 08:24:25.75	0	Новичок
\.


--
-- TOC entry 3547 (class 0 OID 394021)
-- Dependencies: 217
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
69499f01-391f-4eb8-8e22-07c57494c2d6	ebb545844f43faa8f1dcbe058384789d5501017aa22053a1abba9449006e1c29	2026-05-06 09:17:10.536144+00	20260323155937_add_new_articles	\N	\N	2026-05-06 09:17:09.605132+00	1
5177eba0-7721-4a3e-8424-abcb177779cb	3eea35f705c20ecf865a2baf4af8418d53581503dde169665992eb4f0f6cb6ef	2026-05-06 09:17:11.574069+00	20260323170000_add_roles_system	\N	\N	2026-05-06 09:17:10.828864+00	1
ab7000f1-5fb4-42cf-86bd-0d2da8e882b5	c70015a6852e47b4f51092dcca570961e64831c3922cab64cddb9a5a7ad08155	2026-05-06 09:17:12.600988+00	20260323184025_fix_role_unique_constraint	\N	\N	2026-05-06 09:17:11.86552+00	1
da50e57d-3ae3-406a-bd13-f37a68aada69	32af507d79a04f1a7d7646786d00f9df09161f0256236e002344c8604bd4aadf	2026-05-06 09:17:13.628167+00	20260324110846_add_template_type	\N	\N	2026-05-06 09:17:12.890901+00	1
0b8ffd6f-562e-49c7-a0e0-da8f603f635f	4f0f930f90aa62d4719632348d1c9507f66299f32e21b464f7b4e9b0098cc309	2026-05-06 09:17:14.649555+00	20260325104730_add_likes_count	\N	\N	2026-05-06 09:17:13.918563+00	1
668ef84e-fec1-477a-a1e9-cba546e3a0ac	0550e191644396292568654ed6de670c29fad16e9bc69180ecaf95c12d3737ce	2026-05-06 09:17:15.667133+00	20260330111631_add_pro_subscription_fields	\N	\N	2026-05-06 09:17:14.939703+00	1
68112cc1-a48c-441e-a921-e367d85616c5	b7287481cff362a89497fbcea199fec5a6331311a00f969f39830331bf9671fd	2026-05-06 09:17:16.703724+00	20260331130157_add_password_reset_token	\N	\N	2026-05-06 09:17:15.957396+00	1
5145ed9b-bfb5-40ba-9e10-558da3e31eb3	606bc4156ab77b0003e212613c849dfa434de38de82f890116f4ccbe8f38328d	2026-05-06 09:17:17.76704+00	20260410160208_add_battles	\N	\N	2026-05-06 09:17:16.994315+00	1
2e66d65e-42cb-4375-b136-828ac290acb3	5071dd9e369393996da27076e288c134081bb55fc9ef187dd92e9d70ef251431	2026-05-06 09:17:18.800141+00	20260430112300_add_performance_indexes	\N	\N	2026-05-06 09:17:18.056915+00	1
61b4019b-e445-4dcd-8372-0606667beab3	f41ed459030361a49102afd1922a10c9172e4e90a946139047a33882b6dfb5d9	2026-05-06 09:17:19.907463+00	20260505080714_add_uuid	\N	\N	2026-05-06 09:17:19.091049+00	1
f72cbe16-38d5-4599-a1d9-f89c1f1f6bba	b7346044371498753f509692b90a4c26b5fc21154b920e24c7805f795a6f46e3	2026-05-06 09:17:20.934959+00	20260505115016_add_fix_05052026	\N	\N	2026-05-06 09:17:20.199151+00	1
6da6548c-2687-4969-a39c-93d6bc35b289	17c24c6a956c43ad715906a444d2a37ae0340f82005881fd663397a8d5b47c34	2026-05-06 09:17:50.145921+00	20260506091748_add_title	\N	\N	2026-05-06 09:17:49.115278+00	1
03a431da-bf42-43de-8bf0-0ef4b68f205b	624f76e1eb8d592646fe3983874bb737d5b0cc21d22e03e8b23199b0c661dca5	2026-05-07 12:52:37.558343+00	20260507125236_add_slug	\N	\N	2026-05-07 12:52:36.794406+00	1
\.


--
-- TOC entry 3571 (class 0 OID 394249)
-- Dependencies: 241
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.achievements (id, title, description, icon_url, xp_value, is_secret, requirements) FROM stdin;
bookworm_1	Начинающий читатель	Добавить 1 книгу в тир-лист	🐛	10	f	\N
bookworm_2	Любитель	Добавить 5 книг в тир-листы	📖	25	f	\N
bookworm_3	Знаток	Добавить 15 книг в тир-листы	🤓	50	f	\N
bookworm_4	Библиофил	Добавить 50 книг в тир-листы	🏛️	100	f	\N
bookworm_5	Вселенский читатель	Добавить 100 книг в тир-листы	🌌	250	f	\N
popular_1	Заметный автор	Получить 10 лайков	👍	15	f	\N
popular_2	Любимец публики	Получить 50 лайков	🌟	40	f	\N
popular_3	Звезда	Получить 200 лайков	⭐	80	f	\N
popular_4	Легенда	Получить 1000 лайков	👑	200	f	\N
critic_1	Начинающий критик	Написать 3 рецензии	✍️	15	f	\N
critic_2	Опытный обозреватель	Написать 10 рецензий	📝	40	f	\N
critic_3	Глас народа	Написать 30 рецензий	📢	80	f	\N
critic_4	Вершитель судеб	Написать 100 рецензий	⚖️	200	f	\N
curator_1	Собиратель	Создать 1 подборку	🗂️	20	f	\N
curator_2	Эксперт	Создать 5 подборок	🎨	50	f	\N
curator_3	Галерист	Создать 20 подборок	🖼️	100	f	\N
fighter_1	Новичок ринга	Участвовать в 1 битве	🥊	10	f	\N
fighter_2	Боец	Участвовать в 10 битвах	🛡️	30	f	\N
fighter_3	Чемпион	Выиграть 5 битв	🏆	75	f	\N
fighter_4	Непобедимый	Выиграть 20 битв	🔥	150	f	\N
secret_lucky	Счастливчик	Найти секретное достижение	🍀	50	t	\N
secret_night	Ночной дожор	Добавить книгу после 3:00 ночи	🦉	50	t	\N
secret_speed	Скорочтение	Добавить 10 книг за час	⚡	50	t	\N
explorer	Исследователь	Сделать форк чужого тир-листа	🧭	15	f	\N
first_tier_list	Первый тир-лист	Вы создали свой первый тир-лист!	🆕	10	f	\N
bibliophile_10	Библиофил 10	Добавлено 10 книг	📚	20	f	\N
bibliophile_50	Библиофил 50	Добавлено 50 книг	📚	50	f	\N
popular_author_10	Популярный автор	Ваш тир-лист получил 10 лайков	❤️	30	f	\N
battle_participant	Участник битвы	Вы приняли участие в битве	⚔️	20	f	\N
battle_winner	Победитель битвы	Вы победили в битве!	🥇	100	f	\N
critic	Критик	Написан первый отзыв	✍️	10	f	\N
\.


--
-- TOC entry 3568 (class 0 OID 394234)
-- Dependencies: 238
-- Data for Name: battle_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.battle_participants (id, battle_id, tier_list_id, votes_count) FROM stdin;
\.


--
-- TOC entry 3570 (class 0 OID 394242)
-- Dependencies: 240
-- Data for Name: battle_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.battle_votes (id, battle_id, user_id, tier_list_id, created_at) FROM stdin;
\.


--
-- TOC entry 3566 (class 0 OID 394221)
-- Dependencies: 236
-- Data for Name: battles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.battles (id, template_id, title, description, type, status, start_time, end_time, winner_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3561 (class 0 OID 394107)
-- Dependencies: 231
-- Data for Name: news_articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.news_articles (id, title, content, excerpt, image_url, tags, author_id, published_at, is_published, created_at, updated_at) FROM stdin;
430c5d5d-738e-4ba6-b12f-85d692841fbd	Новые возможности платформы	Мы рады сообщить о запуске новых функций платформы TierMaker Pro!\n\nТеперь вы можете:\n- Создавать неограниченное количество тир-листов\n- Использовать шаблоны для быстрого старта\n- Делиться своими рейтингами с сообществом\n- Загружать обложки книг через drag-and-drop\n\nСледите за обновлениями!	Обзор новых функций платформы TierMaker Pro	\N	{новинки,обновления}	1	2026-05-06 09:18:28.166	t	2026-05-06 09:18:28.166	2026-05-06 09:18:28.166
a1850338-ce71-41c4-b713-985b563c8a8b	Как создать идеальный тир-лист	Советы по созданию качественных тир-листов:\n\n1. Определите критерии оценки\n2. Выберите подходящую категорию книг\n3. Используйте шаблоны для экономии времени\n4. Не бойтесь экспериментировать с уровнями\n\nПомните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!	Руководство для начинающих	\N	{гайды,советы}	1	2026-05-06 09:18:29.263	t	2026-05-06 09:18:29.263	2026-05-06 09:18:29.263
3e2fc8f4-2821-4305-ab01-ed0a8e7e8731	Топ книг месяца	Подборка популярных книг этого месяца по версии нашего сообщества:\n\n📚 **Фантастика:**\n- "Dune" — Frank Herbert\n- "The Hobbit" — J.R.R. Tolkien\n\n📖 **Фэнтези:**\n- "Harry Potter" — J.K. Rowling\n- "Percy Jackson" — Rick Riordan\n\n🔍 **Детективы:**\n- "Sherlock Holmes" — Arthur Conan Doyle\n\nА какие книги в вашем топе?	Ежемесячная подборка лучших книг	\N	{подборки,рекомендации}	1	2026-05-06 09:18:30.359	t	2026-05-06 09:18:30.359	2026-05-06 09:18:30.359
44a82f37-584d-4333-a0c3-d04d1d6eef45	Новые возможности платформы	Мы рады сообщить о запуске новых функций платформы TierMaker Pro!\n\nТеперь вы можете:\n- Создавать неограниченное количество тир-листов\n- Использовать шаблоны для быстрого старта\n- Делиться своими рейтингами с сообществом\n- Загружать обложки книг через drag-and-drop\n\nСледите за обновлениями!	Обзор новых функций платформы TierMaker Pro	\N	{новинки,обновления}	1	2026-05-06 11:04:25.19	t	2026-05-06 11:04:25.19	2026-05-06 11:04:25.19
6ff4f53c-4dac-4809-b73e-b317c2d1a654	Как создать идеальный тир-лист	Советы по созданию качественных тир-листов:\n\n1. Определите критерии оценки\n2. Выберите подходящую категорию книг\n3. Используйте шаблоны для экономии времени\n4. Не бойтесь экспериментировать с уровнями\n\nПомните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!	Руководство для начинающих	\N	{гайды,советы}	1	2026-05-06 11:04:26.35	t	2026-05-06 11:04:26.35	2026-05-06 11:04:26.35
6dda27f2-daad-4d31-a51a-52fc0b0644ae	Топ книг месяца	Подборка популярных книг этого месяца по версии нашего сообщества:\n\n📚 **Фантастика:**\n- "Dune" — Frank Herbert\n- "The Hobbit" — J.R.R. Tolkien\n\n📖 **Фэнтези:**\n- "Harry Potter" — J.K. Rowling\n- "Percy Jackson" — Rick Riordan\n\n🔍 **Детективы:**\n- "Sherlock Holmes" — Arthur Conan Doyle\n\nА какие книги в вашем топе?	Ежемесячная подборка лучших книг	\N	{подборки,рекомендации}	1	2026-05-06 11:04:27.474	t	2026-05-06 11:04:27.474	2026-05-06 11:04:27.474
b8ab6aa3-c77a-4f31-b84b-0b982f41cd60	Новые возможности платформы	Мы рады сообщить о запуске новых функций платформы TierMaker Pro!\n\nТеперь вы можете:\n- Создавать неограниченное количество тир-листов\n- Использовать шаблоны для быстрого старта\n- Делиться своими рейтингами с сообществом\n- Загружать обложки книг через drag-and-drop\n\nСледите за обновлениями!	Обзор новых функций платформы TierMaker Pro	\N	{новинки,обновления}	1	2026-05-18 08:21:02.139	t	2026-05-18 08:21:02.139	2026-05-18 08:21:02.139
50b9632d-80d5-4bfd-93f8-d21ace1a407f	Как создать идеальный тир-лист	Советы по созданию качественных тир-листов:\n\n1. Определите критерии оценки\n2. Выберите подходящую категорию книг\n3. Используйте шаблоны для экономии времени\n4. Не бойтесь экспериментировать с уровнями\n\nПомните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!	Руководство для начинающих	\N	{гайды,советы}	1	2026-05-18 08:21:03.587	t	2026-05-18 08:21:03.587	2026-05-18 08:21:03.587
b0bae5aa-1b4d-4aca-bc19-6d96d8729ceb	Топ книг месяца	Подборка популярных книг этого месяца по версии нашего сообщества:\n\n📚 **Фантастика:**\n- "Dune" — Frank Herbert\n- "The Hobbit" — J.R.R. Tolkien\n\n📖 **Фэнтези:**\n- "Harry Potter" — J.K. Rowling\n- "Percy Jackson" — Rick Riordan\n\n🔍 **Детективы:**\n- "Sherlock Holmes" — Arthur Conan Doyle\n\nА какие книги в вашем топе?	Ежемесячная подборка лучших книг	\N	{подборки,рекомендации}	1	2026-05-18 08:21:04.847	t	2026-05-18 08:21:04.847	2026-05-18 08:21:04.847
1084e564-fe62-4cae-9f60-687818ae153a	Новые возможности платформы	Мы рады сообщить о запуске новых функций платформы TierMaker Pro!\n\nТеперь вы можете:\n- Создавать неограниченное количество тир-листов\n- Использовать шаблоны для быстрого старта\n- Делиться своими рейтингами с сообществом\n- Загружать обложки книг через drag-and-drop\n\nСледите за обновлениями!	Обзор новых функций платформы TierMaker Pro	\N	{новинки,обновления}	1	2026-05-18 08:24:43.701	t	2026-05-18 08:24:43.701	2026-05-18 08:24:43.701
d32287e8-3112-4e2a-a382-9a68d738a15b	Как создать идеальный тир-лист	Советы по созданию качественных тир-листов:\n\n1. Определите критерии оценки\n2. Выберите подходящую категорию книг\n3. Используйте шаблоны для экономии времени\n4. Не бойтесь экспериментировать с уровнями\n\nПомните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!	Руководство для начинающих	\N	{гайды,советы}	1	2026-05-18 08:24:45.252	t	2026-05-18 08:24:45.252	2026-05-18 08:24:45.252
944a5b8c-5e37-401a-9a6e-e43b09403c62	Топ книг месяца	Подборка популярных книг этого месяца по версии нашего сообщества:\n\n📚 **Фантастика:**\n- "Dune" — Frank Herbert\n- "The Hobbit" — J.R.R. Tolkien\n\n📖 **Фэнтези:**\n- "Harry Potter" — J.K. Rowling\n- "Percy Jackson" — Rick Riordan\n\n🔍 **Детективы:**\n- "Sherlock Holmes" — Arthur Conan Doyle\n\nА какие книги в вашем топе?	Ежемесячная подборка лучших книг	\N	{подборки,рекомендации}	1	2026-05-18 08:24:46.581	t	2026-05-18 08:24:46.581	2026-05-18 08:24:46.581
\.


--
-- TOC entry 3552 (class 0 OID 394053)
-- Dependencies: 222
-- Data for Name: tier_lists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tier_lists (id, "userId", title, year, is_template, is_public, created_at, updated_at, likes_count, slug) FROM stdin;
af1c473d-31b6-4908-8697-ee1f928cfec0	1	Top Fantasy Books	\N	f	f	2026-05-06 09:18:17.206	2026-05-06 09:18:17.206	0	\N
74f57e87-8827-472a-b4fc-0878d629bd5c	1	Top Sci-Fi Books	\N	f	f	2026-05-06 09:18:23.641	2026-05-06 09:18:23.641	0	\N
1e61da73-0fce-4da3-b3ee-921de3a812bb	3	Best Mystery Novels	\N	f	f	2026-05-06 09:18:25.357	2026-05-06 09:18:25.357	0	\N
ced4fe9a-3250-4de6-b608-9e868687fde6	9	test2	\N	f	f	2026-05-06 10:48:26.62	2026-05-06 10:49:59.792	0	\N
daa234ba-6f33-4b68-88e6-9b7bdcef9faa	1	Top Fantasy Books	\N	f	f	2026-05-06 11:04:13.954	2026-05-06 11:04:13.954	0	\N
2ca3284a-74dc-4594-9a2a-c99055365b59	1	Top Sci-Fi Books	\N	f	f	2026-05-06 11:04:20.554	2026-05-06 11:04:20.554	0	\N
0f3b3474-c09b-41d5-8557-113b36a1d38d	3	Best Mystery Novels	\N	f	f	2026-05-06 11:04:22.338	2026-05-06 11:04:22.338	0	\N
109ea28e-1c51-4618-b2ab-2a96b604767b	9	44	\N	f	t	2026-05-06 11:07:33.079	2026-05-06 11:11:34.917	0	\N
c3895c7b-ebd3-4db9-8294-ded2922ed1a7	2	a	\N	f	t	2026-05-07 11:27:05.45	2026-05-07 11:28:44.309	0	\N
452cc912-703b-4978-a8ab-a02cf7a72856	2	ее	\N	f	f	2026-05-07 14:37:06.733	2026-05-07 14:37:06.733	0	ee-9o1wy7
6fa4850c-cab0-408c-a320-71189e398aeb	1	Top Fantasy Books	\N	f	f	2026-05-18 08:20:49.47	2026-05-18 08:20:49.47	0	\N
759ceafc-cf3e-4d5d-9de4-0d89c9976711	1	Top Sci-Fi Books	\N	f	f	2026-05-18 08:20:56.897	2026-05-18 08:20:56.897	0	\N
718a6bc0-05f4-4b72-bbc9-bdfa60474220	3	Best Mystery Novels	\N	f	f	2026-05-18 08:20:58.897	2026-05-18 08:20:58.897	0	\N
3143bcff-0a69-410f-8aee-a16a534ef657	1	Top Fantasy Books	\N	f	f	2026-05-18 08:24:29.564	2026-05-18 08:24:29.564	0	\N
f044822e-552a-44ac-8a35-771b53490a18	1	Top Sci-Fi Books	\N	f	f	2026-05-18 08:24:37.94	2026-05-18 08:24:37.94	0	\N
39286d2f-c545-4a45-9a95-673f8eae6e6d	3	Best Mystery Novels	\N	f	f	2026-05-18 08:24:40.011	2026-05-18 08:24:40.011	0	\N
71b996e6-b5d0-4ce4-abd1-90d4bdcd6a9b	2	test	\N	f	f	2026-05-18 09:46:25.214	2026-05-18 09:46:25.214	0	test-zozmvr
\.


--
-- TOC entry 3573 (class 0 OID 394259)
-- Dependencies: 243
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_achievements (id, "userId", "achievementId", earned_at) FROM stdin;
1	9	curator_1	2026-05-06 11:56:10.305
2	9	first_tier_list	2026-05-06 11:56:14.678
3	9	bookworm_1	2026-05-06 11:56:19.026
4	9	fighter_1	2026-05-06 11:56:25.127
5	9	battle_participant	2026-05-06 11:56:29.462
6	9	explorer	2026-05-06 11:56:34.657
7	1	curator_1	2026-05-06 12:01:44.615
8	1	first_tier_list	2026-05-06 12:01:45.16
9	2	fighter_1	2026-05-07 10:33:39.896
10	2	battle_participant	2026-05-07 10:33:47.226
11	2	explorer	2026-05-07 10:33:51.754
12	2	secret_lucky	2026-05-07 10:35:22.039
13	2	curator_1	2026-05-07 11:27:10.996
14	2	first_tier_list	2026-05-07 11:27:15.05
15	2	bookworm_1	2026-05-07 11:28:47.387
\.


--
-- TOC entry 3590 (class 0 OID 0)
-- Dependencies: 220
-- Name: Book_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Book_id_seq"', 27, true);


--
-- TOC entry 3591 (class 0 OID 0)
-- Dependencies: 234
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PasswordResetToken_id_seq"', 1, false);


--
-- TOC entry 3592 (class 0 OID 0)
-- Dependencies: 232
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Role_id_seq"', 3, true);


--
-- TOC entry 3593 (class 0 OID 0)
-- Dependencies: 229
-- Name: TemplateLike_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TemplateLike_id_seq"', 1, false);


--
-- TOC entry 3594 (class 0 OID 0)
-- Dependencies: 227
-- Name: TierListLike_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TierListLike_id_seq"', 1, false);


--
-- TOC entry 3595 (class 0 OID 0)
-- Dependencies: 223
-- Name: Tier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Tier_id_seq"', 50, true);


--
-- TOC entry 3596 (class 0 OID 0)
-- Dependencies: 218
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 33, true);


--
-- TOC entry 3597 (class 0 OID 0)
-- Dependencies: 237
-- Name: battle_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.battle_participants_id_seq', 1, false);


--
-- TOC entry 3598 (class 0 OID 0)
-- Dependencies: 239
-- Name: battle_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.battle_votes_id_seq', 1, false);


--
-- TOC entry 3599 (class 0 OID 0)
-- Dependencies: 242
-- Name: user_achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_achievements_id_seq', 15, true);


--
-- TOC entry 3345 (class 2606 OID 394313)
-- Name: BookPlacement BookPlacement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookPlacement"
    ADD CONSTRAINT "BookPlacement_pkey" PRIMARY KEY ("tierListId", "bookId");


--
-- TOC entry 3332 (class 2606 OID 394051)
-- Name: Book Book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Book"
    ADD CONSTRAINT "Book_pkey" PRIMARY KEY (id);


--
-- TOC entry 3366 (class 2606 OID 394211)
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- TOC entry 3364 (class 2606 OID 394192)
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- TOC entry 3355 (class 2606 OID 394105)
-- Name: TemplateLike TemplateLike_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLike"
    ADD CONSTRAINT "TemplateLike_pkey" PRIMARY KEY (id);


--
-- TOC entry 3348 (class 2606 OID 394087)
-- Name: Template Template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_pkey" PRIMARY KEY (id);


--
-- TOC entry 3351 (class 2606 OID 394095)
-- Name: TierListLike TierListLike_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TierListLike"
    ADD CONSTRAINT "TierListLike_pkey" PRIMARY KEY (id);


--
-- TOC entry 3341 (class 2606 OID 394073)
-- Name: Tier Tier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tier"
    ADD CONSTRAINT "Tier_pkey" PRIMARY KEY (id);


--
-- TOC entry 3328 (class 2606 OID 394041)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 3325 (class 2606 OID 394029)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3378 (class 2606 OID 394257)
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 3373 (class 2606 OID 394240)
-- Name: battle_participants battle_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_participants
    ADD CONSTRAINT battle_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 3375 (class 2606 OID 394248)
-- Name: battle_votes battle_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_pkey PRIMARY KEY (id);


--
-- TOC entry 3370 (class 2606 OID 394365)
-- Name: battles battles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_pkey PRIMARY KEY (id);


--
-- TOC entry 3360 (class 2606 OID 394373)
-- Name: news_articles news_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_pkey PRIMARY KEY (id);


--
-- TOC entry 3336 (class 2606 OID 394383)
-- Name: tier_lists tier_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_lists
    ADD CONSTRAINT tier_lists_pkey PRIMARY KEY (id);


--
-- TOC entry 3380 (class 2606 OID 394267)
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 3343 (class 1259 OID 394306)
-- Name: BookPlacement_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookPlacement_bookId_idx" ON public."BookPlacement" USING btree ("bookId");


--
-- TOC entry 3346 (class 1259 OID 394121)
-- Name: BookPlacement_tierId_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookPlacement_tierId_rank_idx" ON public."BookPlacement" USING btree ("tierId", rank);


--
-- TOC entry 3367 (class 1259 OID 394213)
-- Name: PasswordResetToken_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_token_idx" ON public."PasswordResetToken" USING btree (token);


--
-- TOC entry 3368 (class 1259 OID 394212)
-- Name: PasswordResetToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON public."PasswordResetToken" USING btree (token);


--
-- TOC entry 3362 (class 1259 OID 394193)
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- TOC entry 3356 (class 1259 OID 394124)
-- Name: TemplateLike_templateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TemplateLike_templateId_idx" ON public."TemplateLike" USING btree ("templateId");


--
-- TOC entry 3357 (class 1259 OID 394125)
-- Name: TemplateLike_userId_templateId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TemplateLike_userId_templateId_key" ON public."TemplateLike" USING btree ("userId", "templateId");


--
-- TOC entry 3349 (class 1259 OID 394200)
-- Name: Template_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Template_type_idx" ON public."Template" USING btree (type);


--
-- TOC entry 3352 (class 1259 OID 394332)
-- Name: TierListLike_tierListId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TierListLike_tierListId_idx" ON public."TierListLike" USING btree ("tierListId");


--
-- TOC entry 3353 (class 1259 OID 394333)
-- Name: TierListLike_userId_tierListId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TierListLike_userId_tierListId_key" ON public."TierListLike" USING btree ("userId", "tierListId");


--
-- TOC entry 3342 (class 1259 OID 394324)
-- Name: Tier_tierListId_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tier_tierListId_rank_idx" ON public."Tier" USING btree ("tierListId", rank);


--
-- TOC entry 3326 (class 1259 OID 394118)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 3329 (class 1259 OID 394119)
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- TOC entry 3330 (class 1259 OID 394307)
-- Name: User_xp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_xp_idx" ON public."User" USING btree (xp);


--
-- TOC entry 3371 (class 1259 OID 394344)
-- Name: battle_participants_battle_id_tier_list_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX battle_participants_battle_id_tier_list_id_key ON public.battle_participants USING btree (battle_id, tier_list_id);


--
-- TOC entry 3376 (class 1259 OID 394354)
-- Name: battle_votes_user_id_battle_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX battle_votes_user_id_battle_id_key ON public.battle_votes USING btree (user_id, battle_id);


--
-- TOC entry 3358 (class 1259 OID 394126)
-- Name: news_articles_is_published_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_articles_is_published_published_at_idx ON public.news_articles USING btree (is_published, published_at);


--
-- TOC entry 3361 (class 1259 OID 394127)
-- Name: news_articles_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_articles_tags_idx ON public.news_articles USING btree (tags);


--
-- TOC entry 3333 (class 1259 OID 394310)
-- Name: tier_lists_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tier_lists_created_at_idx ON public.tier_lists USING btree (created_at);


--
-- TOC entry 3334 (class 1259 OID 394311)
-- Name: tier_lists_likes_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tier_lists_likes_count_idx ON public.tier_lists USING btree (likes_count);


--
-- TOC entry 3337 (class 1259 OID 403016)
-- Name: tier_lists_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tier_lists_slug_key ON public.tier_lists USING btree (slug);


--
-- TOC entry 3338 (class 1259 OID 394308)
-- Name: tier_lists_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tier_lists_userId_idx" ON public.tier_lists USING btree ("userId");


--
-- TOC entry 3339 (class 1259 OID 394309)
-- Name: tier_lists_userId_is_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tier_lists_userId_is_public_idx" ON public.tier_lists USING btree ("userId", is_public);


--
-- TOC entry 3381 (class 1259 OID 394270)
-- Name: user_achievements_userId_achievementId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON public.user_achievements USING btree ("userId", "achievementId");


--
-- TOC entry 3385 (class 2606 OID 394143)
-- Name: BookPlacement BookPlacement_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookPlacement"
    ADD CONSTRAINT "BookPlacement_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3386 (class 2606 OID 394148)
-- Name: BookPlacement BookPlacement_tierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookPlacement"
    ADD CONSTRAINT "BookPlacement_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES public."Tier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3387 (class 2606 OID 394399)
-- Name: BookPlacement BookPlacement_tierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookPlacement"
    ADD CONSTRAINT "BookPlacement_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES public.tier_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3394 (class 2606 OID 394214)
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3391 (class 2606 OID 394173)
-- Name: TemplateLike TemplateLike_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLike"
    ADD CONSTRAINT "TemplateLike_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3392 (class 2606 OID 394168)
-- Name: TemplateLike TemplateLike_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLike"
    ADD CONSTRAINT "TemplateLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3388 (class 2606 OID 394153)
-- Name: Template Template_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3389 (class 2606 OID 394419)
-- Name: TierListLike TierListLike_tierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TierListLike"
    ADD CONSTRAINT "TierListLike_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES public.tier_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3390 (class 2606 OID 394158)
-- Name: TierListLike TierListLike_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TierListLike"
    ADD CONSTRAINT "TierListLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3384 (class 2606 OID 394394)
-- Name: Tier Tier_tierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tier"
    ADD CONSTRAINT "Tier_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES public.tier_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3382 (class 2606 OID 394195)
-- Name: User User_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3396 (class 2606 OID 394404)
-- Name: battle_participants battle_participants_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_participants
    ADD CONSTRAINT battle_participants_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3397 (class 2606 OID 394409)
-- Name: battle_participants battle_participants_tier_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_participants
    ADD CONSTRAINT battle_participants_tier_list_id_fkey FOREIGN KEY (tier_list_id) REFERENCES public.tier_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3398 (class 2606 OID 394414)
-- Name: battle_votes battle_votes_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3399 (class 2606 OID 394291)
-- Name: battle_votes battle_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3395 (class 2606 OID 394271)
-- Name: battles battles_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_template_id_fkey FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3393 (class 2606 OID 394178)
-- Name: news_articles news_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3383 (class 2606 OID 394128)
-- Name: tier_lists tier_lists_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_lists
    ADD CONSTRAINT "tier_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3400 (class 2606 OID 394301)
-- Name: user_achievements user_achievements_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public.achievements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3401 (class 2606 OID 394296)
-- Name: user_achievements user_achievements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-05-18 22:07:23 MSK

--
-- PostgreSQL database dump complete
--

\unrestrict 1iFmwiheepslt5ZQkUjQ5cB5eOdwpzXe4PMvZT65tKfAJFgYw1sfXgxHU28y03f

