import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import {
  QrCode,
  ShieldCheck,
  ArrowRight,
  Gift,
  Star,
  Repeat,
  MessageSquare,
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'A counter QR that actually gets used',
    body: 'Customers scan once, keep one account, and check in on every visit. A cooldown stops the same phone from farming rewards.',
  },
  {
    icon: Gift,
    title: 'Milestones you can explain in one sentence',
    body: 'Five visits, a free coffee. Ten visits, twenty percent off. Staff redeem a short code at the counter so nothing is claimed twice.',
  },
  {
    icon: ShieldCheck,
    title: 'Each shop stays in its own lane',
    body: 'One owner can run several businesses. Visits, customers, and vouchers never cross from one shop into another.',
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const launchHref = user?.role === 'BUSINESS_OWNER' ? '/dashboard' : '/dashboard/business/new';

  return (
    <div>
      <section className="px-4 sm:px-6 lg:px-8 pt-14 pb-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sand bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              Loyalty for shops that live on repeat visits
            </p>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-[4.4rem] font-medium tracking-tight text-ink leading-[0.95]">
              Bring them back
              <span className="block italic text-leaf">before they forget you.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
              Grow Business AI gives cafes, studios, and stores a QR check-in, visit rewards, and a private feedback line. Customers keep one account. Each business keeps its own numbers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href={launchHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white hover:bg-leaf transition"
              >
                Launch a business
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sand bg-white px-6 py-3.5 text-sm font-semibold text-ink hover:border-ink/30 transition"
              >
                Try a demo persona
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {[
                ['1', 'account per customer'],
                ['5', 'visits to a free reward'],
                ['0', 'shared data between shops'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl text-ink">{value}</dt>
                  <dd className="mt-1 text-xs leading-snug text-ink/55">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-lime/80 blur-2xl" />
            <div className="relative rounded-[28px] bg-ink text-white p-6 sm:p-7 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Artisan Coffee</p>
                  <p className="mt-1 font-display text-2xl">Alex is one visit away</p>
                </div>
                <span className="rounded-full bg-lime px-3 py-1 text-xs font-semibold text-ink">4 / 5</span>
              </div>
              <div className="mt-6 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-lime" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/8 border border-white/10 p-4">
                  <Repeat className="w-4 h-4 text-lime" />
                  <p className="mt-3 font-display text-2xl">100%</p>
                  <p className="text-xs text-white/55">repeat rate this week</p>
                </div>
                <div className="rounded-2xl bg-white/8 border border-white/10 p-4">
                  <Star className="w-4 h-4 text-lime" />
                  <p className="mt-3 font-display text-2xl">5.0</p>
                  <p className="text-xs text-white/55">private feedback</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white text-ink p-4 flex items-start gap-3">
                <MessageSquare className="w-4 h-4 mt-0.5 text-leaf shrink-0" />
                <p className="text-sm leading-relaxed">
                  “Best flat white in the neighborhood. The check-in took one tap.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[24px] border border-sand bg-white/80 p-6 shadow-card"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime text-ink">
                <feature.icon className="w-5 h-5" />
              </div>
              <h2 className="mt-5 font-display text-2xl leading-tight">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
