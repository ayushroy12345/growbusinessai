import { createBusinessAction } from '@/actions/business';
import { requireAuth } from '@/lib/session';
import {
  Building2,
  Sparkles,
  Globe,
  MapPin,
  Phone,
  Mail,
  Star,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

export default async function NewBusinessPage() {
  await requireAuth('/dashboard/business/new');

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
          <Building2 className="w-3.5 h-3.5" />
          <span>Multi-Tenant Business Provisioning</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create a New Business</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your business profile, loyalty rules, and generate your printable customer QR standee.
        </p>
      </div>

      <form action={createBusinessAction} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
        {/* Core Identity */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
            1. Core Business Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Blue Bottle Coffee"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Public URL Slug *
              </label>
              <div className="flex rounded-xl shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  /b/
                </span>
                <input
                  type="text"
                  name="slug"
                  required
                  placeholder="blue-bottle"
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-r-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                placeholder="e.g. Cafe & Bakery, Hair Salon, Retail"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logo Image URL
              </label>
              <input
                type="url"
                name="logo_url"
                placeholder="https://images.unsplash.com/..."
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Tagline
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="Artisanal specialty coffee & handcrafted pastries roasted fresh daily."
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact & Location */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
            2. Contact & Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                placeholder="+1 (555) 234-5678"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="contact@business.com"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                name="address"
                placeholder="100 Market St, Suite 400"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                placeholder="San Francisco"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State / Region</label>
              <input
                type="text"
                name="state"
                placeholder="CA"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Reputation & Social Channels */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
            3. Google Review & Social Channels
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Google Review Direct URL
            </label>
            <input
              type="url"
              name="google_review_url"
              placeholder="https://g.page/r/your-google-review-link/review"
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Customers can click a neutral button to leave you a 5-star review on Google.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
              <input
                type="url"
                name="website_url"
                placeholder="https://yourwebsite.com"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
              <input
                type="url"
                name="instagram_url"
                placeholder="https://instagram.com/yourhandle"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Facebook URL</label>
              <input
                type="url"
                name="facebook_url"
                placeholder="https://facebook.com/yourpage"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp_number"
                placeholder="+15551234567"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Channel URL</label>
              <input
                type="url"
                name="whatsapp_channel_url"
                placeholder="https://whatsapp.com/channel/..."
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">YouTube URL</label>
              <input
                type="url"
                name="youtube_url"
                placeholder="https://youtube.com/@yourchannel"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
        >
          Create Business & Generate QR Code
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
