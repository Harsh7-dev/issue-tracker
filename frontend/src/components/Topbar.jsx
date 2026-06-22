import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <Link to="/" className="brand" data-testid="brand">
        <span className="brand-mark" />
        Beacon
      </Link>
      <div className="topbar-right">
        <span className="user-chip" data-testid="user-name">{user?.name}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} data-testid="logout-btn">
          Log out
        </button>
      </div>
    </header>
  );
}
