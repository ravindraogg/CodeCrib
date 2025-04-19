import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  const handleCreateRoom = async () => {
    // In a real app, we'd make an API call to create a room
    // For now, we'll generate a random ID
    const newRoomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${newRoomId}`);
  };

  return (
    <div className="home-container">
      <div className="card">
        <div className="header">
          <h1>CodeCrib</h1>
          <p>Real-time collaborative coding platform</p>
        </div>

        <div className="content">
          {isCreating ? (
            <div className="create-room">
              <h2>Create a New Room</h2>
              <button 
                onClick={handleCreateRoom} 
                className="primary-button"
              >
                Create Room
              </button>
              <button 
                onClick={() => setIsCreating(false)} 
                className="secondary-button"
              >
                Back to Join
              </button>
            </div>
          ) : (
            <div className="join-room">
              <h2>Join an Existing Room</h2>
              <form onSubmit={handleJoinRoom}>
                <div className="form-group">
                  <label htmlFor="roomId">Room ID</label>
                  <input
                    type="text"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    required
                  />
                </div>
                <button type="submit" className="primary-button">
                  Join Room
                </button>
              </form>
              <div className="divider">
                <span>or</span>
              </div>
              <button 
                onClick={() => setIsCreating(true)} 
                className="secondary-button"
              >
                Create a New Room
              </button>
            </div>
          )}
        </div>

        <div className="footer">
          <p>
            <a href="/login">Sign in</a> to access your saved rooms
          </p>
        </div>
      </div>
      
      <div className="features">
        <h3>Key Features</h3>
        <ul>
          <li>🔒 Private coding rooms</li>
          <li>📂 Code file sharing (up to 10MB)</li>
          <li>⚡ Real-time collaboration</li>
          <li>🧠 Session memory for continuous work</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;