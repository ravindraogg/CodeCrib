import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Room.css';
import io from 'socket.io-client';
import axios from 'axios';
import FileItem from '../FileItem';

// Interfaces
interface FileItemData {
  displayName: string;
  id: string;
  name: string;
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
  id: string;
}

interface RoomData {
  id: string;
  userId: string;
  mostUsedLanguage: string;
  dateTime: string;
  files: string[];
}

const Room: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItemData[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hoveredFile, setHoveredFile] = useState<FileItemData | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItemData } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileItemData | null>(null);
  const [newMessageCount, setNewMessageCount] = useState<number>(0);
  const socketRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const previewCodeRef = useRef<HTMLDivElement>(null);
  const previewLinesRef = useRef<HTMLDivElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  const API_URL = import.meta.env.VITE_API_ENDPOINT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchRoomAndJoin = async () => {
      try {
        setLoading(true);
        const roomResponse = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoom(roomResponse.data);

        const joinResponse = await axios.post(`${API_URL}/api/rooms/${roomId}/join`, {}, {
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
                const response = await axios.get(`${API_URL}/api/rooms/${roomId}/files/${encodeURIComponent(fullFileName)}`, {
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
      socketRef.current = io(`${API_URL}`, {
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
        const validUsers = users.filter(p => p.id && p.name);
        console.log('Received roomParticipants:', validUsers);
        console.log('Profile pics:', validUsers.map(p => ({ name: p.name, profilePic: p.profilePic })));
        setParticipants(validUsers.filter((p, index, self) => 
          index === self.findIndex(t => t.id === p.id)
        ));
      });

      socketRef.current.on('userJoined', (user: Participant) => {
        console.log('User joined:', user);
        if (user.id && user.name && user.id !== currentUser?.id) {
          setParticipants(prev => {
            const updated = prev.some(p => p.id === user.id)
              ? prev.map(p => p.id === user.id ? { ...p, online: true } : p)
              : [...prev, { ...user, online: true }];
            return updated.filter((p, index, self) => 
              index === self.findIndex(t => t.id === p.id)
            );
          });
          setMessages(prev => {
            if (prev.some(m => m.id === `system-join-${user.id}`)) return prev;
            return [
              ...prev,
              {
                id: `system-join-${user.id}`,
                sender: 'System',
                senderId: 'system',
                text: `${user.name} joined the room`,
                timestamp: new Date().toISOString()
              }
            ];
          });
          updateNewMessageCount();
        }
      });

      socketRef.current.on('userLeft', (user: { userId: string, name: string }) => {
        console.log('User left:', user);
        if (user.userId && user.name) {
          setParticipants(prev =>
            prev.map(p => p.id === user.userId ? { ...p, online: false } : p)
          );
          setMessages(prev => [
            ...prev,
            {
              id: `system-${Date.now()}-${user.userId}`,
              sender: 'System',
              senderId: 'system',
              text: `${user.name} left the room`,
              timestamp: new Date().toISOString()
            }
          ]);
          updateNewMessageCount();
        }
      });

      socketRef.current.on('userStatus', (status: { userId: string, online: boolean }) => {
        console.log('User status update:', status);
        if (status.userId) {
          setParticipants(prev =>
            prev.map(p => p.id === status.userId ? { ...p, online: status.online } : p)
          );
        }
      });

      socketRef.current.on('message', (msg: Message) => {
        setMessages(prev => {
          if (!msg.id) msg.id = `${msg.senderId}-${msg.timestamp}`;
          if (prev.some(m => m.id === msg.id)) return prev;
          if (msg.senderId === currentUser?.id) return prev;
          return [...prev, msg];
        });
        updateNewMessageCount();
      });

      socketRef.current.on('newFile', (file: FileItemData) => {
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

  const updateNewMessageCount = () => {
    if (chatContainerRef.current) {
      const isScrolledToBottom =
        chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop <=
        chatContainerRef.current.clientHeight + 10;
      if (!isScrolledToBottom) {
        setNewMessageCount(prev => prev + 1);
      } else {
        setNewMessageCount(0);
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      const isScrolledToBottom =
        chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop <=
        chatContainerRef.current.clientHeight + 10;
      if (isScrolledToBottom) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        setNewMessageCount(0);
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setNewMessageCount(0);
    }
  };

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

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(true);
    const files = Array.from(event.dataTransfer.items).map(item => item.getAsFile()).filter((file): file is File => file !== null);
    setDraggedFiles(files);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDraggingFile(false);
    setDraggedFiles([]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);
    setDraggedFiles([]);

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0 && roomId) {
      for (const file of droppedFiles) {
        await uploadFile(file);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles && uploadedFiles.length > 0 && roomId) {
      for (let i = 0; i < uploadedFiles.length; i++) {
        await uploadFile(uploadedFiles[i]);
      }
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
        `${API_URL}/api/rooms/${roomId}/files`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('File uploaded successfully:', response.data);
      const roomResponse = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
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
              const response = await axios.get(`${API_URL}/api/rooms/${roomId}/files/${encodeURIComponent(fullFileName)}`, {
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

  const handleFileMouseEnter = (file: FileItemData) => {
    setHoveredFile(file);
  };

  const openFilePreview = async (file: FileItemData) => {
    setSelectedFile(file);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewContent(response.data.content);
      setShowPreview(true);

      if (!file.read) {
        setFiles(prev =>
          prev.map(f => f.id === file.id ? { ...f, read: true } : f)
        );
        socketRef.current?.emit('fileRead', { fileName: file.name });
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setPreviewContent('Unable to load content');
    }
  };

  const closeFilePreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
    setPreviewContent(null);
  };

  const handleFileClick = (file: FileItemData, event: React.MouseEvent) => {
    if (event.type === 'click') {
      openFilePreview(file);
    } else if (event.type === 'contextmenu') {
      event.preventDefault();
      setContextMenu({ x: event.pageX, y: event.pageY, file });
      setHoveredFile(null);
    }
  };

  const handleContextAction = async (action: string, file: FileItemData) => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    switch (action) {
      case 'Copy':
        try {
          const response = await axios.get(`${API_URL}/api/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
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
          const response = await axios.get(`${API_URL}/api/rooms/${roomId}/files/${encodeURIComponent(file.name)}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', file.displayName);
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
          prev.map(f => f.id === file.id ? { ...f, read: !f.read } : f)
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
      const message: Message = {
        id: `${currentUser.id}-${Date.now()}`,
        sender: currentUser.name,
        senderId: currentUser.id,
        text: newMessage,
        timestamp: new Date().toISOString()
      };
      socketRef.current?.emit('message', message);
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setNewMessage('');
      scrollToBottom();
    }
  };

  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (contextMenu && !target.closest('.context-menu')) {
      setContextMenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contextMenu]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPreview) {
        closeFilePreview();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPreview]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-code">
          <span className="brace">{'{'}</span>
          <span className="loading-text">Loading...</span>
          <span className="brace">{'}'}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div
      className="room-container"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      <header className="room-header">
        <div className="logo">Code Crib</div>
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
            Room Id | {roomId || ''}
          </div>
        </div>

        <div className="file-section">
          {files.length === 0 ? (
            <div className="no-files">No files yet. Drop files to share them.</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`file-card ${file.read ? 'read' : ''} ${hoveredFile?.id === file.id ? 'hovered' : ''}`}
                onMouseEnter={() => handleFileMouseEnter(file)}
                onMouseLeave={() => setHoveredFile(null)}
                onClick={(e) => handleFileClick(file, e)}
                onContextMenu={(e) => handleFileClick(file, e)}
              >
                <FileItem fileName={file.displayName || file.name} />
                <div className="file-lines">{file.lines} lines</div>
                <div className="file-ext">{file.ext}</div>
              </div>
            ))
          )}

          {contextMenu && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y - 5, left: contextMenu.x - 5 }}
            >
              <button className="context-btn" onClick={() => handleContextAction('Copy', contextMenu.file)}>Copy</button>
              <button className="context-btn" onClick={() => handleContextAction('Download', contextMenu.file)}>Download</button>
              <button className="context-btn" onClick={() => handleContextAction('Mark as Read', contextMenu.file)}>Mark as Read</button>
              <button className="context-btn" onClick={() => handleContextAction('Delete', contextMenu.file)}>Delete</button>
            </div>
          )}

          {showPreview && selectedFile && (
            <div className="file-preview-modal">
              <div className="file-preview">
                <div className="file-preview-header">
                  <div className="file-info">
                    <span>{selectedFile.displayName}</span>
                    <span>Type: {selectedFile.ext}</span>
                    <span>Lines: {selectedFile.lines}</span>
                    <span>Status: {selectedFile.read ? 'Read' : 'Unread'}</span>
                  </div>
                  <button className="close-preview" onClick={closeFilePreview}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#d4d4d4">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
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
            </div>
          )}

          {isDraggingFile && (
            <div className="drag-drop-popup">
              <div className="drag-drop-content">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="#d4d4d4">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <h3>Drop files here to upload</h3>
                {draggedFiles.length > 0 && (
                  <div className="dragged-files">
                    {draggedFiles.map((file, index) => (
                      <div key={index} className="dragged-file-item">
                        <FileItem fileName={file.name} />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="room-id-box" onClick={copyRoomId}>
              Room Id | {roomId || ''}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Room Participants ({participants.length})</h3>
            {participants.map((p) => (
              <div key={p.id} className="participant">
                <div className="profile-pic">
                  {p.profilePic ? (
                    <img 
                      src={`${API_URL}${p.profilePic}`} 
                      alt="Profile" 
                      className="profile-img" 
                      onError={(e) => {
                        console.error(`Failed to load profile pic for ${p.name}: ${p.profilePic}`);
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
                    style={{ display: p.profilePic ? 'none' : 'block' }}
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
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
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderId === currentUser?.id ? 'own-message' : ''}`}
                  >
                    <strong>{msg.sender}: </strong>{msg.text}
                  </div>
                ))
              )}
            </div>
            {newMessageCount > 0 && (
              <div className="new-message-notification" onClick={scrollToBottom}>
                {newMessageCount} New {newMessageCount === 1 ? 'Message' : 'Messages'} ↓
              </div>
            )}
            <form onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="type/..."
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
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </div>
        </label>
        <input
          id="file-input"
          type="file"
          multiple
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