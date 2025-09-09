import React from 'react';
import { useParams } from 'react-router-dom';

export default function TraceLanding() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="trace-landing">
      <h1>Welcome to Harvest Link Chain Trace</h1>
      <p>Scan a QR code to view batch details.</p>
      {id && <a href={`/trace/${id}`}>View Batch {id}</a>}
    </div>
  );
}
