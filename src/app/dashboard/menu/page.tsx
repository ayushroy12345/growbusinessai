import { requireAuth, getActiveBusinessId } from '@/lib/session';
import { getBusinessesByOwner, getBusinessById } from '@/lib/db';
import { listMenu } from '@/lib/engagement';
import { addMenuCategoryAction, addMenuItemAction, toggleMenuItemAction } from '@/actions/engagement';
import Link from 'next/link';

export default async function MenuDashboardPage() {
  const user = await requireAuth('/dashboard/menu');
  const businesses = await getBusinessesByOwner(user.id);
  if (!businesses.length) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center">
        <Link href="/dashboard/business/new" className="text-indigo-600 font-semibold text-sm">
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

  const menu = await listMenu(business.id, true);

  async function addCategory(formData: FormData) {
    'use server';
    await addMenuCategoryAction(business!.id, String(formData.get('name') || ''));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Menu</h1>
        <p className="text-sm text-slate-500">{business.name}</p>
      </div>

      <form action={addCategory} className="flex gap-2">
        <input name="name" required placeholder="Category name" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Add category</button>
      </form>

      <form action={addMenuItemAction} className="grid sm:grid-cols-2 gap-3 bg-white border border-slate-200 rounded-3xl p-5">
        <input type="hidden" name="businessId" value={business.id} />
        <input name="name" required placeholder="Item name" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="price" type="number" min="0" step="1" required placeholder="Price" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="categoryId" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">No category</option>
          {menu.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input name="imageUrl" placeholder="Image URL" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="description" placeholder="Description" className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button className="sm:col-span-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Add item</button>
      </form>

      <div className="space-y-3">
        {menu.items.map((item) => (
          <form
            key={item.id}
            action={toggleMenuItemAction.bind(null, business.id, item.id, !item.is_available)}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3"
          >
            <div>
              <div className="text-sm font-bold text-slate-900">{item.name}</div>
              <div className="text-xs text-slate-500">₹{(item.price_cents / 100).toFixed(0)} · {item.is_available ? 'Available' : 'Unavailable'}</div>
            </div>
            <button className="text-xs font-bold text-indigo-700">{item.is_available ? 'Mark unavailable' : 'Mark available'}</button>
          </form>
        ))}
        {menu.items.length === 0 && <p className="text-sm text-slate-500">No menu items yet.</p>}
      </div>
    </div>
  );
}
