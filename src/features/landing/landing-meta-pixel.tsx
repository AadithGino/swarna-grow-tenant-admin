"use client";

import { useEffect } from "react";

const META_PIXEL_ID = "1462579651963849";

/** Meta Pixel base code, exactly as provided. Landing page only. */
const META_PIXEL_BASE_CODE = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & Record<string, unknown>;
    _fbq?: unknown;
  }
}

/** Loads the Meta Pixel once on the landing page. */
export function useLandingMetaPixel(): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.fbq) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = META_PIXEL_BASE_CODE;
    document.head.appendChild(script);
  }, []);
}

/** Fallback pixel for browsers with JavaScript disabled. */
export function LandingMetaPixelNoscript() {
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        alt=""
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
