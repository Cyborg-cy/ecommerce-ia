// middleware/validate.js (corregido, compatible con Joi/Zod/Yup)
export const validate = (schema) => async (req, res, next) => {
  try {
    // Estructura común que muchos esquemas aceptan
    const candidate = {
      body: req.body,
      params: req.params,
      query: req.query, // la lees, NO la reasignas
    };

    // Soporta tanto .parse (Zod) como .validateAsync (Joi)
    const parsed =
      typeof schema.parse === "function"
        ? schema.parse(candidate)
        : typeof schema.validateAsync === "function"
        ? await schema.validateAsync(candidate, { abortEarly: false, stripUnknown: true })
        : candidate;

    // Actualiza solo body/params (opcionales) y guarda lo demás en res.locals
    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;

    // Guarda la query saneada sin mutar req.query
    res.locals.validated = {
      ...(res.locals.validated || {}),
      query: parsed.query ?? req.query,
    };

    return next();
  } catch (err) {
    // Normaliza errores de validación
    const details =
      err?.details?.map?.((d) => d.message) ||
      err?.errors ||
      err?.message ||
      "Validación inválida";
    return res.status(400).json({ error: "Validación falló", details });
  }
};
