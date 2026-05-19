import { createContext, useContext, useState, useEffect } from 'react';

const WhatsappContext = createContext(null);

export function WhatsappProvider({ children }) {
  const [waStatus, setWaStatus] = useState('desconectado');
  const [qrUrl, setQrUrl] = useState(null);

  useEffect(() => {
    let timer;
    async function poll() {
      try {
        const res = await fetch('/api/alertas/status');
        if (res.ok) {
          const data = await res.json();
          setWaStatus(data.status);
          setQrUrl(data.qr || null);
        }
      } catch (_) {}
      const delay = waStatus === 'conectado' ? 10000 : 3000;
      timer = setTimeout(poll, delay);
    }
    poll();
    return () => clearTimeout(timer);
  }, [waStatus]);

  return (
    <WhatsappContext.Provider value={{ waStatus, qrUrl, setWaStatus }}>
      {children}
    </WhatsappContext.Provider>
  );
}

export function useWhatsapp() {
  return useContext(WhatsappContext);
}
