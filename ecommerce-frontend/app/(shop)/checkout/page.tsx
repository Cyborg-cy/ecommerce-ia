"use client";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";


export default function CheckoutPage() {
const [clientSecret, setCS] = useState<string | null>(null);
const [err, setErr] = useState<string | null>(null);


useEffect(() => {
(async () => {
try {
const { data } = await api.post("/payments/create-intent", {});
setCS(data.clientSecret);
} catch (e: any) {
setErr(e?.response?.data?.error || "No se pudo crear el intento de pago");
}
})();
}, []);


return (
<div className="max-w-lg">
<h1 className="text-2xl font-semibold mb-4">Checkout</h1>
{err && <p className="text-red-600">{err}</p>}
{clientSecret ? (
<div className="space-y-2">
<p className="text-sm">Intent creado (muestra de depuración):</p>
<code className="block p-2 bg-gray-100 rounded text-xs break-all">{clientSecret}</code>
<p className="text-sm text-gray-600">Más adelante integramos Stripe Elements.</p>
</div>
) : (
<p>Creando intento…</p>
)}
</div>
);
}