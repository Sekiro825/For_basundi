import { redirect } from 'next/navigation';
import { getUserRole } from '../actions';
import { getAdminSupabase } from '../lib/supabase';
import PhotoboothClient from './PhotoboothClient';
import './photobooth.css';

export const dynamic = 'force-dynamic';

export default async function PhotoboothPage() {
  const role = await getUserRole();
  if (!role) redirect('/');

  const db = getAdminSupabase();
  const { data: strips } = await db
    .from('photobooth_prints')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(24);

  return <PhotoboothClient role={role} initialStrips={strips || []} />;
}
