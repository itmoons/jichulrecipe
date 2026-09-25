// /app/sitemap.ts
import { MetadataRoute } from "next";
import { calculatorSlugs, SITE_URL } from "@/lib/calculators/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    {
      url: `${base}/`,
    },
    { url: `${base}/calculators` },
    ...calculatorSlugs.map((slug) => ({ url: `${base}/calculators/${slug}` })),
  ];
}
