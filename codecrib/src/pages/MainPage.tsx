import React, { useEffect, useState, Suspense, useRef, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MainPage.css';
import FileItem from '../FileItem';
import io from 'socket.io-client';

const base = import.meta.env.VITE_API_ENDPOINT;

interface File {
  fileId: string;
  name: string;
  ext: string;
  lines: number;
  read: boolean;
}

interface Room {
  id: string;
  mostUsedLanguage?: string;
  dateTime: string;
  files: File[];
}

interface User {
  name: string;
  email: string;
  profilePicId?: string;
}

interface FileExtensionCount {
  [key: string]: number;
}

interface RoomCardProps {
  room: Room;
  index: number;
  loadedFiles: File[];
  isLoading: boolean;
  isRoomLoading: boolean;
  handleRoomClick: (roomId: string) => void;
  loadMoreFiles: (roomId: string, e: React.MouseEvent) => void;
  formatFileName: (file: File) => string;
  formatDateTime: (dateTimeString: string) => { date: string, time: string };
}

const RoomCard = memo(({ room, index, loadedFiles, isLoading, isRoomLoading, handleRoomClick, loadMoreFiles, formatFileName, formatDateTime }: RoomCardProps) => {
  if (isRoomLoading) {
    return <div className="room-card-loading"></div>;
  }

  const currentFiles = loadedFiles || room.files.slice(0, 5);
  const remainingFiles = room.files.slice(currentFiles.length);
  const { date, time } = formatDateTime(room.dateTime);

  return (
    <div
      key={`${room.id}-${index}`}
      className="room-card"
      onClick={() => handleRoomClick(room.id)}
    >
      <div className="room-header">
        <div className="room-id">Room ID <span className="room-id-value">{room.id}</span></div>
      </div>
      <div className="room-content">
        {room.mostUsedLanguage && (
          <div className="most-used-language">
            Most used language
            <div className="language-name">{room.mostUsedLanguage}</div>
          </div>
        )}
        <div className="date-time">
          Date
          <div className="date-value">
            {date}
            <span className="formatted-time">{time}</span>
          </div>
        </div>
      </div>
      <div className="file-list">
        <Suspense fallback={<div className="file-loading">Loading files...</div>}>
          {currentFiles.length > 0 ? (
            currentFiles.map((file, fileIndex) => (
              <div key={file.fileId || `${file.name}-${fileIndex}`} className="file-item">
                <FileItem fileName={formatFileName(file)} />
              </div>
            ))
          ) : (
            <div className="no-files">No files in this room</div>
          )}
        </Suspense>
      </div>
      {remainingFiles.length > 0 && (
        <div className="load-more-container">
          <button
            className="load-more-btn file-load-more"
            onClick={(e) => loadMoreFiles(room.id, e)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : `Load more (${remainingFiles.length})`}
          </button>
        </div>
      )}
    </div>
  );
});

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User>({ name: 'User', email: '' });
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<Record<string, File[]>>({});
  const [roomLoadingStatus, setRoomLoadingStatus] = useState<Record<string, boolean>>({});
  const [visibleRoomCount, setVisibleRoomCount] = useState(9);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Initialize socket connection
    socketRef.current = io(`${base}`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect_error', (error: { message: any }) => {
      console.error('Socket connection error:', error.message);
    });

    // Fetch user profile and join all rooms
    const fetchUserProfileAndJoinRooms = async () => {
      try {
        const response = await fetch(`${base}/api/profile`, {
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
            profilePicId: userData.profilePicId,
          });

          // Fetch rooms to join their socket rooms
          const roomsResponse = await fetch(`${base}/api/rooms?page=1&limit=100`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (roomsResponse.ok) {
            const roomsData = await roomsResponse.json();
            roomsData.rooms.forEach((room: any) => {
              socketRef.current.emit('joinRoom', {
                roomId: room.id,
                userId: userData._id,
                userName: userData.name,
              });
            });
          }
        } else {
          throw new Error('Invalid token');
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    fetchUserProfileAndJoinRooms();
    fetchRoomHistory(1);

    // Listen for new file uploads
    socketRef.current.on('newFile', (file: File & { roomId: string }) => {
      console.log('New file received via socket:', file);
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room.id === file.roomId) {
            const updatedFiles = [...room.files, { ...file, read: false }];
            const mostUsedLanguage = determineMostUsedLanguage(updatedFiles);
            return { ...room, files: updatedFiles, mostUsedLanguage };
          }
          return room;
        })
      );
      setLoadedFiles((prev) => {
        const roomFiles = prev[file.roomId] || [];
        const updatedRoomFiles = [...roomFiles, { ...file, read: false }];
        return { ...prev, [file.roomId]: updatedRoomFiles };
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchRoomHistory(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [page, hasMore, isLoading]);

  const fetchRoomHistory = async (pageNum: number) => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${base}/api/rooms?page=${pageNum}&limit=6`, {
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

      const sanitizedRooms = data.rooms.map((room: any) => {
        setRoomLoadingStatus((prev) => ({ ...prev, [room.id]: true }));
        const files = Array.isArray(room.files) ? room.files : [];
        const fileDetails = files.map((file: any) => ({
          fileId: file.fileId,
          name: file.name || 'Unknown',
          ext: file.ext || '',
          lines: file.lines || 0,
          read: file.read || false,
        }));
        const mostUsedLanguage = determineMostUsedLanguage(fileDetails);
        setRoomLoadingStatus((prev) => ({ ...prev, [room.id]: false }));
        return {
          id: room.id || 'unknown',
          mostUsedLanguage: mostUsedLanguage || 'None',
          dateTime: room.dateTime || new Date().toISOString().split('T')[0],
          files: fileDetails,
        };
      });

      if (pageNum === 1) {
        setRooms(sanitizedRooms);
        setLoadedFiles(
          sanitizedRooms.reduce((acc: any, room: Room) => ({
            ...acc,
            [room.id]: room.files.slice(0, 5),
          }), {})
        );
      } else {
        setRooms((prev) => [...prev, ...sanitizedRooms]);
        setLoadedFiles((prev) => ({
          ...prev,
          ...sanitizedRooms.reduce((acc: any, room: Room) => ({
            ...acc,
            [room.id]: room.files.slice(0, 5),
          }), {}),
        }));
      }
      setHasMore(data.page * data.limit < data.total);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
      setError('Failed to load rooms. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreFiles = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      const currentFiles = loadedFiles[roomId] || [];
      const remainingFiles = room.files.slice(currentFiles.length);
      if (remainingFiles.length > 0) {
        const newFiles = remainingFiles.slice(0, Math.min(5, remainingFiles.length));
        setLoadedFiles((prev) => ({
          ...prev,
          [roomId]: [...currentFiles, ...newFiles],
        }));
      }
    }
  };

  const loadMoreRooms = () => {
    setIsLoadingMore(true);
    setVisibleRoomCount((prev) => prev + 6);
    setIsLoadingMore(false);
  };

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${base}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mostUsedLanguage: 'JavaScript',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create room');
      }

      const data = await response.json();
      setRooms((prev) => [
        {
          id: data.room.id,
          mostUsedLanguage: 'JavaScript',
          dateTime: new Date().toISOString(),
          files: [],
        },
        ...prev,
      ]);
      navigate(`/room/${data.room.id}`);
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError('Unable to create room. Please try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${base}/api/rooms/${roomId}/join`, {
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
      setError('Unable to join room. Please check the room ID and try again.');
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleRoomClick = (roomId: string) => {
    handleJoinRoom(roomId);
  };

  const handleJoinRoomById = () => {
    if (roomIdToJoin.trim()) {
      handleJoinRoom(roomIdToJoin.trim());
    } else {
      setError('Please enter a valid room ID.');
    }
  };

  const handleRefresh = () => {
    setRooms([]);
    setLoadedFiles({});
    setPage(1);
    setHasMore(true);
    fetchRoomHistory(1);
  };

  const determineMostUsedLanguage = (files: File[]): string => {
    const extensionCounts: FileExtensionCount = {};

    files.forEach((file) => {
      const extension = file.ext.toLowerCase();
      let language = 'Other';
      switch (extension) {
        case 'js':
          language = 'JavaScript';
          break;
        case 'ts':
        case 'tsx':
          language = 'TypeScript';
          break;
        case 'py':
          language = 'Python';
          break;
        case 'java':
          language = 'Java';
          break;
        case 'c':
        case 'cpp':
        case 'h':
          language = 'C/C++';
          break;
        case 'html':
          language = 'HTML';
          break;
        case 'css':
          language = 'CSS';
          break;
        case 'php':
          language = 'PHP';
          break;
        case 'rb':
          language = 'Ruby';
          break;
        case 'go':
          language = 'Go';
          break;
        case 'rs':
          language = 'Rust';
          break;
        case 'swift':
          language = 'Swift';
          break;
        case 'kt':
          language = 'Kotlin';
          break;
        case 'pdf':
          language = 'PDF';
          break;
        case 'doc':
        case 'docx':
          language = 'Word';
          break;
        case 'xls':
        case 'xlsx':
          language = 'Excel';
          break;
        case 'zip':
          language = 'Archive';
          break;
        default:
          language = 'Other';
      }

      extensionCounts[language] = (extensionCounts[language] || 0) + 1;
    });

    let mostUsedLanguage = 'None';
    let maxCount = 0;

    Object.entries(extensionCounts).forEach(([language, count]) => {
      if (count > maxCount) {
        mostUsedLanguage = language;
        maxCount = count;
      }
    });

    return mostUsedLanguage;
  };

  const formatFileName = (file: File) => {
    const parts = file.name.split('-');
    return parts.length > 1 ? parts.slice(1).join('-') : file.name;
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);

      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return { date: formattedDate, time: formattedTime };
    } catch (err) {
      console.error('Error formatting date:', err);
      return { date: dateTimeString, time: '' };
    }
  };

  const visibleRooms = useMemo(() => {
    return rooms.slice(0, visibleRoomCount);
  }, [rooms, visibleRoomCount]);

  return (
    <div className="main-container">
      <header className="header">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="logo">Code Crib</div>
        </Link>
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

      <div className="refresh-container">
        <button className="btn-refresh" onClick={handleRefresh}>
          Refresh Rooms
        </button>
      </div>

      <div className="user-profile">
        <div className="profile-pic">
          {user.profilePicId ? (
            <img
              src={`${base}/api/files/${user.profilePicId}`}
              alt="Profile"
              className="profile-img"
              onError={(e) => {
                console.error(`Failed to load profile pic for ${user.name}: ${user.profilePicId}`);
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'block';
                }
              }}
            />
          ) : null}
          <svg
            viewBox="0 0 24 24"
            fill="white"
            width="24"
            height="24"
            style={{ display: user.profilePicId ? 'none' : 'block' }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
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
          disabled={!!joiningRoomId}
        />
        <button
          className="join-room-btn"
          onClick={handleJoinRoomById}
          disabled={!!joiningRoomId || !roomIdToJoin.trim()}
        >
          {joiningRoomId ? 'Joining...' : 'Join'}
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
          {visibleRooms.map((room, index) => (
            <RoomCard
              key={`${room.id}-${index}`}
              room={room}
              index={index}
              loadedFiles={loadedFiles[room.id]}
              isLoading={isLoading}
              isRoomLoading={roomLoadingStatus[room.id] || false}
              handleRoomClick={handleRoomClick}
              loadMoreFiles={loadMoreFiles}
              formatFileName={formatFileName}
              formatDateTime={formatDateTime}
            />
          ))}
        </div>
      )}

      {visibleRoomCount < rooms.length && (
        <div className="global-load-more">
          <button
            className="load-more-btn"
            onClick={loadMoreRooms}
            disabled={isLoadingMore}
            ref={loadMoreButtonRef}
          >
            {isLoadingMore ? 'Loading...' : `Load more rooms (${rooms.length - visibleRoomCount} remaining)`}
          </button>
        </div>
      )}
      <div ref={loadMoreRef} style={{ height: '20px', width: '100%' }} />
    </div>
  );
};

export default MainPage;