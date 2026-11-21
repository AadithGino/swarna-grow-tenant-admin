"use client";
/* eslint-disable @next/next/no-img-element -- local logo preview (data URL) and the static app screenshot */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanding } from "./landing-context";
import { CUSTOMER_RANGES, LP, PLAN_FEATURES, SETUP_FEE, whatsappLink } from "./landing-config";
import { ChevronDownIcon, WhatsAppIcon } from "./landing-icons";
import { buildDemoLead, cleanPhoneDigits, sendDemoLead, validPhone, type DemoLead } from "./demo-lead";
import { prepareLogo } from "./demo-logo";
import { BrandOverlay } from "./landing-top";
import { seededRandom } from "./landing-hooks";

const DEFAULT_NOTE = "The demo is free. We'll WhatsApp or call within 1 business day.";
const CONFETTI_COLORS = ["#5E1622", "#C3A264", "#E2C88F", "#17694A", "#7C2231", "#F8F0DE"];

function formatPhone(phone: string): string {
  return phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");
}

/** Burst of paper pieces behind the success tick. */
function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const rnd = seededRandom(seed);
    return Array.from({ length: 32 }, (_, i) => {
      const ang = (Math.PI * 2 * i) / 32 + (rnd() - 0.5) * 0.5;
      const dist = 36 + rnd() * 78;
      return {
        "--tx": `${Math.cos(ang) * dist}px`,
        "--ty": `${Math.sin(ang) * dist}px`,
        "--rot": `${rnd() * 720 - 360}deg`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${rnd() * 0.14}s`,
        width: `${5 + rnd() * 5}px`,
        height: `${5 + rnd() * 8}px`,
      } as React.CSSProperties;
    });
  }, [seed]);
  return (
    <div className="success-burst" aria-hidden="true">
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
}

function SuccessScreen({
  lead,
  reduce,
  onClose,
  seed,
}: {
  lead: DemoLead;
  reduce: boolean;
  onClose: () => void;
  seed: number;
}) {
  const brand = lead.brandName;
  const ph = formatPhone(lead.phone);
  const message = `Hi, I just booked a free demo of Swarna Grow${brand ? ` for ${brand}` : ""}.`;
  return (
    <div className={reduce ? "modal-success on static" : "modal-success on play"} aria-live="polite">
      <div className="sx-band">
        <button className="sx-x" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {!reduce && <Confetti seed={seed} />}
        <p className="sx-kicker">Demo booked</p>
        <h4 className="success-title">{brand ? `Thank you, ${brand}!` : "Thank you!"}</h4>
        <div className="sx-phone" aria-hidden="true">
          <div className="sx-screen">
            <BrandOverlay
              name={brand || "Your jewellery"}
              fallbackInitial="S"
              logoUrl={lead.logoDataUrl || null}
            />
            <img src={`${LP}/ui/c_home.jpg`} alt="" />
          </div>
          <div className="success-check-wrap sx-check">
            <span className="success-ring" />
            <span className="success-ring r2" />
            <div className="success-check">
              <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle className="success-circle" cx={26} cy={26} r={24} fill="none" strokeWidth={3} />
                <path
                  className="success-tick"
                  d="M14 27l8 8 16-18"
                  fill="none"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="sx-body">
        <p className="success-text">
          {ph
            ? `We'll WhatsApp you on ${ph} within 1 business day to pick a demo time.`
            : "We'll WhatsApp you within 1 business day to pick a demo time."}
        </p>
        <ol className="success-next sx-steps">
          <li className="done">
            <em>✓</em>
            <span>
              <b>Request received</b>Your details are with our team
            </span>
          </li>
          <li>
            <em>2</em>
            <span>
              <b>We WhatsApp you</b>Within 1 business day, to fix a time
            </span>
          </li>
          <li>
            <em>3</em>
            <span>
              <b>Live demo</b>Your app, dashboard and Sidekick, on a call
            </span>
          </li>
        </ol>
        <div className="success-close sx-actions">
          <a className="btn sx-wa" href={whatsappLink(message)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            WhatsApp us
          </a>
          <button className="btn btn-solid" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function DemoModal() {
  const { demoOpen, closeDemo, brand, setBrand, logo, setLogo } = useLanding();
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [customers, setCustomers] = useState("");
  const [selectOpen, setSelectOpen] = useState(false);
  const [touched, setTouched] = useState({ brand: false, phone: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<{ text: string; err: boolean }>({ text: DEFAULT_NOTE, err: false });
  const [logoError, setLogoError] = useState(false);
  const [lead, setLead] = useState<DemoLead | null>(null);
  const [burstSeed, setBurstSeed] = useState(1);
  const [reduce, setReduce] = useState(false);
  const brandRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const brandOk = brand.trim().length > 0;
  const phoneOk = validPhone(phone);
  const ready = brand.trim().length > 1 && phoneOk;
  const showBrandErr = (touched.brand || submitAttempted) && !brandOk;
  // Same rules as the static page: an empty number errors only after submit;
  // a wrong number errors after blur, after submit, or once all 10 digits are in.
  const showPhoneErr = phone
    ? !phoneOk && (submitAttempted || touched.phone || phone.length === 10)
    : submitAttempted;
  const plan = CUSTOMER_RANGES.find((r) => r.value === customers);

  function reset() {
    setPhone("");
    setLocation("");
    setCustomers("");
    setSelectOpen(false);
    setTouched({ brand: false, phone: false });
    setSubmitAttempted(false);
    setSubmitting(false);
    setNote({ text: DEFAULT_NOTE, err: false });
    setLogoError(false);
    setLogo(null);
    setLead(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    closeDemo();
    // After a booking, start fresh next time; otherwise keep what they typed.
    if (lead) reset();
    else setSelectOpen(false);
  }

  // Focus, scroll lock and Escape while open.
  useEffect(() => {
    if (!demoOpen) return;
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    lastFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => brandRef.current?.focus(), 120);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      lastFocus.current?.focus?.();
    };
  }, [demoOpen]);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // Close the range menu on any outside click.
  useEffect(() => {
    if (!selectOpen) return;
    const onDoc = () => setSelectOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [selectOpen]);

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoError(false);
    if (!file) return;
    try {
      setLogo(await prepareLogo(file));
    } catch {
      setLogo(null);
      e.target.value = "";
      setLogoError(true);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!brandOk || !phoneOk || submitting) return;
    setSubmitting(true);
    setNote({ text: "Sending your demo request…", err: false });
    const next = buildDemoLead({ brand, phoneDigits: phone, location, customers, logo });
    try {
      await sendDemoLead(next);
    } catch {
      setSubmitting(false);
      setNote({ text: "Could not submit right now. Please check your connection and try again.", err: true });
      return;
    }
    window.setTimeout(() => {
      setSubmitting(false);
      setNote({ text: DEFAULT_NOTE, err: false });
      setBurstSeed((s) => s + 1);
      setLead(next);
    }, 650);
  }

  return (
    <div
      className={demoOpen ? "modal-overlay open" : "modal-overlay"}
      aria-hidden={!demoOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={lead ? "modal is-done" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sgDemoTitle"
      >
        <div className="modal-head">
          <div>
            <h3 id="sgDemoTitle">Book your free demo</h3>
            <p>Takes 30 seconds · free · no obligation</p>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={lead ? { display: "none" } : undefined}>
            <ul className="prelist">
              <li>
                <i>✓</i>
                <span>Takes under 2 minutes · the demo is free</span>
              </li>
              <li>
                <i>✓</i>
                <span>We show you the app, dashboard and Sidekick on a live call</span>
              </li>
            </ul>
            <form
              className={submitting ? "prereg-grid form-submitting" : "prereg-grid"}
              noValidate
              onSubmit={onSubmit}
            >
              <div className="form-step is-active">
                <div className={showBrandErr ? "field-label full has-err" : "field-label full"}>
                  <span>
                    Brand name <span className="req">*</span>
                  </span>
                  <input
                    ref={brandRef}
                    name="showroom"
                    required
                    autoComplete="organization"
                    maxLength={40}
                    placeholder="e.g. Lakshmi Jewellers"
                    className={showBrandErr ? "err" : undefined}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, brand: true }))}
                  />
                  <span className="field-hint">Please enter your brand name</span>
                </div>
                <div className={showPhoneErr ? "field-label full has-err" : "field-label full"}>
                  <span>
                    Contact number (WhatsApp) <span className="req">*</span>
                  </span>
                  <div className={showPhoneErr ? "phone-field err" : "phone-field"}>
                    <span className="phone-prefix">+91</span>
                    <input
                      name="phone"
                      required
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      aria-describedby="sgPhoneHint"
                      value={phone}
                      // No maxLength: a pasted "+91 98765 43210" is cleaned down to its 10 digits.
                      onChange={(e) => setPhone(cleanPhoneDigits(e.target.value))}
                      onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    />
                  </div>
                  <span className="field-hint" id="sgPhoneHint">
                    Enter a valid 10-digit mobile number
                  </span>
                </div>
                <div className="field-label full">
                  <span>
                    Location <span className="opt">(optional)</span>
                  </span>
                  <input
                    name="location"
                    autoComplete="address-level2"
                    maxLength={60}
                    placeholder="e.g. Thrissur"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field-label full">
                  <span>
                    Logo <span className="opt">(optional)</span>
                  </span>
                  <label className="logo-drop">
                    <input
                      ref={fileRef}
                      type="file"
                      name="logo_file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={onLogoChange}
                    />
                    <span className="ld-empty" hidden={!!logo}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                      </svg>
                      Upload your logo <small>PNG, JPG or SVG, up to 5 MB</small>
                    </span>
                    <span className="ld-full" hidden={!logo}>
                      {logo && <img src={logo.dataUrl} alt="Your logo" />}
                      <span id="logoName">{logo?.name}</span>
                      <button
                        type="button"
                        className="ld-remove"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLogo(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  </label>
                  <span className="field-hint ld-err" hidden={!logoError}>
                    Please choose an image under 5 MB
                  </span>
                </div>
                <div className="field-label full">
                  <span>
                    How many scheme customers do you have? <span className="opt">(optional)</span>
                  </span>
                  <div className={selectOpen ? "cselect open" : "cselect"}>
                    <button
                      className="cselect-btn"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={selectOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectOpen((o) => !o);
                      }}
                    >
                      <span className={plan ? "cselect-val" : "cselect-val placeholder"}>
                        {plan ? plan.label : "Select a range"}
                      </span>
                      <ChevronDownIcon />
                    </button>
                    <ul className="cselect-menu" role="listbox">
                      {CUSTOMER_RANGES.map((r) => (
                        <li
                          key={r.value}
                          role="option"
                          aria-selected={customers === r.value}
                          className={customers === r.value ? "on" : undefined}
                          onClick={() => {
                            setCustomers(r.value);
                            setSelectOpen(false);
                          }}
                        >
                          <span className="opt-main">{r.label}</span>
                          <span className="opt-sub">{r.sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={plan ? "plan-preview show" : "plan-preview"} aria-live="polite">
                    <div className="plan-row">
                      <div>
                        <b>
                          {plan?.price ?? "₹3,000"}
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>/mo</span>
                        </b>
                        <div className="plan-meta">
                          <strong>Scheme management</strong> · <span>{plan?.cap}</span>
                        </div>
                      </div>
                      <span className="tag">{plan?.tag}</span>
                    </div>
                    <div className="plan-meta" style={{ marginTop: 8 }}>
                      {PLAN_FEATURES}
                    </div>
                    <div className="plan-meta" style={{ marginTop: 10 }}>
                      One-time setup incl. apps: <strong>{SETUP_FEE}</strong> · charged only at go-live,
                      not today
                    </div>
                  </div>
                </div>
              </div>
              <div className="prereg-actions full">
                <button
                  id="preregSubmitBtn"
                  className="btn btn-solid btn-shine"
                  type="submit"
                  disabled={!ready || submitting}
                >
                  {submitting ? "Submitting…" : "Book Free Demo"}
                </button>
              </div>
            </form>
            <p className={note.err ? "prereg-note err" : "prereg-note"}>{note.text}</p>
          </div>
          {lead && <SuccessScreen lead={lead} reduce={reduce} onClose={close} seed={burstSeed} />}
        </div>
      </div>
    </div>
  );
}
