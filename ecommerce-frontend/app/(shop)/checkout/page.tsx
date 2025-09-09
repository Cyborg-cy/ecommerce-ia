"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const r = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/payments/create-intent");
        setClientSecret(data.clientSecret);
        setAmount(data.amount);
      } catch (e: any) {
        alert(e?.response?.data?.error || "No se pudo iniciar el pago");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function pay() {
    if (!stripe || !elements || !clientSecret) return;

    const res = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });

    if (res.error) {
      alert(res.error.message || "Pago fallido");
    } else if (res.paymentIntent && res.paymentIntent.status === "succeeded") {
      alert("Pago exitoso ✅");
      r.push("/orders");
    } else {
      alert("Pago en estado: " + res.paymentIntent?.status);
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!clientSecret) return <div className="p-6">No se pudo iniciar el pago.</div>;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-right text-xl font-bold">
        Total: ${(amount / 100).toFixed(2)}
      </div>
      <div className="border rounded p-3">
        <CardElement
        options={{
          style: {
            base: {
              color: "#fff", // blanco
              fontSize: "16px",
              '::placeholder': { color: "#ccc" }
            },
            invalid: {
              color: "#ff6666"
            }
          }
        }}
      />
     </div>
      <button onClick={pay} className="px-4 py-2 rounded bg-black text-white w-full">
        Confirmar pago
      </button>
      <p className="text-sm text-gray-500">
        Tarjeta de prueba: 4242 4242 4242 4242 · Fecha futura · CVC 123
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}
