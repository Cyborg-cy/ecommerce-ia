// schemas/orderSchemas.js
import Joi from "joi";

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "paid", "shipped", "cancelled").required(),
});
