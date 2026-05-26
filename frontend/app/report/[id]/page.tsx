type ReportPageProps = {
  params: {
    id: string;
  };
};

export default function ReportDetailPage({ params }: ReportPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Report {params.id}</h1>
      <p className="mt-2 text-sm text-slate-600">Saved report preview will be connected here later.</p>
    </main>
  );
}