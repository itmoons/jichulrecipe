import Link from "next/link";
import { calculatorGuides, calculatorSeo, getRelatedCalculatorSlugs, SITE_URL } from "@/lib/calculators/seo";
import { canonicalCalculatorSlug } from "@/lib/calculators/routes";
import { getCalculatorContent } from "@/lib/calculators/content";

export function CalculatorSeoFrame({ slug, children }: { slug: string; children: React.ReactNode }) {
  const item = calculatorSeo[slug];
  const guide = calculatorGuides[slug];
  const related = getRelatedCalculatorSlugs(slug);
  const url = `${SITE_URL}/calculators/${canonicalCalculatorSlug(slug)}`;
  const content = getCalculatorContent(slug);
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
      <aside className="my-6 rounded-xl border border-[#c6e2d4] bg-[#f1f8f4] p-5">
        <p className="text-sm font-semibold text-slate-900">이 결과를 지출레시피에 저장하고 계속 관리하기</p>
        <p className="mt-2 text-xs leading-6 text-slate-600">무료로 가입하고 계산한 금액을 가계부에 기록해보세요. 현재 계산 결과는 자동 저장되지 않습니다.</p>
        <Link href="/sign-in?mode=register&redirect=%2Fdashboard%2Fcalendar" className="mt-3 inline-flex rounded-lg bg-[#1f7a5b] px-4 py-2 text-sm font-semibold text-white">무료로 시작하고 기록하기 →</Link>
      </aside>
      <section className="mb-6 rounded-xl border border-[#dce5dd] bg-white p-6 text-sm text-slate-600">
        <h2 className="text-xl font-bold text-slate-900">계산 방법과 활용</h2>
        <p className="mt-3 leading-7">{content.description}</p>
        <h3 className="mt-6 font-bold text-slate-900">계산 예시</h3>
        <p className="mt-2 leading-7">{content.example}</p>
        <h3 className="mt-6 font-bold text-slate-900">자주 묻는 질문</h3>
        <div className="mt-3 space-y-4">{content.faqs.map(faq => <div key={faq.question}><h4 className="font-semibold text-slate-900">{faq.question}</h4><p className="mt-1 leading-7">{faq.answer}</p></div>)}</div>
      </section>
      <section className="w-full pb-14"><div className="rounded-xl border border-[#dce5dd] bg-white p-6 text-sm text-slate-600 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{guide.question}</h2><p className="mt-3 leading-7">{guide.approach}</p><h3 className="mt-6 font-bold text-slate-900">결과를 해석할 때</h3><p className="mt-2 leading-7">{guide.caution} 이 계산은 입력값으로 만든 참고용 예상치이며 실제 계약·결제 조건을 대신하지 않습니다.</p><h3 className="mt-6 font-bold text-slate-900">함께 사용하면 좋은 계산기</h3><div className="mt-3 flex flex-wrap gap-2">{related.map((relatedSlug) => <Link key={relatedSlug} href={`/calculators/${canonicalCalculatorSlug(relatedSlug)}`} className="rounded-full border border-[#c6e2d4] bg-[#f1f8f4] px-3 py-1.5 text-xs font-semibold text-[#176247]">{calculatorSeo[relatedSlug].name}</Link>)}</div></div></section>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }) }} />
  </>;
}
