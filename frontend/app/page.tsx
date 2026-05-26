import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Astro FreeLance</h1>
      <p className="mt-2 text-sm text-slate-600">Simple astrology office software.</p>
      <Link className="mt-4 inline-block border px-4 py-2" href="/create-report">
        Open Create Report
      </Link>
    </main>
  );
}