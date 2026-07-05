import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { getRoom } from '../services/roomService';
import useRoomSocket from '../hooks/useRoomSocket';
import useLocalFile from '../hooks/useLocalFile';
import VideoPlayer from '../components/room/VideoPlayer';
import ChatPanel from '../components/room/ChatPanel';
import RoomControls from '../components/room/RoomControls';
import MembersList from '../components/room/MembersList';
import LocalFileBanner from '../components/room/LocalFileBanner';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Mobile tab values
const TAB_VIDEO   = 'video';
const TAB_CHAT    = 'chat';
const TAB_MEMBERS = 'members';

const WatchRoomPage = () => {
  const { roomId }        = useParams();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const { user }          = useAuth();
  const { connected, socket } = useSocket();
  const { room, setRoom, members, playbackState } = useRoom();

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Desktop sidebar visibility
  const [showChat,    setShowChat]    = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  // Mobile active tab
  const [mobileTab, setMobileTab] = useState(TAB_VIDEO);

  // ── Local file state ─────────────────────────────────────────────────────
  const [localFileInfo, setLocalFileInfo] = useState(null);
  const [readyMembers,  setReadyMembers]  = useState([]);
  const { localFile, loadFile, clearFile } = useLocalFile();

  // isHostRef lets callbacks always read the latest isHost without re-registering
  const isHostRef = useRef(false);

  // onLocalFileAnnounced fires for EVERYONE (server uses io.to which includes sender).
  // The host must be ignored here because they already loaded the file locally.
  const onLocalFileAnnounced = useCallback(({ fileName, hostName }) => {
    if (isHostRef.current) return;          // host: ignore, they set it themselves
    setLocalFileInfo({ fileName, hostName });
    setReadyMembers([]);
    clearFile();                            // member: reset so they pick the new file
  }, [clearFile]);

  const onMemberFileReady = useCallback(({ username, socketId }) => {
    setReadyMembers(prev =>
      prev.find(m => m.socketId === socketId) ? prev : [...prev, { username, socketId }]
    );
  }, []);

  const socketActions = useRoomSocket(roomId, { onLocalFileAnnounced, onMemberFileReady });

  const isHost          = room?.host?._id === user?._id || room?.host === user?._id;
  const isLocalFileMode = playbackState?.movieUrl?.startsWith('local-file://');

  // Keep ref in sync with isHost so callbacks always have the latest value
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  const handleHostLocalFileLoaded = useCallback((file) => {
    loadFile(file);
    setLocalFileInfo({ fileName: file.name, hostName: user?.username });
    setReadyMembers([{ username: user?.username, socketId: 'host' }]); // count host as ready
    socketActions.emitLocalFileReady?.();
  }, [loadFile, user, socketActions]);

  const handleMemberLoadFile = useCallback((file) => {
    if (!localFileInfo) return;
    loadFile(file);
    socketActions.emitLocalFileReady?.();
  }, [loadFile, localFileInfo, socketActions]);

  useEffect(() => {
    const password = searchParams.get('password') || '';
    getRoom(roomId, password)
      .then(data => {
        setRoom(data);
        if (data.movieUrl?.startsWith('local-file://')) {
          setLocalFileInfo({
            fileName: data.movieUrl.replace('local-file://', ''),
            hostName: data.host?.username || 'Host',
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load this room.');
        setLoading(false);
      });
  }, [roomId, searchParams, setRoom]);

  useEffect(() => {
    if (!socket) return;
    const onRoomEnded = ({ reason }) => {
      alert(reason || 'The room has ended.');
      navigate('/');
    };
    socket.on('room-ended', onRoomEnded);
    return () => socket.off('room-ended', onRoomEnded);
  }, [socket, navigate]);

  if (loading) return <LoadingSpinner fullscreen text="Loading room…" />;

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-xl font-bold text-white mb-2">Room not found</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">← Back to Home</button>
        </div>
      </div>
    );
  }

  const readyCount = readyMembers.length;
  const totalCount = members.length || 1;

  // ── Shared top bar ────────────────────────────────────────────────────────
  const topBar = (
    <header className="glass px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0"
          aria-label="Go home">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="font-semibold text-white truncate text-sm">{room?.roomName}</h1>
            {room?.isLocked && <span className="text-yellow-400 text-xs">🔒</span>}
            {isHost && <span className="bg-primary-600/30 text-primary-300 text-xs px-1.5 py-0.5 rounded">Host</span>}
            {isLocalFileMode && <span className="bg-green-900/40 text-green-400 text-xs px-1.5 py-0.5 rounded">📂 Local</span>}
          </div>
          <p className="text-xs text-gray-500 font-mono">{roomId}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Connection dot */}
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`} aria-live="polite">
          <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="hidden sm:inline">{connected ? 'Connected' : 'Reconnecting…'}</span>
        </div>

        {/* Desktop: Members / Chat toggles */}
        <button onClick={() => setShowMembers(p => !p)}
          className={`hidden md:flex p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${showMembers ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white bg-dark-600'}`}
          aria-label={`${showMembers ? 'Hide' : 'Show'} members`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>

        <button onClick={() => setShowChat(p => !p)}
          className={`hidden md:flex p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${showChat ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white bg-dark-600'}`}
          aria-label={`${showChat ? 'Hide' : 'Show'} chat`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </button>

        {/* Copy Room ID */}
        <button onClick={() => navigator.clipboard.writeText(roomId)}
          className="hidden sm:flex items-center gap-1 text-xs bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Copy Room ID">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span className="hidden lg:inline">{roomId}</span>
        </button>
      </div>
    </header>
  );

  // ── Mobile bottom tab bar ─────────────────────────────────────────────────
  const mobileTabBar = (
    <nav className="md:hidden flex-shrink-0 flex bg-dark-800 border-t border-dark-600 safe-area-bottom" role="tablist">
      {[
        { id: TAB_VIDEO,   label: 'Watch',   icon: '🎬' },
        { id: TAB_CHAT,    label: 'Chat',    icon: '💬' },
        { id: TAB_MEMBERS, label: 'Members', icon: '👥' },
      ].map(tab => (
        <button key={tab.id} role="tab" aria-selected={mobileTab === tab.id}
          onClick={() => setMobileTab(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium
            transition-colors focus:outline-none
            ${mobileTab === tab.id ? 'text-primary-400 bg-primary-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
          <span className="text-lg leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.id === TAB_CHAT && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary-500 hidden" aria-hidden="true" />
          )}
        </button>
      ))}
    </nav>
  );

  // ── Video + controls column ───────────────────────────────────────────────
  const videoColumn = (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden h-full">
      {localFileInfo && (
        <LocalFileBanner
          fileName={localFileInfo.fileName}
          hostName={localFileInfo.hostName}
          isHost={isHost}
          isLoaded={!!localFile}
          onLoadFile={handleMemberLoadFile}
          readyCount={readyCount}
          totalCount={totalCount}
        />
      )}
      <div className="flex-1 bg-black overflow-hidden">
        <VideoPlayer
          isHost={isHost}
          isLocked={room?.isLocked}
          localBlobUrl={localFile?.blobUrl || null}
          {...socketActions}
        />
      </div>
      {isHost && (
        <div className="flex-shrink-0">
          <RoomControls
            roomId={roomId} room={room} setRoom={setRoom}
            isHost={isHost} members={members}
            onLocalFileLoaded={handleHostLocalFileLoaded}
            {...socketActions}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      {topBar}

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {videoColumn}

        {showMembers && (
          <aside className="w-60 flex-shrink-0 border-l border-dark-600 overflow-y-auto animate-fade-in">
            <MembersList members={members} hostId={room?.host?._id || room?.host}
              currentUserId={user?._id} isHost={isHost}
              onRemove={socketActions.emitRemoveUser}
              onTransferHost={socketActions.emitTransferHost} />
          </aside>
        )}

        {showChat && (
          <aside className="w-72 flex-shrink-0 border-l border-dark-600 flex flex-col animate-fade-in">
            <ChatPanel roomId={roomId}
              onSendMessage={socketActions.emitMessage}
              onTyping={socketActions.emitTyping} />
          </aside>
        )}
      </div>

      {/* ── MOBILE layout — full-screen panels ── */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {/* Video tab */}
        <div className={`flex-1 overflow-hidden flex flex-col ${mobileTab === TAB_VIDEO ? 'flex' : 'hidden'}`}>
          {videoColumn}
        </div>

        {/* Chat tab */}
        <div className={`flex-1 overflow-hidden flex flex-col ${mobileTab === TAB_CHAT ? 'flex' : 'hidden'}`}>
          <ChatPanel roomId={roomId}
            onSendMessage={socketActions.emitMessage}
            onTyping={socketActions.emitTyping} />
        </div>

        {/* Members tab */}
        <div className={`flex-1 overflow-y-auto ${mobileTab === TAB_MEMBERS ? 'block' : 'hidden'}`}>
          <MembersList members={members} hostId={room?.host?._id || room?.host}
            currentUserId={user?._id} isHost={isHost}
            onRemove={socketActions.emitRemoveUser}
            onTransferHost={socketActions.emitTransferHost} />
        </div>
      </div>

      {mobileTabBar}
    </div>
  );
};

export default WatchRoomPage;
