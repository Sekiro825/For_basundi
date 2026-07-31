'use client';

import { useState } from 'react';
import DeliveryGiftModal from './DeliveryGiftModal';
import './comfort.css';

export default function ComfortClient() {
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  return (
    <div className="comfort-page-root">
      
      {/* HERO BANNER */}
      <div className="comfort-hero">
        <div className="hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="hero-tag">🌸 For My Queen Grishma (Basundi) • By Saket</span>
            <h1 className="hero-title">Basundi’s Comfort Hub 🌸💖</h1>
            <p className="hero-subtitle">
              Your cozy sanctuary for relaxation, treats, and sweet surprises!
            </p>
          </div>

          <button
            className="open-gift-modal-btn"
            onClick={() => setIsGiftModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #be123c)',
              color: '#fff',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 8px 20px rgba(244, 63, 94, 0.4)',
            }}
          >
            🎁 Claim Doorstep Treats Voucher
          </button>
        </div>
      </div>

      {/* NOVEL READER (HIDDEN FOR NOW) */}

      {/* GIFT & ADDRESS MODAL */}
      <DeliveryGiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
      />

    </div>
  );
}
