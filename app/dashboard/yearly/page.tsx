// src/app/dashboard/yearly/page.tsx
import React, { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import YearlyDashboardClient from "./YearlyDashboardClient";

export default function YearlyDashboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="연간 지출 레시피 대시보드">
          <div className="pointer-events-none fixed inset-0 -z-10 landing-surface" />
          <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
          <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,193,130,0.22)] blur-3xl" />

          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-xs text-slate-500">
              연간 지출 레시피 대시보드를 준비하고 있어요...
            </p>
          </div>
        </PageContainer>
      }
    >
      <YearlyDashboardClient />
    </Suspense>
  );
}
