// src/components/layout/PageContainer.tsx
import React from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
};

export function PageContainer({ title, children }: Props) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {title && (
          <h1 className="mb-4 text-2xl font-semibold text-slate-900">
            {title}
          </h1>
        )}
        {children}
      </div>
    </main>
  );
}
