import React from 'react';

interface Event {
  type: string;
  payload: any;
  timestamp?: string;
}

export default function BatchTimeline({ events }: { events: Event[] }) {
  return (
    <div className="timeline">
      {events.map((evt, i) => (
        <div key={i} className="timeline-event">
          <div><strong>{evt.type}</strong> <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ''}</span></div>
          <div>Actor: {evt.payload?.actor || evt.payload?.from || evt.payload?.farmer || '-'}</div>
          {evt.payload?.memo && <div>Memo: {evt.payload.memo}</div>}
          {evt.payload?.certUri && <div>Cert: <a href={evt.payload.certUri} target="_blank" rel="noopener noreferrer">{evt.payload.certUri}</a></div>}
          {evt.payload?.txHash && <div>Tx: <a href={`https://polygonscan.com/tx/${evt.payload.txHash}`} target="_blank" rel="noopener noreferrer">{evt.payload.txHash}</a></div>}
        </div>
      ))}
    </div>
  );
}
