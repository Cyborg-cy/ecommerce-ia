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
    <div className="flex items-center gap-3 mt-8">
      <Link
        href={prevHref}
        className={`rounded-md px-3.5 py-1.5 border border-border text-sm hover:bg-surface ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
        aria-disabled={page === 1}
      >
        ← Anterior
      </Link>

      <span className="text-sm text-muted">
        Página {page} de {totalPages}
      </span>

      <Link
        href={nextHref}
        className={`rounded-md px-3.5 py-1.5 border border-border text-sm hover:bg-surface ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
        aria-disabled={page === totalPages}
      >
        Siguiente →
      </Link>
    </div>
  );
}
