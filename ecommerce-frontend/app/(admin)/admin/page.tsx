"use client";

import RequireAdmin from "@/components/RequireAdmin";
import Link from "next/link";

export default function AdminHome() {
  return (
    <RequireAdmin>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <ul className="list-disc pl-5">
          <li><Link className="underline" href="/admin/products">Gestionar productos</Link></li>
          <li><Link className="underline" href="/admin/orders">Ver pedidos (opcional)</Link></li>
          <li><Link className="underline" href="/admin/stats">Estadísticas (opcional)</Link></li>
        </ul>
      </div>
    </RequireAdmin>
  );
}
