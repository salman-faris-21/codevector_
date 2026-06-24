// utils/cursor.js

export const encodeCursor = (createdAt, id) => {
  const payload = {
    createdAt,
    id,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
};

export const decodeCursor = (cursor) => {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");

    const payload = JSON.parse(decoded);

    if (!payload.createdAt || payload.id === undefined) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};
