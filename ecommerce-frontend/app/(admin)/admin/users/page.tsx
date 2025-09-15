"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";

type User = { id: number; name: string; email: string; role?: "admin" | "user"; is_admin?: boolean };

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.items || [];
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <nav className="text-sm space-x-3">
            <a href="/admin" className="underline">Dashboard</a>
            <a href="/admin/products" className="underline">Productos</a>
            <a href="/admin/orders" className="underline">Pedidos</a>
          </nav>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[800px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Nombre</th>
                  <th className="p-2 border text-left">Email</th>
                  <th className="p-2 border text-left">Rol</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const role = u.role ?? (u.is_admin ? "admin" : "user");
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-2 border">{u.id}</td>
                      <td className="p-2 border">{u.name}</td>
                      <td className="p-2 border">{u.email}</td>
                      <td className="p-2 border">{role}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">Sin usuarios</td>
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
