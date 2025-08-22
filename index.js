import express from "express";
import bodyParser from "body-parser";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js"; 
import ordersRouter from "./routes/orders.js";

const app = express();
app.use(bodyParser.json());

// Rutas
app.use("/users", usersRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter); 
app.use("/orders", ordersRouter);

 app.get("/", (req, res) => {
  res.json({ message: "🚀 API E-commerce funcionando correctamente" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
