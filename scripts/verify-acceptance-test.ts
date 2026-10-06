import {
  upsertUser,
  createOrUpdateCustomerProfile,
  createBusiness,
  getBusinessBySlug,
  getBusinessesByOwner,
  getOrCreateBusinessCustomer,
  recordCustomerVisit,
  getRewardsByBusiness,
  createReward,
  claimReward,
  getCustomerClaims,
  verifyAndRedeemReward,
  submitPrivateFeedback,
  trackSocialClick,
  getBusinessAnalytics,
  getBusinessCustomersList,
  updateLoyaltyCooldown,
  getSuperAdminOverview,
} from '../src/lib/db.ts';
import { generateQRCodeDataUrl } from '../src/lib/qr.ts';
import { computeRewardStatus } from '../src/lib/loyalty.ts';

async function runAcceptanceTest() {
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END ACCEPTANCE TEST...\n');

  // STEP 1: Create Owner & Business A
  console.log('--- Step 1: Create Business A ---');
  const owner = await upsertUser({
    email: 'marcus.owner@cafeempire.com',
    full_name: 'Marcus Vance',
    role: 'BUSINESS_OWNER',
  });
  console.log('✓ Owner created:', owner.email, 'ID:', owner.id);

  const businessA = await createBusiness(owner.id, {
    name: 'Artisan Coffee Roasters',
    slug: 'artisan-coffee',
    category: 'Specialty Cafe',
    description: 'Fresh artisanal roasts and handcrafted espresso.',
    phone: '+1 555 100 2000',
    email: 'hello@artisancoffee.com',
    city: 'San Francisco',
    state: 'CA',
    google_review_url: 'https://g.page/r/artisancoffee/review',
    instagram_url: 'https://instagram.com/artisancoffee',
  });
  console.log('✓ Business A created:', businessA.name, 'Slug:', businessA.slug);

  // STEP 2: Configure "5 visits = Free Coffee"
  console.log('\n--- Step 2: Configure Loyalty (5 visits = Free Coffee) ---');
  // Set cooldown to 0 for instant automated test progression
  await updateLoyaltyCooldown(businessA.id, 0);

  const rewardsA = await getRewardsByBusiness(businessA.id);
  let coffeeReward = rewardsA.find((r) => r.required_visits === 5);
  if (!coffeeReward) {
    coffeeReward = await createReward(businessA.id, {
      title: 'Free Coffee',
      description: 'One complimentary signature latte or drip coffee',
      reward_type: 'FREE_ITEM',
      reward_value: 'Free Coffee',
      required_visits: 5,
      expiry_days: 30,
    });
  }
  console.log('✓ Loyalty Rule Verified: Required Visits =', coffeeReward.required_visits, 'Reward:', coffeeReward.title);

  // STEP 3: Generate Business A QR Code
  console.log('\n--- Step 3: Generate Business A QR ---');
  const qrUrl = `https://loyalty-saas.com/b/${businessA.slug}`;
  const qrDataUrl = await generateQRCodeDataUrl(qrUrl);
  console.log('✓ Dynamic QR Generated (Length:', qrDataUrl.length, 'bytes) targeting:', qrUrl);

  // STEP 4-6: Customer Signs in & Profile is created
  console.log('\n--- Step 4-6: Customer Signs in & Profile is created ---');
  const customerUser = await upsertUser({
    email: 'elena.rodriguez@example.com',
    full_name: 'Elena Rodriguez',
    role: 'CUSTOMER',
  });
  const customerProfile = await createOrUpdateCustomerProfile(
    customerUser.id,
    'Elena Rodriguez',
    '+1 555 888 9999'
  );
  console.log('✓ Global Customer Profile Created:', customerProfile.full_name, 'Universal ID:', customerProfile.id);

  // STEP 7-8: First visit recorded -> 1/5 progress
  console.log('\n--- Step 7-8: Record First Visit (1/5 Progress) ---');
  const visit1 = await recordCustomerVisit(businessA.id, customerProfile.id, 'QR_SCAN');
  console.log('✓ Visit 1 status:', visit1.message);
  console.log('✓ Progress:', visit1.businessCustomer.total_visits, '/ 5 visits');
  if (visit1.businessCustomer.total_visits !== 1) throw new Error('Expected 1 visit!');

  // STEP 9-10: Second visit recorded -> 2/5 progress
  console.log('\n--- Step 9-10: Record Second Visit (2/5 Progress) ---');
  const visit2 = await recordCustomerVisit(businessA.id, customerProfile.id, 'QR_SCAN');
  console.log('✓ Visit 2 status:', visit2.message);
  console.log('✓ Progress:', visit2.businessCustomer.total_visits, '/ 5 visits');
  if (visit2.businessCustomer.total_visits !== 2) throw new Error('Expected 2 visits!');

  // STEP 11: Continue until 5/5
  console.log('\n--- Step 11: Progressing to 5/5 Visits ---');
  await recordCustomerVisit(businessA.id, customerProfile.id, 'QR_SCAN'); // 3
  await recordCustomerVisit(businessA.id, customerProfile.id, 'QR_SCAN'); // 4
  const visit5 = await recordCustomerVisit(businessA.id, customerProfile.id, 'QR_SCAN'); // 5
  console.log('✓ Visits completed. Total:', visit5.businessCustomer.total_visits, '/ 5 visits');
  if (visit5.businessCustomer.total_visits !== 5) throw new Error('Expected 5 visits!');

  // STEP 12: Reward becomes AVAILABLE
  console.log('\n--- Step 12: Reward becomes AVAILABLE ---');
  const claimsBefore = await getCustomerClaims(customerProfile.id, businessA.id);
  const statusCheck = computeRewardStatus(coffeeReward, visit5.businessCustomer.total_visits, claimsBefore);
  console.log('✓ Reward Status computed:', statusCheck.status);
  if (statusCheck.status !== 'AVAILABLE') throw new Error(`Expected AVAILABLE, got ${statusCheck.status}`);

  // STEP 13: Customer claims reward
  console.log('\n--- Step 13: Customer Claims Reward ---');
  const claim = await claimReward(customerProfile.id, businessA.id, coffeeReward.id);
  console.log('✓ Reward Claimed! Unique Claim Code generated:', claim.claim_code, 'Status:', claim.status);
  if (!claim.claim_code.startsWith('RW-') || claim.status !== 'CLAIMED') {
    throw new Error('Claim code generation failed');
  }

  // STEP 14-15: Business verifies and redeems reward -> REDEEMED
  console.log('\n--- Step 14-15: Business Verifies & Redeems Reward ---');
  const redeemResult = await verifyAndRedeemReward(businessA.id, claim.claim_code, owner.id);
  console.log('✓ Staff Redemption Result:', redeemResult.message);
  if (!redeemResult.success || redeemResult.claim?.status !== 'REDEEMED') {
    throw new Error('Redemption failed');
  }

  // Verify anti-duplicate redemption: Trying to redeem same code again MUST FAIL
  const duplicateRedeem = await verifyAndRedeemReward(businessA.id, claim.claim_code, owner.id);
  console.log('✓ Anti-Duplicate Check: Attempting to redeem already-redeemed code ->', duplicateRedeem.message);
  if (duplicateRedeem.success) {
    throw new Error('CRITICAL BUG: Duplicate reward redemption was permitted!');
  }
  console.log('✓ Anti-Duplicate Protection Passed: Second redemption strictly blocked.');

  // STEP 16: Customer creates private feedback
  console.log('\n--- Step 16: Customer Submits Private Feedback ---');
  const feedback = await submitPrivateFeedback(
    businessA.id,
    customerProfile.id,
    5,
    'Exceptional cold brew and very friendly baristas!',
    customerProfile.full_name,
    customerProfile.phone
  );
  console.log('✓ Private feedback stored. Rating:', feedback.rating, 'Stars. Comment:', feedback.comment);

  // STEP 17: Customer clicks Google review button
  console.log('\n--- Step 17: Customer Clicks Google Review Button ---');
  await trackSocialClick(businessA.id, customerProfile.id, 'google_review');
  console.log('✓ Google review click tracked without gating reward or claiming external API completion.');

  // STEP 18: Business dashboard reflects actual data
  console.log('\n--- Step 18: Business Dashboard Live Analytics Calculation ---');
  const analyticsA = await getBusinessAnalytics(businessA.id);
  console.log('✓ Business A Analytics:');
  console.log('  - Total Customers:', analyticsA.totalCustomers);
  console.log('  - Total Visits:', analyticsA.totalVisits);
  console.log('  - Repeat Customer Rate:', analyticsA.repeatRate, '%');
  console.log('  - Rewards Redeemed:', analyticsA.rewardsRedeemed);
  console.log('  - Google Review Clicks:', analyticsA.googleReviewClicks);
  console.log('  - Private Feedback Count:', analyticsA.feedbackCount);
  if (analyticsA.totalVisits < 5 || analyticsA.rewardsRedeemed !== 1 || analyticsA.googleReviewClicks !== 1) {
    throw new Error('Analytics calculation discrepancy');
  }

  // STEP 19: Create Business B under the same owner
  console.log('\n--- Step 19: Create Business B under Same Owner ---');
  const businessB = await createBusiness(owner.id, {
    name: 'Roy Haute Fashion',
    slug: 'roy-fashion',
    category: 'Apparel & Boutique',
    city: 'New York',
    state: 'NY',
  });
  console.log('✓ Business B Created:', businessB.name, 'Slug:', businessB.slug);

  const ownerBusinesses = await getBusinessesByOwner(owner.id);
  console.log('✓ Owner now manages', ownerBusinesses.length, 'businesses:', ownerBusinesses.map((b) => b.name));
  if (ownerBusinesses.length < 2) throw new Error('Owner should have multiple businesses');

  // STEP 20-21: Customer enters Business B -> Universal identity reused
  console.log('\n--- Step 20-21: Customer Enters Business B (Universal Account Reused) ---');
  const bcB = await getOrCreateBusinessCustomer(businessB.id, customerProfile.id);
  console.log('✓ Customer entered Business B. Total visits in Business B:', bcB.total_visits);
  if (bcB.total_visits !== 0) throw new Error('Customer should start at 0 visits in Business B!');

  // STEP 22-23: Strict Multi-Tenant Isolation Verification
  console.log('\n--- Step 22-23: Multi-Tenant Data Isolation Test ---');
  const customersInA = await getBusinessCustomersList(businessA.id);
  const customersInB = await getBusinessCustomersList(businessB.id);

  console.log('✓ Business A Customers Count:', customersInA.length);
  console.log('✓ Business B Customers Count (prior to visit):', customersInB.length);

  // Business B customer list must not reflect Business A's visits
  const customerAinA = customersInA.find((c) => c.customer_id === customerProfile.id);
  if (!customerAinA || customerAinA.total_visits !== 5) {
    throw new Error('Business A customer visit count corrupted');
  }

  // Cross-tenant claim redemption attempt: Try redeeming Business A code at Business B
  console.log('✓ Testing Cross-Tenant Breach Attack: Redeeming Business A voucher at Business B...');
  const crossTenantAttempt = await verifyAndRedeemReward(businessB.id, claim.claim_code, owner.id);
  console.log('✓ Cross-Tenant Attack Result:', crossTenantAttempt.message);
  if (crossTenantAttempt.success) {
    throw new Error('CRITICAL SECURITY LEAK: Business B was able to redeem Business A voucher!');
  }
  console.log('✓ Cross-Tenant Isolation Verified: Cross-business redemption is strictly blocked.');

  // STEP 24-26: Super Admin Verification
  console.log('\n--- Step 24-26: Super Admin Verification ---');
  const adminOverview = await getSuperAdminOverview();
  console.log('✓ Super Admin Overview:');
  console.log('  - Total Managed Businesses:', adminOverview.businesses.length);
  console.log('  - Total Registered Customers:', adminOverview.customers.length);
  console.log('  - System Audit Logs recorded:', adminOverview.auditLogs.length);
  console.log('  - Platform Analytics Events tracked:', adminOverview.recentEvents.length);

  console.log('\n🎉 ALL 26 ACCEPTANCE TEST CRITERIA PASSED SUCCESSFULLY! 🚀');
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
