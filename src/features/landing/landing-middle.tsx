"use client";
/* eslint-disable @next/next/no-img-element -- static marketing screenshots, sized by the landing stylesheet */

import { useEffect, useRef, useState } from "react";
import { useOpenDemo } from "./landing-context";
import { LP } from "./landing-config";
import { useCarouselIndex, useIntersection } from "./landing-hooks";

function MidCta({ text }: { text: string }) {
  const openDemo = useOpenDemo();
  return (
    <div className="mid-cta">
      <p>{text}</p>
      <button className="btn btn-solid" type="button" onClick={openDemo}>
        Get Free Demo
      </button>
    </div>
  );
}

function Dots({ count, active, className }: { count: number; active: number; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i === active ? "on" : undefined} />
      ))}
    </div>
  );
}

/** Counts up from 0 the first time the stats bar scrolls into view. */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLElement>(null);
  const done = useRef(false);
  useIntersection(
    ref,
    (visible) => {
      if (!visible || done.current) return;
      done.current = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 900);
        setValue(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.4 },
  );
  return <b ref={ref}>{value}</b>;
}

export function LandingProof() {
  return (
    <div className="proof">
      <div className="wrap">
        <div>
          <CountUp to={8} />
          showrooms live in Kerala
        </div>
        <div>
          <b>iOS + Android</b>apps published in your brand
        </div>
        <div>
          <b>Any scheme</b>cash or gold weight, your rules
        </div>
        <div>
          <b>Keep your billing</b>no change to billing or accounts software
        </div>
      </div>
    </div>
  );
}

const FLOW_STEPS = [
  { img: "c_lock.jpg", title: "Gets a reminder", text: "A notification from your app, 3 days before the due date", alt: "Lock screen notification: instalment due in 3 days" },
  { img: "c_scheme.jpg", title: "Opens the scheme", text: "Every instalment, the schedule and the maturity date", alt: "Scheme detail screen with instalments and maturity date" },
  { img: "c_paysheet.jpg", title: "Pays by UPI", text: "PhonePe, Google Pay, Paytm or any UPI app", alt: "Payment sheet: pay ₹3,000 by UPI" },
  { img: "c_ok.jpg", title: "Gold gets credited", text: "Grams added at the day's rate, instantly", alt: "Payment success: ₹3,000 paid, 4.486 g gold saved" },
  { img: "c_pay.jpg", title: "Receipt in their pocket", text: "Every app, counter and UPI payment in one list", alt: "Payments list with receipts" },
];

export function LandingFlow() {
  const rowRef = useRef<HTMLOListElement>(null);
  const active = useCarouselIndex(rowRef, ".f5");
  return (
    <section className="tint" id="flow">
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">Customer app</span>
          <h2>How your customer pays, from reminder to receipt</h2>
          <p>No calls from staff, no counter queue, no paper passbook.</p>
          <p className="store-line">
            Published on the App Store and Google Play under your jewellery&apos;s name.
          </p>
        </div>
        <ol className="flow5" ref={rowRef} aria-label="How a customer pays, step by step">
          {FLOW_STEPS.map((s, i) => (
            <li className="f5" key={s.img}>
              <div className="f5-ph">
                <img src={`${LP}/ui/${s.img}`} alt={s.alt} loading="lazy" width={390} height={844} />
              </div>
              <div className="f5-cap">
                <em>{i + 1}</em>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </ol>
        <Dots count={FLOW_STEPS.length} active={active} className="shop-dots flow-dots" />
        <MidCta text="See this app with your jewellery's name and logo." />
      </div>
    </section>
  );
}

const STORE_SCREENS = [
  { img: "c_shop2.jpg", alt: "Store home with live 22K rate, bridal banner and bestsellers", title: "Your catalogue", text: "Live 22K and 24K rate, collections and bestsellers.", mid: false },
  { img: "c_product.jpg", alt: "Product page with gold, making and GST breakup and scheme savings applied", title: "Honest pricing", text: "Gold, making and GST on every piece. Savings applied in one tap.", mid: true },
  { img: "c_dm.jpg", alt: "Digi Gold wallet showing grams held and buy, sell and redeem options", title: "Digi Gold & Silver", text: "Buy from ₹100, sell back or redeem as jewellery.", mid: false },
];

export function LandingStore() {
  const rowRef = useRef<HTMLDivElement>(null);
  const active = useCarouselIndex(rowRef, ".sp");
  return (
    <section id="store">
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">Online store &amp; Digi Gold</span>
          <h2>Shop at today&apos;s rate. Pay with scheme savings.</h2>
          <p>Live gold rate, your catalogue and Digi Gold, in the same app.</p>
        </div>
        <div className="shop3" ref={rowRef}>
          {STORE_SCREENS.map((s) => (
            <figure className={s.mid ? "sp mid rv" : "sp rv"} key={s.img}>
              <div className="hp">
                <div className="hp-screen hp-img">
                  <img src={`${LP}/ui/${s.img}`} alt={s.alt} loading="lazy" />
                </div>
              </div>
              <figcaption>
                <b>{s.title}</b>
                {s.text}
              </figcaption>
            </figure>
          ))}
        </div>
        <Dots count={STORE_SCREENS.length} active={active} className="shop-dots" />
      </div>
    </section>
  );
}

/** Looping UI recording that only plays while it is on screen. */
function VisibleVideo(props: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((x) => {
          if (x.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} {...props} />;
}

export function LandingAi() {
  return (
    <section id="ai">
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">For jewellery owners</span>
          <h2>Ask Sidekick. Get answers from your live data.</h2>
          <p>
            Sidekick is the AI assistant in your dashboard. Ask in English, Malayalam or Hindi
            and get answers from your live data.
          </p>
        </div>
        <div className="aiv">
          <div className="aiv-copy">
            <ul className="aiv-points">
              <li>
                <b>Real answers, not reports.</b> Sidekick reads your schemes, collections and
                branches the moment you ask.
              </li>
              <li>
                <b>Numbers, charts and next steps.</b> Every answer comes with the figures behind
                it and follow-up questions to dig deeper.
              </li>
              <li>
                <b>English, Malayalam or Hindi.</b> Ask &quot;ee maasathe collection ethra?&quot;
                and get the same answer.
              </li>
              <li>
                <b>Owner control.</b> Only you and the staff you allow can use it. Customers never
                see it.
              </li>
            </ul>
            <div className="aiv-lbl">Owners ask things like</div>
            <div className="aiv-qs">
              <span>How much did we collect this month?</span>
              <span>Who has 2 or more overdue instalments?</span>
              <span>Compare cash and UPI for the last 14 days</span>
              <span>Which schemes mature next month?</span>
              <span>Who are my top 5 customers?</span>
            </div>
          </div>
          <div className="aiv-frame">
            <VisibleVideo
              src={`${LP}/ui/ai-panel.mp4`}
              poster={`${LP}/ui/ai-panel.jpg`}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Sidekick answering: compare cash and UPI collection for the last 14 days"
            />
          </div>
        </div>
        <MidCta text="See Sidekick answer from your own shop's data." />
      </div>
    </section>
  );
}

export function LandingProduct() {
  return (
    <section id="product">
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">Owner control</span>
          <h2>Every manual gold scheme problem, solved</h2>
          <p>
            Whether you call it gold scheme, kuri or chitty, Swarna Grow handles the daily work
            and answers your questions about it.
          </p>
        </div>
        <div className="cards">
          <div className="card rv">
            <span className="no">01</span>
            <div className="ic">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16" />
                <path d="M4 12h11" />
                <path d="M4 18h7" />
              </svg>
            </div>
            <h3>Never miss dues or defaulters</h3>
            <p>
              See due-today, upcoming and overdue customers live every morning, so follow-up
              happens before cash flow gets delayed.
            </p>
            <div className="mock">
              <div className="mrow">
                <span>
                  <b className="dot due" />
                  Ramesh K. <small>SJ-1182</small>
                </span>
                <span className="pill p-due">Due today</span>
              </div>
              <div className="mrow">
                <span>
                  <b className="dot over" />
                  Anjali M. <small>SJ-0974</small>
                </span>
                <span className="pill p-over">14 days over</span>
              </div>
              <div className="mrow">
                <span>
                  <b className="dot paid" />
                  Suresh P. <small>SJ-1240</small>
                </span>
                <span className="pill p-paid">Paid</span>
              </div>
            </div>
          </div>
          <div className="card rv">
            <span className="no">02</span>
            <div className="ic">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
              </svg>
            </div>
            <h3>Ask your business anything</h3>
            <p>
              Type a question in plain words. Sidekick, the AI assistant, answers from your live
              data: collections, dues, branches and maturity. Only you and staff you allow can use
              it.
            </p>
            <div className="mock">
              <div className="mrow">
                <span>&quot;Collection this month?&quot;</span>
                <small>₹38.6 lakh</small>
              </div>
              <div className="mrow">
                <span>&quot;Who matures in September?&quot;</span>
                <small>21 schemes</small>
              </div>
              <div className="barline">
                <i style={{ width: "78%" }} />
              </div>
            </div>
          </div>
          <div className="card rv">
            <span className="no">03</span>
            <div className="ic">
              <svg viewBox="0 0 24 24">
                <rect x={3} y={5} width={18} height={16} rx={2} />
                <path d="M8 3v4M16 3v4" />
                <path d="M8 13h4" />
              </svg>
            </div>
            <h3>Track maturity before customers ask</h3>
            <p>
              Month 11/12 maturities are tracked with gold-weight and value, so your team can
              proactively close redemptions on time.
            </p>
            <div className="mock">
              <div className="mrow">
                <span>
                  Ravi Menon <small>12 months</small>
                </span>
                <small>23.4 g · 18 Aug</small>
              </div>
              <div className="mrow">
                <span>
                  Sreeja K. <small>11 months</small>
                </span>
                <small>18.1 g · 21 Aug</small>
              </div>
              <div className="mrow">
                <span>
                  Leela P. <small>12 months</small>
                </span>
                <small>12.9 g · 27 Aug</small>
              </div>
            </div>
          </div>
          <div className="card rv">
            <span className="no">04</span>
            <div className="ic">
              <svg viewBox="0 0 24 24">
                <path d="M3 20V10M9 20V4M15 20v-7M21 20V7" />
                <path d="M3 20h18" />
              </svg>
            </div>
            <h3>Close collections without confusion</h3>
            <p>
              UPI, cash and bank entries stay in one report with staff audit trail, so day-end
              totals match without back-and-forth checks.
            </p>
            <div className="mock">
              <div className="mrow">
                <span>Collected today</span>
                <small>₹64,000</small>
              </div>
              <div className="splitmini">
                <i style={{ width: "63%", background: "var(--maroon)" }} />
                <i style={{ width: "27%", background: "var(--gold)" }} />
                <i style={{ width: "10%", background: "#8a5b2a" }} />
              </div>
              <div className="mrow">
                <span>Unreconciled</span>
                <small>0</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingWhatYouGet() {
  return (
    <section>
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">What you get</span>
          <h2>Everything your customers need, under your name</h2>
          <p>
            One setup gives you a branded app on both stores, a customer website and a scheme
            builder that fits how your shop already works.
          </p>
        </div>
        <div className="quotes">
          <div className="q rv">
            <div className="body">
              Customers search your shop&apos;s name on the App Store or Play Store and download an
              app with your logo and colours. Swarna Grow stays in the background.
            </div>
            <div className="who">
              <span className="av av-ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6.5" y="2.5" width={11} height={19} rx="2.5" />
                  <path d="M10.5 18.5h3" />
                </svg>
              </span>
              <div>
                <b>Your own app on both stores</b>
                <small>We handle publishing and updates</small>
              </div>
            </div>
          </div>
          <div className="q rv">
            <div className="body">
              Customers who don&apos;t install the app can log in on the web to see schemes, pay
              instalments and download receipts.
            </div>
            <div className="who">
              <span className="av av-ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx={12} cy={12} r={9} />
                  <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
                </svg>
              </span>
              <div>
                <b>Customer web portal</b>
                <small>
                  <a href="/customer-portal.html">See the portal</a>
                </small>
              </div>
            </div>
          </div>
          <div className="q rv">
            <div className="body">
              Rupees or grams, fixed or flexible amounts, bonus or a free last instalment, due on a
              fixed date or the joining date. Set it once.
            </div>
            <div className="who">
              <span className="av av-ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
                  <circle cx={15} cy={6} r={2} />
                  <circle cx={9} cy={12} r={2} />
                  <circle cx={17} cy={18} r={2} />
                </svg>
              </span>
              <div>
                <b>Custom scheme builder</b>
                <small>Your rules, applied to every customer</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
