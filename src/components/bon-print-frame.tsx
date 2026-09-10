"use client";

import { useEffect, useRef } from "react";

/** Dedicated Bon tab: ticket document in an iframe, then window.print() on that document. */
export function BonPrintFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const run = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.print();
      }
    };

    const onLoad = () => {
      window.setTimeout(run, 400);
    };
    frame.addEventListener("load", onLoad);
    const fallback = window.setTimeout(run, 800);
    return () => {
      frame.removeEventListener("load", onLoad);
      window.clearTimeout(fallback);
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Bon"
      srcDoc={html}
      className="lw-bon-frame"
      style={{
        display: "block",
        width: "100%",
        minHeight: "100vh",
        border: 0,
        background: "#fff",
      }}
    />
  );
}
