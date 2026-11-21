"use client";
/* eslint-disable @next/next/no-img-element -- static partner logos, sized by the landing stylesheet */

import { useEffect, useRef } from "react";
import { useOpenDemo } from "./landing-context";
import { CONTACT_EMAIL, LP, WHATSAPP_DISPLAY, whatsappLink } from "./landing-config";
import { WhatsAppIcon } from "./landing-icons";
import { GoldDust } from "./landing-top";

function Tick() {
  return <i>✓</i>;
}

export function LandingPricing() {
  const openDemo = useOpenDemo();
  return (
    <section className="tint" id="pricing">
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">Pricing</span>
          <h2>One setup fee, then a monthly fee by size</h2>
          <p>
            Your monthly fee depends on how many scheme customers you have. The demo is free, and
            billing starts only when you confirm go&#8209;live.
          </p>
        </div>
        <div className="tiers three">
          <div className="tier rv">
            <div className="cap-top">
              <div className="nm">Setup</div>
              <div className="amt num">
                ₹30,000<span> once</span>
              </div>
              <p className="cap">Your apps, portal and data, ready to go</p>
            </div>
            <div className="body">
              <ul>
                <li><Tick />iOS app on the App Store</li>
                <li><Tick />Android app on Play Store</li>
                <li><Tick />Customer web portal</li>
                <li><Tick />Your schemes configured</li>
                <li><Tick />Register or Excel data migrated</li>
                <li><Tick />Staff training</li>
              </ul>
              <div className="go">
                <a href="#demo" onClick={openDemo}>Get Free Demo</a>
              </div>
            </div>
          </div>
          <div className="tier hot rv">
            <span className="flag">CORE PLAN</span>
            <div className="cap-top">
              <div className="nm">Scheme management</div>
              <div className="amt num">
                <small className="from">from</small>₹3,000<span>/mo</span>
              </div>
              <p className="cap">Everything to run gold schemes, with AI</p>
            </div>
            <div className="body">
              <dl className="slabs" aria-label="Monthly fee by number of scheme customers">
                <div><dt>Up to 1,000 customers</dt><dd>₹3,000<span>/mo</span></dd></div>
                <div><dt>1,001 to 2,500 customers</dt><dd>₹5,000<span>/mo</span></dd></div>
                <div><dt>Above 2,500 customers</dt><dd>₹8,000<span>/mo</span></dd></div>
              </dl>
              <ul>
                <li><Tick />AI business assistant</li>
                <li><Tick />Custom scheme builder</li>
                <li><Tick />UPI, cash and bank collections</li>
                <li><Tick />App reminders and gold receipts</li>
                <li><Tick />Dues, defaulters and maturity</li>
                <li><Tick />Staff roles and audit trail</li>
              </ul>
              <div className="go">
                <a href="#demo" onClick={openDemo}>Get Free Demo</a>
              </div>
            </div>
          </div>
          <div className="tier rv">
            <div className="cap-top">
              <div className="nm">Add-on modules</div>
              <div className="amt num">
                +₹2,000<span>/mo onwards</span>
              </div>
              <p className="cap">Switch on when you&apos;re ready</p>
            </div>
            <div className="body">
              <ul>
                <li><Tick />Online store · ₹2,000/mo</li>
                <li><Tick />Catalogue, orders and delivery in your app</li>
                <li><Tick />Digi Gold &amp; Silver · ₹5,000/mo</li>
                <li><Tick />Buy, sell and redeem by the gram</li>
              </ul>
              <div className="go">
                <a href="#demo" onClick={openDemo}>Ask about add-ons</a>
              </div>
            </div>
          </div>
        </div>
        <div className="contactbar rv">
          <div>
            <b>Multiple showrooms or a fully custom build?</b>
            <span>We scope branches, staff and custom features with your team on a call.</span>
          </div>
          <a className="btn btn-solid btn-wa" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            Talk to us on WhatsApp
          </a>
        </div>
        <p className="note rv">
          The ₹30,000 setup fee is charged only when you confirm go-live. The demo is free, with no
          obligation to sign up.
        </p>
      </div>
    </section>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is gold scheme software?",
    a: "Gold scheme software manages the monthly savings schemes a jewellery showroom runs for its customers — enrolment, instalment due dates, collections, receipts, accumulated gold weight and maturity. Swarna Grow handles that scheme side only; your billing, GST and accounts software continues untouched.",
  },
  {
    q: "Is this the same as gold chitti or gold kuri software app?",
    a: "Yes. In Kerala this is often called gold kuri software or gold chitti software. Swarna Grow runs the same workflow in your own app, with due tracking, reminders, collections, receipts and maturity for weight-based or cash-based schemes.",
  },
  {
    q: "Why do most jewellery gold schemes run for 11 months?",
    a: "An advance received for the supply of goods within 365 days is not treated as a deposit under the Companies (Acceptance of Deposits) Rules, so jewellers structure schemes inside that window — commonly 11 months plus a redemption month. Swarna Grow flags every scheme as it enters month 11. General information, not legal advice; confirm your structure with your auditor.",
  },
  {
    q: "Do I have to change my billing or accounting software?",
    a: "No. Swarna Grow sits around your existing system and handles your customer app, dues, collections, receipts and maturity. Nothing about billing, GST filing or accounts changes.",
  },
  {
    q: "What happens to my old paper register or Excel sheet?",
    a: "We digitise, clean and import it during setup using a standard migration template. Most showrooms go live on their own historical data the same week.",
  },
  {
    q: "Will the app carry my jewellery's name?",
    a: "Yes. Customers download an app with your jewellery's name and logo from the App Store and Play Store. We handle publishing. Customers who prefer not to install it can use the web portal instead.",
  },
  {
    q: "What can I ask the AI assistant?",
    a: "Anything about your schemes: how much came in this week, who is overdue in a branch, which schemes mature next month, or how many customers paid by UPI. It answers from live data and you can ask follow-up questions. Customers never see it.",
  },
  {
    q: "Can customers pay by UPI?",
    a: "Yes. Customers pay inside your app with any UPI app (PhonePe, GPay, Paytm or others) and get a receipt instantly. Cash paid at the counter is recorded by the cashier and behaves identically in the ledger, reports and receipts.",
  },
  {
    q: "Can showroom staff see my margins or set the gold rate?",
    a: "No. Cashiers get a login that records payments and nothing else. Setting the daily rate, viewing reports and exporting data stay with the owner, and every payment records which staff member took it.",
  },
  {
    q: "Does it work for multiple showrooms?",
    a: "Yes. Add your branches, assign staff to each one and compare them side by side, or just ask the AI which branch collected the most.",
  },
  {
    q: "How much does gold scheme software cost in India?",
    a: "Swarna Grow costs ₹30,000 one-time for setup, including your branded iOS and Android apps and data migration. Scheme management with the AI assistant is ₹3,000 a month for up to 1,000 customers, ₹5,000 a month for up to 2,500 customers and ₹8,000 a month above 2,500 customers. The online store is ₹2,000 a month and Digi Gold & Silver is ₹5,000 a month.",
  },
];

export const LANDING_FAQS = FAQS;

export function LandingFaq() {
  const firstRef = useRef<HTMLDetailsElement>(null);
  // Desktop opens the first answer; phones start with every answer closed.
  useEffect(() => {
    if (firstRef.current && window.matchMedia("(max-width: 900px)").matches) {
      firstRef.current.open = false;
    }
  }, []);
  return (
    <section>
      <div className="wrap">
        <div className="head mid rv">
          <span className="eyebrow">FAQ</span>
          <h2>Questions jewellers ask us</h2>
        </div>
        <div className="faq rv">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0 ? true : undefined} ref={i === 0 ? firstRef : undefined}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFinal({ finalRef }: { finalRef: React.RefObject<HTMLElement | null> }) {
  const openDemo = useOpenDemo();
  return (
    <section className="final" id="demo" ref={finalRef}>
      <GoldDust count={12} seed={29} />
      <div className="wrap">
        <h2>Be ready before your next due cycle.</h2>
        <p>
          Book a free demo. We&apos;ll show you the app and dashboard, then plan your schemes, data
          migration and go-live, so your customers are paying in your app by next month.
        </p>
        <div className="final-cta">
          <button
            className="btn btn-solid btn-shine"
            style={{ background: "var(--gold)", color: "var(--maroon-deep)", boxShadow: "none" }}
            type="button"
            onClick={openDemo}
          >
            Get Free Demo
          </button>
          <a className="btn btn-line btn-wa" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            WhatsApp us
          </a>
        </div>
        <div className="onboard-steps">
          <div>
            <b>1 · Book a demo</b>
            <span>Name, showroom, WhatsApp number and roughly how many scheme customers you have.</span>
          </div>
          <div>
            <b>2 · Live demo</b>
            <span>We show your app and dashboard, then map your schemes, branding and migration timeline.</span>
          </div>
          <div>
            <b>3 · Go live</b>
            <span>Your app live on both stores, staff trained, ledger imported.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Phone-only bar with WhatsApp + Get Free Demo, shown between the hero and the closing section. */
export function LandingMobileBar({ visible }: { visible: boolean }) {
  const openDemo = useOpenDemo();
  return (
    <div className={visible ? "mbar on" : "mbar"} aria-hidden={!visible}>
      <a
        className="mbar-wa"
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp us"
        tabIndex={visible ? 0 : -1}
      >
        <WhatsAppIcon />
      </a>
      <button className="btn btn-solid" type="button" tabIndex={visible ? 0 : -1} onClick={openDemo}>
        Get Free Demo
      </button>
    </div>
  );
}

export function LandingFooter() {
  const openDemo = useOpenDemo();
  return (
    <footer>
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <b>Swarna Grow</b>
          <span>Your own gold scheme app, with AI. A product of GroQuik Solutions Private Limited.</span>
          <div className="foot-trust">
            <img src={`${LP}/ui/ksum-logo.png`} alt="Kerala Startup Mission" width={100} height={80} loading="lazy" />
            <img src={`${LP}/ui/startup-india-logo.png`} alt="DPIIT Startup India" width={146} height={60} loading="lazy" />
          </div>
        </div>
        <div className="foot-contact">
          <b>Contact</b>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span>Kochi, Kerala, India</span>
        </div>
        <nav aria-label="Footer">
          <b>Explore</b>
          <a href="#product">Gold scheme management</a>
          <a href="#flow">Customer app</a>
          <a href="#ai">Sidekick AI assistant</a>
          <a href="#pricing">Pricing</a>
          <a href="#demo" onClick={openDemo}>
            Get Free Demo
          </a>
        </nav>
      </div>
    </footer>
  );
}
