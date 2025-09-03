"use client";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";


type CartItem = { product_id: number; name: string; description: string | null; quantity: number; price: number|string; subtotal: number };


type CartRes = { cart_id: number; items: CartItem[]; total: number };


export default function CartPage() {
const [data, setData] = useState<CartRes | null>(null);


const load = async () => {
const { data } = await api.get<CartRes>("/cart");
setData(data);
};


useEffect(() => { load(); }, []);


return (
<div className="space-y-4">
<h1 className="text-2xl font-semibold">Carrito</h1>
{!data ? (
<p>Cargando…</p>
) : data.items.length === 0 ? (
<p>Tu carrito está vacío.</p>
) : (
<>
<ul className="space-y-2">
{data.items.map((it) => (
<li key={it.product_id} className="flex items-center justify-between border rounded p-3">
<div>
<div className="font-semibold">{it.name}</div>
<div className="text-sm text-gray-600">x{it.quantity}</div>
</div>
<div className="font-semibold">${Number(it.subtotal).toFixed(2)}</div>
</li>
))}
</ul>
<div className="flex items-center justify-between">
<div className="text-lg">Total</div>
<div className="text-xl font-bold">${(data.total/100).toFixed(2)}</div>
</div>
<form action="/checkout">
<button className="px-4 py-2 rounded bg-black text-white">Ir a pagar</button>
</form>
</>
)}
</div>
);
}