import React from 'react';

export default function CustodyTrail({ custodyTrail }: { custodyTrail: any[] }) {
  return (
    <div className="custody-stepper">
      {custodyTrail.map((entry, i) => (
        <span key={i} className="custody-step">
          {entry.address || entry}
          {entry.timestamp && <span className="custody-timestamp"> ({new Date(entry.timestamp).toLocaleString()})</span>}
          {i < custodyTrail.length - 1 && <span className="custody-arrow">→</span>}
        </span>
      ))}
    </div>
  );
}
