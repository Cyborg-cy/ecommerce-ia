// middleware/validate.js  (body-only, soporta Joi/Zod)
export const validate = (schema) => async (req, res, next) => {
  try {
    // Normaliza: si body viene como string JSON, parsearlo primero
    if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
      try {
        req.body = JSON.parse(req.body);
      } catch {}
    }

    // detecta tipo de esquema y valida SOLO req.body
    if (schema?.parseAsync) {
      // Zod
      req.body = await schema.parseAsync(req.body);
    } else if (schema?.safeParse) {
      // Zod (sync)
      const r = schema.safeParse(req.body);
      if (!r.success) throw r.error;
      req.body = r.data;
    } else if (schema?.validateAsync) {
      // Joi
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true, // "123" -> 123
      });
    } else if (schema?.validate) {
      // Joi (sync)
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      if (error) throw error;
      req.body = value;
    } else {
      // esquema desconocido: no validar
    }

    next();
  } catch (err) {
    const details =
      err?.details?.map?.((d) => d.message) ||
      err?.issues?.map?.((i) => i.message) ||
      err?.message ||
      "Validación inválida";
    res.status(400).json({ error: "Validación falló", details });
  }
};
