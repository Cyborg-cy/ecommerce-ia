"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import toast from "react-hot-toast";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const r = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/payments/create-intent");
        setClientSecret(data.clientSecret);
        setAmount(data.amount);
      } catch (e: any) {
        toast.error(e?.response?.data?.error || "No se pudo iniciar el pago");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function pay() {
    if (!stripe || !elements || !clientSecret) return;
    setPaying(true);
    try {
      const res = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (res.error) {
        toast.error(res.error.message || "Pago fallido");
      } else if (res.paymentIntent && res.paymentIntent.status === "succeeded") {
        toast.success("Pago realizado");
        r.push("/orders");
      } else {
        toast.error("Pago en estado: " + res.paymentIntent?.status);
      }
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="max-w-md mx-auto px-6 py-16 text-muted">Cargando...</div>;
  if (!clientSecret) return <div className="max-w-md mx-auto px-6 py-16 text-muted">No se pudo iniciar el pago.</div>;

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-serif text-2xl mb-1">Pago</h1>
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
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
