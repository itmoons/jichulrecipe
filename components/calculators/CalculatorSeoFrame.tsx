import Link from "next/link";
import { calculatorSeo, calculatorSlugs, SITE_URL } from "@/lib/calculators/seo";

export function CalculatorSeoFrame({ slug, children }: { slug: string; children: React.ReactNode }) {
  const item = calculatorSeo[slug];
  const related = calculatorSlugs.filter((value) => value !== slug).slice(0, 3);
  const url = `${SITE_URL}/calculators/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: item.name,
    applicationCategory: "FinanceApplication", operatingSystem: "Web", url,
    description: item.description, isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  };
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "계산기", item: `${SITE_URL}/calculators` },
      { "@type": "ListItem", position: 3, name: item.name, item: url },
    ],
  };
  return <>
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-5 text-xs text-slate-500 sm:px-6"><Link href="/">홈</Link><span className="px-2">›</span><Link href="/calculators">계산기</Link><span className="px-2">›</span><span>{item.name}</span></nav>
    {children}
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6"><div className="rounded-3xl border border-orange-100 bg-white/80 p-6 text-sm text-slate-600 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{item.name} 안내</h2><p className="mt-3 leading-7">{item.description}</p><h3 className="mt-6 font-bold text-slate-900">계산 결과를 볼 때 유의할 점</h3><p className="mt-2 leading-7">계산 결과는 입력값을 바탕으로 한 참고용 예상치입니다. 실제 조건과 기준은 금융기관 및 관련 기관의 최신 안내를 확인해 주세요.</p><h3 className="mt-6 font-bold text-slate-900">관련 계산기</h3><div className="mt-3 flex flex-wrap gap-2">{related.map((relatedSlug) => <Link key={relatedSlug} href={`/calculators/${relatedSlug}`} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">{calculatorSeo[relatedSlug].name}</Link>)}</div></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
  </>;
}
