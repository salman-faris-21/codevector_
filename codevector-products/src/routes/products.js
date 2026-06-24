import express from "express";
import {
  getProducts,
  getCategories,
  getStats,
} from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/", getProducts);
productRouter.get("/categories", getCategories);
productRouter.get("/stats", getStats);

export default productRouter;
