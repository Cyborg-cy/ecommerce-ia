"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.push(`/products?${params.toString()}`);
  };

  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 justify-center py-4">
      <button
        className="border px-3 py-1 rounded disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        ← Anterior
      </button>
      <span className="text-sm">
        Página {page} de {totalPages}
      </span>
      <button
        className="border px-3 py-1 rounded disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Siguiente →
      </button>
    </div>
  );
}