// src/components/layout/PageContainer.tsx
import React from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
};

export function PageContainer({ title, children }: Props) {
  return (
    <main className="app-surface min-h-screen">
      <div className="min-h-screen px-3 pb-10 pt-5 sm:px-6 sm:pt-8 mx-auto w-full lg:max-w-[1360px]">
        {title && (
          <h1 className="mb-5 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
        )}
        {children}
      </div>
    </main>
  );
}
