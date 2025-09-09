import React, { useState } from 'react';
import api from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import RoleGate from './RoleGate';

export default function UpdateQualityModal({ batchId, onClose }: { batchId: string, onClose: () => void }) {
  const { jwt } = useWallet();
  const [metric, setMetric] = useState('');
  const [value, setValue] = useState('');
  const [certUri, setCertUri] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api.post(`/batches/${batchId}/quality`, { metric, value, certUri }, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    setLoading(false);
    onClose();
  };

  return (
    <RoleGate role="QUALITY_UPDATER">
      <div className="modal">
        <form onSubmit={handleSubmit}>
          <h2>Update Quality</h2>
          <input type="text" placeholder="Metric" value={metric} onChange={e => setMetric(e.target.value)} required />
          <input type="text" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} required />
          <input type="text" placeholder="Cert URI" value={certUri} onChange={e => setCertUri(e.target.value)} />
          <button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Quality'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </RoleGate>
  );
}
