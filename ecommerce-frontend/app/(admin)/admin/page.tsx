"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api-client";

type Stats = {
  total_products: number;
  total_users: number;
  total_orders: number;
  revenue_paid: number;
  orders_by_status: { status: string; count: number }[];
};

type Order = {
  id: number;
  status: string;
  payment_status?: string | null;
  total?: number | string | null;
  created_at?: string;
  email?: string;
};

type Product = {
  id: number;
  name: string;
  stock?: number | null;
  image_url?: string | null;
  category_name?: string | null;
};

type TopProduct = { id: number; name: string; total_units: number; revenue: number | string };

type Period = "today" | "7d" | "30d" | "all";

const LOW_STOCK = 5;

const STATUS: Record<string, { label: string; pill: string; bar: string }> = {
  pending: { label: "Pendiente", pill: "bg-[#fef3c7] text-[#78350f]", bar: "bg-[#b45309]" },
  paid: { label: "Pagado", pill: "bg-[#dbeafe] text-[#1e3a8a]", bar: "bg-accent" },
  shipped: { label: "Enviado", pill: "bg-[#ccfbf1] text-[#134e4a]", bar: "bg-[#0f766e]" },
  cancelled: { label: "Cancelado", pill: "bg-[#e5e7eb] text-[#374151]", bar: "bg-[#6b7280]" },
};
const STATUS_ORDER = ["pending", "paid", "shipped", "cancelled"];

const PAYMENT: Record<string, { label: string; dot: string }> = {
  paid: { label: "Pagado", dot: "bg-[#15803d]" },
  unpaid: { label: "Sin pagar", dot: "bg-[#b45309]" },
  refunded: { label: "Reembolsado", dot: "bg-[#6b7280]" },
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "all", label: "Todo" },
];

function periodFrom(p: Period): string | undefined {
  if (p === "all") return undefined;
  const d = new Date();
  if (p === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - (p === "7d" ? 7 : 30));
  return d.toISOString();
}

function money(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function shortDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

function Thumb({ src }: { src?: string | null }) {
  return (
    <span className="w-9 h-9 rounded-lg bg-foreground/10 overflow-hidden shrink-0">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      )}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, o, p] = await Promise.allSettled([
        api.get<Stats>("/admin/stats"),
        api.get<Order[]>("/admin/orders"),
        api.get<{ items: Product[] }>("/admin/products"),
      ]);
      if (s.status === "fulfilled") setStats(s.value.data);
      if (o.status === "fulfilled") setOrders(Array.isArray(o.value.data) ? o.value.data : []);
      if (p.status === "fulfilled") setProducts(Array.isArray(p.value.data?.items) ? p.value.data.items : []);
      if ([s, o, p].some((r) => r.status === "rejected")) {
        setErr("Algunas métricas no se pudieron cargar");
        toast.error("Algunas métricas no se pudieron cargar");
      }
    })();
  }, []);

  // "Más vendidos" es lo único que el backend filtra por fechas (from/to)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const from = periodFrom(period);
        const { data } = await api.get<TopProduct[]>("/stats/top-products", {
          params: { limit: 5, ...(from ? { from } : {}) },
        });
        if (alive) setTop(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setTop([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [period]);

  const byStatus = useMemo(() => {
    const counts = new Map((stats?.orders_by_status ?? []).map((s) => [s.status, s.count]));
    const max = Math.max(1, ...counts.values());
    return STATUS_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0, pct: ((counts.get(status) ?? 0) / max) * 100 }));
  }, [stats]);

  const pendingCount = byStatus.find((s) => s.status === "pending")?.count ?? 0;
  const toShipCount = byStatus.find((s) => s.status === "paid")?.count ?? 0;

  const lowStock = useMemo(
    () =>
      products
        .filter((p) => (p.stock ?? 0) <= LOW_STOCK)
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [products]
  );

  const kpis = [
    { label: "Ingresos pagados", value: stats ? money(stats.revenue_paid) : "—", hint: "Solo pedidos con pago confirmado", href: "/admin/orders" },
    { label: "Pedidos", value: stats?.total_orders ?? "—", hint: `${pendingCount} pendientes`, href: "/admin/orders" },
    { label: "Productos", value: stats?.total_products ?? "—", hint: `${lowStock.length} con stock bajo`, href: "/admin/products" },
    { label: "Usuarios", value: stats?.total_users ?? "—", hint: "Cuentas registradas", href: "/admin/users" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-semibold">Dashboard</h1>
          <span className="text-sm text-muted">Resumen de la tienda</span>
        </div>
        <Link
          href="/admin/products/new"
          className="h-11 px-4 rounded-lg bg-foreground text-background text-[15px] font-medium flex items-center gap-2 hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo producto
        </Link>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="min-h-32 p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between gap-3 hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{k.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden="true">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </div>
            <span className="font-serif text-3xl md:text-4xl font-semibold leading-none">{k.value}</span>
            <span className="text-xs md:text-[13px] text-muted">{k.hint}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pedidos recientes */}
        <section className="lg:col-span-2 rounded-2xl bg-surface border border-border overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Pedidos recientes</h2>
            <Link href="/admin/orders" className="text-sm text-muted hover:text-foreground py-2">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-foreground/[0.04] text-xs font-semibold tracking-wide text-muted border-y border-border">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">PEDIDO</th>
                  <th className="text-left font-semibold px-3 py-3">CLIENTE</th>
                  <th className="text-left font-semibold px-3 py-3">ESTADO</th>
                  <th className="text-left font-semibold px-3 py-3">PAGO</th>
                  <th className="text-right font-semibold px-3 py-3">TOTAL</th>
                  <th className="text-right font-semibold px-5 py-3">FECHA</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => {
                  const st = STATUS[o.status];
                  const pay = PAYMENT[o.payment_status ?? ""];
                  return (
                    <tr key={o.id} className="border-b border-border/70 last:border-0 hover:bg-foreground/[0.03]">
                      <td className="px-5 h-14">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">#{o.id}</Link>
                      </td>
                      <td className="px-3 text-foreground/80 max-w-[220px] truncate">{o.email ?? "—"}</td>
                      <td className="px-3">
                        <span className={`inline-flex items-center h-6.5 px-2.5 rounded-full text-xs font-medium ${st?.pill ?? "bg-[#e5e7eb] text-[#374151]"}`}>
                          {st?.label ?? o.status}
                        </span>
                      </td>
                      <td className="px-3">
                        <span className="flex items-center gap-1.5 text-foreground/80">
                          <span className={`w-2 h-2 rounded-full ${pay?.dot ?? "bg-[#6b7280]"}`} />
                          {pay?.label ?? o.payment_status ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 text-right font-medium">{money(o.total)}</td>
                      <td className="px-5 text-right text-muted">{shortDate(o.created_at)}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted">Todavía no hay pedidos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pedidos por estado */}
        <section className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-5">
          <h2 className="text-[17px] font-semibold">Pedidos por estado</h2>
          {byStatus.map((s) => (
            <div key={s.status} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>{STATUS[s.status].label}</span>
                <span className="font-medium">{s.count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className={`h-full rounded-full ${STATUS[s.status].bar}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
          {toShipCount > 0 && (
            <Link
              href="/admin/orders"
              className="mt-auto p-4 rounded-xl bg-[#fef3c7] text-[#78350f] text-sm leading-snug flex gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {toShipCount === 1 ? "1 pedido pagado espera envío." : `${toShipCount} pedidos pagados esperan envío.`}
            </Link>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Más vendidos */}
        <section className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold">Más vendidos</h2>
            <div role="group" aria-label="Periodo" className="flex p-1 rounded-lg bg-background border border-border">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  aria-pressed={period === p.id}
                  className={`h-8 px-3 rounded-md text-[13px] transition-colors ${
                    period === p.id ? "bg-surface shadow-sm font-medium text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {top.length === 0 ? (
            <p className="px-5 py-8 border-t border-border text-sm text-muted text-center">Sin ventas en este periodo.</p>
          ) : (
            top.map((t, i) => (
              <Link
                key={t.id}
                href={`/admin/products/${t.id}`}
                className="h-14 px-5 flex items-center gap-3.5 border-t border-border/70 text-sm hover:bg-foreground/[0.03]"
              >
                <span className="w-5 font-semibold text-muted">{i + 1}</span>
                <Thumb src={products.find((p) => p.id === t.id)?.image_url} />
                <span className="flex-1 font-medium truncate">{t.name}</span>
                <span className="w-16 text-right text-foreground/80">{t.total_units} u.</span>
                <span className="w-24 text-right font-medium">{money(t.revenue)}</span>
              </Link>
            ))
          )}
        </section>

        {/* Stock bajo */}
        <section className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Stock bajo</h2>
            <Link href="/admin/products" className="text-sm text-muted hover:text-foreground py-2">Ver inventario</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="px-5 py-8 border-t border-border text-sm text-muted text-center">Todo el inventario está por encima de {LOW_STOCK} unidades.</p>
          ) : (
            lowStock.slice(0, 5).map((p) => {
              const out = (p.stock ?? 0) <= 0;
              return (
                <div key={p.id} className="h-14 px-5 flex items-center gap-3.5 border-t border-border/70 text-sm">
                  <Thumb src={p.image_url} />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="font-medium truncate">{p.name}</span>
                    {p.category_name && <span className="text-xs text-muted truncate">{p.category_name}</span>}
                  </div>
                  <span
                    className={`h-6.5 px-2.5 rounded-full text-xs font-medium flex items-center whitespace-nowrap ${
                      out ? "bg-[#0f1115] text-white" : "bg-[#fef3c7] text-[#78350f]"
                    }`}
                  >
                    {out ? "Agotado" : `${p.stock} en stock`}
                  </span>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="h-9 px-3 rounded-lg border border-foreground/20 flex items-center text-[13px] font-medium hover:bg-foreground/5"
                  >
                    Reponer
                  </Link>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
