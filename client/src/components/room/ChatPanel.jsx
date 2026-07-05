import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

const MessageBubble = ({ msg, isOwn }) => {
  const isSystem = msg.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-1" role="status" aria-live="polite">
        <span className="text-xs text-gray-500 bg-dark-600 px-3 py-1 rounded-full">
          {msg.message}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <Avatar
          username={msg.sender?.username}
          avatar={msg.sender?.avatar}
          size="xs"
          className="flex-shrink-0 mb-0.5"
        />
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-0.5 ml-1">{msg.sender?.username}</span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm break-words leading-relaxed ${
            isOwn
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-dark-500 text-gray-100 rounded-bl-sm'
          }`}
        >
          {msg.message}
        </div>
        <span className="text-xs text-gray-600 mt-0.5 mx-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

const ChatPanel = ({ roomId, onSendMessage, onTyping }) => {
  const { messages } = useRoom();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojis, setShowEmojis] = useState(false);

  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;
    const onUserTyping = ({ username, isTyping }) => {
      if (username === user?.username) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        }
        return prev.filter((u) => u !== username);
      });
    };
    socket.on('user-typing', onUserTyping);
    return () => socket.off('user-typing', onUserTyping);
  }, [socket, user?.username]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.(true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping?.(false);
    }, 1500);
  }, [onTyping]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    onSendMessage?.(trimmed);
    setInput('');
    setShowEmojis(false);

    // Stop typing indicator
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
    inputRef.current?.focus();
  }, [input, onSendMessage, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const typingText = typingUsers.length === 1
    ? `${typingUsers[0]} is typing…`
    : typingUsers.length === 2
    ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
    : typingUsers.length > 2
    ? 'Several people are typing…'
    : '';

  return (
    <div className="flex flex-col h-full bg-dark-800" aria-label="Chat panel">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-dark-600 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h2 className="text-sm font-semibold text-white">Chat</h2>
        <span className="ml-auto text-xs text-gray-500">{messages.length} messages</span>
      </div>

      {/* Messages list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg._id || i}
              msg={msg}
              isOwn={msg.sender?.userId === user?._id || msg.sender?.userId?.toString() === user?._id}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingText && (
          <div className="flex items-center gap-2 px-1" aria-live="polite">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 italic">{typingText}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="flex-shrink-0 px-3 pb-2 flex flex-wrap gap-1.5 animate-fade-in border-t border-dark-600 pt-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              className="text-xl hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-dark-600">
        <div className="flex items-end gap-2">
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojis((p) => !p)}
            className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0 ${
              showEmojis ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white bg-dark-600'
            }`}
            aria-label="Toggle emoji picker"
            aria-expanded={showEmojis}
          >
            <span className="text-base leading-none">😊</span>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message…"
              rows={1}
              maxLength={500}
              className="w-full bg-dark-600 border border-dark-400 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         resize-none overflow-hidden transition-all"
              style={{ minHeight: '36px', maxHeight: '96px' }}
              aria-label="Chat message input"
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1 text-right">{input.length}/500</p>
      </div>
    </div>
  );
};

export default ChatPanel;
