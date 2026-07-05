import { createContext, useContext, useState, useCallback } from 'react';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1,
    movieUrl: '',
    movieTitle: '',
  });

  const updatePlayback = useCallback((state) => {
    setPlaybackState((prev) => ({ ...prev, ...state }));
  }, []);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearRoom = useCallback(() => {
    setRoom(null);
    setMembers([]);
    setMessages([]);
    setPlaybackState({ isPlaying: false, currentTime: 0, playbackSpeed: 1, movieUrl: '', movieTitle: '' });
  }, []);

  return (
    <RoomContext.Provider
      value={{
        room, setRoom,
        members, setMembers,
        messages, setMessages, addMessage,
        playbackState, updatePlayback,
        clearRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
};
