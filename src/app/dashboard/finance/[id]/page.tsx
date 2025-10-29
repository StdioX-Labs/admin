export default function FinanceDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Finance Details</h1>
      <p className="text-muted-foreground">ID: {params.id}</p>
    </div>
  );
}

