import Link from "next/link";
import { calculatorGuides, calculatorSeo, getRelatedCalculatorSlugs, SITE_URL } from "@/lib/calculators/seo";

export function CalculatorSeoFrame({ slug, children }: { slug: string; children: React.ReactNode }) {
  const item = calculatorSeo[slug];
  const guide = calculatorGuides[slug];
  const related = getRelatedCalculatorSlugs(slug);
  const url = `${SITE_URL}/calculators/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: item.name,
    applicationCategory: "FinanceApplication", operatingSystem: "Web", url, inLanguage: "ko-KR",
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
    <div className="calculator-detail">
      {children}
      <section className="w-full pb-14"><div className="rounded-xl border border-[#dce5dd] bg-white p-6 text-sm text-slate-600 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{guide.question}</h2><p className="mt-3 leading-7">{guide.approach}</p><h3 className="mt-6 font-bold text-slate-900">결과를 해석할 때</h3><p className="mt-2 leading-7">{guide.caution} 이 계산은 입력값으로 만든 참고용 예상치이며 실제 계약·결제 조건을 대신하지 않습니다.</p><h3 className="mt-6 font-bold text-slate-900">함께 사용하면 좋은 계산기</h3><div className="mt-3 flex flex-wrap gap-2">{related.map((relatedSlug) => <Link key={relatedSlug} href={`/calculators/${relatedSlug}`} className="rounded-full border border-[#c6e2d4] bg-[#f1f8f4] px-3 py-1.5 text-xs font-semibold text-[#176247]">{calculatorSeo[relatedSlug].name}</Link>)}</div></div></section>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
  </>;
}
