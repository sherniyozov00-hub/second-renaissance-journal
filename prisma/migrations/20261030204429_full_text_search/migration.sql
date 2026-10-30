-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "search_text" TEXT,
ADD COLUMN     "search_vector" tsvector;

-- CreateIndex
CREATE INDEX "Article_search_vector_idx" ON "Article" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "Article_search_text_idx" ON "Article" USING GIN ("search_text" gin_trgm_ops);

-- ─── Full-text search (TZ section 8) ────────────────────────────────────────
-- Uzbek normalisation, identical to searchNormalize() in lib/search/normalize.ts:
-- lower-case, ö/ğ folded, every apostrophe variant removed (o‘zbek → ozbek), so
-- that o‘, o’, o', o` and ö all match each other.
CREATE OR REPLACE FUNCTION uz_search_norm(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT regexp_replace(
    translate(lower(coalesce(input, '')), 'öğ', 'og'),
    '[‘’ʻʼ`´''′]', '', 'g'
  )
$$;

-- Weights: A = titles, keywords, author names; B = abstracts; C = full text.
CREATE OR REPLACE FUNCTION article_search_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  authors text;
  body text;
  head text;
BEGIN
  SELECT string_agg(coalesce(p."fullName", aa.name, ''), ' ')
    INTO authors
    FROM "ArticleAuthor" aa
    LEFT JOIN "AuthorProfile" p ON p.id = aa."authorProfileId"
   WHERE aa."articleId" = NEW.id;

  SELECT regexp_replace(coalesce(v."htmlBody", ''), '<[^>]+>', ' ', 'g')
    INTO body
    FROM "ArticleVersion" v
   WHERE v."articleId" = NEW.id
   ORDER BY v.version DESC
   LIMIT 1;

  head := uz_search_norm(concat_ws(' ', NEW."titleUz", NEW."titleEn", NEW."titleRu",
                                   array_to_string(NEW.keywords, ' '), authors));
  NEW.search_text := head;
  NEW.search_vector :=
       setweight(to_tsvector('simple', head), 'A')
    || setweight(to_tsvector('simple', uz_search_norm(concat_ws(' ', NEW."abstractUz", NEW."abstractEn", NEW."abstractRu"))), 'B')
    || setweight(to_tsvector('simple', uz_search_norm(body)), 'C');
  RETURN NEW;
END
$$;

-- Not on every UPDATE: view/download counters must stay cheap. Child tables
-- touch "search_text" to force a recompute.
CREATE TRIGGER article_search_refresh
BEFORE INSERT OR UPDATE OF "titleUz", "titleEn", "titleRu", "abstractUz", "abstractEn", "abstractRu", "keywords", "search_text"
ON "Article" FOR EACH ROW EXECUTE FUNCTION article_search_trigger();

CREATE OR REPLACE FUNCTION article_search_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE "Article" SET search_text = NULL WHERE id = OLD."articleId";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE "Article" SET search_text = NULL WHERE id = NEW."articleId";
  END IF;
  RETURN NULL;
END
$$;

CREATE TRIGGER article_author_search_touch
AFTER INSERT OR UPDATE OR DELETE ON "ArticleAuthor"
FOR EACH ROW EXECUTE FUNCTION article_search_touch();

CREATE TRIGGER article_version_search_touch
AFTER INSERT OR UPDATE OF "htmlBody" OR DELETE ON "ArticleVersion"
FOR EACH ROW EXECUTE FUNCTION article_search_touch();

CREATE OR REPLACE FUNCTION author_profile_search_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Article" SET search_text = NULL
   WHERE id IN (SELECT "articleId" FROM "ArticleAuthor" WHERE "authorProfileId" = NEW.id);
  RETURN NULL;
END
$$;

CREATE TRIGGER author_profile_search_touch
AFTER UPDATE OF "fullName" ON "AuthorProfile"
FOR EACH ROW EXECUTE FUNCTION author_profile_search_touch();

-- Trigram index for author name search and autocomplete.
CREATE INDEX "AuthorProfile_fullName_trgm_idx" ON "AuthorProfile" USING GIN (uz_search_norm("fullName") gin_trgm_ops);

-- Backfill existing rows.
UPDATE "Article" SET search_text = NULL;
