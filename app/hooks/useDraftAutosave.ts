"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDraftAutosave<T>(value: T, enabled: boolean, save: (value: T) => Promise<void>) {
  const [status, setStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [composing, setComposing] = useState(false);
  const latest = useRef(value);
  const saved = useRef<string | null>(null);
  const writer = useRef(save);
  const active = useRef(false);
  const ready = useRef(false);
  const ime = useRef(false);
  const running = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    latest.current = value;
    writer.current = save;
    ready.current = enabled;
    if (enabled && saved.current === null) saved.current = JSON.stringify(value);
  }, [value, enabled, save]);

  const flush = useCallback((): Promise<boolean> => {
    if (!ready.current || ime.current) return Promise.resolve(false);
    if (running.current) return running.current;
    const work = async () => {
      try {
        while (active.current && !ime.current && JSON.stringify(latest.current) !== saved.current) {
          const snapshot = latest.current;
          const serialized = JSON.stringify(snapshot);
          setStatus("saving");
          await writer.current(snapshot);
          saved.current = serialized;
        }
        const complete = JSON.stringify(latest.current) === saved.current;
        if (active.current) setStatus(complete ? "saved" : "pending");
        return complete;
      } catch {
        if (active.current) setStatus("error");
        return false;
      }
    };
    running.current = work().finally(() => { running.current = null; });
    return running.current;
  }, []);

  useEffect(() => {
    if (!enabled || saved.current === JSON.stringify(value)) return;
    const pending = window.setTimeout(() => setStatus("pending"), 0);
    const timer = composing ? null : window.setTimeout(() => { void flush(); }, 1000);
    return () => {
      window.clearTimeout(pending);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [value, enabled, composing, flush]);

  useEffect(() => {
    const dirty = () => ready.current && saved.current !== JSON.stringify(latest.current);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty()) { event.preventDefault(); event.returnValue = ""; }
    };
    const beforeLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      if (dirty() && !window.confirm("아직 저장되지 않은 변경 사항이 있습니다. 저장하지 않고 이동할까요?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    const online = () => { if (dirty()) void flush(); };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
      window.removeEventListener("online", online);
    };
  }, [flush]);

  return {
    status, flush,
    onCompositionStart: () => { ime.current = true; setComposing(true); },
    onCompositionEnd: () => { ime.current = false; setComposing(false); },
  };
}
