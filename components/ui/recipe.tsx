import React from "react";
import { cn } from "@/lib/utils";

export function RecipePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-recipe min-h-screen">
      <div className="mx-auto w-[1320px] px-4 py-6">{children}</div>
    </div>
  );
}

export function RecipeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function RecipeCard({
  title,
  description,
  right,
  children,
  className,
}: {
  title?: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm",
        "border-blue-100/70",
        "backdrop-blur supports-[backdrop-filter]:bg-white/80",
        className
      )}
    >
      {(title || description || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-blue-100/70 px-4 py-3">
          <div>
            {title && <div className="text-base font-extrabold text-zinc-900">{title}</div>}
            {description && <div className="text-xs text-zinc-500 mt-0.5">{description}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export function RecipeBadge({
  variant = "neutral",
  children,
}: {
  variant?: "neutral" | "blue" | "danger" | "success";
  children: React.ReactNode;
}) {
  const cls =
    variant === "blue"
      ? "bg-orange-50 text-orange-600 border-orange-200"
      : variant === "danger"
      ? "bg-red-50 text-red-700 border-red-200"
      : variant === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-zinc-50 text-zinc-700 border-zinc-200";

  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function RecipeButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";

  const v =
    variant === "primary"
      ? "bg-[#ff8a3d] text-slate-900 hover:bg-[#fb923c] shadow-sm"
      : variant === "danger"
      ? "bg-red-500 text-white hover:bg-red-600"
      : variant === "outline"
      ? "border border-orange-200 bg-white hover:bg-orange-50 text-zinc-900"
      : "bg-transparent hover:bg-orange-50 text-zinc-900";

  return <button className={cn(base, v, className)} {...props} />;
}

export function RecipeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px]",
        "outline-none focus:ring-2 focus:ring-blue-200"
      )}
    />
  );
}

export function RecipeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px]",
        "outline-none focus:ring-2 focus:ring-blue-200"
      )}
    />
  );
}

export function RecipeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px]",
        "outline-none focus:ring-2 focus:ring-blue-200"
      )}
    />
  );
}
