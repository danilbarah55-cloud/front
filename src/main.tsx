import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const cap = (window as unknown as {Capacitor?: {isNativePlatform?: () => boolean}}).Capacitor;
if (!cap?.isNativePlatform?.() && location.protocol !== 'file:') {
  registerSW({immediate: true});
}

createRoot(document.getElementById('root')!).render(<App />);
