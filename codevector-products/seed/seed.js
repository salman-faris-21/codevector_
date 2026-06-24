import pool from "../src/db/pool.js";
import fs from "fs";
import { fileURLToPath } from "url";

const TOTAL_PRODUCTS = 200000;

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

async function seed() {
  let client;

  try {
    client = await pool.connect();

    const schemaSql = fs.readFileSync(
      new URL("./schema.sql", import.meta.url),
      "utf8",
    );

    console.log(" Creating schema...");
    await client.query(schemaSql);

    await client.query("TRUNCATE TABLE products RESTART IDENTITY");

    const start = Date.now();

    await client.query(
      `
      INSERT INTO products (
        name,
        category,
        price,
        created_at,
        updated_at
      )
      SELECT
        'Product ' || g.id || ' - ' || picked.category,
        picked.category,
        round((random() * 2000 + 5)::numeric, 2),
        now() - (random() * interval '60 days'),
        now()
      FROM generate_series(1, $1) AS g(id)

      CROSS JOIN LATERAL (
        SELECT
          g.id AS _correlate,
          ($2::text[])[
            1 + floor(
              random() *
              array_length($2::text[], 1)
            )::int
          ] AS category
      ) AS picked
      `,
      [TOTAL_PRODUCTS, CATEGORIES],
    );

    const elapsedMs = Date.now() - start;

    console.log(
      ` Inserted ${TOTAL_PRODUCTS.toLocaleString()} rows in ${elapsedMs} ms`,
    );

    const { rows } = await client.query("SELECT COUNT(*) FROM products");

    console.log(` Row count in database: ${rows[0].count}`);

    console.log(" Running ANALYZE...");
    await client.query("ANALYZE products");

    console.log(" Seeding completed successfully!");
  } catch (err) {
    console.error(" Seed failed:", err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

seed();
