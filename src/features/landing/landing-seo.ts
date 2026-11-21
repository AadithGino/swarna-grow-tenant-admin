/** Search-engine copy and structured data for the landing page (same as the static site). */
export const LANDING_TITLE =
  "Gold Scheme App for Jewellers | Your Own Branded App with AI — Swarna Grow";

export const LANDING_DESCRIPTION =
  "Swarna Grow gives jewellers in Kerala and India their own branded gold scheme app on the App Store and Play Store, a customer web portal and an AI business assistant. Gold chitti and kuri schemes, UPI collections, receipts and maturity in one place.";

export const LANDING_META: Record<string, string> = {
  description: LANDING_DESCRIPTION,
  keywords:
    "gold scheme software app, gold chitti software, gold kuri software app, gold scheme management software, jewellery scheme software, kuri management software, jewellery app for customers, digital gold for jewellers, AI for jewellers",
  "og:type": "website",
  "og:site_name": "Swarna Grow",
  "og:title": "Swarna Grow | Your jewellery's own gold scheme app, with AI",
  "og:description":
    "Your own app on the App Store and Play Store, a customer web portal and an AI assistant for owners. Gold schemes, UPI collections, receipts and maturity in one place. Book a free demo.",
  "og:url": "https://swarnagrow.com/",
  "twitter:card": "summary_large_image",
  "twitter:title": "Swarna Grow | Your jewellery's own gold scheme app, with AI",
  "twitter:description":
    "A branded iOS and Android gold scheme app for your jewellery, with a customer web portal and an AI business assistant. ₹30,000 setup, from ₹3,000 a month.",
};

export const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Swarna Grow",
      "alternateName": [
        "Gold Scheme App for Jewellers",
        "Gold Chitti Software",
        "Gold Kuri Software App"
      ],
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Branded gold scheme app and management software for jewellers",
      "operatingSystem": "iOS, Android, Web",
      "url": "https://swarnagrow.com/",
      "description": "Branded gold scheme app for jewellers: iOS and Android customer apps, customer web portal, custom scheme builder, UPI and cash collection, gold-weight receipts, maturity management and an AI business assistant for owners.",
      "keywords": "gold scheme app, gold chitti software, gold kuri software app, jewellery scheme software, AI for jewellers",
      "publisher": {
        "@type": "Organization",
        "name": "GroQuik Solutions"
      },
      "offers": [
        {
          "@type": "Offer",
          "name": "One-time setup",
          "price": "30000",
          "priceCurrency": "INR",
          "description": "Branded App Store and Play Store apps, customer web portal, scheme setup and data migration"
        },
        {
          "@type": "Offer",
          "name": "Scheme management, up to 1,000 customers",
          "price": "3000",
          "priceCurrency": "INR",
          "description": "Monthly, includes the AI assistant"
        },
        {
          "@type": "Offer",
          "name": "Scheme management, 1,001 to 2,500 customers",
          "price": "5000",
          "priceCurrency": "INR",
          "description": "Monthly, includes the AI assistant"
        },
        {
          "@type": "Offer",
          "name": "Scheme management, above 2,500 customers",
          "price": "8000",
          "priceCurrency": "INR",
          "description": "Monthly, includes the AI assistant"
        },
        {
          "@type": "Offer",
          "name": "Online store add-on",
          "price": "2000",
          "priceCurrency": "INR",
          "description": "Monthly"
        },
        {
          "@type": "Offer",
          "name": "Digi Gold and Silver add-on",
          "price": "5000",
          "priceCurrency": "INR",
          "description": "Monthly"
        }
      ],
      "featureList": [
        "Branded iOS and Android app on the App Store and Play Store",
        "Customer web portal",
        "AI business assistant for owners",
        "Custom scheme builder",
        "UPI, cash and bank collection",
        "Gold-weight receipts",
        "Maturity and redemption calendar",
        "Staff roles and audit trail"
      ],
      "areaServed": "IN"
    },
    {
      "@type": "Organization",
      "name": "GroQuik Solutions",
      "url": "https://swarnagrow.com/",
      "areaServed": {
        "@type": "State",
        "name": "Kerala, India"
      },
      "brand": {
        "@type": "Brand",
        "name": "Swarna Grow"
      }
    },
    {
      "@type": "WebSite",
      "name": "Swarna Grow",
      "url": "https://swarnagrow.com/",
      "inLanguage": "en-IN"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is gold scheme software?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Gold scheme software manages the monthly savings schemes a jewellery showroom runs for its customers - enrolment, instalment due dates, collections, receipts, accumulated gold weight and maturity."
          }
        },
        {
          "@type": "Question",
          "name": "Is gold scheme software the same as gold chitti or gold kuri software app?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. In Kerala, jewellers often call the same workflow gold kuri software or gold chitti software. Swarna Grow runs these schemes in your own branded app."
          }
        },
        {
          "@type": "Question",
          "name": "Will the app carry my jewellery's name?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Customers download an app with your jewellery's name and logo from the App Store and Play Store, and can also use a customer web portal."
          }
        },
        {
          "@type": "Question",
          "name": "What does the AI assistant do?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Owners and permitted staff ask questions in plain words, such as how much was collected this month or who is overdue in a branch, and get answers from live scheme data. Customers do not see it."
          }
        },
        {
          "@type": "Question",
          "name": "How much does gold scheme software cost in India?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Swarna Grow costs Rs 30,000 one-time for setup, including your branded apps. Scheme management with the AI assistant is Rs 3,000 a month for up to 1,000 customers, Rs 5,000 a month for up to 2,500 customers and Rs 8,000 a month above 2,500 customers. The online store is Rs 2,000 per month and Digi Gold and Silver is Rs 5,000 per month."
          }
        }
      ]
    }
  ]
} as const;
