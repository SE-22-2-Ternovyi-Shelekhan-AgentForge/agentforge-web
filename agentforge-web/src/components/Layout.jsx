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
    `nav-link px-2 ${isActive ? 'text-primary fw-bold' : 'text-light'}`;

  return (
    <div className="bg-dark text-white vh-100 d-flex flex-column" style={{ backgroundColor: '#05070a' }}>
      <nav
        className="navbar navbar-dark border-bottom border-secondary px-4"
        style={{ backgroundColor: 'rgba(5, 7, 10, 0.9)' }}
      >
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <img src={icon} alt="Logo" width="28" height="28" />
          <span>Agent<span className="text-primary">Forge</span></span>
        </Link>
        <div className="d-flex align-items-center gap-3">
          <NavLink to="/" end className={linkClass}>Чати</NavLink>
          <NavLink to="/teams" className={linkClass}>Команди</NavLink>
          <span className="text-secondary small">{user?.displayName}</span>
          <button className="btn btn-sm btn-outline-light" onClick={onLogout}>Вийти</button>
        </div>
      </nav>

      <div className="flex-grow-1 d-flex overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
