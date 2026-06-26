'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './actions';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [sparkles, setSparkles] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Generate floating hearts
    const newHearts = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 20 + 12,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    setHearts(newHearts);

    // Generate sparkle particles
    const newSparkles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 5,
    }));
    setSparkles(newSparkles);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('password', password);
      await login(formData);
      router.push('/home');
      router.refresh();
    } catch (err) {
      setError('Wrong password, try again 💔');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Floating Hearts Background */}
      <div className="hearts-container">
        {hearts.map((h) => (
          <div
            key={h.id}
            className="floating-heart"
            style={{
              left: `${h.left}%`,
              fontSize: `${h.size}px`,
              animationDuration: `${h.duration}s`,
              animationDelay: `${h.delay}s`,
              opacity: h.opacity,
            }}
          >
            💗
          </div>
        ))}
      </div>

      {/* Sparkle Particles */}
      <div className="sparkles-container">
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="sparkle"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Glassmorphic Login Card */}
      <div className="login-glass-card login-fade-in">
        {/* Decorative glow orbs */}
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>

        {/* Couple Photo Placeholder */}
        <div className="couple-photo-frame">
          <div className="couple-photo-placeholder">
            <span className="photo-heart-icon">💑</span>
          </div>
          <div className="photo-ring"></div>
        </div>

        {/* Title Section */}
        <div className="login-header-section">
          <p className="login-label">Our Moments 💙</p>
          <h1 className="login-hero-title">Saket & Grishma</h1>
          <p className="login-hero-sub">
            Memories too precious to lose
          </p>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span className="divider-heart">♡</span>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="login-form-new">
          <div className="input-wrapper">
            <input
              id="password-input"
              type="password"
              placeholder="Enter the secret key..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="login-glass-input"
              autoFocus
            />
            <span className="input-icon">🔑</span>
          </div>

          {error && (
            <p className="login-error-msg login-fade-in">{error}</p>
          )}

          <button
            id="login-button"
            type="submit"
            disabled={isLoading || !password}
            className="login-glow-btn"
          >
            {isLoading ? (
              <span className="btn-loading">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </span>
            ) : (
              'Enter Our World ✨'
            )}
          </button>
        </form>

        <p className="login-footer-text">
          Every great love story deserves a place to live 💖
        </p>
      </div>
    </div>
  );
}
