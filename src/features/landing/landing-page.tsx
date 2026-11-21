"use client";

import { useEffect, useRef, useState } from "react";
import "./landing.css";
import { LandingProvider, useLanding } from "./landing-context";
import { useRevealOnScroll } from "./landing-hooks";
import { LANDING_JSON_LD, LANDING_META, LANDING_TITLE } from "./landing-seo";
import { LandingFilm, LandingHero, LandingNav } from "./landing-top";
import { LandingShowcase } from "./landing-showcase";
import {
  LandingAi,
  LandingFlow,
  LandingProduct,
  LandingProof,
  LandingStore,
  LandingWhatYouGet,
} from "./landing-middle";
import {
  LandingFaq,
  LandingFinal,
  LandingFooter,
  LandingMobileBar,
  LandingPricing,
} from "./landing-bottom";
import { DemoModal } from "./demo-modal";

/** Sets the page title and meta tags while the landing page is mounted, then restores them. */
function useDocumentMeta() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = LANDING_TITLE;
    const added: HTMLMetaElement[] = [];
    const changed: [HTMLMetaElement, string | null][] = [];
    Object.entries(LANDING_META).forEach(([key, content]) => {
      const attr = key.startsWith("og:") ? "property" : "name";
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (el) {
        changed.push([el, el.getAttribute("content")]);
      } else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        added.push(el);
      }
      el.setAttribute("content", content);
    });
    const html = document.documentElement;
    const prevScroll = html.style.scrollBehavior;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      html.style.scrollBehavior = "smooth";
    }
    return () => {
      document.title = prevTitle;
      added.forEach((el) => el.remove());
      changed.forEach(([el, content]) => {
        if (content === null) el.removeAttribute("content");
        else el.setAttribute("content", content);
      });
      html.style.scrollBehavior = prevScroll;
    };
  }, []);
}

function LandingContent() {
  const { demoOpen, openDemo, setBrand } = useLanding();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroTryRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const [barOn, setBarOn] = useState(false);

  useDocumentMeta();
  useRevealOnScroll(rootRef);

  // `?demo=1` (or `#book-demo`) opens the demo form straight away; `&brand=` prefills it.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("demo") || window.location.hash === "#book-demo") {
      const brand = q.get("brand");
      if (brand) setBrand(brand.slice(0, 40));
      openDemo();
    }
  }, [openDemo, setBrand]);

  // Phone bottom bar: visible once the hero's demo box has scrolled away, hidden at the closing section.
  useEffect(() => {
    const heroTry = heroTryRef.current;
    const fin = finalRef.current;
    if (!heroTry || typeof IntersectionObserver === "undefined") return;
    let heroOut = false;
    let finIn = false;
    const update = () => setBarOn(heroOut && !finIn);
    const heroIo = new IntersectionObserver(([e]) => {
      heroOut = !e.isIntersecting && e.boundingClientRect.top < 0;
      update();
    });
    heroIo.observe(heroTry);
    const finIo = new IntersectionObserver(
      ([e]) => {
        finIn = e.isIntersecting;
        update();
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    if (fin) finIo.observe(fin);
    return () => {
      heroIo.disconnect();
      finIo.disconnect();
    };
  }, []);

  const rootClass = ["sg-landing", demoOpen && "modal-open", barOn && "mbar-on"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} ref={rootRef}>
      <script
        type="application/ld+json"
        // Structured data for search engines; static content, no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSON_LD) }}
      />
      <LandingNav />
      <LandingHero tryRef={heroTryRef} />
      <LandingFilm />
      <LandingShowcase />
      <LandingProof />
      <LandingFlow />
      <LandingStore />
      <LandingAi />
      <LandingProduct />
      <LandingWhatYouGet />
      <LandingPricing />
      <LandingFaq />
      <LandingFinal finalRef={finalRef} />
      <DemoModal />
      <LandingMobileBar visible={barOn} />
      <LandingFooter />
    </div>
  );
}

/** Public marketing page for swarnagrow.com, served at /landing. */
export function LandingPage() {
  return (
    <LandingProvider>
      <LandingContent />
    </LandingProvider>
  );
}
