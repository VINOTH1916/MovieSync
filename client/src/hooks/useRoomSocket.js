import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRoom } from '../context/RoomContext';
import { getChatHistory } from '../services/roomService';

/**
 * Handles all socket events for the watch room.
 * Call this once inside the WatchRoom page.
 */
const useRoomSocket = (roomId, { onLocalFileAnnounced, onMemberFileReady } = {}) => {
  const { socket } = useSocket();
  const { setRoom, setMembers, setMessages, addMessage, updatePlayback, clearRoom } = useRoom();
  const joinedRef = useRef(false);

  // ─── Join room on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId || joinedRef.current) return;

    getChatHistory(roomId).then((history) => setMessages(history)).catch(() => {});

    socket.emit('join-room', { roomId }, (res) => {
      if (res?.error) { console.error('[join-room]', res.error); return; }
      joinedRef.current = true;
    });

    return () => {
      if (joinedRef.current) {
        socket.emit('leave-room', { roomId });
        joinedRef.current = false;
        clearRoom();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  // ─── Socket event listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onSyncState = (state) => {
      if (state.members) setMembers(state.members);
      if (state.host) setRoom((prev) => prev ? { ...prev, host: state.host, isLocked: state.isLocked ?? prev?.isLocked } : prev);

      const playbackUpdate = {};
      if (state.isPlaying  !== undefined) playbackUpdate.isPlaying     = state.isPlaying;
      if (state.currentTime !== undefined) playbackUpdate.currentTime  = state.currentTime;
      if (state.playbackSpeed !== undefined) playbackUpdate.playbackSpeed = state.playbackSpeed;
      if (state.movieUrl   !== undefined) playbackUpdate.movieUrl      = state.movieUrl;
      if (state.movieTitle !== undefined) playbackUpdate.movieTitle    = state.movieTitle;
      if (Object.keys(playbackUpdate).length > 0) updatePlayback(playbackUpdate);

      // Late joiner: server says room is in local-file mode
      if (state.isLocalFile && state.localFileName) {
        onLocalFileAnnounced?.({ fileName: state.localFileName, hostName: state.host?.username || '' });
      }
    };

    const onMovieUpdated = (data) => {
      updatePlayback({
        movieUrl:    data.movieUrl,
        movieTitle:  data.movieTitle,
        currentTime: data.currentTime ?? 0,
        isPlaying:   data.isPlaying ?? false,
      });
    };

    const onUserJoined    = ({ members }) => setMembers(members);
    const onUserLeft      = ({ members }) => setMembers(members);
    const onReceiveMessage = (msg) => addMessage(msg);
    const onRoomLocked    = ({ isLocked }) =>
      setRoom((prev) => prev ? { ...prev, isLocked } : prev);
    const onHostChanged   = ({ newHostId }) =>
      setRoom((prev) => prev ? { ...prev, host: { ...prev.host, _id: newHostId } } : prev);

    // ── Local file events ────────────────────────────────────────────────
    const onLocalFileAnnouncedEv = (data) => onLocalFileAnnounced?.(data);
    const onMemberFileReadyEv    = (data) => onMemberFileReady?.(data);

    socket.on('sync-state',           onSyncState);
    socket.on('movie-updated',        onMovieUpdated);
    socket.on('user-joined',          onUserJoined);
    socket.on('user-left',            onUserLeft);
    socket.on('receive-message',      onReceiveMessage);
    socket.on('room-locked',          onRoomLocked);
    socket.on('host-changed',         onHostChanged);
    socket.on('local-file-announced', onLocalFileAnnouncedEv);
    socket.on('member-file-ready',    onMemberFileReadyEv);

    return () => {
      socket.off('sync-state',           onSyncState);
      socket.off('movie-updated',        onMovieUpdated);
      socket.off('user-joined',          onUserJoined);
      socket.off('user-left',            onUserLeft);
      socket.off('receive-message',      onReceiveMessage);
      socket.off('room-locked',          onRoomLocked);
      socket.off('host-changed',         onHostChanged);
      socket.off('local-file-announced', onLocalFileAnnouncedEv);
      socket.off('member-file-ready',    onMemberFileReadyEv);
    };
  }, [socket, setMembers, setRoom, addMessage, updatePlayback, onLocalFileAnnounced, onMemberFileReady]);

  // ─── Playback emitters ───────────────────────────────────────────────────
  const emitPlay        = useCallback((currentTime) => socket?.emit('play',           { roomId, currentTime }), [socket, roomId]);
  const emitPause       = useCallback((currentTime) => socket?.emit('pause',          { roomId, currentTime }), [socket, roomId]);
  const emitSeek        = useCallback((currentTime) => socket?.emit('seek',           { roomId, currentTime }), [socket, roomId]);
  const emitSpeedChange = useCallback((speed)       => socket?.emit('playback-speed', { roomId, speed }),       [socket, roomId]);
  const emitChangeMovie = useCallback((movieUrl, movieTitle) => socket?.emit('change-movie', { roomId, movieUrl, movieTitle }), [socket, roomId]);
  const emitMessage     = useCallback((message)     => socket?.emit('send-message',   { roomId, message }),     [socket, roomId]);
  const emitTyping      = useCallback((isTyping)    => socket?.emit('typing',         { roomId, isTyping }),    [socket, roomId]);
  const emitRequestSync = useCallback(()            => socket?.emit('request-sync',   { roomId }),              [socket, roomId]);

  // ─── Local file emitters ─────────────────────────────────────────────────
  const emitLocalFileAnnounce = useCallback((fileName) => {
    socket?.emit('local-file-announce', { roomId, fileName });
  }, [socket, roomId]);

  const emitLocalFileReady = useCallback(() => {
    socket?.emit('local-file-ready', { roomId });
  }, [socket, roomId]);

  // ─── Host-only emitters ──────────────────────────────────────────────────
  const emitRemoveUser   = useCallback((targetSocketId)  => socket?.emit('remove-user',   { roomId, targetSocketId }),  [socket, roomId]);
  const emitTransferHost = useCallback((newHostUserId)   => socket?.emit('transfer-host', { roomId, newHostUserId }),   [socket, roomId]);
  const emitToggleLock   = useCallback((isLocked)        => socket?.emit('toggle-lock',   { roomId, isLocked }),        [socket, roomId]);
  const emitEndSession   = useCallback(()                => socket?.emit('end-session',   { roomId }),                  [socket, roomId]);

  return {
    emitPlay, emitPause, emitSeek, emitSpeedChange,
    emitChangeMovie, emitMessage, emitTyping, emitRequestSync,
    emitLocalFileAnnounce, emitLocalFileReady,
    emitRemoveUser, emitTransferHost, emitToggleLock, emitEndSession,
  };
};

export default useRoomSocket;
