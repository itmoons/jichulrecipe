export default function MemoCard({
  title,
  dateLabel,
  detail,
}: {
  title: string;
  dateLabel: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-[10px] text-neutral-400">{dateLabel}</span>
      </div>
      <div className="text-[11px] text-neutral-600 mt-1">{detail}</div>
    </div>
  );
}
