"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Stats = {
  products: number | null;
  users: number | null;
  orders: number | null;
  revenue: number | null;                // 👈 nuevo
  ordersByStatus?: { status: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    products: null,
    users: null,
    orders: null,
    revenue: null,
    ordersByStatus: [],
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const DEFAULT_API = "http://localhost:3000";
      const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;
      const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        setErr(null);

        // 1) /admin/stats (preferido)
        try {
          const r = await fetch(`${base}/admin/stats`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const s = await r.json();
            setStats({
              products: s.total_products ?? null,
              users: s.total_users ?? null,
              orders: s.total_orders ?? null,
              revenue: typeof s.revenue_paid === "number" ? s.revenue_paid : null,
              ordersByStatus: Array.isArray(s.orders_by_status) ? s.orders_by_status : [],
            });
            return;
          }
        } catch {}

        // 2) Fallbacks ligeros si no existe /admin/stats
        let products: number | null = null,
          users: number | null = null,
          orders: number | null = null;

        try {
          let r = await fetch(`${base}/admin/products`, { headers: auth, cache: "no-store" });
          if (r.status === 404 || r.status === 403) {
            r = await fetch(`${base}/products`, { cache: "no-store" });
          }
          if (r.ok) {
            const d = await r.json();
            const arr = Array.isArray(d) ? d : (d.products ?? d.items ?? d.rows ?? []);
            products = Array.isArray(arr) ? arr.length : null;
          }
        } catch {}

        try {
          const r = await fetch(`${base}/admin/users?page=1&pageSize=50`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const d = await r.json();
            users = Array.isArray(d?.users) ? d.users.length : null;
          }
        } catch {}

        try {
          const r = await fetch(`${base}/admin/orders`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const arr = await r.json();
            orders = Array.isArray(arr) ? arr.length : null;
          }
        } catch {}

        setStats({ products, users, orders, revenue: null, ordersByStatus: [] });
      } catch (e: any) {
        setErr(e?.message || "No se pudieron cargar las métricas");
        toast.error(e?.message || "No se pudieron cargar las métricas");
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl">Dashboard</h1>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="Productos" value={stats.products} href="/admin/products" />
        <Card title="Usuarios" value={stats.users} href="/admin/users" />
        <Card title="Pedidos" value={stats.orders} href="/admin/orders" />
        <Card title="Categorías" value={null} href="/admin/categories" />
        <Card title="Ingresos" value={stats.revenue} href="/admin/orders" format="money" accent />
      </div>

      {/* Opcional: resumen por estado */}
      {stats.ordersByStatus && stats.ordersByStatus.length > 0 && (
        <div>
          <h2 className="text-sm text-muted mb-3">Pedidos por estado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.ordersByStatus.map((s) => (
              <div key={s.status} className="rounded-lg border border-border bg-surface p-4">
                <div className="text-xs text-muted uppercase tracking-wide">{s.status}</div>
                <div className="text-2xl font-serif mt-1">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  href,
  format,
  accent,
}: {
  title: string;
  value: number | null;
  href: string;
  format?: "money";
  accent?: boolean;
}) {
  const display =
    value == null
      ? "—"
      : format === "money"
      ? `$${value.toFixed(2)}`
      : String(value);

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-surface p-4 hover:border-accent/40 hover:-translate-y-0.5 transition-all"
    >
      <div className="text-sm text-muted">{title}</div>
      <div className={`text-3xl font-serif mt-1 ${accent ? "text-accent" : ""}`}>{display}</div>
      <div className="text-xs text-muted mt-2">Ir a {title.toLowerCase()} →</div>
    </Link>
  );
}