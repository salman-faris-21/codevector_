import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import productsRouter from "./routes/products.js";
import pool from "./db/pool.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRouter);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");

    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
startServer();
