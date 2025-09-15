"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";

type Order = {
  id: number;
  user_id: number;
  email?: string;
  status?: string | null;
  payment_status?: string | null;
  created_at?: string;
  total?: number | string | null;
};

export default function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/orders/${id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      await load();
    } catch (e: any) {
      alert(e.message || "Error al actualizar estado");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <nav className="text-sm space-x-3">
            <a href="/admin" className="underline">Dashboard</a>
            <a href="/admin/products" className="underline">Productos</a>
            <a href="/admin/users" className="underline">Usuarios</a>
          </nav>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Usuario</th>
                  <th className="p-2 border text-left">Estado</th>
                  <th className="p-2 border text-left">Pago</th>
                  <th className="p-2 border text-left">Fecha</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2 border">{o.id}</td>
                    <td className="p-2 border">{o.email ?? o.user_id}</td>
                    <td className="p-2 border">{o.status ?? "-"}</td>
                    <td className="p-2 border">{o.payment_status ?? "-"}</td>
                    <td className="p-2 border">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="p-2 border">
                      <div className="flex flex-wrap gap-2">
                        {["pending", "paid", "shipped", "cancelled"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(o.id, s)}
                            className="px-2 py-1 text-sm rounded border hover:bg-gray-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Sin pedidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
