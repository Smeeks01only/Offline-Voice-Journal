import React, { useState, useEffect } from 'react';
import './GlobalToast.css';

export default function GlobalToast() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleApiError = (e) => {
      setMessage(e.detail);
      setTimeout(() => setMessage(''), 5000);
    };

    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, []);

  if (!message) return null;

  return (
    <div className="global-toast">
      {message}
    </div>
  );
}
