-- Schema for products table.
--
-- Design notes:
-- 1. We order browsing by (created_at, id) and NEVER by updated_at.
--    This is what makes "browse while data changes" correct: editing
--    an existing product's price/name only touches updated_at, so it
--    cannot move in the already-fixed created_at/id ordering. New
--    products get a fresh created_at and simply appear at the very
--    top (page 1), never inserting themselves into the middle of a
--    page the user has already paginated past.
--
-- 2. The composite index (category, created_at DESC, id DESC) lets
--    Postgres satisfy "filter by category + order by newest + seek
--    past a cursor" with a single index range scan -- no sort step,
--    no full scan, regardless of how deep the user paginates.
--
-- 3. id is included as a tiebreaker because created_at alone is not
--    guaranteed unique (many rows can share a timestamp at this
--    volume). (created_at, id) together is unique and gives a total
--    order, which is required for keyset pagination to be exact.

CREATE TABLE IF NOT EXISTS products (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports: browse all products, newest first, seek by cursor
CREATE INDEX IF NOT EXISTS idx_products_created_id
  ON products (created_at DESC, id DESC);

-- Supports: browse one category, newest first, seek by cursor
CREATE INDEX IF NOT EXISTS idx_products_category_created_id
  ON products (category, created_at DESC, id DESC);

-- Supports: fast "distinct categories" listing for the filter dropdown
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (category);
