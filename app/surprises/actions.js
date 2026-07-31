'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '../lib/supabase';
import { surpriseGiftMap, surpriseGifts } from './surpriseData';

async function getRole() {
  const cookieStore = await cookies();
  return cookieStore.get('user_role')?.value || null;
}

async function verifyLoggedIn() {
  const role = await getRole();
  if (!role) throw new Error('Please log in first.');
  return role;
}

async function verifyAdmin() {
  const role = await getRole();
  if (role !== 'admin') throw new Error('Unauthorized');
}

export async function setGiftReveal(formData) {
  await verifyAdmin();

  const giftKey = formData.get('giftKey');
  const isRevealed = formData.get('isRevealed') === 'true';
  if (!surpriseGiftMap.has(giftKey)) throw new Error('Unknown gift.');

  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('surprise_unlocks')
    .upsert(
      {
        gift_key: giftKey,
        is_revealed: isRevealed,
        is_claimed: isRevealed ? undefined : false,
        revealed_at: isRevealed ? new Date().toISOString() : null,
        claimed_at: isRevealed ? undefined : null,
      },
      { onConflict: 'gift_key' }
    );

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/surprises');
}

export async function revealNextGift() {
  await verifyAdmin();

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('surprise_unlocks')
    .select('gift_key,is_revealed')
    .order('gift_key');

  if (error) throw new Error(error.message);

  const revealed = new Set((data || []).filter((row) => row.is_revealed).map((row) => row.gift_key));
  const nextGift = surpriseGifts.find((gift) => !revealed.has(gift.key));
  if (!nextGift) return { done: true };

  const formData = new FormData();
  formData.append('giftKey', nextGift.key);
  formData.append('isRevealed', 'true');
  await setGiftReveal(formData);
  return { done: false, giftKey: nextGift.key };
}

export async function markGiftWon(formData) {
  await verifyLoggedIn();

  const giftKey = formData.get('giftKey');
  if (!surpriseGiftMap.has(giftKey)) throw new Error('Unknown gift.');

  const supabase = getAdminSupabase();
  const { data, error: readError } = await supabase
    .from('surprise_unlocks')
    .select('is_revealed')
    .eq('gift_key', giftKey)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!data?.is_revealed) throw new Error('This gift has not been revealed yet.');

  const { error } = await supabase
    .from('surprise_unlocks')
    .upsert(
      {
        gift_key: giftKey,
        is_revealed: true,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      },
      { onConflict: 'gift_key' }
    );

  if (error) throw new Error(error.message);
  revalidatePath('/surprises');
  revalidatePath('/admin');
}
