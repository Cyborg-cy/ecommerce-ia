"use client";
import { useRouter, useSearchParams } from "next/navigation";


export default function Pagination({ page, totalPages }: { page: number; totalPages: number; }) {
const router = useRouter();
const sp = useSearchParams();
const go = (p: number) => {
const params = new URLSearchParams(sp.toString());
params.set("page", String(p));
router.push(`/products?${params.toString()}`);
};


if (totalPages <= 1) return null;


return (
<div className="flex gap-2 items-center justify-center mt-6">
<button disabled={page<=1} onClick={()=>go(page-1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
<span className="text-sm">{page} / {totalPages}</span>
<button disabled={page>=totalPages} onClick={()=>go(page+1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
</div>
);
}