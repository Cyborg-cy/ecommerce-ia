// schemas/orderSchemas.js
import Joi from "joi";

export const createOrderSchema = Joi.object({
  body: Joi.object({
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
  }).required(),
});

export const updateOrderStatusSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  body: Joi.object({
    status: Joi.string().valid("pending", "paid", "shipped", "cancelled").required(),
  }).required(),
});
