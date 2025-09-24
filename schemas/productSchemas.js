// schemas/productSchemas.js
import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().allow(null, ""),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.number().integer().positive().allow(null),
  image_url: Joi.string().uri().allow(null, ""),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(1),
  description: Joi.string().allow(null, ""),
  price: Joi.number().positive(),
  stock: Joi.number().integer().min(0),
  category_id: Joi.number().integer().positive().allow(null),
  image_url: Joi.string().uri().allow(null, ""),
}).min(1); // al menos 1 campo en updates
