import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '../context/AuthContext';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function RoomPage() {
  const { roomId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});

  const [peers, setPeers] = useState([]);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        socketRef.current = io(SERVER_URL, { auth: { token } });

        socketRef.current.on('connect', () => {
          socketRef.current.emit('join_room', { roomId, userId: user._id, username: user.username });
        });

        socketRef.current.on('existing_users', (users) => {
          users.forEach(({ socketId, username }) => {
            const peer = createPeer(socketId, stream);
            peersRef.current[socketId] = { peer, username };
            setPeers(prev => [...prev, { socketId, peer, username }]);
          });
        });

        socketRef.current.on('user_joined', ({ socketId, username }) => {
          const peer = addPeer(socketId, stream);
          peersRef.current[socketId] = { peer, username };
          setPeers(prev => [...prev, { socketId, peer, username }]);
        });

        socketRef.current.on('offer', ({ offer, from, username }) => {
          const peer = peersRef.current[from];
          if (peer) peer.peer.signal(offer);
        });

        socketRef.current.on('answer', ({ answer, from }) => {
          const peer = peersRef.current[from];
          if (peer) peer.peer.signal(answer);
        });

        socketRef.current.on('ice_candidate', ({ candidate, from }) => {
          const peer = peersRef.current[from];
          if (peer) peer.peer.signal(candidate);
        });

        socketRef.current.on('user_left', ({ socketId, username }) => {
          if (peersRef.current[socketId]) {
            peersRef.current[socketId].peer.destroy();
            delete peersRef.current[socketId];
          }
          setPeers(prev => prev.filter(p => p.socketId !== socketId));
          setMessages(prev => [...prev, { system: true, text: `${username} left the call` }]);
        });

        socketRef.current.on('room_users', setRoomUsers);

        socketRef.current.on('chat_message', (msg) => {
          setMessages(prev => [...prev, msg]);
        });

      } catch (err) {
        alert('Camera/mic access denied. Please allow permissions.');
        navigate('/');
      }
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(({ peer }) => peer.destroy());
      socketRef.current?.disconnect();
    };
  }, [roomId, user, token, navigate]);

  const createPeer = (targetId, stream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', offer => {
      socketRef.current.emit('offer', { offer, to: targetId });
    });
    return peer;
  };

  const addPeer = (callerId, stream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', answer => {
      socketRef.current.emit('answer', { answer, to: callerId });
    });
    return peer;
  };

  const toggleAudio = () => {
    const enabled = !audioOn;
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = enabled);
    setAudioOn(enabled);
    socketRef.current?.emit('media_state', { roomId, audio: enabled, video: videoOn });
  };

  const toggleVideo = () => {
    const enabled = !videoOn;
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = enabled);
    setVideoOn(enabled);
    socketRef.current?.emit('media_state', { roomId, video: enabled, audio: audioOn });
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(({ peer }) => {
        const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      socketRef.current?.emit('screen_share_started', { roomId });
      screenTrack.onended = () => {
        Object.values(peersRef.current).forEach(({ peer }) => {
          const sender = peer._pc?.getSenders().find(s => s.track?.kind === 'video');
          const videoTrack = localStreamRef.current?.getVideoTracks()[0];
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        socketRef.current?.emit('screen_share_stopped', { roomId });
      };
    } catch {}
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socketRef.current?.emit('chat_message', { roomId, message: msgInput, username: user.username });
    setMsgInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endCall = () => {
    navigate('/');
  };

  const totalUsers = peers.length + 1;

  return (
    <div className="room-page">
      <div className="room-header">
        <div className="room-info">
          <h3>📹 FlashMeet</h3>
          <span>{totalUsers} participant{totalUsers !== 1 ? 's' : ''}</span>
        </div>
        <div className="room-id-badge" onClick={copyRoomId}>
          🔗 {roomId} — Click to copy
        </div>
      </div>

      <div className="room-body">
        <div className="videos-area">
          {peers.length === 0 ? (
            <div className="waiting-msg">
              <div className="big-icon">📹</div>
              <h3>Waiting for others...</h3>
              <p>Share your room code to invite people</p>
              <div className="room-link" onClick={copyRoomId}>🔗 Room Code: {roomId}</div>
              <div style={{marginTop: 16, width: '100%', maxWidth: 500}}>
                <video ref={localVideoRef} autoPlay muted playsInline
                  style={{width:'100%', borderRadius:12, background:'#13131a', minHeight:200}} />
              </div>
            </div>
          ) : (
            <>
              <div className={`video-tile ${peers.length === 0 ? 'single' : ''}`}>
                <video ref={localVideoRef} autoPlay muted playsInline />
                <div className="tile-name">You {!audioOn && '🔇'}</div>
                {!audioOn && <div className="muted-icon">🔇</div>}
              </div>
              {peers.map(({ socketId, peer, username }) => (
                <PeerVideo key={socketId} peer={peer} username={username} />
              ))}
            </>
          )}
        </div>

        {chatOpen && (
          <div className="chat-panel">
            <h4>💬 Chat</h4>
            <div className="chat-messages">
              {messages.map((msg, i) => (
                msg.system
                  ? <div key={i} style={{textAlign:'center', fontSize:12, color:'#555'}}>{msg.text}</div>
                  : <div key={i} className="chat-msg">
                      <div className="msg-user">{msg.username}</div>
                      <div className="msg-text">{msg.message}</div>
                      <div className="msg-time">{msg.time}</div>
                    </div>
              ))}
            </div>
            <div className="chat-input-area">
              <input className="chat-input" placeholder="Message..." value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button className="chat-send" onClick={sendMessage}>➤</button>
            </div>
          </div>
        )}
      </div>

      <div className="room-controls">
        <button className={`ctrl-btn ${!audioOn ? 'off' : ''}`} onClick={toggleAudio} title={audioOn ? 'Mute' : 'Unmute'}>
          {audioOn ? '🎤' : '🔇'}
        </button>
        <button className={`ctrl-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo} title={videoOn ? 'Stop Video' : 'Start Video'}>
          {videoOn ? '📷' : '🚫'}
        </button>
        <button className="ctrl-btn" onClick={shareScreen} title="Share Screen">🖥️</button>
        <button className="ctrl-btn" onClick={() => setChatOpen(!chatOpen)} title="Toggle Chat">💬</button>
        <button className="ctrl-btn end" onClick={endCall} title="End Call">📵</button>
      </div>

      {copied && <div className="copied-toast">✅ Room code copied!</div>}
    </div>
  );
}

function PeerVideo({ peer, username }) {
  const videoRef = useRef(null);

  useEffect(() => {
    peer.on('stream', stream => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    });
  }, [peer]);

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline />
      <div className="tile-name">{username}</div>
    </div>
  );
}
