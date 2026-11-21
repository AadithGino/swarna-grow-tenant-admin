"use client";
/* eslint-disable @next/next/no-img-element -- static marketing screenshots, sized by the landing stylesheet */

import { useCallback, useEffect, useRef, useState } from "react";
import { LP } from "./landing-config";

type Screen = {
  tab: string;
  caption: string;
  kind: "video" | "image";
  src: string;
  poster?: string;
};

const SCREENS: Screen[] = [
  { tab: "Dashboard", caption: "Collections, dues and redemptions across every showroom, live.", kind: "video", src: "dash.mp4", poster: "dash.jpg" },
  { tab: "Sidekick AI ✦", caption: "Ask in plain words. Sidekick answers from live data with numbers and charts.", kind: "video", src: "aiwin.mp4", poster: "aiwin.jpg" },
  { tab: "Customer view", caption: "One click shows what a customer has paid, what's due and when each scheme matures.", kind: "video", src: "custview.mp4", poster: "custview.jpg" },
  { tab: "Collections", caption: "Every UPI, cash and bank payment, with receipts and staff who collected it.", kind: "image", src: "collections.jpg" },
  { tab: "Dues & overdue", caption: "Who is due, who is overdue and by how much, before it slips further.", kind: "image", src: "dues.jpg" },
  { tab: "Digi Gold & Silver", caption: "Gram-by-gram buying, selling and redemption at your live rate.", kind: "image", src: "dm.jpg" },
];

const IMAGE_MS = 5000;

/** Real admin screens: auto-advances while on screen, tabs pick one and hold it. */
export function LandingShowcase() {
  const [cur, setCur] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLElement>(null);
  const mediaRefs = useRef<(HTMLVideoElement | HTMLImageElement | null)[]>([]);
  const state = useRef({ held: false, visible: false, t0: 0, timer: 0 as number | undefined, raf: 0, reduce: false });

  const current = useCallback(() => mediaRefs.current[cur], [cur]);

  const advance = useCallback(() => {
    const s = state.current;
    if (!s.held) {
      setCur((c) => (c + 1) % SCREENS.length);
      return;
    }
    const m = current();
    if (m instanceof HTMLVideoElement) {
      m.currentTime = 0;
      m.play().catch(() => {});
    } else {
      s.t0 = performance.now();
      s.timer = window.setTimeout(advance, IMAGE_MS);
    }
  }, [current]);

  const play = useCallback(() => {
    const s = state.current;
    window.clearTimeout(s.timer);
    if (!s.visible) return;
    const m = current();
    if (m instanceof HTMLVideoElement) {
      if (m.readyState === 0) {
        m.preload = "auto";
        m.load();
      }
      m.play().catch(() => {});
    } else {
      s.t0 = performance.now();
      s.timer = window.setTimeout(advance, IMAGE_MS);
    }
  }, [advance, current]);

  // Latest values for the long-lived observer and media callbacks.
  const curRef = useRef(cur);
  const playRef = useRef(play);
  const advanceRef = useRef(advance);
  useEffect(() => {
    curRef.current = cur;
    playRef.current = play;
    advanceRef.current = advance;
  });

  // Show the current screen: pause the others, restart this one.
  useEffect(() => {
    mediaRefs.current.forEach((m, n) => {
      if (m instanceof HTMLVideoElement && n !== cur) m.pause();
    });
    const m = mediaRefs.current[cur];
    if (m instanceof HTMLVideoElement && m.readyState > 0) {
      try {
        m.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
    }
    play();
    return () => window.clearTimeout(state.current.timer);
  }, [cur, play]);

  // Progress bar + visibility.
  useEffect(() => {
    const s = state.current;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const m = mediaRefs.current[curRef.current];
      let k = 0;
      if (m instanceof HTMLVideoElement) k = m.duration ? m.currentTime / m.duration : 0;
      else k = Math.min(1, (performance.now() - s.t0) / IMAGE_MS);
      if (progRef.current) progRef.current.style.width = `${(k * 100).toFixed(2)}%`;
      s.raf = requestAnimationFrame(tick);
    };
    const el = playerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((x) => {
          s.visible = x.isIntersecting && !s.reduce;
          if (s.visible) {
            playRef.current();
            if (!s.raf) s.raf = requestAnimationFrame(tick);
          } else {
            window.clearTimeout(s.timer);
            mediaRefs.current.forEach((m) => {
              if (m instanceof HTMLVideoElement) m.pause();
            });
            cancelAnimationFrame(s.raf);
            s.raf = 0;
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  const pick = (n: number) => {
    state.current.held = true;
    if (!state.current.reduce) state.current.visible = true;
    if (n === cur) play();
    else setCur(n);
  };

  return (
    <div className="showcase" id="dashboard">
      <span className="orb a" />
      <span className="orb b" />
      <span className="grid" />
      <div className="wrap">
        <div className="ptabs-wrap">
          <div className="ptabs" role="tablist" aria-label="Swarna Grow screens">
            {SCREENS.map((s, n) => (
              <button
                key={s.tab}
                className={n === cur ? "ptab on" : "ptab"}
                type="button"
                role="tab"
                aria-selected={n === cur}
                onClick={() => pick(n)}
              >
                {s.tab}
              </button>
            ))}
          </div>
        </div>
        <div className="rp" ref={playerRef}>
          <div className="rp-bar">
            <i />
            <i />
            <i />
            <span>app.swarnagrow.com</span>
            <em className="livedot">
              <em />
              Real screens
            </em>
          </div>
          <div className="rp-stage">
            {SCREENS.map((s, n) =>
              s.kind === "video" ? (
                <video
                  key={s.src}
                  ref={(el) => {
                    mediaRefs.current[n] = el;
                  }}
                  className={n === cur ? "rp-m on" : "rp-m"}
                  src={`${LP}/ui/${s.src}`}
                  poster={s.poster ? `${LP}/ui/${s.poster}` : undefined}
                  muted
                  playsInline
                  preload={n === 0 ? "auto" : "none"}
                  aria-label={`${s.tab.replace(" ✦", "")}: ${s.caption}`}
                  onEnded={() => advanceRef.current()}
                  onCanPlay={(e) => {
                    const v = e.currentTarget;
                    if (curRef.current === n && state.current.visible && v.paused) v.play().catch(() => {});
                  }}
                />
              ) : (
                <img
                  key={s.src}
                  ref={(el) => {
                    mediaRefs.current[n] = el;
                  }}
                  className={n === cur ? "rp-m rp-img on" : "rp-m rp-img"}
                  src={`${LP}/ui/${s.src}`}
                  alt={`${s.tab}: ${s.caption}`}
                  loading="lazy"
                  width={1440}
                  height={900}
                />
              ),
            )}
            <div className="rp-prog">
              <i ref={progRef} />
            </div>
          </div>
        </div>
        <div className="rp-caps">
          {SCREENS.map((s, n) => (
            <p key={s.tab} className={n === cur ? "rp-cap on" : "rp-cap"}>
              {s.caption}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
