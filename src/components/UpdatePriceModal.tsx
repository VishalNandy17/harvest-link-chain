import React, { useState } from 'react';
import api from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import RoleGate from './RoleGate';

export default function UpdatePriceModal({ batchId, onClose }: { batchId: string, onClose: () => void }) {
  const { jwt } = useWallet();
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const priceWei = (window as any).ethers.utils.parseEther(price);
    await api.post(`/batches/${batchId}/price`, { priceWei: priceWei.toString(), reason }, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    setLoading(false);
    onClose();
  };

  return (
    <RoleGate role="PRICE_UPDATER">
      <div className="modal">
        <form onSubmit={handleSubmit}>
          <h2>Update Price</h2>
          <input type="number" placeholder="New Price per Kg" value={price} onChange={e => setPrice(e.target.value)} required />
          <input type="text" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Price'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </RoleGate>
  );
}
