import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import {
  getBusinessBySlug,
  getCustomerProfileByUserId,
  getBusinessCustomer,
  getRewardsByBusiness,
  getCustomerClaims,
  getLoyaltyRules,
  trackAnalyticsEvent,
} from '@/lib/db';
import { BusinessClientView } from './BusinessClientView';

interface BusinessPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function BusinessPublicPage({ params }: BusinessPageProps) {
  const { businessSlug } = await params;
  const business = await getBusinessBySlug(businessSlug);

  if (!business || !business.is_active) {
    notFound();
  }

  const user = await getCurrentUser();
  const customerProfile = user ? await getCustomerProfileByUserId(user.id) : null;

  let businessCustomer = null;
  let claims: any[] = [];
  let visits: any[] = [];

  if (customerProfile) {
    businessCustomer = await getBusinessCustomer(business.id, customerProfile.id);
    claims = await getCustomerClaims(customerProfile.id, business.id);
  }

  const rewards = await getRewardsByBusiness(business.id);
  const rules = await getLoyaltyRules(business.id);

  // Track QR / landing page opened event
  await trackAnalyticsEvent('qr_opened', business.id, customerProfile?.id || null, {
    slug: businessSlug,
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <BusinessClientView
        business={business}
        customerProfile={customerProfile}
        businessCustomer={businessCustomer}
        rewards={rewards}
        claims={claims}
        visits={visits}
        minIntervalHours={rules?.min_interval_hours ?? 2}
      />
    </div>
  );
}
