// /app/sitemap.ts
import { MetadataRoute } from "next";
import { calculatorSlugs, SITE_URL } from "@/lib/calculators/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    { url: `${base}/calculators`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...calculatorSlugs.map((slug) => ({ url: `${base}/calculators/${slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
