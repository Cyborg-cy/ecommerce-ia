// schemas/orderSchemas.js
import Joi from "joi";

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "paid", "shipped", "cancelled").required(),
});

// POST /payments/create-intent: dirección de envío del pedido.
// Largos = columnas shipping_* de orders. Todo obligatorio salvo el teléfono.
export const createIntentSchema = Joi.object({
  shipping: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    phone: Joi.string().trim().max(50).allow("", null),
    address_line: Joi.string().trim().min(3).max(255).required(),
    city: Joi.string().trim().min(2).max(120).required(),
    zip: Joi.string().trim().min(3).max(20).required(),
  }).required(),
  // true = guardar también esta dirección en el perfil del usuario
  save_to_profile: Joi.boolean().default(false),
});
