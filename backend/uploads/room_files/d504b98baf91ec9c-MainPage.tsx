import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

// Lazy-loaded FileItem component
const FileItem = lazy(() => import('../FileItem'));

interface Room {
  id: string;
  mostUsedLanguage?: string;
  dateTime: string;
  files: string[];
}

interface User {
  name: string;
  email: string;
  profilePic?: string;
}

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User>({ name: 'User', email: '' });
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            name: userData.name || 'User',
            email: userData.email || '',
            profilePic: userData.profilePic,
          });
        } else {
          throw new Error('Invalid token');
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    fetchUserProfile();
    fetchRoomHistory(1);
  }, [navigate]);

  const fetchRoomHistory = async (pageNum: number) => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/rooms?page=${pageNum}&limit=6`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch rooms');
      }

      const data = await response.json();
      const sanitizedRooms = data.rooms.map((room: any) => ({
        id: room.id || 'unknown',
        mostUsedLanguage: room.mostUsedLanguage || undefined,
        dateTime: room.dateTime || new Date().toISOString().split('T')[0],
        files: Array.isArray(room.files) ? room.files : [],
      }));

      if (pageNum === 1) {
        setRooms(sanitizedRooms);
      } else {
        setRooms((prev) => [...prev, ...sanitizedRooms]);
      }
      setHasMore(data.page * data.limit < data.total);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
      setError(err.message || 'Failed to load rooms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mostUsedLanguage: 'JavaScript', // Default language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create room');
      }

      const data = await response.json();
      navigate(`/room/${data.room.id}`);
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join room');
      }

      navigate(`/room/${roomId}`);
    } catch (err: any) {
      console.error('Failed to join room:', err);
      setError(err.message || 'Failed to join room. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleRoomClick = (roomId: string) => {
    handleJoinRoom(roomId);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchRoomHistory(page + 1);
    }
  };

  const handleJoinRoomById = () => {
    if (roomIdToJoin.trim()) {
      handleJoinRoom(roomIdToJoin.trim());
    } else {
      setError('Please enter a room ID.');
    }
  };

  return (
    <div className="main-container">
      <header className="header">
        <div className="logo">Code Crib</div>
        <div className="nav-buttons">
          <button 
            className="btn-create" 
            onClick={handleCreateRoom}
            disabled={isCreatingRoom}
          >
            {isCreatingRoom ? 'Creating...' : 'Create a room'}
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="error-message">{error}</p>}

      <div className="user-profile">
        <div className="profile-pic">
          {user.profilePic ? (
            <img src={`http://localhost:5000${user.profilePic}`} alt="Profile" className="profile-img" />
          ) : (
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          )}
        </div>
        <div className="user-name">{user.name}</div>
      </div>

      <div className="join-room-container">
        <h3>Join Room</h3>
        <input
          type="text"
          className="join-room-input"
          placeholder="Enter Room ID"
          value={roomIdToJoin}
          onChange={(e) => setRoomIdToJoin(e.target.value)}
        />
        <button
          className="join-room-btn"
          onClick={handleJoinRoomById}
          disabled={!roomIdToJoin.trim()}
        >
          Join
        </button>
      </div>

      {rooms.length === 0 && !isLoading ? (
        <div className="no-rooms-container">
          <div className="no-rooms">
            <p>No rooms created yet.</p>
            <button 
              className="btn-create-room-first" 
              onClick={handleCreateRoom}
              disabled={isCreatingRoom}
            >
              {isCreatingRoom ? 'Creating...' : 'Create Your First Room'}
            </button>
          </div>
        </div>
      ) : (
        <div className="room-grid-masonry">
          {rooms.map((room, index) => (
            <div
              key={`${room.id}-${index}`}
              className={`room-card room-card-files-${Math.min(room.files.length, 5)}`}
              onClick={() => handleRoomClick(room.id)}
            >
              
              <div className="room-content">
                {room.mostUsedLanguage && (
                  <div className="most-used-language">
                    Most used language
                    <div className="language-name">{room.mostUsedLanguage}</div>
                  </div>
                )}

                <div className="date-time">
                  Date<br />
                  time
                  <div className="date-value">{room.dateTime}</div>
                </div>
              </div>

              <div className="file-list">
                <Suspense fallback={<div className="file-loading">Loading files...</div>}>
                  {room.files.length > 0 ? (
                    room.files.slice(0, 5).map((file, fileIndex) => (
                      <FileItem key={fileIndex} fileName={file} />
                    ))
                  ) : (
                    <div className="no-files">No files in this room</div>
                  )}
                </Suspense>
              </div>
            </div>
          ))}
        </div>
      )}

      {rooms.length > 0 && hasMore && (
        <div className="load-more-container global-load-more">
          <button
            className="load-more-btn"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MainPage;