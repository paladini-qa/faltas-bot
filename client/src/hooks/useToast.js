import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
  };

  return { toasts, toast };
}
