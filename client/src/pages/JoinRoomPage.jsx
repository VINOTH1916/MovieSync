import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getRoom } from '../services/roomService';
import Navbar from '../components/layout/Navbar';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    const id = roomId.trim().toUpperCase();
    if (!id) { setError('Please enter a Room ID.'); return; }

    setLoading(true);
    try {
      // Try without password first
      const room = await getRoom(id);
      setRoomInfo(room);
      // Not private or host — go straight in
      navigate(`/room/${id}`);
    } catch (err) {
      if (err.response?.status === 403) {
        // Private room, need password
        setNeedsPassword(true);
        setRoomInfo({ roomId: id });
      } else {
        setError(err.response?.data?.message || 'Room not found. Check the Room ID and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('Please enter the room password.'); return; }

    setLoading(true);
    try {
      await getRoom(roomId.trim().toUpperCase(), password.trim());
      navigate(`/room/${roomId.trim().toUpperCase()}?password=${encodeURIComponent(password)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      <main className="max-w-md mx-auto px-4 py-14 animate-fade-in">
        <div className="text-center mb-8">
          <span className="text-5xl">🚪</span>
          <h1 className="text-2xl font-bold text-white mt-3">Join a Room</h1>
          <p className="text-gray-400 text-sm mt-1">Enter a Room ID to jump in and watch together.</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm" role="alert">
            {error}
          </div>
        )}

        {!needsPassword ? (
          <form onSubmit={handleLookup} className="card space-y-4">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-1">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD34"
                maxLength={8}
                className="input-field tracking-widest text-lg font-mono text-center"
                autoFocus
                aria-describedby="roomId-hint"
              />
              <p id="roomId-hint" className="text-xs text-gray-500 mt-1 text-center">
                8-character code — ask the room host for it.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !roomId.trim()}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Looking up room…' : 'Join Room →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinWithPassword} className="card space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-2">
              <span>🔒</span>
              <p className="text-sm">This room is password-protected.</p>
            </div>

            <div>
              <label htmlFor="roomPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Room Password
              </label>
              <input
                id="roomPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="input-field"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setNeedsPassword(false); setPassword(''); setError(''); }}
                className="btn-secondary flex-1"
              >
                ← Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Want to start your own?{' '}
          <Link to="/create-room" className="text-primary-400 hover:text-primary-300 transition-colors">
            Create a room
          </Link>
        </p>
      </main>
    </div>
  );
};

export default JoinRoomPage;
