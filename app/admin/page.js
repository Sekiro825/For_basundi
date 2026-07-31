import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSupabase } from '../lib/supabase';
import AdminClient from './AdminClient';

export const revalidate = 0;

export default async function AdminPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (role !== 'admin') redirect('/home');

  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('surprise_unlocks')
    .select('*');

  let periodDeliveries = [];
  try {
    const { data: deliveries } = await supabase
      .from('period_care_deliveries')
      .select('*')
      .order('created_at', { ascending: false });
    if (deliveries) periodDeliveries = deliveries;
  } catch (e) {
    console.error(e);
  }

  const surpriseStatuses = Object.fromEntries((data || []).map((row) => [row.gift_key, row]));

  return <AdminClient surpriseStatuses={surpriseStatuses} periodDeliveries={periodDeliveries} />;
}

