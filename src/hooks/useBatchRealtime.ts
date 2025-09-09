import { useEffect, useState } from 'react';
import { connectSocket } from '../lib/socket';
import api from '../lib/api';

export function useBatchRealtime(batchId: string, jwt: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [latestBatchSnapshot, setLatestBatchSnapshot] = useState<any>(null);

  useEffect(() => {
    let socket: any;
    let mounted = true;
    async function fetchInitial() {
      const { data } = await api.get(`/batches/${batchId}`);
      if (mounted) setLatestBatchSnapshot(data);
    }
    fetchInitial();
    socket = connectSocket(jwt);
    socket.joinBatch(batchId);
    socket.on('update', (evt: any) => {
      setEvents((prev) => [...prev, evt]);
      setLatestBatchSnapshot((prev) => ({ ...prev, ...evt.payload }));
    });
    return () => {
      mounted = false;
      socket.leaveBatch(batchId);
      socket.disconnect();
    };
  }, [batchId, jwt]);

  return { events, latestBatchSnapshot };
}
