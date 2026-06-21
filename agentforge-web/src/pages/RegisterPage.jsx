import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context.js';
import icon from '../assets/agentForge-icon.png';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="text-white min-vh-100 d-flex justify-content-center align-items-center p-3"
      style={{
        background:
          'radial-gradient(700px 480px at 50% 12%, rgba(124,92,255,0.18), transparent 60%), radial-gradient(600px 420px at 80% 100%, rgba(77,159,255,0.14), transparent 60%), #070912',
      }}
    >
      <div className="card af-glass shadow-lg af-fade-in" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img src={icon} alt="Logo" width="40" height="40" className="mb-2" />
            <h4 className="fw-bold mb-0">Реєстрація</h4>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label small text-secondary">Ім'я</label>
              <input
                className="form-control bg-dark text-white border-secondary"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small text-secondary">Електронна пошта</label>
              <input
                type="email"
                className="form-control bg-dark text-white border-secondary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small text-secondary">Пароль (мін. 6 символів)</label>
              <input
                type="password"
                className="form-control bg-dark text-white border-secondary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button className="btn btn-primary w-100 fw-bold" disabled={busy}>
              {busy ? 'Створення…' : 'Створити акаунт'}
            </button>
          </form>

          <p className="text-center text-secondary small mt-3 mb-0">
            Вже є акаунт? <Link to="/login">Увійти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
