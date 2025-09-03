"use client";
import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/api";

type User = { id: number; name: string; email: string };

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Cargando usuarios…</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <ul className="list-disc pl-6">
        {users.map((u) => (
          <li key={u.id}>
            {u.name} — <span className="text-gray-600">{u.email}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
