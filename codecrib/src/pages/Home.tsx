import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const codeRef = useRef<HTMLElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const [typedCode, setTypedCode] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  const finalCode = `function initCodeCrib() {
  const room = new CodeRoom({
    realtime: true,
    fileSharing: true
  });
  
  room.onUserJoin(user => {
    console.log(\`\${user.name} joined the room\`);
  });
  
  return room;
}

// Start coding together
const codeSession = initCodeCrib();
codeSession.invite('your-team');`;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let cursorTimeout: ReturnType<typeof setTimeout>;

    const typeCode = () => {
      let i = 0;
      const typing = () => {
        if (i < finalCode.length) {
          setTypedCode(finalCode.substring(0, i + 1));
          i++;
          timeout = setTimeout(typing, Math.random() * 50 + 10);
        } else {
          setTypedCode(finalCode); // Ensure final text is set
          if (codeRef.current && window.hljs) {
            window.hljs.highlightElement(codeRef.current);
          }
          setIsAnimationComplete(true); // Mark animation as complete
        }
      };
      typing();

      // Cursor blink after typing starts
      const blinkCursor = () => {
        setShowCursor(prev => !prev);
        cursorTimeout = setTimeout(blinkCursor, 500);
      };
      blinkCursor();
    };

    const initialTimeout = setTimeout(typeCode, 1000);

    // Cleanup to prevent memory leaks
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeout);
      clearTimeout(cursorTimeout);
    };
  }, []); // Runs once on mount

  useEffect(() => {
    const codeWindow = codeContainerRef.current;
    if (!codeWindow) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!codeWindow) return;
      const { left, top, width, height } = codeWindow.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      
      codeWindow.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
      codeWindow.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)';
    };

    codeWindow.addEventListener('mousemove', handleMouseMove);
    codeWindow.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      codeWindow.removeEventListener('mousemove', handleMouseMove);
      codeWindow.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleJoinRoom = () => {
    navigate('/login');
  };

  const handleCreateRoom = () => {
    navigate('/register'); 
  };

  const handleLogout = () => {
    navigate('/login'); 
  };

  return (
    <div className="home-container">
      <div className="animated-background">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      <header className="header">
        <div className="logo">
          <span className="logo-text">Code</span>
          <span className="logo-accent"> Crib</span>
        </div>
        <div className="nav-buttons">
          <button className="btn-create" onClick={handleCreateRoom} disabled={false}>
            Register
          </button>
          <button className="btn-logout" onClick={handleLogout}>Login</button>
        </div>
      </header>
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="main-title">
            <span className="title-word title-word-1">Code</span>
            <span className="title-word title-word-2">Crib</span>
          </h1>
          <p className="tagline">Real-time collaborative coding made simple</p>
          <div className="hero-buttons">
            <button className="btn-primary pulse" onClick={handleGetStarted}>Get Started</button>
            <button className="btn-secondary" onClick={handleJoinRoom}>Join a Room</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="code-window" ref={codeContainerRef}>
            <div className="code-header">
              <div className="window-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="file-name">main.js</div>
            </div>
            <div className="code-content">
              <pre>
                <code ref={codeRef} className="javascript">
                  {typedCode}{isAnimationComplete && showCursor ? '|' : ''}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
      <div className="features-section">
        <h2 className="section-title">Features that make coding together better</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon animate-icon">🔒</div>
            <h3>Private Rooms</h3>
            <p>Create secure rooms with unique IDs for your team to collaborate privately</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon animate-icon">📂</div>
            <h3>File Sharing</h3>
            <p>Upload and share individual code files with your team instantly</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon animate-icon">⚡</div>
            <h3>Real-Time Updates</h3>
            <p>See code changes as they happen with live syncing across all users</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon animate-icon">🧠</div>
            <h3>Session Memory</h3>
            <p>Room maintains shared file content even when team members come and go</p>
          </div>
        </div>
      </div>
      <div className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create a Room</h3>
            <p>Generate a private room with a unique ID or create a secret link</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Share With Team</h3>
            <p>Invite teammates to join your room with the unique room ID</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Upload Files</h3>
            <p>Share your code files (up to 20MB) with the entire room</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Code Together</h3>
            <p>Edit code in real-time and see changes instantly across all users</p>
          </div>
        </div>
      </div>
      <div className="cta-section">
        <h2 className="section-title">Ready to start coding together?</h2>
        <p>Join thousands of developers who are already using CodeCrib for collaborative coding</p>
        <div className="cta-buttons">
          <button className="btn-primary pulse" onClick={handleGetStarted}>Create Room</button>
          <button className="btn-secondary" onClick={handleJoinRoom}>Join Existing Room</button>
        </div>
      </div>
      <footer className="home-footer">
        <div className="footer-logo">
          <span className="logo-text">Code</span>
          <span className="logo-accent">Crib</span>
        </div>
        <div className="footer-links">
          <a href="https://www.github.com//ravindraogg">About</a>
          <a href="/">Contact</a>
          <a href="/">Privacy Policy</a>
          <a href="/">Terms of Use</a>
        </div>
        <div className="footer-copyright">
          @ developed by Ravindra
          © {new Date().getFullYear()} CodeCrib. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

declare global {
  interface Window {
    hljs: any;
  }
}

export default Home;