import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadMovie, updateRoom } from '../../services/roomService';
import Modal from '../ui/Modal';
import { isValidVideoUrl, isGoogleDriveUrl } from '../../utils/videoUrl';

const RoomControls = ({
  roomId, room, setRoom, isHost, members,
  emitChangeMovie, emitToggleLock, emitEndSession,
  emitLocalFileAnnounce, onLocalFileLoaded,
}) => {
  const navigate     = useNavigate();
  const fileRef      = useRef(null);
  const localFileRef = useRef(null);

  const [showUrlModal,    setShowUrlModal]    = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEndModal,    setShowEndModal]    = useState(false);

  const [urlInput,        setUrlInput]        = useState('');
  const [titleInput,      setTitleInput]      = useState('');
  const [file,            setFile]            = useState(null);
  const [uploadTitle,     setUploadTitle]     = useState('');
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploading,       setUploading]       = useState(false);
  const [error,           setError]           = useState('');

  const isLocked = room?.isLocked || false;

  const handleLocalFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    emitLocalFileAnnounce?.(f.name);
    onLocalFileLoaded?.(f);
    e.target.value = '';
  };

  const handleSetUrl = () => {
    setError('');
    const url = urlInput.trim();
    if (!url) { setError('Please enter a video URL.'); return; }
    if (!isValidVideoUrl(url)) { setError('Please enter a valid URL or Google Drive link.'); return; }
    emitChangeMovie?.(url, titleInput.trim() || 'Untitled');
    setShowUrlModal(false); setUrlInput(''); setTitleInput('');
  };

  const handleFileUpload = async () => {
    if (!file) { setError('Please select a video file.'); return; }
    setError(''); setUploading(true); setUploadProgress(0);
    try {
      const result = await uploadMovie(roomId, file, uploadTitle || file.name, setUploadProgress);
      emitChangeMovie?.(result.movieUrl, result.movieTitle);
      setShowUploadModal(false); setFile(null); setUploadTitle('');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleLock = async () => {
    const newLocked = !isLocked;
    emitToggleLock?.(newLocked);
    setRoom(prev => prev ? { ...prev, isLocked: newLocked } : prev);
    try { await updateRoom(roomId, { isLocked: newLocked }); }
    catch { setRoom(prev => prev ? { ...prev, isLocked: isLocked } : prev); }
  };

  const handleEndSession = () => { emitEndSession?.(); navigate('/'); };
  const handleCopyInvite = () => navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);

  if (!isHost) return null;

  // Shared button class
  const btn = 'flex items-center gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 whitespace-nowrap flex-shrink-0 touch-manipulation';

  return (
    <>
      {/* Scrollable strip — works on mobile */}
      <div className="bg-dark-800 border-t border-dark-600 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs text-gray-500 font-medium hidden sm:block">Host:</span>

          {/* Local File */}
          <input ref={localFileRef} type="file" accept="video/*" className="hidden" onChange={handleLocalFileChange} />
          <button onClick={() => localFileRef.current?.click()}
            className={`${btn} bg-green-800/40 hover:bg-green-700/50 text-green-300`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
            Local File
          </button>

          {/* Set URL */}
          <button onClick={() => { setShowUrlModal(true); setError(''); }}
            className={`${btn} bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            Set URL
          </button>

          {/* Upload */}
          <button onClick={() => { setShowUploadModal(true); setError(''); setFile(null); setUploadProgress(0); }}
            className={`${btn} bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload
          </button>

          {/* Lock */}
          <button onClick={handleToggleLock} aria-pressed={isLocked}
            className={`${btn} ${isLocked ? 'bg-yellow-600/30 text-yellow-400' : 'bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isLocked
                ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}/>
            </svg>
            {isLocked ? 'Locked' : 'Lock'}
          </button>

          {/* Invite */}
          <button onClick={handleCopyInvite}
            className={`${btn} bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
            Invite
          </button>

          {/* End Session */}
          <button onClick={() => setShowEndModal(true)}
            className={`${btn} bg-red-900/30 hover:bg-red-900/60 text-red-400 hover:text-red-300`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            End
          </button>
        </div>
      </div>

      {/* Set URL Modal */}
      <Modal isOpen={showUrlModal} onClose={() => setShowUrlModal(false)} title="🔗 Set Video URL">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-300 mb-1">Video URL</label>
            <input id="videoUrl" type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/video.mp4  or  Google Drive link"
              className="input-field" autoFocus onKeyDown={e => e.key === 'Enter' && handleSetUrl()} />
            {isGoogleDriveUrl(urlInput)
              ? <p className="text-xs text-green-400 mt-1">✓ Google Drive detected — will be converted automatically.</p>
              : <p className="text-xs text-gray-500 mt-1">Supports mp4/webm, Google Drive, YouTube, Vimeo.</p>}
          </div>
          <div>
            <label htmlFor="videoTitle" className="block text-sm font-medium text-gray-300 mb-1">Title (optional)</label>
            <input id="videoTitle" type="text" value={titleInput} onChange={e => setTitleInput(e.target.value)}
              placeholder="Movie name…" className="input-field" onKeyDown={e => e.key === 'Enter' && handleSetUrl()} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowUrlModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSetUrl} className="btn-primary flex-1">Set Video</button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => !uploading && setShowUploadModal(false)} title="📁 Upload Video">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>}
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setUploadTitle(f.name.replace(/\.[^/.]+$/, '')); } }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-dark-400 hover:border-primary-500 rounded-xl p-5 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation">
            {file ? (
              <><p className="text-green-400 font-medium text-sm">✓ {file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size/1024/1024).toFixed(1)} MB</p></>
            ) : (
              <><p className="text-2xl mb-1">📁</p>
                <p className="text-gray-400 text-sm">Tap to select a video file</p>
                <p className="text-xs text-gray-600 mt-0.5">mp4, mkv, webm, avi, mov — up to 2 GB</p></>
            )}
          </button>
          {file && (
            <div>
              <label htmlFor="uploadTitle" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input id="uploadTitle" type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                placeholder="Movie name…" className="input-field" disabled={uploading} />
            </div>
          )}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Uploading…</span><span>{uploadProgress}%</span></div>
              <div className="w-full bg-dark-400 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}
                  role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100} />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => { if (!uploading) { setShowUploadModal(false); setFile(null); } }}
              disabled={uploading} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleFileUpload} disabled={!file || uploading} className="btn-primary flex-1">
              {uploading ? 'Uploading…' : 'Upload & Play'}
            </button>
          </div>
        </div>
      </Modal>

      {/* End Session Modal */}
      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="End Session">
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">This will disconnect all members and close the room.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowEndModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleEndSession} className="btn-danger flex-1">End Session</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RoomControls;
