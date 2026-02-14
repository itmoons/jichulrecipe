import Script from "next/script";

const ADSENSE_CLIENT = "ca-pub-5176453529569105";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      {children}
    </>
  );
}
