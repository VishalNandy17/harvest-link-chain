import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useWallet } from '../contexts/WalletContext';

export default function RoleGate({ role, children }: { role: string, children: React.ReactNode }) {
  const { address, jwt } = useWallet();
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    if (!address || !jwt) return;
    api.get('/auth/roles', { headers: { Authorization: `Bearer ${jwt}` } })
      .then(res => setHasRole(res.data.roles.includes(role)))
      .catch(() => setHasRole(false));
  }, [address, jwt, role]);

  return hasRole ? <>{children}</> : null;
}
