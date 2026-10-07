import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { QrCode, Stamp, Gift, ArrowRight, Check } from 'lucide-react';

const steps = [
  {
    icon: QrCode,
    step: '01',
    title: 'Put a QR on the counter',
    body: 'Print one code. Customers scan it, save their card, and come back to the same shop.',
  },
  {
    icon: Stamp,
    step: '02',
    title: 'You approve every stamp',
    body: 'A visit is a request until you say yes. No one fills a card from the sidewalk.',
  },
  {
    icon: Gift,
    step: '03',
    title: 'Hand over the reward',
    body: 'When the card fills, staff redeem a short code. The same reward cannot be used twice.',
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const startHref = user?.role === 'BUSINESS_OWNER' ? '/dashboard' : '/auth/login?intent=business';

  return (
    <div>
      <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-10 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-sand bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            For the shop on the counter
          </p>
          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-[4.6rem] font-medium tracking-tight text-ink leading-[0.95]">
            Get them to come back
            <span className="block italic text-leaf">next week.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
            Grow Business AI is a stamp card for your business. One QR, visits you approve, and a reward your staff can hand over. Your customers stay yours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <Link
              href={startHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-white hover:bg-leaf transition"
            >
              Start your shop
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-ink/50">Set up in a few minutes. Print the QR today.</p>
          </div>
          <ul className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-ink/70">
            {['You approve each stamp', 'One card per customer', 'Rewards stay in your shop'].map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-leaf" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-8 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <article key={step.step} className="rounded-[24px] border border-sand bg-white/80 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime text-ink">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="font-display text-2xl text-ink/25">{step.step}</span>
              </div>
              <h2 className="mt-5 font-display text-2xl leading-tight">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20 max-w-6xl mx-auto">
        <div className="rounded-[28px] bg-ink text-white px-6 py-10 sm:px-10 sm:py-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.16em] text-lime">Ready when the next customer walks in</p>
            <h2 className="mt-3 font-display text-4xl leading-tight">Put the card on your counter this week.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Name the shop, choose the reward, and print the QR. Customers join from that code. You stay in control of every stamp.
            </p>
          </div>
          <Link
            href={startHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-4 text-sm font-semibold text-ink hover:bg-white transition shrink-0"
          >
            Start your shop
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-ink/45">
          Already a customer of a shop?{' '}
          <Link href="/auth/login?intent=customer" className="text-leaf font-semibold hover:underline">
            Open your card
          </Link>
        </p>
      </section>
    </div>
  );
}
