'use client';

import { useState } from 'react';
import { submitDeliveryAction } from './actions';

const CRAVING_OPTIONS = [
  { id: 'momos', label: 'Hot Steamed Momos', emoji: '🥟' },
  { id: 'fries', label: 'Crispy French Fries', emoji: '🍟' },
  { id: 'falooda', label: 'Chilled Creamy Falooda', emoji: '🍧' },
  { id: 'chinese', label: 'Hakka Noodles & Chinese', emoji: '🥡' },
  { id: 'chocolates', label: 'Rich Chocolates & Treats', emoji: '🍫' },
];

export default function DeliveryGiftModal({ isOpen, onClose }) {
  const [selectedCravings, setSelectedCravings] = useState(['momos', 'chocolates']);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderTicket, setOrderTicket] = useState(null);

  if (!isOpen) return null;

  const toggleCraving = (id) => {
    if (selectedCravings.includes(id)) {
      setSelectedCravings(selectedCravings.filter((c) => c !== id));
    } else {
      setSelectedCravings([...selectedCravings, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSubmitting(true);

    const cravingLabels = selectedCravings.map((cId) => {
      const opt = CRAVING_OPTIONS.find((o) => o.id === cId);
      return opt ? `${opt.emoji} ${opt.label}` : cId;
    });

    const deliveryData = {
      id: 'DEL-' + Math.floor(100000 + Math.random() * 900000),
      address: address.trim(),
      phone: phone.trim(),
      cravings: cravingLabels,
      note: note.trim(),
      createdAt: new Date().toLocaleString(),
    };

    try {
      // Save locally
      const stored = localStorage.getItem('basundi_period_deliveries');
      const existing = stored ? JSON.parse(stored) : [];
      localStorage.setItem('basundi_period_deliveries', JSON.stringify([deliveryData, ...existing]));

      // Save via server action
      await submitDeliveryAction(deliveryData);
    } catch (err) {
      console.error(err);
    }

    setIsSubmitting(false);
    setOrderTicket(deliveryData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        justify: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1f0b14 0%, #3d1226 100%)',
          color: '#fff',
          width: '100%',
          maxWidth: '520px',
          borderRadius: '24px',
          padding: '30px',
          border: '2px solid #f43f5e',
          boxShadow: '0 20px 50px rgba(244,63,94,0.4)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ✕
        </button>

        {!orderTicket ? (
          <div>
            {/* GIFT HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '56px', animation: 'bounce 1.5s infinite' }}>🎁🍫</div>
              <h2 style={{ margin: '8px 0 4px', color: '#fda4af', fontSize: '26px' }}>
                Saket’s Secret Comfort Package
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#fecdd3', opacity: 0.9 }}>
                Since you’re on your period, Saket wants to send your favorite treats & chocolates straight to your doorstep! 🛵💖
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* CRAVINGS SELECTION */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '8px' }}>
                  1. Pick what you are craving right now:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {CRAVING_OPTIONS.map((c) => {
                    const isSelected = selectedCravings.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleCraving(c.id)}
                        style={{
                          padding: '10px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #f43f5e' : '1px solid #4a1e34',
                          background: isSelected ? 'rgba(244,63,94,0.25)' : 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{c.emoji}</span> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADDRESS INPUT */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '6px' }}>
                  2. Delivery Address / Where are you resting right now? 📍
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter your flat/hostel/home address or landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid #6b1e3e',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    resize: 'none',
                  }}
                />
              </div>

              {/* PHONE INPUT (OPTIONAL) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '6px' }}>
                  3. Contact Number (Optional) 📱
                </label>
                <input
                  type="text"
                  placeholder="Number to call when food/chocolates arrive..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid #6b1e3e',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* SPECIAL NOTE */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '6px' }}>
                  4. Special Cravings or Message for Saket 💬
                </label>
                <input
                  type="text"
                  placeholder="e.g., Extra spicy sauce, extra chocolates, hug when delivered..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid #6b1e3e',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  background: 'linear-gradient(135deg, #f43f5e, #be123c)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(244,63,94,0.5)',
                }}
              >
                {isSubmitting ? 'Sending Request to Saket...' : '🛵 Dispatch Comfort Package Now!'}
              </button>

            </form>
          </div>
        ) : (
          /* ORDER CONFIRMATION TICKET */
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '10px' }}>🛵💨✨</div>
            <h2 style={{ color: '#fda4af', margin: '0 0 6px' }}>Order Dispatched to Saket!</h2>
            <p style={{ fontSize: '14px', color: '#ffe4e6', margin: '0 0 20px' }}>
              Saket has received your exact coordinates and craving list! Get ready for fresh treats & pampering.
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px dashed #f43f5e',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '10px' }}>
                VIP CARE TICKET #{orderTicket.id}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                <strong>Selected Cravings:</strong> {orderTicket.cravings.join(', ')}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                <strong>Delivery Address:</strong> {orderTicket.address}
              </div>
              {orderTicket.note && (
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  <strong>Message for Saket:</strong> "{orderTicket.note}"
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>
                ● Status: Saket is ordering & preparing your delivery! 💖
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '10px 24px',
                borderRadius: '20px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Close Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
