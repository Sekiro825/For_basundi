'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '../lib/supabase';

export async function submitDeliveryAction(deliveryData) {
  try {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('period_care_deliveries').insert({
      address: deliveryData.address,
      phone: deliveryData.phone || null,
      cravings: deliveryData.cravings,
      note: deliveryData.note || null,
      status: 'pending_delivery',
    });

    if (error) {
      console.error('Supabase error submitting delivery:', error);
    }
  } catch (err) {
    console.error('Server action error:', err);
  }

  revalidatePath('/admin');
  revalidatePath('/comfort');
  return { success: true };
}

export async function saveHighlightAction(highlightData) {
  try {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('romance_highlights').insert({
      book_id: highlightData.bookId,
      selected_text: highlightData.selectedText,
      color: highlightData.color,
      note: highlightData.note || null,
      chapter_title: highlightData.chapterTitle,
    });

    if (error) {
      console.error('Supabase error saving highlight:', error);
    }
  } catch (err) {
    console.error('Server action error:', err);
  }

  return { success: true };
}
