"use client";

import AdminGate from "@/components/AdminGate";
import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  products: number | null;
  users: number | null;
  orders: number | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ products: null, users: null, orders: null });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        setErr(null);

        // 1) Intentar /admin/stats si lo añades en el backend
        try {
          const r = await fetch(`${base}/admin/stats`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const s = await r.json();
            setStats({
              products: s.total_products ?? null,
              users: s.total_users ?? null,
              orders: s.total_orders ?? null,
            });
            return;
          }
        } catch {}

        // 2) Fallback rápido (no exacto): contar largo de respuestas
        let products = null, users = null, orders = null;

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
          const r = await fetch(`${base}/admin/users?page=1&pageSize=20`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const d = await r.json();
            const arr = d?.users ?? [];
            users = Array.isArray(arr) ? arr.length : null;
          }
        } catch {}

        try {
          const r = await fetch(`${base}/admin/orders`, { headers: auth, cache: "no-store" });
          if (r.ok) {
            const arr = await r.json();
            orders = Array.isArray(arr) ? arr.length : null;
          }
        } catch {}

        setStats({ products, users, orders });
      } catch (e: any) {
        setErr(e?.message || "No se pudieron cargar las métricas");
      }
    })();
  }, []);

  return (
    <AdminGate>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/admin/products" className="px-3 py-1 rounded border">Ver productos</Link>
            <Link href="/admin/users" className="px-3 py-1 rounded border">Ver usuarios</Link>
            <Link href="/admin/orders" className="px-3 py-1 rounded border">Ver pedidos</Link>
          </div>
        </div>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Productos" value={stats.products} href="/admin/products" />
          <Card title="Usuarios" value={stats.users} href="/admin/users" />
          <Card title="Pedidos" value={stats.orders} href="/admin/orders" />
        </div>
      </div>
    </AdminGate>
  );
}

function Card({ title, value, href }: { title: string; value: number | null; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border p-4 hover:shadow-sm transition">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-semibold mt-1">{value ?? "—"}</div>
      <div className="text-xs text-gray-400 mt-2 underline">Ir a {title.toLowerCase()}</div>
    </Link>
  );
}
