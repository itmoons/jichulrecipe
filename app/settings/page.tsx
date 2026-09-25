"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  HandHeart,
  Link2,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SettingsLinkProps = {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
  tone?: "default" | "danger";
};

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
  tone = "default",
}: SettingsLinkProps) {
  const danger = tone === "danger";

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-4 transition hover:bg-[#f7faf8] sm:px-5"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? "bg-red-50 text-red-500"
            : "bg-[#eaf5ef] text-[#1f7a5b]"
        }`}
      >
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[13px] font-bold ${
            danger ? "text-red-600" : "text-slate-800"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-5 text-slate-500 sm:text-xs">
          {description}
        </span>
      </span>
      <ChevronRight
        size={17}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
      />
    </Link>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[12px] font-bold text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-[#edf3ef] overflow-hidden rounded-lg border border-[#e2e5e1] bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1f7a5b] text-white shadow-sm">
            <Settings size={21} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.03em] text-slate-900 sm:text-2xl">
              설정
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">
              계정과 알림, 커플 기능 등 지출레시피 전체 설정을 관리합니다.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <SettingsSection title="계정">
            {loading ? (
              <div className="px-5 py-5 text-xs text-slate-500">
                계정 정보를 확인하고 있습니다…
              </div>
            ) : email ? (
              <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5ef] text-[#1f7a5b]">
                  <CircleUserRound size={19} strokeWidth={1.9} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-slate-800">
                    로그인 계정
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {email}
                  </span>
                </span>
              </div>
            ) : (
              <SettingsLink
                href="/sign-in"
                icon={LogIn}
                title="로그인"
                description="로그인하고 내 지출 기록과 설정을 관리하세요."
              />
            )}
          </SettingsSection>

          {email ? (
            <SettingsSection title="서비스 설정">
              <SettingsLink
                href="/notifications"
                icon={Bell}
                title="알림"
                description="지출레시피에서 받은 알림 내역을 확인합니다."
              />
              <SettingsLink
                href="/couple-settings"
                icon={HandHeart}
                title="커플 장부 설정"
                description="공동 장부, 개인 지출 공유와 편집 권한을 설정합니다."
              />
              <SettingsLink
                href="/couple-link"
                icon={Link2}
                title="커플 연결 관리"
                description="파트너 연결 상태를 확인하거나 커플 연결을 시작합니다."
              />
            </SettingsSection>
          ) : null}

          <SettingsSection title="정보 및 계정 관리">
            <SettingsLink
              href="/privacy"
              icon={ShieldCheck}
              title="개인정보처리방침"
              description="개인정보의 수집, 이용 및 보호 정책을 확인합니다."
            />
            <SettingsLink
              href="/account-delete"
              icon={UserRoundX}
              title="계정 삭제 안내"
              description="계정과 저장된 데이터의 삭제 절차를 확인합니다."
              tone="danger"
            />
          </SettingsSection>

          {email ? (
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2e5e1] bg-white px-4 py-3 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
