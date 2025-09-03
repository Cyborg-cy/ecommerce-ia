// schemas/productSchemas.js
import Joi from "joi";

export const createProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow("", null),
    price: Joi.number().min(0).required(),
    stock: Joi.number().integer().min(0).required(),
    category_id: Joi.number().integer().positive().required(),
  }).required(),
});

export const updateProductSchema = Joi.object({
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().allow("", null),
    price: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category_id: Joi.number().integer().positive(),
  }).min(1), // Al menos un campo para actualizar
});
