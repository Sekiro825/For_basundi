'use client';

import { useState, useCallback } from 'react';
import FlowerSpiral from '../surprises/FlowerSpiral';
import TransparentBouquet from '../surprises/TransparentBouquet';
import '../surprises/surprises.css';

export default function DemoSpiralPage() {
  const [showSpiral, setShowSpiral] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const startDemo = () => {
    setAccepted(false);
    setShowHeartBurst(false);
    setShowModal(false);
    setShowSpiral(true);
  };

  const handleBloomComplete = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleAccept = () => {
    setAccepted(true);
    setShowHeartBurst(true);
    setTimeout(() => {
      setShowModal(false);
      setShowHeartBurst(false);
    }, 1600);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const resetAll = () => {
    setShowSpiral(false);
    setShowModal(false);
    setAccepted(false);
    setShowHeartBurst(false);
  };

  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', minHeight: '100vh', background: 'var(--cream)', color: 'var(--text-dark)', position: 'relative' }}>
      {!showSpiral && (
        <>
          <h1 style={{ color: 'var(--wine)', marginBottom: '1rem', fontSize: '2.4rem' }}>Flower Spiral & Big Bouquet Demo</h1>
          <p style={{ marginBottom: '2rem', fontSize: '1.1rem', opacity: 0.85 }}>
            Preview the grand victory animation: center 3D flower spiral bloom, full-screen floating flower canopy, and Big Bouquet modal!
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button 
              onClick={startDemo}
              className="accept-gift-btn"
              style={{ padding: '1rem 2.2rem', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              Trigger Magic ✨
            </button>
          </div>
        </>
      )}

      {showSpiral && !showModal && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 999999, display: 'flex', gap: '1rem' }}>
          <button 
            onClick={startDemo}
            className="accept-gift-btn"
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 25px rgba(0,0,0,0.25)' }}
          >
            Re-trigger Magic ✨
          </button>
          <button 
            onClick={resetAll}
            className="cancel-gift-btn"
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 25px rgba(0,0,0,0.25)' }}
          >
            Clear Flowers 🧹
          </button>
        </div>
      )}

      {/* Persistent Full Screen Floating Flower Field & Spiral */}
      {showSpiral && (
        <FlowerSpiral onSpiralBloomComplete={handleBloomComplete} />
      )}

      {/* Big Bouquet Modal Overlay */}
      {showModal && (
        <div className="big-bouquet-modal-overlay">
          <div className="big-bouquet-modal">
            <div className="modal-sparkles">✨ 🌸 ✨ 💖 ✨</div>
            <p className="modal-subtitle">✨ GRAND GIFT UNLOCKED ✨</p>
            <h2 className="modal-title">Virtual Starlight Bouquet</h2>
            
            <div className="big-bouquet-img-wrapper">
              <TransparentBouquet 
                src="/assets/bouquet1.png" 
                alt="Virtual Starlight Bouquet" 
                className="big-bouquet-img" 
              />
            </div>

            {showHeartBurst ? (
              <div className="accepted-message">
                <span className="heart-burst-icons">💖 🎉 💐 💖</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--wine)', marginTop: '0.5rem' }}>
                  Bouquet Accepted & Saved!
                </p>
              </div>
            ) : (
              <div className="modal-action-buttons">
                <button className="accept-gift-btn" onClick={handleAccept}>
                  <span>Accept Bouquet 💖</span>
                </button>
                <button className="cancel-gift-btn" onClick={handleCancel}>
                  <span>Close 🌸</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demo status indicator */}
      {accepted && !showModal && (
        <div style={{
          marginTop: '2rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.8rem 1.8rem',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2px dashed var(--rose)',
          borderRadius: '2rem',
          fontWeight: '600',
          color: 'var(--wine)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          <span style={{ fontSize: '1.4rem' }}>✨</span> Bouquet Accepted & Saved in Collection! 💐
        </div>
      )}
    </div>
  );
}
