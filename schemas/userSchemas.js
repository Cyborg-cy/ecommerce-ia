// schemas/userSchemas.js
import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

// PUT /users/me: el usuario edita su propio perfil. Todos los campos son
// opcionales (actualización parcial); "" o null borra el dato. El email y la
// contraseña NO se cambian aquí (requieren confirmar la contraseña actual).
const optionalText = (max) => Joi.string().trim().max(max).allow("", null);

export const updateMeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: optionalText(50),
  address_line: optionalText(255),
  city: optionalText(120),
  zip: optionalText(20),
}).min(1);
