export default function ProductCard({ p }: { p: any }) {
  return (
    <div className="border rounded p-3">
      <h3 className="font-medium">{p.name}</h3>
      <p className="text-sm text-gray-600">{p.description}</p>
      <div className="mt-2 font-semibold">${Number(p.price).toFixed(2)}</div>
    </div>
  );
}
