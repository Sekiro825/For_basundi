import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabase } from '../lib/supabase';
import SurpriseClient from './SurpriseClient';
import { surpriseGifts } from './surpriseData';
import './surprises.css';

export const revalidate = 0;

export default async function SurprisesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (!role) redirect('/');

  const { data } = await supabase
    .from('surprise_unlocks')
    .select('*');

  const statusByKey = new Map((data || []).map((row) => [row.gift_key, row]));
  const gifts = surpriseGifts.map((gift) => ({
    ...gift,
    isRevealed: !!statusByKey.get(gift.key)?.is_revealed,
    isClaimed: !!statusByKey.get(gift.key)?.is_claimed,
  }));

  return <SurpriseClient gifts={gifts} />;
}
