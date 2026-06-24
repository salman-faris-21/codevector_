import pool from "../db/pool.js";
import { encodeCursor, decodeCursor } from "../utils/cursor.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const getProducts = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);

    if (!Number.isFinite(limit) || limit <= 0) {
      limit = DEFAULT_LIMIT;
    }

    limit = Math.min(limit, MAX_LIMIT);

    const category = req.query.category || null;

    let cursorObj = null;

    if (req.query.cursor) {
      cursorObj = decodeCursor(req.query.cursor);

      if (!cursorObj) {
        return res.status(400).json({
          error: "Invalid cursor",
        });
      }
    }

    const values = [];
    const whereParts = [];

    if (category) {
      values.push(category);
      whereParts.push(`category = $${values.length}`);
    }

    if (cursorObj) {
      values.push(cursorObj.createdAt);
      values.push(cursorObj.id);

      whereParts.push(
        `(created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::bigint)`,
      );
    }

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    values.push(limit);

    const query = `
      SELECT
        id,
        name,
        category,
        price,
        created_at,
        updated_at
      FROM products
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${values.length}
    `;

    const { rows } = await pool.query(query, values);

    const hasMore = rows.length === limit;
    const lastRow = rows[rows.length - 1];

    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.created_at, lastRow.id) : null;

    return res.status(200).json({
      data: rows,
      pageInfo: {
        limit,
        count: rows.length,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT category
      FROM products
      ORDER BY category
    `);

    return res.status(200).json({
      categories: rows.map((row) => row.category),
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        count(*) AS total,
        count(*) FILTER (
          WHERE created_at > now() - interval '1 minute'
        ) AS created_last_minute,
        count(*) FILTER (
          WHERE updated_at > now() - interval '1 minute'
          AND updated_at > created_at + interval '5 seconds'
        ) AS updated_last_minute
      FROM products
    `);

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Get Stats Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
