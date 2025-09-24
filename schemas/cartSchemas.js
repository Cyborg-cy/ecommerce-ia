// schemas/cartSchemas.js
import Joi from "joi";

export const addToCartSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});
