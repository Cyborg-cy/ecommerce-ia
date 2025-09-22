import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  description: Joi.string().allow("", null).optional(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.number().integer().positive().optional(), // opcional
  image_url: Joi.string().uri().allow("", null).optional(),   // 👈 NUEVO
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1),
  description: Joi.string().allow("", null),
  price: Joi.number().positive(),
  stock: Joi.number().integer().min(0),

  // permitir limpiar categoría (enviar null)
  category_id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.valid(null)
  ),

  image_url: Joi.string().uri().allow("", null),               // 👈 NUEVO
}).min(1); // <- causa el error cuando TODO lo desconocido se elimina
