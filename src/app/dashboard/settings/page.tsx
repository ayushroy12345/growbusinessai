import Link from 'next/link';
import { updateBusinessAction } from '@/actions/business';
import { requireAuth, getActiveBusinessId } from '@/lib/session';
import { getBusinessesByOwner, getBusinessById } from '@/lib/db';
import { getAppOrigin } from '@/lib/env';
import {
  Settings,
  Building2,
  Globe,
  MapPin,
  Star,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SettingsPageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

const inputClass =
  'w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-leaf focus:outline-none';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function BusinessSettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireAuth();
  const businesses = await getBusinessesByOwner(user.id);

  if (businesses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">No Business Configured</h2>
        <Link href="/dashboard/business/new" className="text-indigo-600 font-semibold text-xs">
          Create a business first
        </Link>
      </div>
    );
  }

  const activeBusinessId = (await getActiveBusinessId()) || businesses[0].id;
  const business = await getBusinessById(activeBusinessId);

  if (!business || business.owner_id !== user.id) {
    throw new Error('UNAUTHORIZED: Access to this business scope is forbidden.');
  }

  const params = await searchParams;
  const error = params.error || null;
  const saved = params.saved === '1' && !error;
  const publicUrl = `${getAppOrigin()}/b/${business.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime text-ink text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Business settings</span>
          </div>
          <h1 className="font-display text-4xl text-ink tracking-tight">{business.name}</h1>
          <p className="text-sm text-ink/60 mt-1">
            These details show on your public page at <span className="font-mono">/b/{business.slug}</span> and
            on the QR customers scan.
          </p>
        </div>

        <div className="flex flex-col gap-2 min-w-[220px]">
          <Link
            href={`/b/${business.slug}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-sand text-sm font-semibold text-ink hover:border-leaf/50 transition"
          >
            <ExternalLink className="w-4 h-4" />
            View public page
          </Link>
          <Link
            href="/dashboard/qr"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink text-sm font-semibold text-white hover:bg-leaf transition"
          >
            <QrCode className="w-4 h-4" />
            Manage QR code
          </Link>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Business details saved.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form action={updateBusinessAction} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
        <input type="hidden" name="business_id" value={business.id} />

        {/* Core Identity */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-leaf inline-flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            Core business details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name *">
              <input
                type="text"
                name="name"
                required
                defaultValue={business.name}
                placeholder="e.g. Blue Bottle Coffee"
                className={inputClass}
              />
            </Field>

            <Field
              label="Public URL Slug *"
              hint="Changing this changes your public link — printed QR codes with the old link will need reprinting."
            >
              <div className="flex rounded-xl shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  /b/
                </span>
                <input
                  type="text"
                  name="slug"
                  required
                  defaultValue={business.slug}
                  placeholder="blue-bottle"
                  className={`${inputClass} rounded-r-xl font-mono`}
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category">
              <input
                type="text"
                name="category"
                defaultValue={business.category || ''}
                placeholder="e.g. Cafe & Bakery, Hair Salon, Retail"
                className={inputClass}
              />
            </Field>

            <Field label="Logo Image URL">
              <input
                type="url"
                name="logo_url"
                defaultValue={business.logo_url || ''}
                placeholder="https://images.unsplash.com/..."
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description / Tagline">
            <textarea
              name="description"
              rows={2}
              defaultValue={business.description || ''}
              placeholder="Artisanal specialty coffee & handcrafted pastries roasted fresh daily."
              className={inputClass}
            />
          </Field>
        </div>

        {/* Contact & Location */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-leaf inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Contact & address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                type="text"
                name="phone"
                defaultValue={business.phone || ''}
                placeholder="+1 (555) 234-5678"
                className={inputClass}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                name="email"
                defaultValue={business.email || ''}
                placeholder="contact@business.com"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Field label="Street Address">
                <input
                  type="text"
                  name="address"
                  defaultValue={business.address || ''}
                  placeholder="100 Market St, Suite 400"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="City">
              <input
                type="text"
                name="city"
                defaultValue={business.city || ''}
                placeholder="San Francisco"
                className={inputClass}
              />
            </Field>
            <Field label="State / Region">
              <input
                type="text"
                name="state"
                defaultValue={business.state || ''}
                placeholder="CA"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Country">
            <input
              type="text"
              name="country"
              defaultValue={business.country || ''}
              placeholder="India"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Reputation & Social Channels */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-leaf inline-flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Google review & social channels
          </h2>

          <Field
            label="Google Review Direct URL"
            hint="Customers can click a neutral button to leave you a 5-star review on Google."
          >
            <input
              type="url"
              name="google_review_url"
              defaultValue={business.google_review_url || ''}
              placeholder="https://g.page/r/your-google-review-link/review"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website URL">
              <input
                type="url"
                name="website_url"
                defaultValue={business.website_url || ''}
                placeholder="https://yourwebsite.com"
                className={inputClass}
              />
            </Field>

            <Field label="Instagram URL">
              <input
                type="url"
                name="instagram_url"
                defaultValue={business.instagram_url || ''}
                placeholder="https://instagram.com/yourhandle"
                className={inputClass}
              />
            </Field>

            <Field label="Facebook URL">
              <input
                type="url"
                name="facebook_url"
                defaultValue={business.facebook_url || ''}
                placeholder="https://facebook.com/yourpage"
                className={inputClass}
              />
            </Field>

            <Field label="WhatsApp Number">
              <input
                type="text"
                name="whatsapp_number"
                defaultValue={business.whatsapp_number || ''}
                placeholder="+15551234567"
                className={inputClass}
              />
            </Field>

            <Field label="WhatsApp Channel URL">
              <input
                type="url"
                name="whatsapp_channel_url"
                defaultValue={business.whatsapp_channel_url || ''}
                placeholder="https://whatsapp.com/channel/..."
                className={inputClass}
              />
            </Field>

            <Field label="YouTube URL">
              <input
                type="url"
                name="youtube_url"
                defaultValue={business.youtube_url || ''}
                placeholder="https://youtube.com/@yourchannel"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <button
            type="submit"
            className="w-full py-4 rounded-full bg-ink hover:bg-leaf text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            Save changes
            <Globe className="w-4 h-4" />
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Public page:{' '}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="font-mono text-ink/60 underline">
              {publicUrl}
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
