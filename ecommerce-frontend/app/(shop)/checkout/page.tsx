"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import toast from "react-hot-toast";
import RequireAuth from "@/components/RequireAuth";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type Shipping = {
  name: string;
  phone: string;
  address_line: string;
  city: string;
  zip: string;
};

const EMPTY_SHIPPING: Shipping = { name: "", phone: "", address_line: "", city: "", zip: "" };

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent";

/* ---------- Paso 1: dirección de envío ---------- */

function AddressStep({
  onReady,
}: {
  onReady: (payment: { clientSecret: string; amount: number }) => void;
}) {
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [cartTotal, setCartTotal] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Carga en paralelo el perfil (para llenar la dirección) y el carrito (para el total)
  useEffect(() => {
    Promise.allSettled([api.get("/users/me"), api.get("/cart")])
      .then(([me, cart]) => {
        if (me.status === "fulfilled") {
          const p = me.value.data;
          setShipping({
            name: p.name ?? "",
            phone: p.phone ?? "",
            address_line: p.address_line ?? "",
            city: p.city ?? "",
            zip: p.zip ?? "",
          });
          // Sin dirección guardada, ofrece guardarla por defecto
          setSaveToProfile(!p.address_line);
        }
        if (cart.status === "fulfilled") {
          setCartTotal(Number(cart.value.data.total ?? 0));
          setItemCount(cart.value.data.items?.length ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof Shipping) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setShipping((s) => ({ ...s, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { data } = await api.post("/payments/create-intent", {
        shipping,
        save_to_profile: saveToProfile,
      });
      onReady({ clientSecret: data.clientSecret, amount: data.amount });
    } catch (err: any) {
      const details = err?.response?.data?.details;
      toast.error(
        Array.isArray(details)
          ? details.join(", ")
          : err?.response?.data?.error || "No se pudo iniciar el pago"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  if (itemCount === 0) {
    return (
      <p className="text-muted">
        Tu carrito está vacío.{" "}
        <Link href="/products" className="underline hover:text-foreground">
          Ver productos
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-muted text-sm">¿A dónde enviamos tu pedido?</p>

      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Nombre de quien recibe</span>
        <input className={inputClass} value={shipping.name} onChange={update("name")}
          required minLength={2} maxLength={200} autoComplete="name" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Teléfono (opcional)</span>
        <input className={inputClass} type="tel" value={shipping.phone} onChange={update("phone")}
          maxLength={50} autoComplete="tel" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Calle y número</span>
        <input className={inputClass} value={shipping.address_line} onChange={update("address_line")}
          required minLength={3} maxLength={255} autoComplete="street-address" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Ciudad</span>
          <input className={inputClass} value={shipping.city} onChange={update("city")}
            required minLength={2} maxLength={120} autoComplete="address-level2" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Código postal</span>
          <input className={inputClass} value={shipping.zip} onChange={update("zip")}
            required minLength={3} maxLength={20} autoComplete="postal-code" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} />
        Guardar esta dirección en mi perfil
      </label>

      {cartTotal !== null && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-muted">Total</span>
          <span className="font-serif text-2xl">${cartTotal.toFixed(2)}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md px-4 py-3 bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Preparando pago..." : "Continuar al pago"}
      </button>
    </form>
  );
}

/* ---------- Paso 2: pago con tarjeta ---------- */

function PaymentStep({ clientSecret, amount }: { clientSecret: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const r = useRouter();
  const [paying, setPaying] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const res = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (res.error) {
        toast.error(res.error.message || "Pago fallido");
      } else if (res.paymentIntent && res.paymentIntent.status === "succeeded") {
        toast.success("Pago realizado");
        r.push("/account/orders");
      } else {
        toast.error("Pago en estado: " + res.paymentIntent?.status);
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <p className="text-muted text-sm mb-8">Ingresa los datos de tu tarjeta para completar la compra.</p>

      <div className="flex items-center justify-between mb-6">
        <span className="text-muted">Total</span>
        <span className="font-serif text-2xl">${(amount / 100).toFixed(2)}</span>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <CardElement
          options={{
            style: {
              base: {
                color: "#1c1a17",
                fontSize: "16px",
                "::placeholder": { color: "#a89f8f" },
              },
              invalid: {
                color: "#dc2626",
              },
            },
          }}
        />
      </div>

      <button
        onClick={pay}
        disabled={paying}
        className="w-full mt-6 rounded-md px-4 py-3 bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {paying ? "Procesando..." : "Confirmar pago"}
      </button>
      <p className="text-sm text-muted mt-4 text-center">
        Tarjeta de prueba: 4242 4242 4242 4242 · Fecha futura · CVC 123
      </p>
    </>
  );
}

export default function CheckoutPage() {
  const [payment, setPayment] = useState<{ clientSecret: string; amount: number } | null>(null);

  return (
    <RequireAuth>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-xs text-muted mb-2">
          <span className={payment ? "" : "text-foreground font-medium"}>1. Envío</span>
          <span>→</span>
          <span className={payment ? "text-foreground font-medium" : ""}>2. Pago</span>
        </div>
        <h1 className="font-serif text-2xl mb-4">{payment ? "Pago" : "Dirección de envío"}</h1>

        {payment ? (
          <Elements stripe={stripePromise}>
            <PaymentStep clientSecret={payment.clientSecret} amount={payment.amount} />
          </Elements>
        ) : (
          <AddressStep onReady={setPayment} />
        )}
      </div>
    </RequireAuth>
  );
}
