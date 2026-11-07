"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

const DEFAULT_HTTPS_RETURN = "https://swarnagrow-tenant-admin.vercel.app/payment-return";
const DEFAULT_DEEP_LINK = "evoluxe://payment-return";

function readDeepLinkBase(): string {
  const raw = process.env.NEXT_PUBLIC_FLUTTER_APP_DEEP_LINK?.trim();
  return raw || DEFAULT_DEEP_LINK;
}

/** PhonePe `redirectUrl` landing page for Flutter (hosted checkout). Opens the native app; payment truth is API poll. */
export function FlutterPaymentReturnBridgePage() {
  const deepLinkBase = readDeepLinkBase();
  const [attempted, setAttempted] = useState(false);

  const httpsReturn =
    process.env.NEXT_PUBLIC_FLUTTER_PAYMENT_RETURN_URL?.trim() || DEFAULT_HTTPS_RETURN;

  useEffect(() => {
    const qs =
      typeof window !== "undefined" && window.location.search
        ? window.location.search.replace(/^\?/, "")
        : "";
    const deepLink = qs ? `${deepLinkBase}?${qs}` : deepLinkBase;
    setAttempted(true);
    window.location.replace(deepLink);
    const t = window.setTimeout(() => {
      window.location.href = deepLink;
    }, 600);
    return () => window.clearTimeout(t);
  }, [deepLinkBase]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#fbf8f4] px-6 text-center">
      <div className="max-w-sm space-y-4">
        <LoaderCircle className="mx-auto size-10 animate-spin text-[#730321]" aria-hidden />
        <h1 className="text-lg font-bold text-[#171722]">Returning to the app</h1>
        <p className="text-sm text-[#5c4a4e]">
          {attempted
            ? "If the app did not open, switch back to Swarna Grow and check payment status there."
            : "Opening Swarna Grow…"}
        </p>
        <p className="text-[11px] text-[#857a7d]">
          Configured return URL: <span className="font-mono break-all">{httpsReturn}</span>
        </p>
      </div>
    </div>
  );
}
