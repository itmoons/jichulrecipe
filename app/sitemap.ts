// /app/sitemap.ts
import { MetadataRoute } from "next";
import { calculatorSlugs, SITE_URL } from "@/lib/calculators/seo";
import { canonicalCalculatorSlug } from "@/lib/calculators/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    {
      url: `${base}/`,
    },
    { url: `${base}/calculators` },
    { url: `${base}/couple-household` },
    ...calculatorSlugs.map((slug) => ({ url: `${base}/calculators/${canonicalCalculatorSlug(slug)}` })),
  ];
}
