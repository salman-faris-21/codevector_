# Product Browser — CodeVector Take-Home

A scalable product browsing API supporting **200,000+ products**, **cursor-based pagination**, **category filtering**, and **concurrent writes** without duplicates or skipped records.

## Tech Stack

- Node.js + Express
- PostgreSQL (Neon)

---

## Features

- Cursor (keyset) pagination
- Category filtering
- Composite indexes for efficient queries
- Efficient seed script generating 200k products
- Correct pagination during concurrent inserts/updates
- Health and statistics endpoints

---

## Project Structure

```text
seed/
  schema.sql
  seed.js
  simulate_writes.js
  test_pagination_stability.js

src/
  controllers/
    productController.js
  db/
    pool.js
  routes/
    products.js
  utils/
    cursor.js
  server.js

public/
  index.html
```

---

## Setup

### Install

```bash
npm install
```

### Configure Environment

```env
DATABASE_URL=<postgres_connection_string>
PORT=3000
```

### Seed Database

```bash
npm run seed
```

Creates schema and generates **200,000 products**.

### Start Server

```bash
npm start
```

Server runs at:

```text
http://localhost:3000
```

---

# API Endpoints

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

---

## Get Products

### First Page

```http
GET /api/products?limit=20
```

Response:

```json
{
  "data": [...],
  "pageInfo": {
    "limit": 20,
    "count": 20,
    "nextCursor": "...",
    "hasMore": true
  }
}
```

### Next Page

```http
GET /api/products?limit=20&cursor=<nextCursor>
```

---

## Filter by Category

```http
GET /api/products?category=Books&limit=20
```

---

## Get Categories

```http
GET /api/products/categories
```

Response:

```json
{
  "categories": ["Books", "Electronics", "Sports"]
}
```

---

## Database Statistics

```http
GET /api/products/stats
```

Response:

```json
{
  "total": "200000",
  "created_last_minute": "0",
  "updated_last_minute": "0"
}
```

---

# Postman Validation Checklist

## 1. Health Check

Request:

```http
GET http://localhost:3000/health
```

Expected:

```json
{
  "status": "ok"
}
```

---

## 2. Verify Seed Data

Request:

```http
GET http://localhost:3000/api/products/stats
```

Expected:

```json
{
  "total": "200000"
}
```

---

## 3. Validate Pagination

Request:

```http
GET http://localhost:3000/api/products?limit=20
```

Verify:

- 20 products returned
- `nextCursor` exists
- `hasMore` is true

Copy `nextCursor`.

Request:

```http
GET http://localhost:3000/api/products?limit=20&cursor=<nextCursor>
```

Verify:

- No duplicate IDs
- Different records returned
- New cursor returned

---

## 4. Validate Category Filter

Request:

```http
GET http://localhost:3000/api/products?category=Books&limit=20
```

Verify:

- All returned products have category = Books

---

## 5. Validate Categories Endpoint

Request:

```http
GET http://localhost:3000/api/products/categories
```

Verify:

- Category list returned
- Contains seeded categories

---

## 6. Validate Invalid Cursor Handling

Request:

```http
GET http://localhost:3000/api/products?cursor=invalid
```

Expected:

```json
{
  "error": "Invalid cursor"
}
```

Status:

```text
400 Bad Request
```

---

# Pagination Design

The API uses **keyset (cursor) pagination** instead of OFFSET/LIMIT.

```sql
SELECT *
FROM products
WHERE (created_at, id) < ($lastCreatedAt, $lastId)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Why not OFFSET?

```sql
OFFSET 100 LIMIT 20
```

Problems:

- Slower as offset increases
- Produces duplicates and skipped rows when new records are inserted

### Why Keyset Pagination?

- Constant-time index seek
- No scan-and-skip
- Stable under concurrent writes
- No duplicates
- No missing records

---

# Indexes

```sql
CREATE INDEX idx_products_created_id
ON products (created_at DESC, id DESC);

CREATE INDEX idx_products_category_created_id
ON products (category, created_at DESC, id DESC);
```

These indexes allow PostgreSQL to satisfy pagination and category-filtered queries using efficient index range scans.

---

# Concurrent Write Validation

### Terminal 1

```bash
npm start
```

### Terminal 2

```bash
node seed/simulate_writes.js
```

This:

- Inserts 25 new products
- Updates 25 random products

### Terminal 3

```bash
node seed/test_pagination_stability.js
```

Expected Output:

```text
PASS: no duplicates seen across pages.
```

This demonstrates that cursor pagination remains correct while data changes.

---

# Efficient Seeding

Instead of executing 200,000 individual INSERT statements, the seed script uses:

```sql
INSERT INTO products (...)
SELECT ...
FROM generate_series(1, 200000);
```

Benefits:

- Single database round trip
- Fast bulk insertion
- Generates 200k rows in a few seconds

---
