import Link from "next/link";

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface min-h-screen break-keep">
      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-[#dce5dd] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 px-4 py-7 text-xs text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <p>계산 결과는 참고용 예상치입니다. 실제 계약·결제 조건은 해당 기관에서 확인하세요.</p>
          <div className="flex gap-4 font-semibold text-[#176247]">
            <Link href="/calculators" className="hover:underline">전체 계산 도구</Link>
            <Link href="/" className="hover:underline">지출레시피 홈</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
