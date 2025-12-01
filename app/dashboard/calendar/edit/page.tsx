// src/app/dashboard/calendar/edit/page.tsx
import { Suspense } from "react";
import CalendarEditClient from "./CalendarEditClient";

export default function CalendarEditPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center  bg-white [background-size:18px_18px] px-4">
          <div className="rounded-2xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow">
            하루 지출 레시피 편집 화면을 준비하고 있어요...
          </div>
        </main>
      }
    >
      <CalendarEditClient />
    </Suspense>
  );
}
