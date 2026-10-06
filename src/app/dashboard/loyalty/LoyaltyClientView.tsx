'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Reward, LoyaltyRule } from '@/types';
import { addRewardAction, deleteRewardAction, updateCooldownAction } from '@/actions/business';
import { Gift, Plus, Trash2, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LoyaltyClientViewProps {
  businessId: string;
  businessName: string;
  rewards: Reward[];
  rules: LoyaltyRule | null;
}

export function LoyaltyClientView({
  businessId,
  businessName,
  rewards,
  rules,
}: LoyaltyClientViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // New reward form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [cooldownHours, setCooldownHours] = useState(rules?.min_interval_hours ?? 2);
  const [cooldownSaved, setCooldownSaved] = useState(false);

  function handleSaveCooldown() {
    startTransition(async () => {
      await updateCooldownAction(businessId, cooldownHours);
      setCooldownSaved(true);
      setTimeout(() => setCooldownSaved(false), 3000);
      router.refresh();
    });
  }

  function handleDeleteReward(id: string) {
    if (!confirm('Are you sure you want to delete this reward milestone?')) return;
    startTransition(async () => {
      await deleteRewardAction(id, businessId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Cooldown / Anti-Abuse Configuration */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Visit Anti-Duplicate Cooldown Protection
            </h2>
            <p className="text-xs text-slate-500">
              Prevent unlimited duplicate visit credits from repeated QR scans. Set the minimum hours required between valid visits.
            </p>
          </div>
          {cooldownSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={72}
              value={cooldownHours}
              onChange={(e) => setCooldownHours(parseInt(e.target.value, 10) || 0)}
              className="w-24 text-sm font-bold px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-600">Hours cooldown</span>
          </div>

          <button
            onClick={handleSaveCooldown}
            disabled={isPending}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Save Setting
          </button>
        </div>
      </div>

      {/* Rewards Milestones List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-indigo-600" />
              Configured Milestone Rewards
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers unlock these rewards once they hit the designated visit count.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition"
          >
            <Plus className="w-4 h-4" />
            Add Reward Milestone
          </button>
        </div>

        {rewards.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No rewards created yet. Click above to add your first milestone reward.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                      {reward.required_visits} Visits Required
                    </span>
                    <button
                      onClick={() => handleDeleteReward(reward.id)}
                      disabled={isPending}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Reward"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mt-2">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-xs text-slate-500 mt-1">{reward.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-200/60 font-medium">
                  <span>Type: {reward.reward_type}</span>
                  <span>Expires in: {reward.expiry_days} days</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Add Milestone Reward</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                await addRewardAction(formData);
                setShowAddModal(false);
                router.refresh();
              }}
              className="space-y-4"
            >
              <input type="hidden" name="business_id" value={businessId} />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reward Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Free Specialty Latte or Dessert"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Enjoy any artisanal single-origin coffee on the house."
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Required Visits *
                  </label>
                  <input
                    type="number"
                    name="required_visits"
                    required
                    min={1}
                    defaultValue={5}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reward Type
                  </label>
                  <select
                    name="reward_type"
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  >
                    <option value="FREE_ITEM">Free Item</option>
                    <option value="DISCOUNT">Discount Percentage</option>
                    <option value="GIFT">Gift / Merch</option>
                    <option value="EXPERIENCE">VIP Experience</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reward Value Label
                  </label>
                  <input
                    type="text"
                    name="reward_value"
                    placeholder="e.g. 100% Free"
                    defaultValue="Free Item"
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pass Expiry (Days)
                  </label>
                  <input
                    type="number"
                    name="expiry_days"
                    min={1}
                    defaultValue={30}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
