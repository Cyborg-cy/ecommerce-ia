"use client";
import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/api";

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error);
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <ul className="mt-4">
        {users.map((u) => (
          <li key={u.id} className="border-b p-2">
            {u.name} ({u.email})
          </li>
        ))}
      </ul>
    </main>
  );
}
