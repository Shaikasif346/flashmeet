import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);

  const createRoom = async () => {
    if (!roomName.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('/api/rooms/create', { name: roomName });
      navigate(`/room/${res.data.roomId}`);
    } catch {
      alert('Error creating room');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = () => {
    if (!joinId.trim()) return;
    navigate(`/room/${joinId.toUpperCase()}`);
  };

  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="nav-logo">📹 FlashMeet</div>
        <div className="nav-user">
          <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span style={{fontSize: '14px'}}>{user?.username}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="home-content">
        <h1>Video calls made <span>simple</span></h1>
        <p>Create a room and share the link — start meeting in seconds</p>

        <div className="room-actions">
          <div className="create-room-card">
            <h3>🎥 New Meeting</h3>
            <p>Create a room and invite others</p>
            <input className="room-input" placeholder="Meeting name..." value={roomName} onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()} />
            <button className="btn-create" onClick={createRoom} disabled={creating}>
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="join-room-card">
            <h3>🔗 Join Meeting</h3>
            <p>Enter a room code to join</p>
            <input className="room-input" placeholder="Enter room code..." value={joinId} onChange={e => setJoinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinRoom()} />
            <button className="btn-join" onClick={joinRoom}>Join Room</button>
          </div>
        </div>

        <div className="features">
          <div className="feature"><div className="feature-icon">🎥</div><p>HD Video</p></div>
          <div className="feature"><div className="feature-icon">🎤</div><p>Clear Audio</p></div>
          <div className="feature"><div className="feature-icon">💬</div><p>In-call Chat</p></div>
          <div className="feature"><div className="feature-icon">🖥️</div><p>Screen Share</p></div>
        </div>
      </div>
    </div>
  );
}
