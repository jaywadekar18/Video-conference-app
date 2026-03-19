import { useState } from 'react';
import './App.css';
import { VideoRoom } from './components/VideoRoom';

function App() {
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      setJoinedRoom(roomId.trim());
    }
  };

  return (
    <div className="App">
      {joinedRoom ? (
        <VideoRoom roomId={joinedRoom} onLeave={() => setJoinedRoom(null)} />
      ) : (
        <div className="join-container">
          <div className="brand">
            <h1>Video Conference</h1>
            <p className="subtitle">Connect seamlessly with anyone, anywhere.</p>
          </div>
          
          <form className="join-form" onSubmit={handleJoin}>
            <div className="input-group">
              <label htmlFor="roomId">Enter a Code or Link</label>
              <input
                id="roomId"
                type="text"
                placeholder="e.g. daily-sync-123"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="room-input"
                required
              />
            </div>
            <button type="submit" className="join-btn">
              Join Meeting
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

export default App;