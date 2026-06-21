import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context.js';
import icon from '../assets/agentForge-icon.png';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) =>
    `nav-link px-3 py-1 ${isActive ? 'fw-bold' : ''}`;
  const linkStyle = ({ isActive }) =>
    isActive
      ? { background: 'var(--af-accent-soft)', color: '#cfc3ff' }
      : { color: 'var(--af-muted)' };

  return (
    <div className="text-white vh-100 d-flex flex-column">
      <nav
        className="navbar navbar-dark px-4"
        style={{ backgroundColor: 'rgba(9, 12, 22, 0.72)', borderBottom: '1px solid var(--af-border)' }}
      >
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <img src={icon} alt="Logo" width="28" height="28" />
          <span>Agent<span className="af-gradient-text">Forge</span></span>
        </Link>
        <div className="d-flex align-items-center gap-2">
          <NavLink to="/" end className={linkClass} style={linkStyle}>Чати</NavLink>
          <NavLink to="/teams" className={linkClass} style={linkStyle}>Команди</NavLink>
          <span className="af-muted small ms-2 me-1 d-none d-sm-inline">{user?.displayName}</span>
          <button className="btn btn-sm btn-outline-light" onClick={onLogout}>Вийти</button>
        </div>
      </nav>

      <div className="flex-grow-1 d-flex overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
