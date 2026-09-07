import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Static store policy pages. Cashfree's whitelisting review checks that the
// site has Contact Us / About / T&C / Refund & Return / Shipping pages, so
// these are linked from the footer. Replace the placeholder business details
// below with the real ones before submitting the whitelisting request.

const SITE = {
  name: 'MEESHO Sales & U.P. Price',
  brand: 'Meesho'
};

const CONTACT = {
  phone: '+91 98765 43210',
  email: 'support@meeosalesurprice.in',
  address: 'MEESHO Sales & U.P. Price, New Delhi, Delhi, 110001, India',
  hours: 'Mon–Sat, 10 AM – 7 PM IST'
};

type PageKey = 'about' | 'contact' | 'terms' | 'refund' | 'shipping' | 'privacy';

const PAGES: Record<PageKey, { title: string; sections: { h: string; b: string[] }[] }> = {
  about: {
    title: 'About Us',
    sections: [
      {
        h: `Welcome to ${SITE.name}`,
        b: [
          `${SITE.name} is an online store specializing in ethnic wear for women — kurtis and suit sets — as well as a curated selection of grocery, kitchen, electronics, and beauty essentials at affordable reseller-friendly prices.`,
          'We combine quality products with simple, transparent pricing so every order is a good deal and delivered to your doorstep.',
        ],
      },
      {
        h: 'Our Commitment',
        b: [
          'We are committed to secure payments, fast shipping, and responsive customer support. Your privacy and satisfaction come first in everything we do.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contact Us',
    sections: [
      {
        h: 'Get in touch',
        b: [
          `Phone: ${CONTACT.phone}`,
          `Email: ${CONTACT.email}`,
          `Address: ${CONTACT.address}`,
          `Support Hours: ${CONTACT.hours}`,
          'We usually reply within 24 hours on business days.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    sections: [
      {
        h: 'General',
        b: [
          'By placing an order on this website you agree to these terms. Products are offered at the prices displayed at checkout. Prices and availability are subject to change without notice.',
        ],
      },
      {
        h: 'Orders & Payment',
        b: [
          'An order is accepted when your payment is successfully confirmed. All payments are processed through secure payment gateways (UPI and online card / net-banking channels). We never store your card or payment details.',
        ],
      },
      {
        h: 'Pricing',
        b: [
          'All prices are listed in Indian Rupees (INR) inclusive of applicable taxes unless stated otherwise. Shipping charges, if any, are shown before you confirm payment.',
        ],
      },
      {
        h: 'Use of Website',
        b: [
          'You agree to use this website only for lawful purposes and not to misuse, copy, or resell the content or products without permission.',
        ],
      },
    ],
  },
  refund: {
    title: 'Return & Refund Policy',
    sections: [
      {
        h: 'Returns & Exchanges',
        b: [
          'We accept returns/exchanges within 7 days of delivery for unused items in their original condition with all tags intact. Please share your order ID when raising a request.',
        ],
      },
      {
        h: 'Refunds',
        b: [
          'Once a return is approved, the refund is processed to the same payment method used at checkout within 5–7 business days after we receive the returned item.',
        ],
      },
      {
        h: 'Non-returnable items',
        b: [
          'Grocery and personal-care items that have been opened or used cannot be returned unless the product is damaged, defective, or incorrect on arrival.',
        ],
      },
      {
        h: 'Damaged or wrong item',
        b: [
          `If you receive a damaged or incorrect item, contact us at ${CONTACT.email} or ${CONTACT.phone} within 48 hours of delivery with your order ID and photos, and we will replace or refund it.`,
        ],
      },
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    sections: [
      {
        h: 'Dispatch',
        b: [
          'Orders are processed and dispatched within 24–48 hours of payment confirmation on business days.',
        ],
      },
      {
        h: 'Delivery',
        b: [
          'We ship across India. Estimated delivery is 3–7 business days depending on your location. You will receive the tracking update once your order ships.',
        ],
      },
      {
        h: 'Shipping Charges',
        b: [
          'Shipping is FREE on eligible orders. Any applicable charges are shown at checkout before you pay.',
        ],
      },
      {
        h: 'Delays',
        b: [
          'Occasional courier delays can happen. If your order is delayed more than the stated delivery window, contact us and we will track it for you.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        h: 'What we collect',
        b: [
          'We collect only the details needed to fulfil your order: your name, phone number, shipping address, and order details.',
        ],
      },
      {
        h: 'How we use it',
        b: [
          'Your information is used to process and deliver your order, send order updates, and provide support. We do not sell or share your personal data with third parties except to payment gateways and delivery partners as required to fulfil your order.',
        ],
      },
      {
        h: 'Security',
        b: [
          'Payments are handled by certified payment gateways. We do not store your card or banking details on our servers.',
        ],
      },
    ],
  },
};

export function InfoPage({ page }: { page: PageKey }) {
  const navigate = useNavigate();
  const data = PAGES[page];

  React.useEffect(() => {
    document.title = `${data.title} | ${SITE.brand}`;
  }, [data.title]);

  return (
    <div className="min-h-full bg-[#f5f5f8] font-sans">
      <header className="bg-white px-4 h-[56px] flex items-center shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center mr-3 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-[#353543]" />
        </button>
        <h1 className="text-[16px] font-extrabold text-[#353543] tracking-tight">{data.title}</h1>
      </header>

      <main className="max-w-[720px] mx-auto px-4 py-6 space-y-5">
        {data.sections.map((s, i) => (
          <section key={i} className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5">
            <h2 className="text-[15px] font-extrabold text-[#02060ce6] mb-2">{s.h}</h2>
            {s.b.map((p, j) => (
              <p key={j} className="text-[13px] font-medium text-gray-600 leading-relaxed mb-2 last:mb-0">{p}</p>
            ))}
          </section>
        ))}

        <p className="text-center text-[11px] text-gray-400 pb-6 pt-1">
          {SITE.name} • © {new Date().getFullYear()} All rights reserved.
        </p>
      </main>
    </div>
  );
}