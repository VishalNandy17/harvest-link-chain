/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QR_BASE_URL?: string;
  readonly VITE_PUBLIC_BASE_URL?: string;
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_EXPLORER_URL?: string;
  readonly VITE_DEPLOYMENT_BLOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
