"use client";
/* eslint-disable @next/next/no-img-element -- static marketing screenshots, sized by the landing stylesheet */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanding, useOpenDemo } from "./landing-context";
import { LP } from "./landing-config";
import { seededRandom, useMounted, useReducedMotion } from "./landing-hooks";

/** Floating gold specks behind the hero and the closing section. */
export function GoldDust({ count, seed }: { count: number; seed: number }) {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const specks = useMemo(() => {
    const rnd = seededRandom(seed);
    return Array.from({ length: count }, () => {
      const size = (3 + rnd() * 4).toFixed(1);
      return {
        left: `${(rnd() * 100).toFixed(1)}%`,
        animationDuration: `${(9 + rnd() * 11).toFixed(1)}s`,
        animationDelay: `${(-rnd() * 14).toFixed(1)}s`,
        width: `${size}px`,
        height: `${size}px`,
      };
    });
  }, [count, seed]);
  return (
    <span className="dust" aria-hidden="true">
      {mounted && !reduce && specks.map((style, i) => <i key={i} style={style} />)}
    </span>
  );
}

export function LandingNav() {
  const openDemo = useOpenDemo();
  const [pill, setPill] = useState(false);
  useEffect(() => {
    const onScroll = () => setPill(window.scrollY > 42);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={pill ? "top pill" : "top"}>
      <div className="wrap">
        <a className="logo" href="#" aria-label="Swarna Grow home">
          <img src={`${LP}/logo/logo-only.png`} alt="Swarna Grow" />
        </a>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="#ai">AI assistant</a>
          <a href="#flow">Customer app</a>
          <a href="/customer-portal.html">Customer portal</a>
          <a href="#pricing">Pricing</a>
          <a className="btn btn-solid" href="#demo" onClick={openDemo}>
            Get Free Demo
          </a>
        </div>
      </div>
    </nav>
  );
}

/** The phone header that shows the visitor's shop name (and logo) over the real app screenshot. */
export function BrandOverlay({
  name,
  fallbackInitial,
  logoUrl,
  hidden,
}: {
  name: string;
  fallbackInitial: string;
  logoUrl?: string | null;
  hidden?: boolean;
}) {
  return (
    <div className="hp-brand" hidden={hidden} aria-live="polite">
      <i
        className={logoUrl ? "has-logo" : undefined}
        style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
      >
        {name ? name.charAt(0).toUpperCase() : fallbackInitial}
      </i>
      <div>
        <b>{name}</b>
        <small>Powered by SwarnaGrow</small>
      </div>
    </div>
  );
}

export function LandingHero({ tryRef }: { tryRef: React.RefObject<HTMLDivElement | null> }) {
  const { brand, setBrand, logo } = useLanding();
  const openDemo = useOpenDemo();
  const shown = brand.replace(/\s+/g, " ").trim();
  return (
    <header className="hero split">
      <GoldDust count={14} seed={11} />
      <div className="wrap">
        <div className="hero-copy">
          <span className="badge">
            <em />
            New · your own app on the App Store &amp; Play Store
          </span>
          <h1>
            Your jewellery&apos;s own <mark>gold scheme app</mark>, with AI built in.
          </h1>
          <p className="sub">
            Customers join schemes and pay by UPI in an app with your name on it. You see
            every payment in one dashboard.
          </p>
          <div className="hero-benefits">
            <span>
              <em />
              iOS &amp; Android app in your brand
            </span>
            <span>
              <em />
              Customer web portal
            </span>
            <span>
              <em />
              AI business assistant
            </span>
          </div>
          <div className="hero-try" ref={tryRef}>
            <label htmlFor="heroName">Type your shop&apos;s name to see your app</label>
            <div className="ht-row">
              <input
                id="heroName"
                maxLength={28}
                placeholder="Your shop name"
                autoComplete="organization"
                enterKeyHint="go"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openDemo(e);
                }}
              />
              <button className="btn btn-solid btn-shine" type="button" onClick={openDemo}>
                Get Free Demo
              </button>
            </div>
          </div>
          <p className="hero-cta-note">
            <b>₹30,000 setup · from ₹3,000/month.</b> The demo is free.{" "}
            <a href="#pricing">See pricing</a>
          </p>
          <div className="trustrow">
            <span className="dots">
              <i>SJ</i>
              <i>RG</i>
              <i>KM</i>
              <i>+5</i>
            </span>
            <span>Built for Kerala jewellers running gold, chitti and kuri schemes</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Your jewellery's customer app on a phone">
          <div className="hero-float f1" aria-hidden="true">
            <i className="ic">✓</i>
            <div>
              <b>₹3,000 paid by UPI</b>Receipt saved in the app
            </div>
          </div>
          <div className="hero-float f2" aria-hidden="true">
            <i className="ic">✦</i>
            <div>
              <b>Sidekick</b>&quot;14 customers are overdue in Thrissur this month.&quot;
            </div>
          </div>
          <div className="hp">
            <div className="hp-screen hp-img">
              <BrandOverlay
                name={shown}
                fallbackInitial="K"
                logoUrl={logo?.dataUrl}
                hidden={!shown}
              />
              <img
                src={`${LP}/ui/c_home.jpg`}
                alt="Kairali Jewellers customer app home screen showing ₹81,100 total savings and 4.486 g gold"
                width={390}
                height={844}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Narrated product film: 16:9 on desktop, the 9:16 reel on phones. Plays only while visible. */
export function LandingFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    v.poster = `${LP}/video/${mobile ? "swarna-grow-reel-poster.jpg" : "swarna-grow-poster.jpg"}`;
    v.src = `${LP}/video/${mobile ? "swarna-grow-reel.mp4" : "swarna-grow.mp4"}`;
    userPaused.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sync = () => setPaused(v.paused);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((x) => {
          if (x.isIntersecting && !userPaused.current) v.play().catch(() => {});
          else if (!x.isIntersecting) v.pause();
        });
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const turningOn = v.muted;
    v.muted = !turningOn;
    if (turningOn) {
      v.currentTime = 0;
      userPaused.current = false;
      v.play().catch(() => {});
    }
    setSoundOn(turningOn);
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <section className="film" id="film" aria-label="Swarna Grow product video">
      <div className="wrap">
        <div className="film-frame">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="53-second narrated tour: owner dashboard, AI assistant, customer view, customer app, online store and Digi Gold"
          />
          <button
            className="film-sound"
            type="button"
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              <path className="w" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
              <path className="x" d="M16 9l5 6M21 9l-5 6" />
            </svg>
            <span>{soundOn ? "Sound off" : "Sound on"}</span>
          </button>
          <button
            className={paused ? "film-toggle paused" : "film-toggle"}
            type="button"
            aria-label={paused ? "Play video" : "Pause video"}
            onClick={togglePlay}
            data-reduce={reduce || undefined}
          >
            <svg className="i-pause" viewBox="0 0 24 24">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
            <svg className="i-play" viewBox="0 0 24 24">
              <path d="M8 5l11 7-11 7z" />
            </svg>
          </button>
        </div>
        <p className="film-cap">
          Real screens from Swarna Grow: the owner dashboard, Sidekick (the AI assistant), the
          customer view, your customer app and online store. Tap Sound on to hear the tour.
        </p>
      </div>
    </section>
  );
}
