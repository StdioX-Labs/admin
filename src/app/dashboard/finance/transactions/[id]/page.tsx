export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
      <p className="text-muted-foreground">Transaction ID: {params.id}</p>
    </div>
  );
}

