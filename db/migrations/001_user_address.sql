-- 001: dirección de envío guardada en el perfil del usuario.
-- Mismos tipos que las columnas shipping_* de orders, para poder copiarlas
-- al pedido tal cual en el checkout.
-- IF NOT EXISTS: se puede correr más de una vez sin error.
-- (Temporal hasta que las migraciones pasen a Prisma.)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone        character varying(50),
  ADD COLUMN IF NOT EXISTS address_line character varying(255),
  ADD COLUMN IF NOT EXISTS city         character varying(120),
  ADD COLUMN IF NOT EXISTS zip          character varying(20);
