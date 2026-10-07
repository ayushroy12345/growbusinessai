import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

const live =
  existsSync('.env.local') && hasLiveCreds(readEnv());

function readEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function hasLiveCreds(env: Record<string, string>): boolean {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url && anon && service && !url.includes('placeholder') && !anon.includes('placeholder') && !service.includes('placeholder')
  );
}

interface Fixture {
  admin: SupabaseClient;
  anon: SupabaseClient;
  ownerAToken: string;
  customerAToken: string;
  ownerBToken: string;
  customerBToken: string;
  ownerBUserId: string;
  customerBUserId: string;
  businessA: { id: string; slug: string };
  businessB: { id: string; slug: string };
  customerBProfileId: string;
}

async function loginWith(anon: SupabaseClient, admin: SupabaseClient, email: string): Promise<string> {
  let link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error || !link.data.properties?.hashed_token) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) throw new Error(`could not create auth user ${email}: ${created.error.message}`);
    link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  }
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error(`could not generate link for ${email}: ${link.error?.message}`);
  }
  const { data, error } = await anon.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (error || !data.session) {
    throw new Error(`could not start session for ${email}: ${error?.message}`);
  }
  return data.session.access_token;
}

function authedClient(url: string, anonKey: string, token: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

test(
  'page-read RPCs (live Supabase integration + tenant isolation)',
  { skip: live ? false : 'NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured' },
  async (t) => {
    const env = readEnv();
    const url = env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = env.SUPABASE_SERVICE_ROLE_KEY!;

    const admin = createClient(url, service, { auth: { persistSession: false } });
    // This client is ONLY used to mint sessions via loginWith(); it gets signed in repeatedly.
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    // A truly anonymous client, never signed in, for anonymous/unauthenticated assertions.
    const guest = createClient(url, anonKey, { auth: { persistSession: false } });

    // Skip the suite if the migration has not been applied yet (function 404s).
    const probe = await guest.rpc('get_business_page', { p_slug: 'artisan-coffee' });
    if (probe.error && probe.error.code === 'PGRST202') {
      t.skip('run supabase/migrations/20251010_page_read_rpcs.sql first');
      return;
    }

    const suffix = randomUUID().slice(0, 8);
    const ownerBEmail = `rpc-owner-${suffix}@example.com`;
    const customerBEmail = `rpc-customer-${suffix}@example.com`;
    const businessA = { id: '35761743-fc45-4e53-a5f8-a621b13b7dfb', slug: 'artisan-coffee' };

    const ownerBUser = await admin.auth.admin.createUser({ email: ownerBEmail, email_confirm: true });
    if (ownerBUser.error) throw new Error(`create ownerB: ${ownerBUser.error.message}`);
    const ownerBUserId = ownerBUser.data.user.id;

    const { error: ownerBRowErr } = await admin
      .from('users')
      .insert({ id: ownerBUserId, email: ownerBEmail, full_name: 'RPC Owner B', role: 'BUSINESS_OWNER' });
    if (ownerBRowErr) throw new Error(`insert ownerB users row: ${ownerBRowErr.message}`);

    const businessB = {
      id: randomUUID(),
      slug: `rpc-test-b2-${suffix}`,
      name: `RPC Test Business B ${suffix}`,
      owner_id: ownerBUserId,
      is_active: true,
    };
    const { error: bizErr } = await admin.from('businesses').insert(businessB);
    if (bizErr) throw new Error(`insert businessB: ${bizErr.message}`);

    const customerBUser = await admin.auth.admin.createUser({ email: customerBEmail, email_confirm: true });
    if (customerBUser.error) throw new Error(`create customerB: ${customerBUser.error.message}`);
    const customerBUserId = customerBUser.data.user.id;

    const { error: customerBRowErr } = await admin
      .from('users')
      .insert({ id: customerBUserId, email: customerBEmail, full_name: 'RPC Customer B', role: 'CUSTOMER' });
    if (customerBRowErr) throw new Error(`insert customerB users row: ${customerBRowErr.message}`);

    const { data: customerBProfile, error: profileErr } = await admin
      .from('customer_profiles')
      .insert({ user_id: customerBUserId, full_name: 'RPC Customer B', phone: '+910000000000' })
      .select()
      .single();
    if (profileErr) throw new Error(`insert customerB profile: ${profileErr.message}`);

    const fixture: Fixture = {
      admin,
      anon,
      ownerAToken: await loginWith(anon, admin, 'asha.shop@example.com'),
      customerAToken: await loginWith(anon, admin, 'priya.customer@example.com'),
      ownerBToken: await loginWith(anon, admin, ownerBEmail),
      customerBToken: await loginWith(anon, admin, customerBEmail),
      ownerBUserId,
      customerBUserId,
      businessA,
      businessB: { id: businessB.id, slug: businessB.slug },
      customerBProfileId: customerBProfile.id,
    };

    const ownerA = authedClient(url, anonKey, fixture.ownerAToken);
    const ownerB = authedClient(url, anonKey, fixture.ownerBToken);
    const customerA = authedClient(url, anonKey, fixture.customerAToken);
    const customerB = authedClient(url, anonKey, fixture.customerBToken);

    await t.test('not found business page returns null for everyone', async () => {
      const { data } = await guest.rpc('get_business_page', { p_slug: 'does-not-exist-xyz' });
      assert.equal(data, null);
    });

    await t.test('anon can read the public business page, but no user data', async () => {
      const { data, error } = await guest.rpc('get_business_page', { p_slug: fixture.businessA.slug });
      assert.equal(error, null);
      assert.ok(data?.business?.id === fixture.businessA.id);
      assert.equal(data.customer_profile, null);
      assert.equal(data.business_customer, null);
      assert.deepEqual(data.claims, []);
    });

    await t.test('logged-in customer gets own profile on the public page', async () => {
      const { data, error } = await customerA.rpc('get_business_page', { p_slug: fixture.businessA.slug });
      assert.equal(error, null);
      assert.ok(data.customer_profile);
      assert.equal(data.business_customer?.business_id, fixture.businessA.id);
    });

    await t.test('anon cannot read the customer dashboard payload (no rows leaked)', async () => {
      const { data, error } = await guest.rpc('get_customer_dashboard');
      assert.equal(error, null);
      assert.equal(data?.profile, null);
      assert.deepEqual(data?.stores, []);
      assert.deepEqual(data?.claims, []);
    });

    await t.test('customer A sees only their own profile and participation', async () => {
      const { data, error } = await customerA.rpc('get_customer_dashboard');
      assert.equal(error, null);
      assert.ok(data?.profile?.id === '6ed54a61-75a5-4a1e-9add-f8a2a7173e85');
      assert.ok(Array.isArray(data.stores));
      const store = data.stores.find((s: { business: { id: string } }) => s.business.id === fixture.businessA.id);
      assert.ok(store, 'customer A participates in business A');
      assert.ok(Array.isArray(store.rewards));
    });

    await t.test('customer B (separate user) sees their own profile and no other rows', async () => {
      const { data, error } = await customerB.rpc('get_customer_dashboard');
      assert.equal(error, null);
      assert.equal(data?.profile?.id, fixture.customerBProfileId);
      assert.deepEqual(data?.stores, []);
    });

    await t.test('owner A can read their own dashboard', async () => {
      const { data, error } = await ownerA.rpc('get_owner_dashboard', { p_business_id: fixture.businessA.id });
      assert.equal(error, null);
      assert.ok(typeof data.analytics.totalCustomers === 'number');
      assert.ok(Array.isArray(data.recentCustomers));
      assert.ok(Array.isArray(data.recentFeedback));
      assert.ok(Array.isArray(data.stampRequests));
      assert.ok(Array.isArray(data.recentCustomers));
    });

    await t.test('owner A cannot read owner B business', async () => {
      const { error } = await ownerA.rpc('get_owner_dashboard', { p_business_id: fixture.businessB.id });
      assert.ok(error, 'expected unauthorized RPC error');
      assert.ok(error.code === '42501' || /not accessible/.test(error.message));
    });

    await t.test('owner B can read their empty dashboard, not owner A\'s', async () => {
      const { data: own, error: ownErr } = await ownerB.rpc('get_owner_dashboard', { p_business_id: fixture.businessB.id });
      assert.equal(ownErr, null);
      assert.equal(own.analytics.totalCustomers, 0);

      const { error: otherErr } = await ownerB.rpc('get_owner_dashboard', { p_business_id: fixture.businessA.id });
      assert.ok(otherErr, 'expected cross-tenant rejection');
    });

    await t.test('customer cannot read an owner dashboard', async () => {
      const { error } = await customerB.rpc('get_owner_dashboard', { p_business_id: fixture.businessA.id });
      assert.ok(error, 'expected unauthorized RPC error for customers');
    });

    await t.test('owner can read customer list only for own business', async () => {
      const { data: list, error: listErr } = await ownerA.rpc('get_business_customers', { p_business_id: fixture.businessA.id });
      assert.equal(listErr, null);
      assert.ok(Array.isArray(list));
      assert.ok(list.every((row: { business_id: string }) => row.business_id === fixture.businessA.id));

      const { error } = await ownerA.rpc('get_business_customers', { p_business_id: fixture.businessB.id });
      assert.ok(error && (error.code === '42501' || /not accessible/.test(error.message)));
    });

    await t.test('owner can read loyalty panel only for own business', async () => {
      const { data, error } = await ownerA.rpc('get_loyalty_panel', { p_business_id: fixture.businessA.id });
      assert.equal(error, null);
      assert.ok(Array.isArray(data.rewards));

      const { error: otherErr } = await ownerA.rpc('get_loyalty_panel', { p_business_id: fixture.businessB.id });
      assert.ok(otherErr, 'expected cross-tenant rejection');
    });

    await t.test('unauthenticated requests cannot reach protected RPCs', async () => {
      const { error: ownerErr } = await guest.rpc('get_owner_dashboard', { p_business_id: fixture.businessA.id });
      assert.ok(ownerErr, 'anon owner dashboard should fail');
      const { error: listErr } = await guest.rpc('get_business_customers', { p_business_id: fixture.businessA.id });
      assert.ok(listErr, 'anon customer list should fail');
    });

    // Cleanup (auth user delete cascades public.users -> businesses/profiles).
    for (const uid of [fixture.ownerBUserId, fixture.customerBUserId]) {
      await admin.auth.admin.deleteUser(uid);
    }
  }
);