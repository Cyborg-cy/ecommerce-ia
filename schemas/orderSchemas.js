// schemas/orderSchemas.js
import Joi from "joi";

export const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "paid", "shipped", "cancelled").required(),
});
