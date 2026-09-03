"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CoupleLedgerNav from "@/components/couple-ledger/CoupleLedgerNav";

type CoupleContext = {
  couple_link_id: string;
  couple_ledger_id: string;
  partner_user_id: string;
  shared_ledger_on: boolean;
  personal_share_on: boolean;
  allow_edit: boolean;
} | null;

type CoupleExpense = {
  id: string;
  couple_link_id: string;
  created_by: string;
  amount: number;
  category: string | null;
  memo: string | null;
  expense_date: string;
  created_at: string;
  receipt_url?: string | null;
};

type PersonalExpense = {
  id: string;
  user_id: string;
  amount: number;
  category: string | null;
  memo: string | null;
  expense_date: string;
  created_at: string;
};

type Tab = "shared" | "mine" | "partner";
type ToastType = "success" | "error" | "info";

function money(n: number | bigint) {
  const v = typeof n === "bigint" ? Number(n) : n;
  return (v || 0).toLocaleString("ko-KR");
}

function dayK(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR");
  } catch {
    return dateStr;
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Pill({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "soft" | "muted";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[10px] px-3 py-1 text-[11px] font-medium",
        tone === "accent" && "border border-[#fed7aa] bg-[#fff7ed] text-[#ff8a3d]",
        tone === "soft" && "border border-[#E5E7EB] bg-white text-[#ff8a3d]",
        tone === "muted" && "border border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      {children}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-[12px] px-4 py-2.5 text-[10px] font-medium transition-all duration-200",
        active
          ? "border border-[#fed7aa] bg-[#fff7ed] text-[#ff8a3d] shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-[#fed7aa] hover:bg-[#fff7ed] hover:text-[#ff8a3d]"
      )}
    >
      <span className="text-[14px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[20px] md:rounded-[24px] border border-[#F3F4F6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function DataCard({
  label,
  value,
  subtle,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-4">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] md:text-[15px] font-semibold text-slate-900">
        {value}
      </div>
      {subtle ? <div className="mt-1 text-[11px] text-slate-500">{subtle}</div> : null}
    </div>
  );
}

function RecipeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function InlineReceiptField({
  preview,
  hasExisting,
  onPick,
  onClear,
}: {
  preview: string | null;
  hasExisting?: boolean;
  onPick: (file: File | null) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="mt-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />

      <div className="flex min-h-[46px] items-center gap-2 rounded-[16px] border border-[#E5E7EB] bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center rounded-[10px] border border-[#cfe9ff] bg-[#f4fbff] px-3 py-1.5 text-[12px] font-medium text-[#ff8a3d] transition hover:bg-[#eaf6ff]"
        >
          {preview || hasExisting ? "변경" : "첨부"}
        </button>

        <div className="min-w-0 flex-1">
          {preview ? (
            <div className="flex items-center gap-2">
              <img
                src={preview}
                alt="영수증 미리보기"
                className="h-8 w-8 rounded-[8px] object-cover ring-1 ring-black/5"
              />
              <span className="truncate text-[12px] text-slate-600">새 영수증 이미지 선택됨</span>
            </div>
          ) : hasExisting ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#fff7ed] text-[13px]">
                🧾
              </span>
              <span className="truncate text-[12px] text-slate-600">기존 영수증 있음</span>
            </div>
          ) : (
            <span className="truncate text-[12px] text-slate-400">영수증 이미지 없음</span>
          )}
        </div>

        {(preview || hasExisting) && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center rounded-[10px] border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 transition hover:bg-slate-50"
          >
            제거
          </button>
        )}
      </div>
    </div>
  );
}

const inputBaseClass =
  "mt-1.5 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FDBA74] focus:ring-4 focus:ring-[#fff7ed]";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] bg-[#ff8a3d] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#ff8a3d] disabled:opacity-60";

const neutralButtonClass =
  "inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50";

export default function CoupleLedgerEntryUI() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [ctx, setCtx] = useState<CoupleContext>(null);
  const [tab, setTab] = useState<Tab>("shared");

  const [sharedList, setSharedList] = useState<CoupleExpense[]>([]);
  const [myList, setMyList] = useState<PersonalExpense[]>([]);
  const [partnerList, setPartnerList] = useState<PersonalExpense[]>([]);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("데이트");
  const [memo, setMemo] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [adding, setAdding] = useState(false);

  const [mySharePct, setMySharePct] = useState(50);
  const [period, setPeriod] = useState<"thisMonth" | "all" | "custom">("thisMonth");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const mm = String(first.getMonth() + 1).padStart(2, "0");
    const dd = String(first.getDate()).padStart(2, "0");
    return `${first.getFullYear()}-${mm}-${dd}`;
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [settlement, setSettlement] = useState<any>(null);
  const [settling, setSettling] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("데이트");
  const [editMemo, setEditMemo] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [updating, setUpdating] = useState(false);

  const [showMobileAddForm, setShowMobileAddForm] = useState(false);
  const addFormRef = useRef<HTMLDivElement | null>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);
  const [editReceiptPreview, setEditReceiptPreview] = useState<string | null>(null);
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | null>(null);
  const [editRemoveReceipt, setEditRemoveReceipt] = useState(false);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
      if (editReceiptPreview) URL.revokeObjectURL(editReceiptPreview);
    };
  }, [receiptPreview, editReceiptPreview]);

  const validateReceiptFile = (file: File | null) => {
    if (!file) return null;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return "jpg, png, webp 이미지만 업로드할 수 있습니다.";
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return "이미지는 5MB 이하만 업로드할 수 있습니다.";
    }

    return null;
  };

  const uploadReceiptImage = async (file: File, uid: string) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("receipt-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("receipt-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const clearReceiptPreview = () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    setReceiptFile(null);
  };

  const clearEditReceiptPreview = () => {
    if (editReceiptPreview) URL.revokeObjectURL(editReceiptPreview);
    setEditReceiptPreview(null);
    setEditReceiptFile(null);
  };

  const handleReceiptChange = (file: File | null) => {
    const err = validateReceiptFile(file);
    if (err) {
      showToast(err, "error");
      return;
    }

    if (receiptPreview) URL.revokeObjectURL(receiptPreview);

    setReceiptFile(file);

    if (file) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const handleEditReceiptChange = (file: File | null) => {
    const err = validateReceiptFile(file);
    if (err) {
      showToast(err, "error");
      return;
    }

    if (editReceiptPreview) URL.revokeObjectURL(editReceiptPreview);

    setEditReceiptFile(file);
    setEditRemoveReceipt(false);

    if (file) {
      setEditReceiptPreview(URL.createObjectURL(file));
    } else {
      setEditReceiptPreview(null);
    }
  };

  const loadContext = async (): Promise<CoupleContext> => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    setIsLoggedIn(!!uid);

    if (!uid) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const { data, error } = await supabase.rpc("get_my_couple_context");
    if (error || !data || data.length === 0) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const next = data[0] as CoupleContext;
    setCtx(next);
    setChecking(false);
    return next;
  };

  const loadShared = async (couple_link_id: string) => {
    const { data, error } = await supabase
      .from("couple_expenses")
      .select("*")
      .eq("couple_link_id", couple_link_id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);

    if (!error) setSharedList((data || []) as CoupleExpense[]);
  };

  const loadPersonal = async (who: "me" | "partner") => {
    const { data, error } = await supabase.rpc("get_couple_personal_expenses", {
      p_who: who,
      p_limit: 200,
    });

    if (error) {
      if (who === "me") setMyList([]);
      else setPartnerList([]);
      return;
    }

    if (who === "me") setMyList((data || []) as PersonalExpense[]);
    else setPartnerList((data || []) as PersonalExpense[]);
  };

  const calcSettlement = async (c?: CoupleContext, silent = false) => {
    const context = c ?? ctx;
    if (!context?.couple_link_id) return;

    if (!context.shared_ledger_on) {
      setSettlement(null);
      return;
    }

    setSettling(true);
    try {
      let p_from = from;
      let p_to = to;

      if (period === "thisMonth") {
        const d = new Date();
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const mm = String(first.getMonth() + 1).padStart(2, "0");
        const dd = String(first.getDate()).padStart(2, "0");
        p_from = `${first.getFullYear()}-${mm}-${dd}`;

        const mm2 = String(d.getMonth() + 1).padStart(2, "0");
        const dd2 = String(d.getDate()).padStart(2, "0");
        p_to = `${d.getFullYear()}-${mm2}-${dd2}`;

        setFrom(p_from);
        setTo(p_to);
      }

      if (period === "all") {
        p_from = "1970-01-01";
        const d = new Date();
        const mm2 = String(d.getMonth() + 1).padStart(2, "0");
        const dd2 = String(d.getDate()).padStart(2, "0");
        p_to = `${d.getFullYear()}-${mm2}-${dd2}`;
      }

      const pct = Math.trunc(Number(mySharePct));

      const { data, error } = await supabase.rpc("get_couple_settlement", {
        p_my_share_pct: pct,
        p_from,
        p_to,
      });

      if (error) throw error;
      setSettlement(data?.[0] ?? null);
    } catch (e: any) {
      if (!silent) showToast(e?.message ?? "정산 계산 실패", "error");
      setSettlement(null);
    } finally {
      setSettling(false);
    }
  };

  const refreshAll = async () => {
    const c = await loadContext();
    if (!c?.couple_link_id) return;

    if (c.shared_ledger_on) await loadShared(c.couple_link_id);
    else setSharedList([]);

    if (c.personal_share_on) {
      await loadPersonal("me");
      await loadPersonal("partner");
    } else {
      setMyList([]);
      setPartnerList([]);
    }

    await calcSettlement(c, true);
  };

  useEffect(() => {
    refreshAll();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshAll();
    });

    return () => subscription.unsubscribe();
  }, []);

  const openMobileAddForm = () => {
    setShowMobileAddForm(true);
    setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const addShared = async () => {
    if (!ctx?.couple_link_id) return;

    if (!ctx.shared_ledger_on) {
      showToast("공동 장부 공유가 꺼져 있습니다.", "error");
      return;
    }

    const v = Number(amount.replaceAll(",", ""));
    if (!Number.isFinite(v) || v <= 0) {
      showToast("금액을 올바르게 입력하세요.", "error");
      return;
    }

    setAdding(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("로그인이 필요합니다.");

      let receiptUrl: string | null = null;

      if (receiptFile) {
        receiptUrl = await uploadReceiptImage(receiptFile, uid);
      }

      const { error } = await supabase.from("couple_expenses").insert({
        couple_link_id: ctx.couple_link_id,
        created_by: uid,
        amount: v,
        category,
        memo,
        expense_date: expenseDate,
        receipt_url: receiptUrl,
      });

      if (error) throw error;

      setAmount("");
      setMemo("");
      setCategory("데이트");
      setExpenseDate(() => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${mm}-${dd}`;
      });
      clearReceiptPreview();
      setShowMobileAddForm(false);
      showToast("지출 레시피가 저장되었습니다.", "success");
      await refreshAll();
    } catch (e: any) {
      showToast(e?.message ?? "추가 실패", "error");
    } finally {
      setAdding(false);
    }
  };

  const canEdit = !!ctx?.allow_edit;

  const startEdit = (item: CoupleExpense) => {
    if (!canEdit) return;

    setEditingId(item.id);
    setEditAmount(String(item.amount ?? ""));
    setEditCategory(item.category || "데이트");
    setEditMemo(item.memo || "");
    setEditExpenseDate(item.expense_date);
    setEditReceiptUrl(item.receipt_url || null);
    setEditReceiptFile(null);
    setEditRemoveReceipt(false);

    if (editReceiptPreview) {
      URL.revokeObjectURL(editReceiptPreview);
      setEditReceiptPreview(null);
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditCategory("데이트");
    setEditMemo("");
    setEditExpenseDate("");
    setEditReceiptUrl(null);
    setEditReceiptFile(null);
    setEditRemoveReceipt(false);

    if (editReceiptPreview) {
      URL.revokeObjectURL(editReceiptPreview);
      setEditReceiptPreview(null);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !canEdit) return;

    const v = Number(editAmount.replaceAll(",", ""));
    if (!Number.isFinite(v) || v <= 0) {
      showToast("수정 금액을 올바르게 입력하세요.", "error");
      return;
    }

    setUpdating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("로그인이 필요합니다.");

      let nextReceiptUrl = editReceiptUrl;

      if (editRemoveReceipt) {
        nextReceiptUrl = null;
      }

      if (editReceiptFile) {
        nextReceiptUrl = await uploadReceiptImage(editReceiptFile, uid);
      }

      const { error } = await supabase
        .from("couple_expenses")
        .update({
          amount: v,
          category: editCategory,
          memo: editMemo,
          expense_date: editExpenseDate,
          receipt_url: nextReceiptUrl,
        })
        .eq("id", editingId);

      if (error) throw error;

      showToast("레시피가 수정되었습니다.", "success");
      cancelEdit();
      await refreshAll();
    } catch (e: any) {
      showToast(e?.message ?? "수정 실패", "error");
    } finally {
      setUpdating(false);
    }
  };

  const deleteShared = async (id: string) => {
    if (!canEdit) return;

    const ok = window.confirm("이 항목을 삭제할까요?");
    if (!ok) return;

    const { error } = await supabase.from("couple_expenses").delete().eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    if (editingId === id) cancelEdit();

    showToast("레시피가 삭제되었습니다.", "success");
    await refreshAll();
  };

  const list = useMemo(() => {
    if (tab === "shared") return sharedList;
    if (tab === "mine") return myList;
    return partnerList;
  }, [tab, sharedList, myList, partnerList]);

  const listTitle =
    tab === "shared" ? "함께 쓴 레시피" : tab === "mine" ? "내가 적은 레시피" : "상대가 적은 레시피";

  const sharedLocked = ctx?.shared_ledger_on !== true;
  const personalLocked = ctx?.personal_share_on !== true;

  const thisMonthSharedTotal = useMemo(() => {
    const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return sharedList
      .filter((x) => (x.expense_date || "").startsWith(ym))
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }, [sharedList]);

  const mySharedPaidTotal = useMemo(() => {
    if (!ctx?.partner_user_id) return 0;
    return sharedList
      .filter((x) => x.created_by !== ctx.partner_user_id)
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }, [sharedList, ctx?.partner_user_id]);

  if (checking) {
    return <div className="mx-auto max-w-[1180px] landing-surface min-h-screen p-6 text-[14px] text-slate-600">불러오는 중…</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="landing-surface min-h-screen p-4 md:p-6">
        <Surface className="mx-auto max-w-xl p-5 md:p-6">
          <div className="text-[18px] md:text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
            우리의 지출 레시피
          </div>
          <div className="mt-2 text-[14px] leading-6 text-slate-600">로그인 후 사용할 수 있습니다.</div>
          <div className="mt-5">
            <Link href="/sign-in" className={primaryButtonClass}>
              로그인하기
            </Link>
          </div>
        </Surface>
      </div>
    );
  }

  if (!ctx?.couple_link_id) {
    return (
      <div className="landing-surface min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          <Surface className="p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[20px] md:text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
                  우리의 지출 레시피
                </div>
                <div className="mt-2 text-[14px] leading-6 text-slate-600">
                  아직 커플 연결이 없습니다. 먼저 연결을 완료하세요.
                </div>
              </div>
              <Pill tone="accent">Recipe Note</Pill>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/couple-link" className={primaryButtonClass}>
                커플 연결하러 가기
              </Link>
              <Link href="/" className={neutralButtonClass}>
                홈으로
              </Link>
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-surface min-h-screen pb-24 md:pb-10">
      <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-6 md:py-8">
        <Surface className="overflow-hidden">
          <div className="border-b border-[#F3F4F6] bg-white px-4 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-[18px] md:text-[20px] font-semibold tracking-[-0.03em] text-slate-900">
                  우리의 지출 레시피
                </div>
                <div className="mt-2 max-w-2xl text-[10px] md:text-[14px] leading-6 text-slate-600">
                  함께 쓴 돈을 한 장에 정리하고, 정산까지 이어지는 커플 가계부
                </div>

                <div className="mt-4 flex flex-wrap gap-1 text-[6px]">
                  <Pill tone="accent">함께 기록 중</Pill>
                  <Pill tone={sharedLocked ? "muted" : "soft"}>
                    공동 공유 {sharedLocked ? "OFF" : "ON"}
                  </Pill>
                  <Pill tone={personalLocked ? "muted" : "soft"}>
                    개인 공유 {personalLocked ? "OFF" : "ON"}
                  </Pill>
                  <Pill tone={canEdit ? "soft" : "muted"}>
                    편집 {canEdit ? "ON" : "OFF"}
                  </Pill>
                </div>
              </div>

              <CoupleLedgerNav active="entry" />
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 md:grid-cols-3 md:px-6 md:py-5">
            <DataCard label="이번달 함께 쓴 금액" value={`${money(thisMonthSharedTotal)}원`} />
            <DataCard label="내가 결제한 금액" value={`${money(mySharedPaidTotal)}원`} />
            <DataCard
              label="현재 정산 메모"
              value={
                settlement?.who_pays_to === "even"
                  ? "정산 없음"
                  : settlement?.who_pays_to === "me->partner"
                    ? `내가 ${money(settlement?.amount || 0)}원 보내기`
                    : settlement?.who_pays_to === "partner->me"
                      ? `상대가 ${money(settlement?.amount || 0)}원 보내기`
                      : "아직 계산 전"
              }
            />
          </div>
        </Surface>

        <Surface className="mt-4 md:mt-5 p-4 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[17px] md:text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                정산 레시피
              </div>
              <div className="mt-2 text-[10px] md:text-[14px] leading-6 text-slate-600">
                공동 지출 기준으로 부담 비율에 맞춰 자동 계산됩니다.
              </div>
            </div>

            <button
              type="button"
              onClick={() => calcSettlement(undefined, false)}
              disabled={settling || sharedLocked}
              className={cx("w-full sm:w-auto", primaryButtonClass)}
            >
              {settling ? "계산 중…" : "정산 다시 계산"}
            </button>
          </div>

          {sharedLocked ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-[14px] text-slate-700">
              공동 장부 공유가 꺼져 있습니다. 커플 설정에서 공동 공유를 켜면 정산이 활성화됩니다.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.9fr_1.15fr]">
                <div className="rounded-[20px] md:rounded-[24px] border border-[#d5f9ff] bg-[#f9fdff] p-4">
                  <div className="text-[12px] font-medium text-slate-500">기간 설정</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={cx(
                        "rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition",
                        period === "thisMonth"
                          ? "bg-[#fff7ed] text-[#0c6ac2]"
                          : "border border-slate-200 bg-white text-slate-600"
                      )}
                      onClick={() => setPeriod("thisMonth")}
                    >
                      이번달
                    </button>
                    <button
                      type="button"
                      className={cx(
                        "rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition",
                        period === "all"
                          ? "bg-[#fff7ed] text-[#ff8a3d]"
                          : "border border-slate-200 bg-white text-slate-600"
                      )}
                      onClick={() => setPeriod("all")}
                    >
                      전체
                    </button>
                    <button
                      type="button"
                      className={cx(
                        "rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition",
                        period === "custom"
                          ? "bg-[#fff7ed] text-[#ff8a3d]"
                          : "border border-slate-200 bg-white text-slate-600"
                      )}
                      onClick={() => setPeriod("custom")}
                    >
                      직접
                    </button>
                  </div>

                  {period === "custom" && (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className={inputBaseClass.replace("mt-1.5 ", "")}
                      />
                      <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className={inputBaseClass.replace("mt-1.5 ", "")}
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] md:rounded-[24px] border border-[#d5f9ff] bg-white p-4">
                  <div className="text-[12px] font-medium text-slate-500">내 부담 비율</div>
                  <div className="mt-2 text-[12px] leading-5 text-slate-500">
                    50이면 반반, 60이면 내가 60% 부담합니다.
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={mySharePct}
                      onChange={(e) => setMySharePct(Number(e.target.value))}
                      className="w-full accent-[#ff8a3d]"
                    />
                    <div className="min-w-[68px] rounded-[16px] border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-center text-[14px] font-semibold text-[#ff8a3d]">
                      {mySharePct}%
                    </div>
                  </div>

                  <div className="mt-2 text-[12px] text-slate-500">
                    상대 부담: <b>{100 - mySharePct}%</b>
                  </div>
                </div>

                <div className="rounded-[20px] md:rounded-[24px] border border-[#fed7aa] bg-[#f9fdff] p-4">
                  <div className="text-[12px] font-medium text-slate-500">정산 결과</div>

                  {settlement ? (
                    <>
                      <div className="mt-3 rounded-[18px] md:rounded-[20px] border border-[#d5f9ff] bg-white px-4 py-4">
                        <div className="text-[11px] font-medium text-slate-500">정산 문장</div>
                        <div className="mt-1 text-[14px] md:text-[16px] font-semibold leading-7 tracking-[-0.02em] text-slate-900">
                          {settlement.who_pays_to === "even" && "이번 기간은 정산 없음"}
                          {settlement.who_pays_to === "me->partner" &&
                            `내가 상대에게 ${money(settlement.amount)}원 보내기`}
                          {settlement.who_pays_to === "partner->me" &&
                            `상대가 나에게 ${money(settlement.amount)}원 보내기`}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <DataCard label="총 공동지출" value={`${money(settlement.total_amount)}원`} />
                        <DataCard label="내가 낸 돈" value={`${money(settlement.my_paid)}원`} />
                        <DataCard label="내가 부담할 돈" value={`${money(settlement.my_should_pay)}원`} />
                        <DataCard label="상대가 낸 돈" value={`${money(settlement.partner_paid)}원`} />
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 text-[14px] leading-6 text-slate-600">
                      아직 계산된 정산이 없습니다. 정산 다시 계산을 눌러주세요.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-[11px] leading-5 text-slate-500">
                * 정산은 공동 지출만 기준으로 계산합니다. 개인 지출은 공유하더라도 정산에 포함하지 않는 편이 분쟁 비용이 낮습니다.
              </div>
            </>
          )}
        </Surface>

        <div className="mt-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-max gap-2 px-0">
            <TabButton active={tab === "shared"} onClick={() => setTab("shared")} icon="🧾" label="함께" />
            <TabButton active={tab === "mine"} onClick={() => setTab("mine")} icon="✍️" label="내 레시피" />
            <TabButton active={tab === "partner"} onClick={() => setTab("partner")} icon="💌" label="상대 레시피" />
          </div>
        </div>

        <Surface className="mt-4 p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[17px] md:text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                {listTitle}
              </div>
              <div className="mt-2 text-[10px] leading-5 text-slate-600">
                {tab === "shared" && "둘이 함께 사용한 지출을 레시피처럼 남깁니다."}
                {tab === "mine" && "내 개인 지출입니다. 개인 공유가 켜져 있어야 보입니다."}
                {tab === "partner" && "상대 개인 지출입니다. 개인 공유가 켜져 있어야 보입니다."}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={refreshAll} className={neutralButtonClass}>
                새로고침
              </button>

              {tab === "shared" && !sharedLocked && (
                <button
                  type="button"
                  onClick={openMobileAddForm}
                  className="inline-flex md:hidden items-center justify-center rounded-[12px] bg-[#ff8a3d] px-4 py-2.5 text-[10px] font-medium text-white"
                >
                  새 레시피
                </button>
              )}
            </div>
          </div>

          {tab === "shared" && sharedLocked && (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-[14px] text-slate-700">
              공동 공유가 꺼져 있어 공동 장부가 비공개 상태입니다. 커플 설정에서 켜면 사용할 수 있습니다.
            </div>
          )}

          {(tab === "mine" || tab === "partner") && personalLocked && (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-[14px] text-slate-700">
              개인 지출 공유가 꺼져 있습니다. 커플 설정에서 개인 공유를 켜면 내/상대 지출 탭이 활성화됩니다.
            </div>
          )}

          {tab === "shared" && !sharedLocked && (
            <div
              ref={addFormRef}
              className={cx(
                "mt-5 rounded-[20px] md:rounded-[24px] border border-[#fed7aa] bg-[#f9fdff] p-4 md:p-5",
                "block",
                !showMobileAddForm && "hidden md:block"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[15px] md:text-[16px] font-semibold text-slate-900">
                    새 지출 레시피 적기
                  </div>
                  <div className="mt-1 text-[13px] text-slate-600">
                    오늘 함께 사용한 지출을 간단히 남겨보세요.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="accent">Recipe Note</Pill>
                  <button
                    type="button"
                    onClick={() => setShowMobileAddForm(false)}
                    className="inline-flex md:hidden rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700"
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-6">
                <RecipeField label="날짜">
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="카테고리">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputBaseClass}
                  >
                    <option>데이트</option>
                    <option>식비</option>
                    <option>카페</option>
                    <option>교통</option>
                    <option>장보기</option>
                    <option>여행</option>
                    <option>생활</option>
                    <option>기타</option>
                  </select>
                </RecipeField>

                <RecipeField label="금액">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="예: 45000"
                    inputMode="numeric"
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="메모">
                  <input
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="예: 브런치 + 커피"
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="영수증">
                  <InlineReceiptField
                    preview={receiptPreview}
                    hasExisting={false}
                    onPick={handleReceiptChange}
                    onClear={clearReceiptPreview}
                  />
                </RecipeField>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addShared}
                    disabled={adding}
                    className={cx("w-full", primaryButtonClass)}
                  >
                    {adding ? "추가 중…" : "레시피 저장"}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-[11px] leading-5 text-slate-500">
                * 편집 허용이 켜져 있으면 수정/삭제도 가능합니다.
              </div>
            </div>
          )}

          {tab === "shared" && editingId && canEdit && (
            <div className="mt-5 rounded-[20px] md:rounded-[24px] border border-[#fed7aa] bg-[#f9fdff] p-4 md:p-5">
              <div className="text-[15px] font-semibold text-slate-900">지출 레시피 수정</div>
              <div className="mt-2 text-[10px] text-slate-600">선택한 항목을 다시 정리합니다.</div>

              <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
                <RecipeField label="날짜">
                  <input
                    type="date"
                    value={editExpenseDate}
                    onChange={(e) => setEditExpenseDate(e.target.value)}
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="카테고리">
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={inputBaseClass}
                  >
                    <option>데이트</option>
                    <option>식비</option>
                    <option>카페</option>
                    <option>교통</option>
                    <option>장보기</option>
                    <option>여행</option>
                    <option>생활</option>
                    <option>기타</option>
                  </select>
                </RecipeField>

                <RecipeField label="금액">
                  <input
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    inputMode="numeric"
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="메모">
                  <input
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    className={inputBaseClass}
                  />
                </RecipeField>

                <RecipeField label="영수증">
                  <InlineReceiptField
                    preview={editRemoveReceipt ? null : editReceiptPreview}
                    hasExisting={!!editReceiptUrl && !editRemoveReceipt && !editReceiptPreview}
                    onPick={handleEditReceiptChange}
                    onClear={() => {
                      setEditRemoveReceipt(true);
                      clearEditReceiptPreview();
                    }}
                  />
                </RecipeField>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={updating}
                  className={cx("w-full sm:w-auto", primaryButtonClass)}
                >
                  {updating ? "저장 중…" : "수정 저장"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={cx("w-full sm:w-auto", neutralButtonClass)}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3">
            {list.length === 0 ? (
              <div className="rounded-[20px] md:rounded-[22px] border border-slate-200 bg-slate-50 p-8 text-center text-[14px] text-slate-600">
                아직 항목이 없습니다. {tab === "shared" ? "공동 지출을 추가해 보세요." : "공유 설정을 확인하세요."}
              </div>
            ) : (
              list.map((e: any) => (
                <div
                  key={e.id}
                  className="group rounded-[18px] md:rounded-[22px] border border-[#F3F4F6] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(27,22,17,0.03)] transition hover:shadow-[0_14px_28px_rgba(27,22,17,0.05)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] md:text-[15px] font-semibold text-slate-900">
                          {e.memo?.trim() ? e.memo : "지출"}
                        </span>

                        <span className="rounded-[10px] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ff8a3d]">
                          {e.category || "기타"}
                        </span>

                        <span className="text-[11px] text-slate-500">{dayK(e.expense_date)}</span>

                        {tab === "shared" && (
                          <span className="text-[11px] text-slate-400">
                            {e.created_by === ctx.partner_user_id ? "상대 결제" : "내 결제"}
                          </span>
                        )}

                        <span
                          className={cx(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                            e.receipt_url
                              ? "border border-[#bfe4ff] bg-[#eef8ff] text-[#ff8a3d]"
                              : "border border-slate-200 bg-slate-50 text-slate-500"
                          )}
                        >
                          {e.receipt_url ? "🧾 영수증 있음" : "영수증 없음"}
                        </span>
                      </div>

                      <div className="mt-1 text-[12px] text-slate-500">
                        {tab === "shared"
                          ? "공동 기록"
                          : tab === "mine"
                            ? "개인(나) 기록"
                            : "개인(상대) 기록"}
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:items-end sm:text-right">
                      <div className="text-[15px] font-semibold text-[#ff8a3d]">{money(e.amount)}원</div>

                      {e.receipt_url && (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-[#ff8a3d]"
                        >
                          영수증 보기
                        </a>
                      )}

                      {tab === "shared" && canEdit && (
                        <div className="flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => startEdit(e as CoupleExpense)}
                            className="rounded-[10px] border border-[#fed7aa] bg-white px-3 py-1.5 text-[11px] font-medium text-[#ff8a3d] hover:bg-[#fff7ed]"
                            title="수정"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteShared(e.id)}
                            className="rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            title="삭제"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 rounded-[20px] md:rounded-[22px] border border-[#d5f9ff] bg-[#f9fdff] p-4 text-[11px] leading-5 text-slate-600">
            <b className="text-slate-900">운영 원칙</b>
            <div className="mt-1 text-[8px] sm:text-[8px]">
              - 개인 지출 공유는 갈등도 높일 수 있으므로 OFF가 합리적입니다.
            </div>
            <div className="mt-1 text-[8px] sm:text-[8px]">
              - 날짜와 메모를 정확히 남길수록 거래비용이 줄어듭니다.
            </div>
          </div>
        </Surface>
      </div>

      {tab === "shared" && !sharedLocked && (
        <button
          type="button"
          onClick={openMobileAddForm}
          className="fixed bottom-5 right-4 z-40 inline-flex md:hidden items-center gap-2 rounded-full bg-[#ff8a3d] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_14px_30px_rgba(12,134,234,0.28)]"
        >
          <span className="text-[16px]">＋</span>
          <span>새 레시피</span>
        </button>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
          <div
            className={cx(
              "min-w-[220px] rounded-[10px] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
              toast.type === "success" && "bg-[#ff8a3d]",
              toast.type === "error" && "bg-[#d84b4b]",
              toast.type === "info" && "bg-slate-900"
            )}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}