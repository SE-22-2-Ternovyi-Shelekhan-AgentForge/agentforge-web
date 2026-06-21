import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context.js';
import icon from '../assets/agentForge-icon.png';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="bg-dark text-white min-vh-100 d-flex justify-content-center align-items-center"
      style={{ background: 'radial-gradient(circle at center, #1a1d24 0%, #05070a 100%)' }}
    >
      <div className="card bg-black border-secondary shadow-lg" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img src={icon} alt="Logo" width="40" height="40" className="mb-2" />
            <h4 className="fw-bold mb-0">Вхід до Agent<span className="text-primary">Forge</span></h4>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={onSubmit}>
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
              <label className="form-label small text-secondary">Пароль</label>
              <input
                type="password"
                className="form-control bg-dark text-white border-secondary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary w-100 fw-bold" disabled={busy}>
              {busy ? 'Вхід…' : 'Увійти'}
            </button>
          </form>

          <p className="text-center text-secondary small mt-3 mb-0">
            Немає акаунта? <Link to="/register">Зареєструватися</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
