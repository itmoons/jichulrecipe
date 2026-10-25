import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import AccountDeleteForm from "./AccountDeleteForm";

export const metadata = { title: "계정 삭제 | 지출레시피" };

export default function AccountDeletePage() {
  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-7 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[1320px]">
        <Link href="/settings" className="mb-8 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f7a5b]">
          <ArrowLeft size={15} aria-hidden="true" /> 설정으로 돌아가기
        </Link>
        <header className="mb-7">
          <p className="mb-2 text-xs font-semibold text-[#1f7a5b]">계정 관리</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">계정 삭제</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">삭제하기 전에 아래 내용을 확인해 주세요.</p>
        </header>
        <div className="overflow-hidden rounded-2xl border border-[#e2e5e1] bg-white shadow-sm">
          <section aria-labelledby="delete-notice" className="border-b border-slate-100 px-5 py-6 sm:px-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldAlert size={18} className="text-rose-500" aria-hidden="true" /><h2 id="delete-notice">삭제한 계정은 복구할 수 없어요</h2></div>
            <ul className="mt-3 space-y-2 pl-6 text-[13px] leading-6 text-slate-500 list-disc marker:text-slate-300">
              <li>삭제 후에는 이 계정으로 로그인할 수 없습니다.</li>
              <li>계정과 연결된 기록은 복구할 수 없습니다.</li>
              <li>필요한 기록은 삭제 전에 별도로 보관해 주세요.</li>
            </ul>
          </section>
          <AccountDeleteForm />
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">삭제는 동의와 확인 문구 입력 후에 진행됩니다.</p>
      </div>
    </main>
  );
}
