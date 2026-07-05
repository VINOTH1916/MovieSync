import { useRef } from 'react';

const LocalFileBanner = ({ fileName, hostName, isHost, isLoaded, onLoadFile, readyCount, totalCount }) => {
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onLoadFile?.(f);
    e.target.value = '';
  };

  const fileChip = (
    <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-xs break-all">
      {fileName}
    </span>
  );

  // ── Host bar ──────────────────────────────────────────────────────────────
  if (isHost) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border-b border-green-700/40 flex-wrap">
        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span className="text-green-300 text-xs sm:text-sm">
          <strong>Local File</strong> — {fileChip}
        </span>
        <span className="ml-auto text-xs text-gray-400">{readyCount}/{totalCount} ready</span>
      </div>
    );
  }

  // ── Member banner ─────────────────────────────────────────────────────────
  return (
    <div className={`px-3 py-2.5 border-b flex-shrink-0 transition-colors ${
      isLoaded ? 'bg-green-900/30 border-green-700/40' : 'bg-yellow-900/30 border-yellow-700/40'
    }`}>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleChange} />

      {isLoaded ? (
        <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{fileChip} loaded — you&apos;re in sync ✅</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-yellow-300 text-xs sm:text-sm min-w-0 flex-1">
            <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
            <span className="truncate">
              <strong>{hostName || 'Host'}</strong> is playing {fileChip}
            </span>
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white
                       text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0
                       focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
            aria-label={`Load your copy of ${fileName}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Load My Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default LocalFileBanner;
