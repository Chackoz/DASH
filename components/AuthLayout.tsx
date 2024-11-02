// app/components/AuthLayout.tsx
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#2E3440] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#3B4252] rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-[#88C0D0] rounded-full flex items-center justify-center">
            <span className="text-[#2E3440] text-2xl font-bold">D</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}