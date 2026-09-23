# ecommerce-ia

Tienda en línea con backend propio en Node/Express + Postgres, pagos con Stripe, y frontend en Next.js. Proyecto personal en desarrollo.

## Stack

**Backend** (`/`)
- Node.js + Express 5
- PostgreSQL (`pg`)
- Auth con JWT (access token + refresh token)
- Stripe (Payment Intents + webhook)
- Multer + Cloudinary para subida de imágenes (persistentes; sin Cloudinary configurado cae a disco local, solo válido en dev)
- Joi para validación de body

**Frontend** (`/ecommerce-frontend`)
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Axios (con interceptor de renovación de sesión)
- Stripe Elements

## Estructura

```
/                       backend (Express)
  index.js              punto de entrada, monta todos los routers
  db.js                 conexión a Postgres (pool)
  routes/               un archivo por recurso (auth, users, products, orders, cart, payments, admin, ...)
  middleware/           auth.js (JWT), validate.js (Joi)
  schemas/              esquemas Joi por recurso
  uploads/              imágenes subidas (servidas como estático en /uploads)

ecommerce-frontend/     frontend (Next.js App Router)
  app/(shop)/            tienda: productos, carrito, checkout
  app/(account)/         área de cuenta del usuario
  app/(admin)/            panel admin: productos, categorías, pedidos, usuarios
  lib/                   api-client (axios), auth (contexto de sesión), jwt (decode)
  components/            componentes compartidos (Header, AdminGate, RequireAuth, ...)
```

## Cómo levantarlo en local

### 1. Base de datos

No hay un archivo de schema versionado en el repo todavía — las tablas viven en la base de datos configurada. Para levantar una local con Docker:

```bash
docker run -d --name ecommerce-db \
  -e POSTGRES_USER=irving -e POSTGRES_PASSWORD=password123 -e POSTGRES_DB=ecommerce \
  -p 5432:5432 postgres:15
```

Tablas usadas por el código: `users`, `refresh_tokens`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`. Columnas concretas: ver las queries en `routes/*.js` (o pedir el `schema.sql` reconstruido que se usó para las pruebas de la sesión donde se arreglaron los bugs de este README).

### 2. Backend

```bash
npm install
cp .env.example .env   # completa tus valores (ver abajo)
npm run dev            # nodemon, puerto por defecto 3000
```

Variables de entorno (`.env` en la raíz):

| Variable | Para qué |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME` | conexión a Postgres (si no usas `DATABASE_URL`) |
| `DATABASE_URL` | connection string completa (tiene prioridad sobre las de arriba); si es Render/managed, se fuerza SSL |
| `JWT_SECRET` | firma de los access tokens |
| `JWT_EXPIRES` | vida del access token (ej. `1h`) |
| `REFRESH_TOKEN_EXPIRES_DAYS` | vida del refresh token |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | integración de pagos |
| `CURRENCY` | moneda para Stripe (ej. `usd`) |
| `CORS_ORIGINS` | orígenes permitidos, separados por coma (los `*.vercel.app` siempre se permiten) |
| `UPLOADS_DIR` | carpeta donde se guardan las imágenes subidas (fallback local, no usado si hay Cloudinary) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | subida de imágenes persistente. **Obligatorio en producción** — sin esto las imágenes se guardan en el disco del servidor, que en Render no sobrevive un redeploy |
| `PORT` | puerto del servidor (default 3000) |

### 3. Frontend

```bash
cd ecommerce-frontend
npm install
cp .env.local.example .env.local   # ver abajo
npm run dev -- -p 3001             # el backend ya usa el 3000
```

Variables de entorno (`.env.local` en `ecommerce-frontend/`):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_BASE` | URL del backend (ej. `http://localhost:3000`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | clave pública de Stripe, para el checkout |

## Flujo de pago

El checkout **siempre** pasa por Stripe: el frontend pide un PaymentIntent (`POST /payments/create-intent`), el usuario paga con Stripe Elements, y es el **webhook** (`POST /payments/webhook`) quien confirma el pago y recién ahí crea la orden + descuenta stock. No existe un camino para crear una orden sin pasar por Stripe (se eliminó a propósito por ser un bypass de pago).

## Sesión / auth

- `POST /auth/login` devuelve `{ accessToken, refreshToken }`.
- El access token dura poco (`JWT_EXPIRES`); cuando expira, el frontend lo renueva solo contra `POST /auth/refresh` (interceptor de axios en `lib/api-client.ts`). Si el refresh también falló (revocado o vencido, `REFRESH_TOKEN_EXPIRES_DAYS`), manda a `/login`.
- `POST /auth/logout` revoca el refresh token en el servidor.

## Pendientes conocidos

- No hay `schema.sql` versionado — si se pierde la base de datos actual, hay que reconstruir el schema a mano desde las queries.
- No hay suite de tests completa, solo un smoke test (`npm run smoke-test`, ver abajo).
- El frontend depende de Next.js 15.x; subir a Next 16 cerraría las últimas 2 vulnerabilidades de `npm audit` pero es un cambio mayor que no se hizo todavía.

## Smoke test

Con el backend corriendo (contra una base con al menos un producto cargado), desde la raíz:

```bash
BASE_URL=http://localhost:3000 npm run smoke-test
```

Registra un usuario de prueba con email aleatorio y prueba el flujo básico: registro, login, refresh, listado/búsqueda de productos, carrito, y que las rutas eliminadas de bypass de pago (`POST /orders`, `POST /cart/checkout`) sigan devolviendo 404.
