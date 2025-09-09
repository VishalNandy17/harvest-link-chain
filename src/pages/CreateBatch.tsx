import React, { useState } from 'react';
import CreateBatchForm from '../components/CreateBatchForm';

export default function CreateBatch() {
  const [batches, setBatches] = useState<any[]>([]);

  const handleCreated = (batch: any) => {
    setBatches((prev) => [batch, ...prev]); // optimistic UI
  };

  return (
    <div className="create-batch-page">
      <h1>Create New Batch</h1>
      <CreateBatchForm onCreated={handleCreated} />
      <h2>My Recent Batches</h2>
      <ul>
        {batches.map((b, i) => (
          <li key={i}>{b.cropType} ({b.batchId})</li>
        ))}
      </ul>
    </div>
  );
}
