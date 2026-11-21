/** Static marketing assets live in /public/lp so they never collide with portal routes. */
export const LP = "/lp";

export const WHATSAPP_NUMBER = "919526415630";
export const WHATSAPP_DISPLAY = "+91 95264 15630";
export const CONTACT_EMAIL = "hello@swarnagrow.com";

export const DEMO_WHATSAPP_TEXT = "Hi, I'd like a free demo of Swarna Grow";

export function whatsappLink(text: string = DEMO_WHATSAPP_TEXT): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/** Legacy Google Sheet webhook (unused; leads go to POST /public/landing-demo-requests). */
export const DEFAULT_LEAD_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzdSdEHprp5ALVpXkB4HSYTR5xhrzy7f9hLI66KjR9lgY1T89izblzvRfZ72hHcbyeu2Q/exec";

export const SETUP_FEE = "₹30,000";

export type CustomerRange = {
  value: string;
  label: string;
  sub: string;
  tag: string;
  price: string;
  cap: string;
};

export const CUSTOMER_RANGES: CustomerRange[] = [
  {
    value: "Up to 1,000",
    label: "Up to 1,000 customers",
    sub: "₹3,000/mo",
    tag: "Up to 1,000",
    price: "₹3,000",
    cap: "Up to 1,000 scheme customers",
  },
  {
    value: "1,001 to 2,500",
    label: "1,001 to 2,500 customers",
    sub: "₹5,000/mo",
    tag: "Up to 2,500",
    price: "₹5,000",
    cap: "1,001 to 2,500 scheme customers",
  },
  {
    value: "Above 2,500",
    label: "Above 2,500 customers",
    sub: "₹8,000/mo",
    tag: "2,500+",
    price: "₹8,000",
    cap: "Above 2,500 scheme customers",
  },
  {
    value: "Not sure yet",
    label: "Not sure yet",
    sub: "We'll help you check",
    tag: "From ₹3,000",
    price: "₹3,000",
    cap: "We'll confirm your slab on the demo call",
  },
];

export const PLAN_FEATURES =
  "Branded iOS & Android app · Web portal · Sidekick AI assistant";
