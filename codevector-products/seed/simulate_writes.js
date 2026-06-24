/**
 * Simulates real-world write traffic while someone is browsing:
 * - inserts 25 brand-new products (fresh created_at -> they should
 *   only ever show up at the very top of page 1, never mid-list)
 * - updates 25 random EXISTING products' price/name and bumps
 *   updated_at (their created_at/id stay put, so their position in
 *   the browse order does not change)
 *
 * Run this in a second terminal while you paginate through the API
 * with curl/Postman to see that cursor pagination does not duplicate
 * or skip rows, unlike plain OFFSET pagination would.
 */

import pool from "../src/db/pool.js";
import dotenv from "dotenv";

dotenv.config();
console.log("DATABASE_URL =", process.env.DATABASE_URL);

const CATEGORIES = [
  "Electronics",
  "Home & Kitchen",
  "Books",
  "Clothing",
  "Toys",
  "Sports",
  "Beauty",
  "Automotive",
  "Grocery",
  "Office Supplies",
  "Garden",
  "Pet Supplies",
  "Health",
  "Music",
  "Shoes",
];

async function simulate() {
  const client = await pool.connect();
  try {
    console.log("Inserting 25 new products...");
    await client.query(
      `
      INSERT INTO products (name, category, price, created_at, updated_at)
      SELECT
        'NEW Product ' || g.id || ' - ' || picked.category,
        picked.category,
        round((random() * 2000 + 5)::numeric, 2),
        now(),
        now()
      FROM generate_series(1, 25) AS g(id)
      CROSS JOIN LATERAL (
        SELECT g.id AS _correlate,
               ($1::text[])[1 + floor(random() * array_length($1::text[], 1))::int] AS category
      ) AS picked
      `,
      [CATEGORIES],
    );

    console.log("Updating 25 random existing products...");
    await client.query(
      `
      UPDATE products
      SET price = round((random() * 2000 + 5)::numeric, 2),
          updated_at = now()
      WHERE id IN (
        SELECT id FROM products ORDER BY random() LIMIT 25
      )
      `,
    );

    console.log("Done: +25 inserted, 25 updated.");
  } finally {
    client.release();
    await pool.end();
  }
}

simulate().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
