"use client";
export default function GlobalError({ error }: { error: Error }) {
  return <main className="p-8 text-center">Ocurrió un error: {error.message}</main>;
}
