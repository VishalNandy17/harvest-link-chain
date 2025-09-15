import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Vite PWA plugin will handle service worker registration
// No need for manual registration with the plugin

createRoot(document.getElementById("root")!).render(<App />);

// Handle PWA install prompt
let deferredPrompt: Event & { prompt?: () => Promise<void> } | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Optionally show your own install button
  // and call deferredPrompt.prompt() when clicked
});

// Listen for app installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
});
