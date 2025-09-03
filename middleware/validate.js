// middleware/validate.js
export const validate = (schema) => (req, res, next) => {
  const toValidate = {
    body: req.body,
    params: req.params,
    query: req.query,
  };
  const { error, value } = schema.validate(toValidate, { abortEarly: false, allowUnknown: true });
  if (error) {
    return res.status(400).json({
      error: "Datos inválidos",
      details: error.details.map(d => d.message),
    });
  }
  // opcional: asignar value normalizado
  req.body = value.body ?? req.body;
  req.params = value.params ?? req.params;
  req.query = value.query ?? req.query;
  next();
};
