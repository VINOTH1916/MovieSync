import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, uploadMovie } from '../services/roomService';
import { isGoogleDriveUrl } from '../utils/videoUrl';
import Navbar from '../components/layout/Navbar';

const CreateRoomPage = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    roomName: '',
    isPrivate: false,
    password: '',
    movieSource: 'url', // 'url' | 'upload'
    movieUrl: '',
    movieTitle: '',
  });
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!form.movieTitle) setForm((p) => ({ ...p, movieTitle: f.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.roomName.trim()) { setError('Room name is required.'); return; }
    if (form.isPrivate && !form.password.trim()) { setError('Password is required for private rooms.'); return; }
    if (form.movieSource === 'url' && form.movieUrl && !/^https?:\/\/.+/.test(form.movieUrl)) {
      setError('Please enter a valid video URL (must start with http:// or https://).');
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom({
        roomName: form.roomName.trim(),
        isPrivate: form.isPrivate,
        password: form.isPrivate ? form.password : '',
        movieUrl: form.movieSource === 'url' ? form.movieUrl : '',
        movieTitle: form.movieTitle.trim() || 'Untitled',
      });

      // Upload file after room creation if needed
      if (form.movieSource === 'upload' && file) {
        await uploadMovie(room.roomId, file, form.movieTitle || file.name, setUploadProgress);
      }

      navigate(`/room/${room.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🎬 Create a Room</h1>
          <p className="text-gray-400 text-sm mt-1">Set up your watch party and invite friends.</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Details */}
          <section className="card space-y-4">
            <h2 className="text-base font-semibold text-white">Room Details</h2>

            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-1">
                Room Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="roomName"
                name="roomName"
                type="text"
                required
                maxLength={60}
                value={form.roomName}
                onChange={handleChange}
                placeholder="Friday Movie Night"
                className="input-field"
              />
            </div>

            {/* Private room toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isPrivate}
                onClick={() => setForm((p) => ({ ...p, isPrivate: !p.isPrivate }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  form.isPrivate ? 'bg-primary-600' : 'bg-dark-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-300">Private room</span>
            </div>

            {form.isPrivate && (
              <div className="animate-fade-in">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Room Password <span aria-hidden="true">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Set a password for your room"
                  className="input-field"
                />
              </div>
            )}
          </section>

          {/* Video Source */}
          <section className="card space-y-4">
            <h2 className="text-base font-semibold text-white">Video Source</h2>

            {/* Source selector */}
            <div className="flex rounded-lg overflow-hidden border border-dark-400">
              {['url', 'upload'].map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, movieSource: src }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                    form.movieSource === src
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-600 text-gray-400 hover:text-white'
                  }`}
                  aria-pressed={form.movieSource === src}
                >
                  {src === 'url' ? '🔗 Video URL' : '📁 Upload File'}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="movieTitle" className="block text-sm font-medium text-gray-300 mb-1">
                Movie / Video Title
              </label>
              <input
                id="movieTitle"
                name="movieTitle"
                type="text"
                value={form.movieTitle}
                onChange={handleChange}
                placeholder="Optional — leave blank to use filename"
                className="input-field"
              />
            </div>

            {form.movieSource === 'url' ? (
              <div>
                <label htmlFor="movieUrl" className="block text-sm font-medium text-gray-300 mb-1">
                  Direct Video URL
                </label>
                <input
                  id="movieUrl"
                  name="movieUrl"
                  type="url"
                  value={form.movieUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/video.mp4  or  Google Drive link"
                  className="input-field"
                />
                {isGoogleDriveUrl(form.movieUrl) ? (
                  <p className="text-xs text-green-400 mt-1">✓ Google Drive link detected — will play automatically.</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Supports mp4, webm, ogg, Google Drive share links and more.</p>
                )}
              </div>
            ) : (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="videoFile"
                  aria-label="Upload video file"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-dark-400 hover:border-primary-500 rounded-lg p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {file ? (
                    <div>
                      <p className="text-green-400 font-medium">✓ {file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl mb-2">📁</p>
                      <p className="text-gray-400 text-sm">Click to select a video file</p>
                      <p className="text-xs text-gray-600 mt-1">mp4, mkv, webm, avi, mov — up to 2 GB</p>
                    </div>
                  )}
                </button>

                {loading && uploadProgress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Uploading…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-dark-400 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                        role="progressbar"
                        aria-valuenow={uploadProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-3"
            >
              {loading ? 'Creating…' : '🎬 Create Room'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateRoomPage;
