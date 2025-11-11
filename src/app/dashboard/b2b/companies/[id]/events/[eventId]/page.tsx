'use client';

import { use } from 'react';

export default function CompanyEventDetailsPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = use(params);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Event Details</h1>
      <p className="text-muted-foreground">Company: {id}</p>
      <p className="text-muted-foreground">Event: {eventId}</p>
    </div>
  );
}

