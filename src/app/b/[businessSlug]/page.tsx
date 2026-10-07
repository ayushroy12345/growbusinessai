import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { trackAnalyticsEvent } from '@/lib/db';
import { getBusinessPageData } from '@/lib/page-data';
import { BusinessClientView } from './BusinessClientView';

interface BusinessPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function BusinessPublicPage({ params }: BusinessPageProps) {
  const { businessSlug } = await params;
  const user = await getCurrentUser();
  const data = await getBusinessPageData(businessSlug, user?.id ?? null);

  if (!data || !data.business.is_active) {
    notFound();
  }

  const { business, customer_profile: customerProfile, business_customer, rewards, claims, rules, stamp_request: stampRequest, menu, scratch } = data;

  const visits: any[] = [];
  const customerId = customerProfile?.id || null;

  // Fire-and-forget: analytics inserts should not delay the first byte.
  after(async () => {
    await trackAnalyticsEvent('qr_opened', business.id, customerId, { slug: businessSlug });
    await trackAnalyticsEvent('business_page_viewed', business.id, customerId, { slug: businessSlug });
    if (menu.items.length > 0) {
      await trackAnalyticsEvent('menu_viewed', business.id, customerId, { items: menu.items.length });
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <BusinessClientView
        business={business}
        customerProfile={customerProfile}
        businessCustomer={business_customer}
        rewards={rewards}
        claims={claims}
        visits={visits}
        minIntervalHours={rules?.min_interval_hours ?? 2}
        stampRequest={stampRequest}
        menu={menu}
        scratch={scratch}
      />
    </div>
  );
}
