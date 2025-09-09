import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { useBatchRealtime } from '../hooks/useBatchRealtime';
import BatchTimeline from '../components/BatchTimeline';
import CustodyTrail from '../components/CustodyTrail';

export default function TracePage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [jwt] = useState<string | null>(null); // public, no auth
  const { events, latestBatchSnapshot } = useBatchRealtime(id!, jwt || '');

  useEffect(() => {
    api.get(`/batches/${id}`).then(res => setBatch(res.data));
  }, [id]);

  const priceHistory = batch?.cache?.priceHistory || [];
  const qualities = batch?.cache?.qualities || [];
  const custodyTrail = batch?.cache?.custodyTrail || [];

  return (
    <div className="trace-page">
      <h1>Batch Trace: {id}</h1>
      <div>Crop: {batch?.cropType}</div>
      <div>Variety: {batch?.variety}</div>
      <div>Farm: {batch?.farmRef}</div>
      <div>Harvest Date: {batch?.harvestAt ? new Date(batch.harvestAt * 1000).toLocaleDateString() : ''}</div>
      <div>Quantity: {batch?.quantityKg} kg</div>
      <div>Current Price: {priceHistory.length ? priceHistory[priceHistory.length - 1].pricePerKgWei : batch?.basePricePerKgWei}</div>
      <div>
        <span>Price History:</span>
        <svg width="120" height="40">
          {priceHistory.length > 1 && priceHistory.map((p, i) => (
            i > 0 && <line key={i} x1={10 * (i - 1)} y1={40 - p.pricePerKgWei / 1e16} x2={10 * i} y2={40 - priceHistory[i].pricePerKgWei / 1e16} stroke="blue" />
          ))}
        </svg>
      </div>
      <h2>Qualities</h2>
      <table>
        <thead><tr><th>Metric</th><th>Value</th><th>Cert</th></tr></thead>
        <tbody>
          {qualities.map((q, i) => (
            <tr key={i}>
              <td>{q.metric}</td>
              <td>{q.value}</td>
              <td>{q.certUri && <a href={q.certUri} target="_blank" rel="noopener noreferrer">Link</a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Custody Trail</h2>
      <CustodyTrail custodyTrail={custodyTrail} />
      <h2>Event Timeline</h2>
      <BatchTimeline events={events} />
      <div style={{ marginTop: 20 }}>
        <a href={`/api/public/qr/${id}.png`} download><button>Download QR</button></a>
        <button onClick={() => navigator.share && navigator.share({ url: window.location.href })}>Share</button>
      </div>
    </div>
  );
}
