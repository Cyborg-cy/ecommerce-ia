// schemas/cartSchemas.js
import Joi from "joi";

export const addToCartSchema = Joi.object({
  body: Joi.object({
    product_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).required(),
  }).required(),
});

export const updateCartItemSchema = Joi.object({
  params: Joi.object({
    productId: Joi.number().integer().positive().required(),
  }).required(),
  body: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
  }).required(),
});
