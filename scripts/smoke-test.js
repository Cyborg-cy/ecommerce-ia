// scripts/smoke-test.js
// Smoke test mínimo: prueba el flujo crítico contra un backend corriendo de verdad.
// No reemplaza una suite de tests real, pero detecta rápido si algo básico se rompió.
//
// Uso:
//   BASE_URL=http://localhost:3000 node scripts/smoke-test.js
// (BASE_URL por defecto: http://localhost:3000)

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
}

async function req(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

async function main() {
  console.log(`Smoke test contra ${BASE_URL}\n`);
  const email = `smoke-${Date.now()}@test.com`;
  const password = "smoketest123";

  console.log("Auth");
  const reg = await req("POST", "/users/register", { body: { name: "Smoke Test", email, password } });
  reg.status === 201 ? ok("registro de usuario") : fail("registro de usuario", `HTTP ${reg.status}`);

  const escalation = await req("POST", "/users/register", {
    body: { name: "Attacker", email: `smoke-admin-${Date.now()}@test.com`, password, role: "admin" },
  });
  escalation.data?.role === "user"
    ? ok("registro público ignora role:\"admin\" (no hay escalada de privilegios)")
    : fail("¡registro público permite crear cuentas admin!", `role devuelto: ${escalation.data?.role}`);

  const login = await req("POST", "/auth/login", { body: { email, password } });
  const hasTokens = login.status === 200 && login.data?.accessToken && login.data?.refreshToken;
  hasTokens ? ok("login devuelve accessToken + refreshToken") : fail("login", `HTTP ${login.status}`);
  if (!hasTokens) {
    console.log("\nNo se pudo hacer login, se detiene el smoke test.");
    process.exit(1);
  }
  let { accessToken, refreshToken } = login.data;

  const me = await req("GET", "/orders", { token: accessToken });
  me.status === 200 ? ok("ruta protegida (GET /orders) acepta el accessToken") : fail("GET /orders", `HTTP ${me.status}`);

  const refresh = await req("POST", "/auth/refresh", { body: { refreshToken } });
  refresh.status === 200 && refresh.data?.accessToken
    ? ok("POST /auth/refresh entrega un accessToken nuevo")
    : fail("POST /auth/refresh", `HTTP ${refresh.status}`);

  const logout = await req("POST", "/auth/logout", { body: { refreshToken } });
  logout.status === 200 ? ok("POST /auth/logout revoca sin error") : fail("POST /auth/logout", `HTTP ${logout.status}`);

  const refreshAfterLogout = await req("POST", "/auth/refresh", { body: { refreshToken } });
  refreshAfterLogout.status === 401
    ? ok("refresh token revocado ya no funciona")
    : fail("refresh post-logout debería dar 401", `HTTP ${refreshAfterLogout.status}`);

  console.log("\nProductos");
  const list = await req("GET", "/products");
  list.status === 200 && Array.isArray(list.data?.items)
    ? ok("GET /products lista productos")
    : fail("GET /products", `HTTP ${list.status}`);

  const firstProductId = list.data?.items?.[0]?.id;
  if (firstProductId) {
    const recs = await req("GET", `/products/recommendations/${firstProductId}`);
    recs.status === 200
      ? ok("GET /products/recommendations/:id no revienta")
      : fail("GET /products/recommendations/:id", `HTTP ${recs.status}`);
  }

  const search = await req("GET", "/products/search?q=a");
  search.status === 200
    ? ok("GET /products/search responde 200 (no lo tapa /:id)")
    : fail("GET /products/search", `HTTP ${search.status}`);

  console.log("\nCarrito (requiere sesión nueva, la de arriba quedó revocada)");
  const login2 = await req("POST", "/auth/login", { body: { email, password } });
  const token2 = login2.data?.accessToken;
  const firstProduct = list.data?.items?.[0];
  if (token2 && firstProduct) {
    const add = await req("POST", "/cart/add", {
      token: token2,
      body: { product_id: firstProduct.id, quantity: 1 },
    });
    add.status === 201 ? ok("POST /cart/add agrega un producto") : fail("POST /cart/add", `HTTP ${add.status}`);

    const cart = await req("GET", "/cart", { token: token2 });
    cart.status === 200 && cart.data?.items?.length > 0
      ? ok("GET /cart devuelve el ítem agregado")
      : fail("GET /cart", `HTTP ${cart.status}`);
  } else {
    console.log("  ⚠️  sin productos cargados, se saltan las pruebas de carrito");
  }

  console.log("\nRutas de bypass de pago (deben seguir eliminadas)");
  const badCheckout = await req("POST", "/cart/checkout", { token: token2 });
  badCheckout.status === 404 ? ok("POST /cart/checkout ya no existe (404)") : fail("POST /cart/checkout debería ser 404", `HTTP ${badCheckout.status}`);

  const badOrders = await req("POST", "/orders", { token: token2, body: { items: [] } });
  badOrders.status === 404 ? ok("POST /orders ya no existe (404)") : fail("POST /orders debería ser 404", `HTTP ${badOrders.status}`);

  console.log("\nUploads");
  const uploadNoAuth = await req("POST", "/uploads/image");
  uploadNoAuth.status === 401
    ? ok("POST /uploads/image sin token da 401")
    : fail("POST /uploads/image sin token debería ser 401", `HTTP ${uploadNoAuth.status}`);

  console.log(`\n${passed} OK, ${failed} fallidas`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke test crasheó:", e);
  process.exit(1);
});
