import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RoomProvider } from './context/RoomContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import WatchRoomPage from './pages/WatchRoomPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullscreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullscreen />;
  return !user ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Private */}
    <Route path="/"           element={<PrivateRoute><HomePage /></PrivateRoute>} />
    <Route path="/create-room" element={<PrivateRoute><CreateRoomPage /></PrivateRoute>} />
    <Route path="/join"        element={<PrivateRoute><JoinRoomPage /></PrivateRoute>} />
    <Route path="/room/:roomId" element={
      <PrivateRoute>
        <RoomProvider>
          <WatchRoomPage />
        </RoomProvider>
      </PrivateRoute>
    } />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
