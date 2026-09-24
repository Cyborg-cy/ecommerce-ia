"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api-client";
import RequireAuth from "@/components/RequireAuth";

type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  zip: string | null;
};

type FormState = {
  name: string;
  phone: string;
  address_line: string;
  city: string;
  zip: string;
};

const EMPTY_FORM: FormState = { name: "", phone: "", address_line: "", city: "", zip: "" };

function toForm(p: Profile): FormState {
  return {
    name: p.name ?? "",
    phone: p.phone ?? "",
    address_line: p.address_line ?? "",
    city: p.city ?? "",
    zip: p.zip ?? "",
  };
}

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/users/me")
      .then(({ data }) => {
        setProfile(data as Profile);
        setForm(toForm(data as Profile));
      })
      .catch((e) => {
        console.error(e);
        toast.error("No se pudo cargar tu perfil");
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.put("/users/me", form);
      setProfile(data as Profile);
      setForm(toForm(data as Profile));
      toast.success("Perfil actualizado");
    } catch (err: any) {
      const details = err?.response?.data?.details;
      toast.error(
        Array.isArray(details) ? details.join(", ") : err?.response?.data?.error || "No se pudo guardar"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl">Mi perfil</h1>
          <Link href="/account/orders" className="text-sm text-muted hover:text-foreground">
            Ver mis pedidos →
          </Link>
        </div>

        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : !profile ? (
          <p className="text-muted">No se pudo cargar tu perfil.</p>
        ) : (
          <form onSubmit={save} className="space-y-8">
            <section className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <h2 className="font-medium">Datos personales</h2>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Nombre</span>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={update("name")}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <div className="space-y-1.5">
                <span className="text-sm text-muted">Email</span>
                <p className="text-sm">{profile.email}</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Teléfono</span>
                <input
                  className={inputClass}
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  maxLength={50}
                  autoComplete="tel"
                />
              </label>
            </section>

            <section className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div>
                <h2 className="font-medium">Dirección de envío</h2>
                <p className="text-sm text-muted mt-0.5">
                  Se usará para llenar el checkout automáticamente.
                </p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Calle y número</span>
                <input
                  className={inputClass}
                  value={form.address_line}
                  onChange={update("address_line")}
                  maxLength={255}
                  autoComplete="street-address"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
                <label className="block space-y-1.5">
                  <span className="text-sm text-muted">Ciudad</span>
                  <input
                    className={inputClass}
                    value={form.city}
                    onChange={update("city")}
                    maxLength={120}
                    autoComplete="address-level2"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm text-muted">Código postal</span>
                  <input
                    className={inputClass}
                    value={form.zip}
                    onChange={update("zip")}
                    maxLength={20}
                    autoComplete="postal-code"
                  />
                </label>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        )}
      </div>
    </RequireAuth>
  );
}
