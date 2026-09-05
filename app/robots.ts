import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/saving",
          "/couple-ledger/",
          "/couple-link",
          "/couple-settings",
          "/settings/",
          "/notifications",
          "/sign-in",
          "/sign-up",
          "/reset-password",
          "/account-delete",
        ],
      },
    ],
    sitemap: "https://www.jiculrecipe.com/sitemap.xml",
    host: "https://www.jiculrecipe.com",
  };
}
