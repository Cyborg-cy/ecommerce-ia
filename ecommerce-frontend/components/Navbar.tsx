"use client";
import Link from "next/link";
import { getToken, logout } from "@/lib/auth";
import { useEffect, useState } from "react";


export default function Navbar() {
const [isAuth, setIsAuth] = useState(false);
useEffect(() => setIsAuth(!!getToken()), []);


return (
<nav className="w-full border-b bg-white">
<div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4 justify-between">
<div className="flex items-center gap-4">
<Link href="/" className="font-semibold">E‑Shop</Link>
<Link href="/products" className="text-sm">Productos</Link>
<Link href="/cart" className="text-sm">Carrito</Link>
</div>
<div className="flex items-center gap-3">
{isAuth ? (
<button
onClick={() => { logout(); location.href = "/"; }}
className="text-sm px-3 py-1 rounded bg-gray-900 text-white"
>Salir</button>
) : (
<>
<Link href="/login" className="text-sm">Entrar</Link>
<Link href="/register" className="text-sm px-3 py-1 rounded bg-gray-900 text-white">Crear cuenta</Link>
</>
)}
</div>
</div>
</nav>
);
}