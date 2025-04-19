import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Room.css';
import io from 'socket.io-client';
import axios from 'axios';

// Rename your interface to avoid conflicts with built-in File type
interface FileItem {
  displayName: string;
  id: string;
  name: string; // Full name with fileId prefix
  lines: number;
  read: boolean;
  ext: string;
}

interface Participant {
  id: string;
  name: string;
  profilePic?: string;
  online: boolean;
}

interface Message {
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
}

interface RoomData {
  id: string;
  userId: string;
  mostUsedLanguage: string;
  dateTime: string;
  files: string[]; // Full file names
}

const Room: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hoveredFile, setHoveredFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(null);
  const socketRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const previewCodeRef = useRef<HTMLDivElement>(null);
  const previewLinesRef = useRef<HTMLDivElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchRoomAndJoin = async () => {
      try {
        setLoading(true);
        const roomResponse = await axios.get(`${API_URL}/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoom(roomResponse.data);

        const joinResponse = await axios.post(`${API_URL}/rooms/${roomId}/join`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrentUser(joinResponse.data.participant);
        setParticipants([joinResponse.data.participant]);

        if (roomResponse.data.files && roomResponse.data.files.length > 0) {
          const filesList = await Promise.all(
            roomResponse.data.files.map(async (fullFileName: string, index: number) => {
              const fileExt = fullFileName.split('.').pop() || '';
              const capitalizedExt = fileExt.charAt(0).toUpperCase() + fileExt.slice(1);
              const baseName = fullFileName.split('-').slice(1).join('-');
              let lines = 0;
              try {
                const response = await axios.get(`${API_URL}/rooms/${roomId}/files/${encodeURIComponent(fullFileName)}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                lines = response.data.content.split('\n').length;
              } catch (error) {
                console.error(`Error fetching lines for ${fullFileName}:`, error);
              }
              return {
                id: `file-${index}`,
                name: fullFileName,
                lines,
                read: false,
                ext: capitalizedExt,
                displayName: baseName
              };
            })
          );
          setFiles(filesList);
          console.log('Files loaded:', filesList);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching room data:', err);
        setError(err.response?.data?.message || 'Error loading room data');
        setLoading(false);
      }
    };

    fetchRoomAndJoin();
  }, [roomId, navigate]);

  useEffect(() => {
    if (!currentUser || !roomId) return;

    const connectSocket = () => {
      socketRef.current = io('http://localhost:5000', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect_error', (error: { message: any; }) => {
        console.error('Connection error:', error.message);
      });

      socketRef.current.emit('joinRoom', {
        roomId,
        userId: currentUser.id,
        userName: currentUser.name
      });

      socketRef.current.on('roomParticipants', (users: Participant[]) => {
        setParticipants(prev => {
          const existingIds = prev.map(p => p.id);
          const validUsers = users.filter(u => u.id !== socketRef.current.id && u.name);
          const newUsers = validUsers.filter(u => !existingIds.includes(u.id));
          return [...prev.filter(p => validUsers.some(u => u.id === p.id)), ...newUsers];
        });
      });

      socketRef.current.on('userJoined', (user: Participant) => {
        if (user.id !== currentUser.id) {
          setParticipants(prev => {
            if (prev.some(p => p.id === user.id)) {
              return prev.map(p => p.id === user.id ? { ...p, online: true } : p);
            }
            return [...prev, user];
          });
          setMessages(prev => [
            ...prev,
            {
              sender: 'System',
              senderId: 'system',
              text: `${user.name} joined the room`,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      });

      socketRef.current.on('userLeft', (user: { userId: string, name: string }) => {
        setParticipants(prev =>
          prev.map(p => p.id === user.userId ? { ...p, online: false } : p)
        );
        setMessages(prev => [
          ...prev,
          {
            sender: 'System',
            senderId: 'system',
            text: `${user.name} left the room`,
            timestamp: new Date().toISOString()
          }
        ]);
      });

      socketRef.current.on('userStatus', (status: { userId: string, online: boolean }) => {
        setParticipants(prev =>
          prev.map(p => p.id === status.userId ? { ...p, online: status.online } : p)
        );
      });

      socketRef.current.on('message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });

      socketRef.current.on('newFile', (file: FileItem) => {
        setFiles(prev => {
          if (prev.some(f => f.id === file.id)) return prev;
          return [...prev, { ...file, read: false }];
        });
      });

      socketRef.current.on('fileRead', (data: { fileName: string, userId: string }) => {
        if (data.userId === currentUser?.id) {
          setFiles(prev =>
            prev.map(f => f.name === data.fileName ? { ...f, read: true } : f)
          );
        }
      });

      socketRef.current.on('fileDelete', (data: { fileName: string }) => {
        setFiles(prev => prev.filter(f => f.name !== data.fileName));
      });

      const handleVisibilityChange = () => {
        const isVisible = !document.hidden;
        socketRef.current.emit('statusChange', { online: isVisible });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        socketRef.current?.disconnect();
      };
    };

    connectSocket();
  }, [roomId, currentUser]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    alert('Room link copied!');
  };

  const exitRoom = () => {
    socketRef.current?.disconnect();
    navigate('/main');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    alert('Room ID copied!');
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && roomId) {
      await uploadFile(droppedFile);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && roomId) {
      await uploadFile(uploadedFile);
    }
  };

  const uploadFile = async (file: Blob) => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    try {
      setIsUploadingFile(true);
      const fileName = file instanceof File ? file.name : 'file';
      const fileExt = fileName.split('.').pop() || '';
      const capitalizedExt = fileExt.charAt(0).toUpperCase() + fileExt.slice(1);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('fileExt', capitalizedExt);

      const response = await axios.post(
        `${API_URL}/rooms/${roomId}/files`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('File uploaded successfully:', response.data);
      const roomResponse = await axios.get(`${API_URL}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (roomResponse.data.files) {
        const filesList = await Promise.all(
          roomResponse.data.files.map(async (fullFileName: string, index: number) => {
            const fileExt = fullFileName.split('.').pop() || '';
            const capitalizedExt = fileExt.charAt(0).toUpperCase() + fileExt.slice(1);
            const baseName = fullFileName.split('-').slice(1).join('-');
            let lines = 0;
            try {
              const response = await axios.get(`${API_URL}/rooms/${roomId}/files/${encodeURIComponent(fullFileName)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              lines = response.data.content.split('\n').length;
            } catch (error) {
              console.error(`Error fetching lines for ${fullFileName}:`, error);
            }
            return {
              id: `file-${index}`,
              name: fullFileName,
              lines,
              read: false,
              ext: capitalizedExt,
              displayName: baseName
            };
          })
        );
        setFiles(filesList);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileMouseEnter = async (file: FileItem, event: React.MouseEvent) => {
    setHoveredFile(file);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const content = response.data.content.slice(0, 1000); // Limit content to prevent performance issues
      setPreviewContent(content);

      // Calculate preview position
      const previewWidth = 450;
      const previewHeight = 300;
      const offset = 10; // Distance from cursor
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const fileSection = document.querySelector('.file-section')?.getBoundingClientRect();
      let left = event.clientX + offset;
      let top = event.clientY + offset;

      // Ensure preview stays within viewport
      if (left + previewWidth > viewportWidth - 20) {
        left = viewportWidth - previewWidth - 20; // Keep within right edge
      }
      if (left < 20) {
        left = 20; // Keep within left edge
      }
      if (top + previewHeight > viewportHeight - 20) {
        top = event.clientY - previewHeight - offset; // Place above cursor
      }
      if (top < 80) { // Account for fixed header height
        top = 80; // Keep below header
      }

      // Prefer below cursor if above doesn't fit
      if (top < 80) {
        top = event.clientY + 20;
      }

      // Ensure preview stays within file-section if possible
      if (fileSection) {
        if (left < fileSection.left) {
          left = fileSection.left;
        }
        if (left + previewWidth > fileSection.right) {
          left = fileSection.right - previewWidth;
        }
      }

      setPreviewPosition({ top, left });
    } catch (error) {
      console.error('Error fetching file content:', error);
      setPreviewContent('Unable to load content');
    }
  };

  const handleFileClick = (file: FileItem, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.pageX, y: event.pageY, file });
    setHoveredFile(null); // Hide preview on context menu
  };

  const handleContextAction = async (action: string, file: FileItem) => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    switch (action) {
      case 'Copy':
        try {
          const response = await axios.get(`${API_URL}/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          navigator.clipboard.writeText(response.data.content);
          alert('File content copied!');
        } catch (error) {
          console.error('Error copying file content:', error);
          alert('Failed to copy file content');
        }
        break;
      case 'Download':
        try {
          const response = await axios.get(`${API_URL}/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', file.name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading file:', error);
          alert('Failed to download file');
        }
        break;
      case 'Mark as Read':
        setFiles(prev =>
          prev.map(f => f.id === file.id ? { ...f, read: true } : f)
        );
        socketRef.current?.emit('fileRead', { fileName: file.name });
        break;
      case 'Delete':
        try {
          socketRef.current?.emit('fileDelete', { fileName: file.name });
          setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) {
          console.error('Error deleting file:', error);
          alert('Failed to delete file');
        }
        break;
    }
    setContextMenu(null);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentUser) {
      const message = {
        sender: currentUser.name,
        senderId: currentUser.id,
        text: newMessage,
        timestamp: new Date().toISOString()
      };
      socketRef.current?.emit('message', message);
      setNewMessage('');
    }
  };

  const handleDocumentClick = () => {
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contextMenu]);

  // Sync line numbers scroll with code scroll
  useEffect(() => {
    const codeElement = previewCodeRef.current;
    const linesElement = previewLinesRef.current;
    if (codeElement && linesElement) {
      const handleScroll = () => {
        linesElement.scrollTop = codeElement.scrollTop;
      };
      codeElement.addEventListener('scroll', handleScroll);
      return () => {
        codeElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [previewContent]);

  if (loading) {
    return <div className="loading">Loading room data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div
      className="room-container"
      onDrop={handleFileDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <header className="room-header">
        <div className="logo">Code-Crib</div>
        <div className="room-actions">
          <button className="btn-action" onClick={copyRoomLink}>
            Copy room link
          </button>
          <button className="btn-action" onClick={exitRoom}>
            Exit room
          </button>
        </div>
      </header>

      <div className="room-content">
        <div className="room-info">
          <div className="room-id-box" onClick={copyRoomId}>
            Room {roomId || ''}
          </div>
        </div>

        <div className="file-section">
          {files.length === 0 ? (
            <div className="no-files">No files yet. Drop files to share them.</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`file-card ${file.read ? 'read' : ''}`}
                onMouseEnter={(e) => handleFileMouseEnter(file, e)}
                onMouseLeave={() => setHoveredFile(null)}
                onClick={(e) => handleFileClick(file, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileClick(file, e);
                }}
              >
                <div className="file-name">{file.displayName || file.name}</div>
                <div className="file-lines">{file.lines} lines</div>
                <div className="file-ext">{file.ext}</div>
              </div>
            ))
          )}

          {hoveredFile && previewPosition && (
            <div
              className="file-preview"
              style={{ top: previewPosition.top, left: previewPosition.left }}
            >
              <div className="file-preview-header">
                <div className="file-info">
                  <span>Type: {hoveredFile.ext}</span>
                  <span>Lines: {hoveredFile.lines}</span>
                  <span>Status: {hoveredFile.read ? 'Read' : 'Unread'}</span>
                </div>
              </div>
              <div className="file-preview-content">
                <div className="file-preview-lines" ref={previewLinesRef}>
                  {previewContent &&
                    previewContent.split('\n').map((_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                </div>
                <div className="file-preview-code" ref={previewCodeRef}>
                  <pre>{previewContent || 'Loading...'}</pre>
                </div>
              </div>
            </div>
          )}

          {contextMenu && (
            <div
              className="file-section"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button onClick={() => handleContextAction('Copy', contextMenu.file)}>Copy</button>
              <button onClick={() => handleContextAction('Download', contextMenu.file)}>Download</button>
              <button onClick={() => handleContextAction('Mark as Read', contextMenu.file)}>
                Mark as Read
              </button>
              <button onClick={() => handleContextAction('Delete', contextMenu.file)}>Delete</button>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="room-id-box" onClick={copyRoomId}>
              Room ID: {roomId || ''}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Room Participants ({participants.filter(p => p.online).length})</h3>
            {participants.map((p) => (
              <div key={p.id} className="participant">
                <div className="profile-pic">
                  {p.profilePic ? (
                    <img src={p.profilePic} alt="Profile" className="profile-img" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  )}
                  {p.online && <div className="online-dot"></div>}
                </div>
                <span>{p.name} {currentUser?.id === p.id ? '(You)' : ''}</span>
              </div>
            ))}
          </div>

          <div className="sidebar-section chat">
            <h3>Chat</h3>
            <div className="chat-messages" ref={chatContainerRef}>
              {messages.length === 0 ? (
                <div className="no-messages">No messages yet</div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.senderId === currentUser?.id ? 'own-message' : ''}`}
                  >
                    <strong>{msg.sender}: </strong>{msg.text}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">➤</button>
            </form>
          </div>
        </aside>
      </div>

      <div className="file-upload">
        <label htmlFor="file-input">
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </div>
        </label>
        <input
          id="file-input"
          type="file"
          onChange={handleFileUpload}
          disabled={isUploadingFile}
          style={{ display: 'none' }}
        />
        <span>
          {isUploadingFile ? 'Uploading...' : 'Drag and drop files here'}
        </span>
      </div>
    </div>
  );
};

export default Room;