import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🎬</span>
          <span className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">
            MovieSync
          </span>
        </Link>

        {/* Actions */}
        {user && (
          <div className="flex items-center gap-3">
            <Link
              to="/create-room"
              className="btn-primary text-sm py-1.5 px-3 hidden sm:inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Room
            </Link>

            <div className="flex items-center gap-2">
              <Avatar username={user.username} avatar={user.avatar} size="sm" />
              <span className="text-sm text-gray-300 hidden sm:block">{user.username}</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
              aria-label="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
