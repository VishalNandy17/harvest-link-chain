import React, { useState } from 'react';
import api from '../lib/api';
import { useWallet } from '../contexts/WalletContext';

export default function CreateBatchForm({ onCreated }: { onCreated: (batch: any) => void }) {
  const { jwt } = useWallet();
  const [form, setForm] = useState({
    cropType: '',
    variety: '',
    farmRef: '',
    quantityKg: '',
    basePricePerKg: '',
    harvestAt: ''
  });
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Convert price to Wei
    const priceWei = (window as any).ethers.utils.parseEther(form.basePricePerKg);
    const payload = {
      ...form,
      basePricePerKgWei: priceWei.toString(),
      quantityKg: Number(form.quantityKg),
      harvestAt: new Date(form.harvestAt).getTime() / 1000
    };
    const { data } = await api.post('/batches', payload, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    setBatchId(data.batchId);
    setQrUrl(data.qrUrl);
    onCreated({ ...payload, batchId: data.batchId });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="create-batch-form">
      <input name="cropType" placeholder="Crop Type" value={form.cropType} onChange={handleChange} required />
      <input name="variety" placeholder="Variety" value={form.variety} onChange={handleChange} required />
      <input name="farmRef" placeholder="Farm Reference" value={form.farmRef} onChange={handleChange} required />
      <input name="quantityKg" type="number" placeholder="Quantity (kg)" value={form.quantityKg} onChange={handleChange} required />
      <input name="basePricePerKg" type="number" placeholder="Base Price per Kg" value={form.basePricePerKg} onChange={handleChange} required />
      <input name="harvestAt" type="date" placeholder="Harvest Date" value={form.harvestAt} onChange={handleChange} required />
      <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Batch'}</button>
      {qrUrl && batchId && (
        <div className="qr-panel-modal">
          <img src={qrUrl} alt="Batch QR" />
          <div>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin + '/trace/' + batchId)}>Copy Link</button>
            <a href={qrUrl} download><button>Download QR</button></a>
          </div>
        </div>
      )}
    </form>
  );
}
