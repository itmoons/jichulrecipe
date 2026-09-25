export default function Loading() {
  return (
    <div className="site-initial-loader" role="status" aria-live="polite" aria-label="페이지를 불러오는 중">
      <div className="site-initial-progress" />
      <div className="site-initial-content">
        <div className="site-initial-ingredients" aria-hidden="true"><span>🥕</span><span>🥬</span><span>💸</span><span>₩</span></div>
        <p className="mt-4 text-sm font-medium text-slate-600">페이지를 준비하고 있어요…</p>
      </div>
    </div>
  );
}
