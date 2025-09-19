"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
};

export default function Pagination({ page, totalPages, prevHref, nextHref }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 mt-4">
      <Link
        href={prevHref}
        className={`px-3 py-1 border rounded ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page === 1}
      >
        ← Anterior
      </Link>

      <span className="text-sm">
        Página {page} de {totalPages}
      </span>

      <Link
        href={nextHref}
        className={`px-3 py-1 border rounded ${page === totalPages ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page === totalPages}
      >
        Siguiente →
      </Link>
    </div>
  );
}
