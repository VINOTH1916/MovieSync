import { useRef, useEffect, useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { useRoom } from '../../context/RoomContext';
import { resolveVideoUrl, isGoogleDriveUrl } from '../../utils/videoUrl';

// Hard-seek if drift exceeds this
const HARD_SEEK_THRESHOLD = 8;
// Speed-up catch-up if drift is between SOFT and HARD
const SOFT_SYNC_THRESHOLD = 2;
// Catch-up playback rate
const CATCHUP_RATE = 1.15;

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
};

const VideoPlayer = ({
  isHost, isLocked,
  emitPlay, emitPause, emitSeek, emitSpeedChange, emitRequestSync,
  localBlobUrl,
}) => {
  const reactPlayerRef  = useRef(null);
  // ref callback — fires as soon as <video> DOM node mounts/unmounts
  const nativeVideoRef  = useRef(null);
  const suppressSyncRef = useRef(false);
  const lastEmittedRef  = useRef(0);
  const catchupRef      = useRef(false);   // are we in speed-catch-up mode?
  const progressRef     = useRef(null);
  const containerRef    = useRef(null);
  const controlsTimerRef = useRef(null);

  const { playbackState, updatePlayback } = useRoom();
  const { isPlaying, currentTime, playbackSpeed, movieUrl, movieTitle } = playbackState;

  const [localPlaying,  setLocalPlaying]  = useState(false);
  const [duration,      setDuration]      = useState(0);
  const [localTime,     setLocalTime]     = useState(0);
  const [volume,        setVolume]        = useState(0.8);
  const [muted,         setMuted]         = useState(false);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [buffering,     setBuffering]     = useState(false);
  const [showControls,  setShowControls]  = useState(true);
  const [seeking,       setSeeking]       = useState(false);

  const canControl  = isHost || !isLocked;
  const isLocalMode = !!localBlobUrl;

  // ── Ref callback: fires when <video> node mounts/changes ─────────────────
  const setNativeVideo = useCallback((node) => {
    if (!node) { nativeVideoRef.current = null; return; }
    nativeVideoRef.current = node;

    // Apply current state immediately so first paint is correct
    node.volume      = volume;
    node.muted       = muted;
    node.playbackRate = playbackSpeed || 1;

    // Attach native events
    const onMeta    = () => setDuration(node.duration);
    const onTime    = () => {
      if (seeking) return;
      setLocalTime(node.currentTime);
      if (isHost && Math.abs(node.currentTime - lastEmittedRef.current) > 5) {
        lastEmittedRef.current = node.currentTime;
        updatePlayback({ currentTime: node.currentTime });
      }
    };
    const onPlay_   = () => { setLocalPlaying(true);  setBuffering(false); };
    const onPause_  = () => setLocalPlaying(false);
    const onWait    = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);

    node.addEventListener('loadedmetadata', onMeta);
    node.addEventListener('timeupdate',     onTime);
    node.addEventListener('play',           onPlay_);
    node.addEventListener('pause',          onPause_);
    node.addEventListener('waiting',        onWait);
    node.addEventListener('canplay',        onCanPlay);

    // Store cleanup on node itself so we can call it on unmount
    node._cleanup = () => {
      node.removeEventListener('loadedmetadata', onMeta);
      node.removeEventListener('timeupdate',     onTime);
      node.removeEventListener('play',           onPlay_);
      node.removeEventListener('pause',          onPause_);
      node.removeEventListener('waiting',        onWait);
      node.removeEventListener('canplay',        onCanPlay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, seeking, updatePlayback]);

  // Cleanup when component unmounts or blobUrl changes
  useEffect(() => {
    return () => {
      nativeVideoRef.current?._cleanup?.();
    };
  }, [localBlobUrl]);

  // ── Smart sync: server state → local player ───────────────────────────────
  // Small drift (2-8s) → speed up to catch. Large drift (>8s) → hard seek.
  useEffect(() => {
    if (suppressSyncRef.current) return;
    setLocalPlaying(isPlaying);

    const applySync = (currentPos, targetTime, playFn, pauseFn, seekFn, setRateFn) => {
      if (isPlaying) playFn();
      else pauseFn();

      if (targetTime === undefined) return;
      const drift = targetTime - currentPos;          // positive = we're behind
      const absDrift = Math.abs(drift);

      if (absDrift > HARD_SEEK_THRESHOLD) {
        // Too far behind/ahead — hard seek
        seekFn(targetTime);
        setLocalTime(targetTime);
        if (catchupRef.current) { setRateFn(playbackSpeed || 1); catchupRef.current = false; }
      } else if (absDrift > SOFT_SYNC_THRESHOLD && drift > 0) {
        // Behind — speed up gently
        if (!catchupRef.current) { setRateFn(CATCHUP_RATE); catchupRef.current = true; }
      } else if (catchupRef.current && absDrift < 0.5) {
        // Back in sync — restore normal speed
        setRateFn(playbackSpeed || 1);
        catchupRef.current = false;
      }
    };

    if (isLocalMode) {
      const vid = nativeVideoRef.current;
      if (!vid) return;
      applySync(
        vid.currentTime,
        currentTime,
        () => vid.play().catch(() => {}),
        () => vid.pause(),
        (t) => { vid.currentTime = t; },
        (r) => { vid.playbackRate = r; },
      );
    } else {
      const player = reactPlayerRef.current;
      applySync(
        player?.getCurrentTime() || 0,
        currentTime,
        () => {},   // ReactPlayer play is driven by the `playing` prop
        () => {},
        (t) => player?.seekTo(t, 'seconds'),
        () => {},   // ReactPlayer speed via playbackRate prop — handled separately
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTime, isLocalMode]);

  // Sync speed/volume to native element
  useEffect(() => {
    const vid = nativeVideoRef.current;
    if (!vid) return;
    if (!catchupRef.current) vid.playbackRate = playbackSpeed || 1;
  }, [playbackSpeed]);

  useEffect(() => {
    const vid = nativeVideoRef.current;
    if (!vid) return;
    vid.volume = volume;
    vid.muted  = muted;
  }, [volume, muted]);

  useEffect(() => { emitRequestSync?.(); }, [emitRequestSync]);

  // ── Auto-hide controls ───────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (localPlaying) setShowControls(false);
    }, 3000);
  }, [localPlaying]);
  useEffect(() => () => clearTimeout(controlsTimerRef.current), []);

  // ── Playback handlers ─────────────────────────────────────────────────────
  const getCurrentTime = useCallback(() => {
    if (isLocalMode) return nativeVideoRef.current?.currentTime || 0;
    return reactPlayerRef.current?.getCurrentTime() || 0;
  }, [isLocalMode]);

  const seekTo = useCallback((t) => {
    if (isLocalMode) { if (nativeVideoRef.current) nativeVideoRef.current.currentTime = t; }
    else reactPlayerRef.current?.seekTo(t, 'seconds');
  }, [isLocalMode]);

  const handlePlay = useCallback(() => {
    if (!canControl) return;
    suppressSyncRef.current = true;
    setLocalPlaying(true);
    updatePlayback({ isPlaying: true });
    if (isLocalMode) nativeVideoRef.current?.play().catch(() => {});
    emitPlay?.(getCurrentTime());
    setTimeout(() => { suppressSyncRef.current = false; }, 400);
  }, [canControl, emitPlay, updatePlayback, isLocalMode, getCurrentTime]);

  const handlePause = useCallback(() => {
    if (!canControl) return;
    suppressSyncRef.current = true;
    setLocalPlaying(false);
    updatePlayback({ isPlaying: false });
    if (isLocalMode) nativeVideoRef.current?.pause();
    emitPause?.(getCurrentTime());
    setTimeout(() => { suppressSyncRef.current = false; }, 400);
  }, [canControl, emitPause, updatePlayback, isLocalMode, getCurrentTime]);

  const handleProgress = useCallback(({ playedSeconds }) => {
    if (!seeking) {
      setLocalTime(playedSeconds);
      if (isHost && Math.abs(playedSeconds - lastEmittedRef.current) > 5) {
        lastEmittedRef.current = playedSeconds;
        updatePlayback({ currentTime: playedSeconds });
      }
    }
  }, [seeking, isHost, updatePlayback]);

  const handleSeekMouseDown = () => setSeeking(true);
  const handleSeekChange    = (e) => setLocalTime(parseFloat(e.target.value));
  const handleSeekMouseUp   = useCallback((e) => {
    setSeeking(false);
    if (!canControl) return;
    const t = parseFloat(e.target.value);
    suppressSyncRef.current = true;
    seekTo(t); setLocalTime(t);
    updatePlayback({ currentTime: t });
    emitSeek?.(t);
    setTimeout(() => { suppressSyncRef.current = false; }, 400);
  }, [canControl, emitSeek, updatePlayback, seekTo]);

  // Touch seek support for mobile
  const handleSeekTouchEnd = useCallback((e) => {
    setSeeking(false);
    if (!canControl) return;
    const t = parseFloat(e.target.value);
    suppressSyncRef.current = true;
    seekTo(t); setLocalTime(t);
    updatePlayback({ currentTime: t });
    emitSeek?.(t);
    setTimeout(() => { suppressSyncRef.current = false; }, 400);
  }, [canControl, emitSeek, updatePlayback, seekTo]);

  const handleVolumeChange = (e) => setVolume(parseFloat(e.target.value));

  const handleSpeedChange = useCallback((speed) => {
    if (!canControl) return;
    updatePlayback({ playbackSpeed: speed });
    emitSpeedChange?.(speed);
    catchupRef.current = false;
    if (isLocalMode && nativeVideoRef.current) nativeVideoRef.current.playbackRate = speed;
  }, [canControl, emitSpeedChange, updatePlayback, isLocalMode]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  const skip = useCallback((secs) => {
    if (!canControl) return;
    const t = Math.max(0, Math.min(getCurrentTime() + secs, duration));
    suppressSyncRef.current = true;
    seekTo(t); setLocalTime(t);
    updatePlayback({ currentTime: t });
    emitSeek?.(t);
    setTimeout(() => { suppressSyncRef.current = false; }, 400);
  }, [canControl, duration, emitSeek, updatePlayback, getCurrentTime, seekTo]);

  const resolvedUrl      = !isLocalMode ? resolveVideoUrl(movieUrl) : null;
  const isDrive          = !isLocalMode && isGoogleDriveUrl(movieUrl || '');
  const isLocalFileMode  = movieUrl?.startsWith('local-file://');
  const localFileName    = isLocalFileMode ? movieUrl.replace('local-file://', '') : null;
  const progressPercent  = duration ? (localTime / duration) * 100 : 0;

  // ── No video placeholder ──────────────────────────────────────────────────
  if (!isLocalMode && !resolvedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
        {isLocalFileMode ? (
          <>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-base font-medium text-gray-300">Load your local file</p>
            <p className="text-sm mt-2 text-gray-500 max-w-xs">
              Use the banner above to load{' '}
              <span className="font-mono text-gray-300 bg-dark-600 px-1 py-0.5 rounded text-xs">{localFileName}</span>
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">📽️</div>
            <p className="text-base font-medium text-gray-400">No video loaded</p>
            <p className="text-sm mt-1 text-gray-500">
              {isHost ? 'Use controls below to load a video.' : 'Waiting for the host…'}
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Shared controls overlay (desktop + mobile) ────────────────────────────
  const controlsOverlay = (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent
        px-3 sm:px-4 pt-8 pb-2 sm:pb-3 transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Progress bar — taller touch target on mobile */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-white text-xs tabular-nums w-9 text-right flex-shrink-0 hidden sm:block">
          {formatTime(localTime)}
        </span>
        <div className="relative flex-1 h-3 sm:h-1.5 group/progress">
          <input
            ref={progressRef}
            type="range" min={0} max={duration || 0} step={0.1} value={localTime}
            onMouseDown={handleSeekMouseDown} onChange={handleSeekChange}
            onMouseUp={handleSeekMouseUp} onTouchEnd={handleSeekTouchEnd}
            onTouchStart={() => setSeeking(true)}
            disabled={!canControl}
            aria-label="Seek video"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10 touch-none"
          />
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-none" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <span className="text-white text-xs tabular-nums w-9 flex-shrink-0 hidden sm:block">
          {formatTime(duration)}
        </span>
      </div>

      {/* Time display on mobile (below bar) */}
      <div className="flex justify-between text-xs text-white/70 px-0.5 mb-2 sm:hidden">
        <span>{formatTime(localTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Buttons row */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Play/Pause */}
        <button onClick={localPlaying ? handlePause : handlePlay} disabled={!canControl}
          className="text-white hover:text-primary-400 disabled:opacity-40 p-1.5 sm:p-1 rounded
                     focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
          aria-label={localPlaying ? 'Pause' : 'Play'}>
          {localPlaying
            ? <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
        </button>

        {/* Skip back 10s */}
        <button onClick={() => skip(-10)} disabled={!canControl}
          className="text-white hover:text-primary-400 disabled:opacity-40 p-1.5 sm:p-1 rounded
                     focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation" aria-label="Back 10s">
          <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>

        {/* Skip forward 10s */}
        <button onClick={() => skip(10)} disabled={!canControl}
          className="text-white hover:text-primary-400 disabled:opacity-40 p-1.5 sm:p-1 rounded
                     focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation" aria-label="Forward 10s">
          <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
          </svg>
        </button>

        {/* Volume — hidden on mobile (use system volume) */}
        <div className="hidden sm:flex items-center gap-1 group/vol">
          <button onClick={() => setMuted(m => !m)}
            className="text-white hover:text-primary-400 p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0
              ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0015 19.73l2 2L18.27 21 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={handleVolumeChange} aria-label="Volume"
            className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-primary-500 h-1 cursor-pointer" />
        </div>

        {/* Speed */}
        {canControl && (
          <select value={playbackSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="bg-dark-800 text-white text-xs border border-white/20 rounded px-1 py-0.5
                       focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer hidden sm:block"
            aria-label="Speed">
            {[0.25,0.5,0.75,1,1.25,1.5,1.75,2].map(s => (
              <option key={s} value={s} className="bg-dark-800">{s}x</option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {/* Fullscreen */}
        <button onClick={handleFullscreen}
          className="text-white hover:text-primary-400 p-1.5 sm:p-1 rounded
                     focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen
            ? <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            : <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
        </button>
      </div>
    </div>
  );

  // ── Local file mode — native <video> with ref callback ───────────────────
  if (isLocalMode) {
    return (
      <div ref={containerRef} className="relative w-full h-full bg-black"
        onMouseMove={resetControlsTimer} onTouchStart={resetControlsTimer}
        onMouseLeave={() => localPlaying && setShowControls(false)}
        onClick={() => { if (canControl) localPlaying ? handlePause() : handlePlay(); }}>

        {/* KEY = localBlobUrl so React fully remounts <video> when URL changes */}
        <video
          key={localBlobUrl}
          ref={setNativeVideo}
          src={localBlobUrl}
          className="w-full h-full object-contain"
          playsInline preload="auto"
          style={{ display: 'block' }}
        />

        <div className="absolute top-3 left-3 bg-black/60 text-green-400 text-xs px-2 py-1 rounded-full
                        flex items-center gap-1 pointer-events-none">
          📂 Local file
        </div>

        {isLocked && !isHost && (
          <div className="absolute top-3 left-3 bg-black/60 text-yellow-400 text-xs px-2 py-1 rounded-full
                          flex items-center gap-1 pointer-events-none">
            🔒 Host controls only
          </div>
        )}

        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-12 w-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {controlsOverlay}
      </div>
    );
  }

  // ── URL mode — ReactPlayer ────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full bg-black"
      onMouseMove={resetControlsTimer} onTouchStart={resetControlsTimer}
      onMouseLeave={() => localPlaying && setShowControls(false)}
      onClick={() => { if (canControl) localPlaying ? handlePause() : handlePlay(); }}>

      <ReactPlayer
        ref={reactPlayerRef}
        url={resolvedUrl}
        playing={localPlaying}
        volume={volume} muted={muted}
        playbackRate={catchupRef.current ? CATCHUP_RATE : (playbackSpeed || 1)}
        width="100%" height="100%"
        onPlay={() => { setLocalPlaying(true); setBuffering(false); }}
        onPause={() => setLocalPlaying(false)}
        onDuration={setDuration}
        onProgress={handleProgress}
        onBuffer={() => setBuffering(true)}
        onBufferEnd={() => setBuffering(false)}
        onReady={() => { if (currentTime > 0) reactPlayerRef.current?.seekTo(currentTime, 'seconds'); }}
        style={{ pointerEvents: 'none' }}
        config={{ file: { attributes: { crossOrigin: 'anonymous' }, forceVideo: true } }}
      />

      {isDrive && (
        <div className="absolute top-3 right-3 bg-black/70 text-yellow-300 text-xs px-3 py-1.5
                        rounded-lg pointer-events-none flex items-center gap-1.5 max-w-[200px]">
          📂 <span>Google Drive — set sharing to <strong>Anyone with link</strong></span>
        </div>
      )}

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-12 w-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {isLocked && !isHost && (
        <div className="absolute top-3 left-3 bg-black/60 text-yellow-400 text-xs px-2 py-1
                        rounded-full flex items-center gap-1 pointer-events-none">
          🔒 Host controls only
        </div>
      )}

      {movieTitle && movieTitle !== 'Untitled' && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs
          px-3 py-1 rounded-full pointer-events-none transition-opacity duration-300
          ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {movieTitle}
        </div>
      )}

      {controlsOverlay}
    </div>
  );
};

export default VideoPlayer;
