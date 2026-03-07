// src/app/calculators/transport-compare/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** 레시피북 톤(연노랑 + 주황) */
const UI = {
  paperBg: "bg-[#ffffff]",
  paperDots:
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px]",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#7f7f7f]",
  card: "bg-[#f2fbff] border-[#e8f8ff]",
};

function toNumberSafe(v: string) {
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function formatKRW(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}
function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

type PublicMode = "월정액 입력" | "1km당 비용(추정)";

type CarModel = {
  fuelEfficiency: string; // km/L
  fuelPrice: string; // 원/L
  parkingMonthly: string; // 월 주차비
  insuranceTaxMonthly: string; // 보험/자동차세 월 환산
  maintenanceMonthly: string; // 정비/소모품 월 환산
  tollEtcMonthly: string; // 통행료/기타
};

export default function TransportComparePage() {
  const [kmPerMonth, setKmPerMonth] = useState("600"); // 월 이동거리(km)

  // 대중교통
  const [publicMode, setPublicMode] = useState<PublicMode>("월정액 입력");
  const [publicMonthly, setPublicMonthly] = useState("80000"); // 월 교통비(정기권/교통카드)
  const [publicCostPerKm, setPublicCostPerKm] = useState("130"); // 1km당 평균 비용(원) 추정

  // 자차
  const [car, setCar] = useState<CarModel>({
    fuelEfficiency: "12", // km/L
    fuelPrice: "1700", // 원/L
    parkingMonthly: "60000",
    insuranceTaxMonthly: "60000",
    maintenanceMonthly: "30000",
    tollEtcMonthly: "20000",
  });

  const calc = useMemo(() => {
    const km = Math.max(0, toNumberSafe(kmPerMonth));

    // 대중교통 월 비용
    const pubMonthly =
      publicMode === "월정액 입력"
        ? Math.max(0, toNumberSafe(publicMonthly))
        : Math.max(0, toNumberSafe(publicCostPerKm)) * km;

    const pubYearly = pubMonthly * 12;
    const pubPerKm = km > 0 ? pubMonthly / km : 0;

    // 자차 비용 분해
    const eff = Math.max(0.1, toNumberSafe(car.fuelEfficiency)); // 0 방지
    const fuelPrice = Math.max(0, toNumberSafe(car.fuelPrice));

    // 연료비 = (km / km/L) * 원/L
    const fuelMonthly = (km / eff) * fuelPrice;

    const parking = Math.max(0, toNumberSafe(car.parkingMonthly));
    const insTax = Math.max(0, toNumberSafe(car.insuranceTaxMonthly));
    const maint = Math.max(0, toNumberSafe(car.maintenanceMonthly));
    const toll = Math.max(0, toNumberSafe(car.tollEtcMonthly));

    const carMonthly = fuelMonthly + parking + insTax + maint + toll;
    const carYearly = carMonthly * 12;
    const carPerKm = km > 0 ? carMonthly / km : 0;

    // 비교
    const diffMonthly = carMonthly - pubMonthly; // +면 자차가 비쌈
    const diffYearly = diffMonthly * 12;

    const cheaper =
      diffMonthly > 0
        ? { winner: "대중교통", msg: "현재 조건에선 대중교통이 비용 면에서 유리합니다." }
        : diffMonthly < 0
        ? { winner: "자차", msg: "현재 조건에선 자차가 비용 면에서 유리합니다." }
        : { winner: "동일", msg: "현재 조건에선 비용이 거의 같습니다." };

    // 신호등: 차이가 크면 점검 유도
    const absDiff = Math.abs(diffMonthly);
    const signal =
      absDiff <= 20000
        ? { label: "근접", badge: "bg-[#52a9ff] text-[#ffffff]" }
        : absDiff <= 80000
        ? { label: "차이 있음", badge: "bg-[#34D399] text-white" }
        : { label: "차이 큼", badge: "bg-[#5bbbf3] text-white" };

    // 자차 비용 비중
    const fixedCar = parking + insTax + maint + toll;
    const fixedShare = carMonthly > 0 ? (fixedCar / carMonthly) * 100 : 0;
    const fuelShare = carMonthly > 0 ? (fuelMonthly / carMonthly) * 100 : 0;

    return {
      km,
      pubMonthly,
      pubYearly,
      pubPerKm,
      fuelMonthly,
      parking,
      insTax,
      maint,
      toll,
      carMonthly,
      carYearly,
      carPerKm,
      diffMonthly,
      diffYearly,
      cheaper,
      signal,
      fixedShare,
      fuelShare,
    };
  }, [kmPerMonth, publicMode, publicMonthly, publicCostPerKm, car]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto w-[1240px] px-4 py-7 sm:py-10">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#5bbbf3] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              교통비 비교
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              교통비 비교 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              월 이동거리(km)를 기준으로 <span className="font-semibold text-[#ffffff]">대중교통 vs 자차</span> 비용을 비교합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>

              <div className="mt-4 grid gap-3">
                <NumberInput
                  label="월 이동거리(km)"
                  value={kmPerMonth}
                  setValue={setKmPerMonth}
                  hint="예: 600"
                />

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">대중교통</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        정기권/교통카드 월 정액이 있으면 그 값이 가장 정확합니다.
                      </div>
                    </div>
                    <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                      Public
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <SelectInput
                      label="입력 방식"
                      value={publicMode}
                      onChange={(v) => setPublicMode(v as PublicMode)}
                      options={["월정액 입력", "1km당 비용(추정)"]}
                    />

                    {publicMode === "월정액 입력" ? (
                      <MoneyInput
                        label="월 교통비(정기권/교통카드)"
                        value={publicMonthly}
                        setValue={setPublicMonthly}
                        hint="예: 80,000"
                      />
                    ) : (
                      <MoneyInput
                        label="1km당 평균 비용(원)"
                        value={publicCostPerKm}
                        setValue={setPublicCostPerKm}
                        hint="예: 130"
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">자차</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        연료비 + (주차/보험/세금/정비/통행료 등) 월 환산을 합산합니다.
                      </div>
                    </div>
                    <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                      Car
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <NumberInput
                      label="연비(km/L)"
                      value={car.fuelEfficiency}
                      setValue={(v) => setCar((p) => ({ ...p, fuelEfficiency: v }))}
                      hint="예: 12"
                    />
                    <MoneyInput
                      label="유가(원/L)"
                      value={car.fuelPrice}
                      setValue={(v) => setCar((p) => ({ ...p, fuelPrice: v }))}
                      hint="예: 1,700"
                    />
                    <MoneyInput
                      label="주차비(월)"
                      value={car.parkingMonthly}
                      setValue={(v) => setCar((p) => ({ ...p, parkingMonthly: v }))}
                    />
                    <MoneyInput
                      label="보험/자동차세(월 환산)"
                      value={car.insuranceTaxMonthly}
                      setValue={(v) => setCar((p) => ({ ...p, insuranceTaxMonthly: v }))}
                      hint="연 납부액 ÷ 12"
                    />
                    <MoneyInput
                      label="정비/소모품(월 환산)"
                      value={car.maintenanceMonthly}
                      setValue={(v) => setCar((p) => ({ ...p, maintenanceMonthly: v }))}
                      hint="타이어/오일 등"
                    />
                    <MoneyInput
                      label="통행료/기타(월)"
                      value={car.tollEtcMonthly}
                      setValue={(v) => setCar((p) => ({ ...p, tollEtcMonthly: v }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 팁</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>자차는 “연료비”보다 <b>고정비(보험/세금/주차/정비)</b>가 큰 경우가 많습니다.</li>
                  <li>월 이동거리가 낮을수록 자차의 1km당 비용이 급격히 올라갑니다(고정비 분산이 안 됨).</li>
                  <li>반대로 이동거리가 매우 높으면 연료비 비중이 커져 유가/연비 민감도가 커집니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>비교 결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    월/연 총액과 1km당 비용을 같이 보세요.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="대중교통 월 비용" value={`${formatKRW(calc.pubMonthly)}원`} />
                <MetricCard title="자차 월 비용" value={`${formatKRW(calc.carMonthly)}원`} />
                <MetricCard title="대중교통 1km당" value={`${formatKRW(calc.pubPerKm)}원/km`} />
                <MetricCard title="자차 1km당" value={`${formatKRW(calc.carPerKm)}원/km`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>월 차이(자차 - 대중교통)</div>
                  <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                    {calc.cheaper.winner} 유리
                  </span>
                </div>

                <div className="mt-2 text-3xl font-bold text-[#ffffff]">
                  {(calc.diffMonthly >= 0 ? "+" : "") + formatKRW(calc.diffMonthly)}원/월
                </div>

                <div className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.cheaper.msg}</div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MiniCard title="연 차이(×12)" value={`${(calc.diffYearly >= 0 ? "+" : "") + formatKRW(calc.diffYearly)}원`} />
                  <MiniCard title="월 이동거리" value={`${formatKRW(calc.km)} km`} />
                </div>
              </div>

              {/* 자차 비용 분해 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>자차 비용 분해</div>

                <div className="mt-3 grid gap-2">
                  <Row label="연료비(추정)" value={`${formatKRW(calc.fuelMonthly)}원`} tone="blue" />
                  <Row label="주차비" value={`${formatKRW(calc.parking)}원`} />
                  <Row label="보험/세금(월 환산)" value={`${formatKRW(calc.insTax)}원`} />
                  <Row label="정비/소모품(월 환산)" value={`${formatKRW(calc.maint)}원`} />
                  <Row label="통행료/기타" value={`${formatKRW(calc.toll)}원`} />
                </div>

                <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7f7f7f]">
                    <span>고정비 비중</span>
                    <span>{pct(calc.fixedShare)}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border border-[#e8f8ff] bg-white">
                    <div
                      className="h-full bg-[#5bbbf3]"
                      style={{ width: `${clamp(calc.fixedShare, 0, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[#7f7f7f]">
                    <span>연료비 비중</span>
                    <span>{pct(calc.fuelShare)}%</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/category-deviation-alert"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 카테고리 편차 경보 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 자차 비용에는 감가상각(차량 가치 하락)과 사고 위험 비용은 포함하지 않았습니다. 실제 총비용 관점에서는 추가 고려가 필요합니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function NumberInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
        )}
      />
    </div>
  );
}

function MoneyInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          ₩
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-[12px] outline-none",
            "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
          )}
        />
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-[#f2fbff] p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-lg font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "blue";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-[#f2fbff] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-[12px] font-bold", tone === "blue" ? "text-[#ffffff]" : "text-[#7f7f7f]")}>
        {value}
      </span>
    </div>
  );
}
