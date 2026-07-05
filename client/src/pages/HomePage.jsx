import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRooms, getWatchHistory } from '../services/roomService';
import Navbar from '../components/layout/Navbar';
import Avatar from '../components/ui/Avatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const RoomCard = ({ room }) => {
  const navigate = useNavigate();
  return (
    <div
      className="card hover:border-primary-600 transition-all duration-200 cursor-pointer group"
      onClick={() => navigate(`/room/${room.roomId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/room/${room.roomId}`)}
      aria-label={`Join room ${room.roomName}`}
    >
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-dark-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden group-hover:bg-dark-500 transition-colors">
        {room.movieUrl ? (
          <div className="text-4xl">🎬</div>
        ) : (
          <div className="text-4xl opacity-40">📽️</div>
        )}
      </div>

      <h3 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
        {room.roomName}
      </h3>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Avatar username={room.host?.username} avatar={room.host?.avatar} size="xs" />
          <span className="text-xs text-gray-400 truncate">{room.host?.username}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs text-gray-400">{room.members?.length ?? 0} watching</span>
        </div>
      </div>

      {room.movieTitle && room.movieTitle !== 'Untitled' && (
        <p className="text-xs text-gray-500 truncate mt-1">{room.movieTitle}</p>
      )}
    </div>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joinInput, setJoinInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [r, h] = await Promise.all([getRooms(), getWatchHistory()]);
        setRooms(r);
        setHistory(h.slice(0, 5));
      } catch {
        // silent fail
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickJoin = (e) => {
    e.preventDefault();
    const id = joinInput.trim().toUpperCase();
    if (id) navigate(`/room/${id}`);
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Hero */}
        <section className="text-center py-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Watch together,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">
              anywhere
            </span>
          </h1>
          <p className="text-gray-400 mt-3 text-lg max-w-xl mx-auto">
            Create a room, share the link, and stay perfectly in sync with everyone.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <Link to="/create-room" className="btn-primary px-6 py-3 text-base w-full sm:w-auto">
              🎬 Create a Room
            </Link>
            <Link to="/join" className="btn-secondary px-6 py-3 text-base w-full sm:w-auto">
              🚪 Join a Room
            </Link>
          </div>

          {/* Quick join */}
          <form onSubmit={handleQuickJoin} className="flex items-center gap-2 max-w-sm mx-auto mt-5">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Enter Room ID…"
              className="input-field text-sm"
              aria-label="Room ID for quick join"
            />
            <button type="submit" className="btn-primary py-2.5 px-4 text-sm whitespace-nowrap">
              Join
            </button>
          </form>
        </section>

        {/* Public Rooms */}
        <section className="mt-6" aria-labelledby="public-rooms-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="public-rooms-heading" className="text-xl font-semibold text-white">
              🌎 Public Rooms
            </h2>
            <button
              onClick={() => { setLoadingRooms(true); getRooms().then(setRooms).finally(() => setLoadingRooms(false)); }}
              className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="Refresh room list"
            >
              ↻ Refresh
            </button>
          </div>

          {loadingRooms ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Loading rooms…" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">📭</p>
              <p>No public rooms right now.</p>
              <p className="text-sm mt-1">Be the first to{' '}
                <Link to="/create-room" className="text-primary-400 hover:underline">create one</Link>!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.map((room) => <RoomCard key={room._id} room={room} />)}
            </div>
          )}
        </section>

        {/* Watch History */}
        {history.length > 0 && (
          <section className="mt-10" aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-xl font-semibold text-white mb-4">
              🕐 Recently Watched
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="card flex items-center justify-between gap-3 cursor-pointer hover:border-primary-600 transition-all"
                  onClick={() => navigate(`/room/${item.roomId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/room/${item.roomId}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">📽️</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.roomName}</p>
                      <p className="text-xs text-gray-500">{item.roomId}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(item.watchedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feature highlights */}
        <section className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Features">
          {[
            { icon: '⚡', title: 'Real-Time Sync', desc: 'Play, pause and seek — everyone stays in sync instantly.' },
            { icon: '📁', title: 'Any Video', desc: 'Upload your own files or paste a direct video URL.' },
            { icon: '💬', title: 'Built-in Chat', desc: 'Talk while you watch with live messages and reactions.' },
          ].map((f) => (
            <div key={f.title} className="card text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default HomePage;
