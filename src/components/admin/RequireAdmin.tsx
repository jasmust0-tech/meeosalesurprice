import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth } from './adminApi';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) {
        navigate('/admin/login');
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-3 border-[#7b1fa2] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Checking admin session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
