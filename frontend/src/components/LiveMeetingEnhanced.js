import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaComment,
  FaUsers,
  FaRecordVinyl,
  FaStop,
  FaPaperPlane,
  FaSmile,
  FaHandPaper,
  FaChevronUp,
  FaEllipsisH,
  FaShieldAlt,
  FaUserFriends,
  FaTimes,
  FaThumbsUp,
  FaHeart,
  FaLaugh,
  FaSadTear,
  FaTh,
  FaCog,
  FaPhone,
  FaCrown,
  FaLock,
  FaUserClock,
  FaCheck,
  FaBan,
  FaUserCheck,
  FaHourglassHalf,
  FaSignInAlt,
  FaUserPlus,
  FaClosedCaptioning,
  FaFile,
  FaClipboard,
  FaShareAlt,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeOff,
  FaPlay,
  FaPause,
  FaWifi,
  FaSignal,
  FaBroadcastTower,
  FaExclamationTriangle,
  FaStar,
  FaUnlock,
  FaDownload
} from 'react-icons/fa';
import './LiveMeetingEnhanced.css';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import HostRatingModal from './HostRatingModal';
import HostAwardModal from './HostAwardModal';
import CyberScoreBadge from './CyberScoreBadge';

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Camera-Off Placeholder shown when video is disabled
const CameraOffPlaceholder = ({ name, isHost, size = 'normal' }) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className={`camera-off-placeholder placeholder-${size}`}>
      <div className="avatar-circle">
        <span className="avatar-initial">{initial}</span>
      </div>
      <div className="camera-off-info">
        {isHost && <FaCrown className="ph-host-badge" />}
        <span className="ph-name">{name}</span>
        <FaVideoSlash className="ph-camera-icon" />
      </div>
    </div>
  );
};

// Enhanced Video Tile Component with modern animations and dual-stream support
const EnhancedVideoTile = React.memo(({ 
  peer, 
  userName, 
  isSmall = false, 
  isMain = false, 
  onDoubleClick, 
  isScreenSharing = false,
  isAudioOn = true,
  isVideoOn = true,
  isHandRaised = false,
  hasCamera = true,
  isHost = false
}) => {
  const ref = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (peer) {
      const handleStream = (stream) => {
        if (ref.current) {
          ref.current.srcObject = stream;
          setIsLoading(false);
          setHasError(false);
        }
      };

      const handleError = (error) => {
        console.warn('Peer video error:', error);
        setHasError(true);
        setIsLoading(false);
      };

      peer.on("stream", handleStream);
      peer.on("error", handleError);

      return () => {
        peer.off("stream", handleStream);
        peer.off("error", handleError);
      };
    }
  }, [peer]);

  const tileClasses = useMemo(() => {
    return [
      'video-tile',
      isSmall && 'small-tile',
      isMain && 'main-tile',
      isScreenSharing && 'screen-sharing',
      isLoading && 'loading',
      hasError && 'error',
      isHovered && 'hovered'
    ].filter(Boolean).join(' ');
  }, [isSmall, isMain, isScreenSharing, isLoading, hasError, isHovered]);

  return (
    <div 
      className={tileClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={onDoubleClick}
    >
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Connecting...</p>
        </div>
      )}
      
      {hasError && (
        <div className="video-error">
          <FaSignal className="error-icon" />
          <p>Connection Error</p>
        </div>
      )}

      {!isVideoOn ? (
        <CameraOffPlaceholder name={userName} isHost={isHost} size={isSmall ? 'small' : 'normal'} />
      ) : (
        <video 
          ref={ref} 
          autoPlay 
          playsInline 
          className="peer-video"
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
        />
      )}
      
      <div className="video-overlay">
        <div className="participant-info">
          <span className="participant-name">
            {userName}
            {isHost && <FaCrown className="host-badge" />}
            {!isAudioOn && <FaMicrophoneSlash className="status-muted" />}
            {!isVideoOn && <FaVideoSlash className="status-video-off" />}
            {isHandRaised && <FaHandPaper className="status-hand-raised" />}
            {isScreenSharing && <FaDesktop className="screen-share-icon" />}
          </span>
        </div>
        
      </div>

      {isScreenSharing && (
        <div className="screen-share-indicator">
          <FaDesktop className="indicator-icon" />
          <span>Screen Sharing</span>
        </div>
      )}
      
    </div>
  );
});

// Enhanced Connection Quality Indicator
const ConnectionQualityIndicator = ({ quality = 'good' }) => {
  const qualityConfig = {
    excellent: { bars: 4, color: 'var(--accent-success)', label: 'Excellent' },
    good: { bars: 3, color: 'var(--accent-success)', label: 'Good' },
    fair: { bars: 2, color: 'var(--accent-warning)', label: 'Fair' },
    poor: { bars: 1, color: 'var(--accent-danger)', label: 'Poor' }
  };

  const config = qualityConfig[quality] || qualityConfig.good;

  return (
    <div className="connection-quality-indicator" title={`Connection: ${config.label}`}>
      <div className="signal-bars">
        {[1, 2, 3, 4].map(bar => (
          <span 
            key={bar}
            className={bar <= config.bars ? 'active' : 'inactive'}
            style={{ 
              backgroundColor: bar <= config.bars ? config.color : 'var(--text-quaternary)',
              height: `${bar * 4}px`
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Enhanced Floating Reaction Component
const FloatingReaction = ({ emoji, sender, position, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="floating-emoji"
      style={{
        left: position?.left || '50%',
        animationDelay: position?.animationDelay || '0s'
      }}
    >
      <span className="emoji-character">{emoji}</span>
      <span className="emoji-sender">{sender}</span>
    </div>
  );
};



// Main Enhanced LiveMeeting Component
const EnhancedLiveMeeting = ({ 
  roomId: propRoomId, 
  userName: propUserName, 
  onClose 
}) => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { enterImmersiveMode, exitImmersiveMode } = useUI();
  const { user, isAuthenticated } = useAuth();

  // Use props if provided, otherwise use route params
  const roomId = propRoomId || paramRoomId;
  const userName = propUserName || location.state?.userName || user?.firstName + ' ' + user?.lastName || "Guest";
  const userId = user?.id || user?._id;

  // Refs
  const socketRef = useRef();
  const userVideo = useRef();
  const cameraVideo = useRef();
  const screenShareVideo = useRef();
  const peersRef = useRef([]);
  const chatContainerRef = useRef();
  const mediaRecorderRef = useRef(null);
  const userStreamRef = useRef(null);
  const mediaInitializedRef = useRef(false);

  // Main State
  const [peers, setPeers] = useState([]);
  const [userStream, setUserStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [supportsScreenShare, setSupportsScreenShare] = useState(false);
  const [compositeStreamCleanup, setCompositeStreamCleanup] = useState(null);
  const [meetingDetails, setMeetingDetails] = useState(null);

  // UI State
  const [viewMode, setViewMode] = useState('speaker');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [pinnedParticipant, setPinnedParticipant] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);

  // Meeting State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeEmojis, setActiveEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  // Additional UI State
  const [showCaptions, setShowCaptions] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  // Meeting Controls State
  const [isHost, setIsHost] = useState(false);
  const [meetingLocked, setMeetingLocked] = useState(false);
  const [meetingState, setMeetingState] = useState('waiting');
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState([]);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Enhanced reactions with position tracking
  const [reactions, setReactions] = useState([]);
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  
  // Cyber Score and Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedParticipantForRating, setSelectedParticipantForRating] = useState(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedParticipantForAward, setSelectedParticipantForAward] = useState(null);
  const [cyberScores, setCyberScores] = useState({});

  // Host-muted tracking (so unmute works correctly after host forces mute)
  const [hostMutedAudio, setHostMutedAudio] = useState(false);
  const [hostMutedVideo, setHostMutedVideo] = useState(false);

  // Device selection
  const [availableDevices, setAvailableDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);

  // End-meeting modal (host: end for all vs leave)
  const [showEndModal, setShowEndModal] = useState(false);

  // File sharing in chat
  const [sharedFiles, setSharedFiles] = useState([]);

  // Passcode-Gate and Security state
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [roomSecurity, setRoomSecurity] = useState({ allowScreenShare: true, allowChat: true, allowUnmute: true });
  
  // Current user information for rating
  const currentUser = {
    id: userId,
    name: userName
  };

  // Fetch meeting details including password on load
  useEffect(() => {
    if (!roomId) return;
    const fetchDetails = async () => {
      try {
        const response = await fetch(`${SOCKET_SERVER_URL}/api/meetings/meeting/${roomId}`);
        const data = await response.json();
        if (data && data.meeting) {
          setMeetingDetails(data.meeting);
        }
      } catch (err) {
        console.warn("Error fetching meeting details:", err);
      }
    };
    fetchDetails();
  }, [roomId]);

  // Passcode verification logic
  useEffect(() => {
    if (!meetingDetails) return;
    
    const isRoomHost = isHost || meetingDetails.creator === user?.email;
    const meetingPassword = meetingDetails.password;
    
    if (!meetingPassword || isRoomHost) {
      setIsPasscodeVerified(true);
      return;
    }
    
    // Check various bypass methods
    const queryPwd = new URLSearchParams(window.location.search).get('pwd');
    const statePwd = location.state?.meetingData?.password;
    const cachedPwd = localStorage.getItem(`verified_passcode_${roomId}`);
    
    if (queryPwd === meetingPassword || statePwd === meetingPassword || cachedPwd === meetingPassword) {
      setIsPasscodeVerified(true);
      localStorage.setItem(`verified_passcode_${roomId}`, meetingPassword);
    }
  }, [meetingDetails, isHost, user, location.state, roomId]);
  
  // Notification helper — defined early so it can be used in all hooks below
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Enter immersive mode on mount
  useEffect(() => {
    enterImmersiveMode();
    return () => exitImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode]);

  // Initialize connection
  useEffect(() => {
    if (!isPasscodeVerified) return;
    initializeConnection();
    return cleanup;
  }, [roomId, userName, isPasscodeVerified]);

  // Enhanced connection initialization - CONNECTS SOCKET FIRST WITHOUT ASYNC CAMERA BLOCK
  const initializeConnection = async () => {
    try {
      // Connect to socket first (highly lightweight, instant join)
      socketRef.current = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false
      });

      setupEnhancedSocketHandlers();

    } catch (error) {
      console.error("Error connecting to socket server:", error);
      showNotification("Failed to connect to server. Retrying...", "error");
    }
  };

  // Delayed camera & mic capture - ONLY executed when the participant is admitted to the meeting!
  const startMediaAndWebRTC = async () => {
    if (mediaInitializedRef.current) return;
    mediaInitializedRef.current = true;

    try {
      showNotification("Initializing audio and video tracks...", "info", 2000);
      
      // Get user media with robust resolution-matching constraints
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
      } catch (err) {
        console.warn("Standard camera/mic constraints failed, trying basic fallback...", err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }

      setUserStream(stream);
      userStreamRef.current = stream;
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      // Detect screen share capabilities
      const isScreenShareSupported = navigator.mediaDevices && 
                                   navigator.mediaDevices.getDisplayMedia && 
                                   (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      setSupportsScreenShare(isScreenShareSupported);

      // Tell backend server that we have initialized media and are ready to join WebRTC mesh
      if (socketRef.current) {
        socketRef.current.emit("ready-for-webrtc");
      }

      // Enumerate available devices for on-the-fly switching selectors
      enumerateDevices();

    } catch (error) {
      console.error("Failed to access camera or microphone completely:", error);
      
      const errorMessages = {
        'NotFoundError': 'No microphone or camera hardware found. Joining as a viewer.',
        'NotAllowedError': 'Camera/microphone permissions were denied. Joining as a viewer.',
        'NotReadableError': 'Camera is already in use by another application. Joining as a viewer.'
      };
      
      const userMessage = errorMessages[error.name] || 'Could not access audio/video devices. Joining as a viewer.';
      showNotification(userMessage, 'warning', 6000);

      // If media access fails completely, we still trigger ready-for-webrtc so they can act as viewer!
      if (socketRef.current) {
        socketRef.current.emit("ready-for-webrtc");
      }
    }
  };

  // Enhanced socket handlers with stream-less structure reading from userStreamRef
  const setupEnhancedSocketHandlers = () => {
    const socket = socketRef.current;

    // Connection quality monitoring
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionQuality('excellent');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionQuality('poor');
    });

    socket.on('connect_error', () => {
      console.log('Connection error');
      setConnectionQuality('poor');
    });

    socket.emit("join-room", { roomId, userId, userName });
    
    // Enhanced host status handling
    socket.on("host-status", (data) => {
      setIsHost(data.isHost);
      const admitted = data.isHost || data.isAdmitted;
      setIsAdmitted(admitted);
      
      if (data.security) {
        setRoomSecurity(data.security);
      }
      
      if (data.isHost) {
        console.log('You are the host of this meeting');
        setMeetingState('active');
        startMediaAndWebRTC();
      } else {
        setIsInWaitingRoom(!admitted);
        setMeetingState(data.meetingStarted ? 'active' : 'waiting');
        if (!admitted) {
          setWaitingMessage('Waiting for the host to admit you...');
        } else {
          startMediaAndWebRTC();
        }
      }
    });

    socket.on("host-security-update", (data) => {
      if (data.security) {
        setRoomSecurity(data.security);
        showNotification("Meeting security permissions have been updated by the host.", "info", 4000);
      }
    });

    socket.on("host-security-confirmed", (data) => {
      if (data.security) {
        setRoomSecurity(data.security);
        showNotification("Security permissions successfully applied room-wide.", "success", 4000);
      }
    });

    // Enhanced peer handling with error recovery - reads from userStreamRef.current
    socket.on("existing-users", (users) => {
      const newPeers = users.map(user => {
        try {
          const peer = createPeer(user.socketId, socket.id, userStreamRef.current);
          peersRef.current.push({ peerID: user.socketId, peer, userName: user.userName, userId: user.userId, isHost: user.isHost });
          return { 
            peer, 
            userName: user.userName, 
            userId: user.userId,
            socketId: user.socketId,
            isHost: user.isHost || false,
            isAudioOn: true,
            isVideoOn: true,
            cyberScore: user.cyberScore
          };
        } catch (error) {
          console.error('Error creating peer for existing user:', error);
          return null;
        }
      }).filter(Boolean);
      
      setPeers(newPeers);
      setParticipantsList(users);
    });

    socket.on("user-connected", (userInfo) => {
      try {
        const peer = addPeer(null, userInfo.socketId, userStreamRef.current);
        peersRef.current.push({ peerID: userInfo.socketId, peer, userName: userInfo.userName, userId: userInfo.userId, isHost: userInfo.isHost });
        const newPeer = { 
          peer, 
          userName: userInfo.userName, 
          userId: userInfo.userId,
          socketId: userInfo.socketId,
          isHost: userInfo.isHost || false,
          isAudioOn: true,
          isVideoOn: true,
          cyberScore: userInfo.cyberScore
        };
        setPeers(prev => [...prev, newPeer]);
        setParticipantsList(prev => [...prev, userInfo]);
      } catch (error) {
        console.error('Error handling new user connection:', error);
      }
    });

    // Enhanced signaling with error handling
    socket.on("signal", ({ from, signal }) => {
      const item = peersRef.current.find(p => p.peerID === from);
      if (item?.peer && !item.peer.destroyed) {
        try {
          item.peer.signal(signal);
        } catch (error) {
          console.warn('Error processing signal:', error);
        }
      }
    });

    // Enhanced user disconnection handling
    socket.on("user-disconnected", ({ socketId }) => {
      const peerObj = peersRef.current.find(p => p.peerID === socketId);
      if (peerObj?.peer) {
        try {
          peerObj.peer.destroy();
        } catch (error) {
          console.warn('Error destroying peer:', error);
        }
      }
      peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      setParticipantsList(prev => prev.filter(p => p.socketId !== socketId));
    });

    // Enhanced chat handling
    socket.on("chat-message", (data) => {
      setChatMessages(prev => [...prev, { ...data, id: Date.now() + Math.random() }]);
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    // Enhanced typing indicators
    socket.on("user-typing", ({ userId, userName: typingUserName }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== userId);
        return [...filtered, { userId, userName: typingUserName }];
      });
    });

    socket.on("user-stop-typing", ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // Enhanced emoji reactions
    socket.on("emoji-reaction", (data) => {
      const { emojiData } = data;
      
      if (emojiData.userId === socket.id) {
        return; // Don't show our own reactions
      }
      
      if (!emojiData.position) {
        emojiData.position = {
          left: `${15 + Math.random() * 70}%`,
          animationDelay: `${Math.random() * 0.5}s`
        };
      }
      
      setActiveEmojis(prev => [...prev, { ...emojiData, id: Date.now() + Math.random() }]);
    });

    // Waiting room status handler
    socket.on("waiting-room-status", (data) => {
      console.log('Received waiting room status:', data);
      if (data.inWaitingRoom) {
        setIsInWaitingRoom(true);
        setIsAdmitted(false);
        setMeetingState('waiting');
        setWaitingMessage(data.message || 'Waiting for the host to admit you...');
      }
    });

    // Waiting room management for hosts
    socket.on("waiting-participants-update", (participants) => {
      console.log('Host received waiting participants update:', participants);
      
      setWaitingParticipants(prev => {
        const nextList = participants || [];
        const prevList = prev || [];
        if (nextList.length > prevList.length) {
          const prevIds = new Set(prevList.map(p => p.socketId));
          const newParticipants = nextList.filter(p => !prevIds.has(p.socketId));
          newParticipants.forEach(np => {
            showNotification(`${np.userName} is in the waiting room.`, "info", 6000);
          });
        }
        return nextList;
      });
    });

    socket.on("admitted-to-meeting", () => {
      console.log('User admitted to meeting');
      setIsInWaitingRoom(false);
      setIsAdmitted(true);
      setMeetingState('active');
      setWaitingMessage('');
      startMediaAndWebRTC();
    });

    socket.on("admission-rejected", (data) => {
      console.log('Admission automatically rejected:', data);
      setWaitingMessage(data.reason || 'Access denied due to account restrictions');
      setIsInWaitingRoom(false);
      setMeetingState('rejected');
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });

    socket.on("rejected-from-meeting", (data) => {
      console.log('Rejected by host:', data);
      setWaitingMessage(data.message || 'Access denied by host');
      setIsInWaitingRoom(false);
      setMeetingState('rejected');
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error('Socket error:', error);
      showNotification(error.message || 'Connection error', 'error');
    });

    // Host control events - when host controls affect current user
    socket.on("host-muted-you", (data) => {
      if (userStream) {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioOn(false);
        }
      }
      showNotification(`You have been muted by the host (${data.hostName})`, 'warning', 4000);
    });

    socket.on("host-disabled-your-video", (data) => {
      if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }
      showNotification(`Your video has been disabled by the host (${data.hostName})`, 'info', 4000);
    });

    socket.on("host-removed-you", (data) => {
      showNotification(`You have been removed from the meeting by the host (${data.hostName}). Reason: ${data.reason}`, 'error', 6000);
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 6000);
    });

    socket.on("meeting-ended-by-host", (data) => {
      showNotification(`The meeting has been ended by the host (${data.hostName || 'Host'}).`, 'info', 5000);
      cleanup();
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    });

    socket.on("host-muted-all", (data) => {
      if (userStream) {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioOn(false);
        }
      }
      showNotification(`All participants have been muted by the host (${data.hostName})`, 'warning', 4000);
    });

    socket.on("host-disabled-all-videos", (data) => {
      if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }
      showNotification(`All participant videos have been disabled by the host (${data.hostName})`, 'info', 4000);
    });

    // Participant status updates for UI
    socket.on("participant-status-update", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.participantId) {
          return {
            ...peer,
            isAudioOn: data.isAudioOn,
            isVideoOn: data.isVideoOn
          };
        }
        return peer;
      }));
    });

    // Hand raise synchronization
    socket.on("user-hand-raise", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isHandRaised: data.isHandRaised
          };
        }
        return peer;
      }));
      
      // Show notification when someone raises/lowers hand
      if (data.isHandRaised) {
        showNotification(`${data.userName} raised their hand`, 'info', 3000);
      }
    });

    // Screen sharing synchronization
    socket.on("user-screen-share", (data) => {
      console.log('📡 Received user-screen-share event:', data);
      
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          const updatedPeer = {
            ...peer,
            isScreenSharing: true,
            hasCamera: data.hasCamera || false,
            screenShareVideoOn: data.isVideoOn || false
          };
          console.log('📺 Updated peer for screen sharing:', updatedPeer);
          return updatedPeer;
        }
        return peer;
      }));
      
      showNotification(`${data.userName} started screen sharing`, 'info', 3000);
    });

    socket.on("user-stop-screen-share", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isScreenSharing: false,
            hasCamera: true, // Reset to default
            screenShareVideoOn: false
          };
        }
        return peer;
      }));
      
      showNotification(`${data.userName} stopped screen sharing`, 'info', 3000);
    });

    // Audio/Video toggle synchronization from other participants
    socket.on("user-toggle-audio", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isAudioOn: data.isAudioOn
          };
        }
        return peer;
      }));
    });

    socket.on("user-toggle-video", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isVideoOn: data.isVideoOn
          };
        }
        return peer;
      }));
    });
  };

  // Enhanced peer creation with better error handling
  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on("signal", signal => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("signal", { to: userToSignal, from: callerID, signal });
      }
    });

    peer.on("error", error => {
      console.warn('Peer connection error:', error);
      // Attempt reconnection logic could be added here
    });

    peer.on("connect", () => {
      console.log('Peer connected successfully');
      setConnectionQuality('good');
    });

    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on("signal", signal => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("signal", { to: callerID, from: socketRef.current.id, signal });
      }
    });

    peer.on("error", error => {
      console.warn('Peer connection error:', error);
    });

    if (incomingSignal) {
      try {
        peer.signal(incomingSignal);
      } catch (error) {
        console.warn('Error signaling incoming peer:', error);
      }
    }

    return peer;
  }, []);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (!enteredPasscode) {
      setPasscodeError("Passcode is required");
      return;
    }
    
    if (enteredPasscode === meetingDetails?.password) {
      setIsPasscodeVerified(true);
      setPasscodeError('');
      localStorage.setItem(`verified_passcode_${roomId}`, enteredPasscode);
      showNotification("Passcode verified successfully! Joining meeting...", "success");
    } else {
      setPasscodeError("Invalid passcode. Please try again.");
    }
  };

  // FIX: Guard against null stream; clear host-muted flag on manual unmute
  const toggleAudio = useCallback(() => {
    if (!userStream) {
      showNotification('No microphone stream. Check your device permissions.', 'warning');
      return;
    }
    const audioTrack = userStream.getAudioTracks()[0];
    if (!audioTrack) {
      showNotification('No microphone found. Please connect one.', 'warning');
      return;
    }
    
    // Block unmuting if restricted by host
    const isUnmuteRestricted = !isHost && !roomSecurity.allowUnmute;
    if (!isAudioOn && isUnmuteRestricted) {
      showNotification('The host has disabled participant unmuting.', 'warning');
      return;
    }

    const newState = !isAudioOn;
    audioTrack.enabled = newState;
    setIsAudioOn(newState);
    if (newState) setHostMutedAudio(false); // clear host-muted flag when manually unmuting
    socketRef.current?.emit('toggle-audio', newState);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [isAudioOn, userStream, showNotification, isHost, roomSecurity.allowUnmute]);

  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoOn) {
        // Turning video OFF: Stop all video tracks to release camera hardware completely
        if (userStream) {
          userStream.getVideoTracks().forEach(track => {
            track.stop();
            userStream.removeTrack(track);
          });
        }
        setIsVideoOn(false);
        socketRef.current?.emit('toggle-video', false);
        showNotification('Camera stopped, hardware released.', 'info', 2000);
      } else {
        // Turning video ON: Obtain fresh video track from hardware
        const constraints = {
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        if (newVideoTrack && userStream) {
          userStream.addTrack(newVideoTrack);
          
          // Replace track for all active peer connections dynamically
          peersRef.current.forEach(({ peer }) => {
            if (peer && !peer.destroyed) {
              try {
                const senders = peer._pc.getSenders();
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                if (sender) {
                  sender.replaceTrack(newVideoTrack);
                }
              } catch (peerErr) {
                console.warn("Could not replace track for peer:", peerErr);
              }
            }
          });
        }
        
        setIsVideoOn(true);
        setHostMutedVideo(false);
        socketRef.current?.emit('toggle-video', true);
        showNotification('Camera started.', 'info', 2000);
      }
      
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      console.error("Error toggling video track:", err);
      showNotification("Could not start camera. Make sure it isn't in use by another app.", "error");
    }
  }, [isVideoOn, userStream, selectedCameraId, showNotification]);

  // Canvas composition for dual-stream (screen + camera)
  const createCompositeStream = useCallback((screenStream, cameraStream) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const screenVideo = document.createElement('video');
    const cameraVideo = document.createElement('video');
    
    // Set canvas size to match screen share
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Setup video elements
    screenVideo.srcObject = screenStream;
    screenVideo.autoplay = true;
    screenVideo.muted = true;
    
    cameraVideo.srcObject = cameraStream;
    cameraVideo.autoplay = true;
    cameraVideo.muted = true;
    
    // Camera overlay dimensions and position
    const cameraWidth = 200;
    const cameraHeight = 150;
    const cameraX = canvas.width - cameraWidth - 20; // 20px from right edge
    const cameraY = 20; // 20px from top edge
    
    let animationFrame;
    
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw screen share (full canvas)
      if (screenVideo.readyState >= 3) { // HAVE_FUTURE_DATA
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      }
      
      // Draw camera overlay with rounded corners and border
      if (cameraVideo.readyState >= 3 && isVideoOn) {
        ctx.save();
        
        // Create rounded rectangle path for camera (with fallback)
        const radius = 12;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, radius);
        } else {
          // Fallback for browsers without roundRect support
          ctx.rect(cameraX, cameraY, cameraWidth, cameraHeight);
        }
        ctx.clip();
        
        // Draw camera video
        ctx.drawImage(cameraVideo, cameraX, cameraY, cameraWidth, cameraHeight);
        
        ctx.restore();
        
        // Draw border around camera
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, radius);
        } else {
          ctx.rect(cameraX, cameraY, cameraWidth, cameraHeight);
        }
        ctx.stroke();
        
        // Add "YOU" label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(cameraX, cameraY + cameraHeight - 25, cameraWidth, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', cameraX + cameraWidth/2, cameraY + cameraHeight - 8);
      }
      
      animationFrame = requestAnimationFrame(draw);
    };
    
    // Wait for both videos to be ready
    let screenReady = false;
    let cameraReady = false;
    
    const startDrawing = () => {
      if (screenReady && cameraReady) {
        draw();
      }
    };
    
    screenVideo.addEventListener('loadedmetadata', () => {
      // Adjust canvas size to match actual screen dimensions
      canvas.width = screenVideo.videoWidth || 1920;
      canvas.height = screenVideo.videoHeight || 1080;
    });
    
    screenVideo.addEventListener('canplay', () => {
      screenReady = true;
      startDrawing();
    });
    
    cameraVideo.addEventListener('canplay', () => {
      cameraReady = true;
      startDrawing();
    });
    
    // Force video loading
    screenVideo.load();
    cameraVideo.load();
    
    // Create stream from canvas
    const compositeStream = canvas.captureStream(30); // 30 FPS
    
    // Add audio tracks
    const audioTracks = screenStream.getAudioTracks();
    audioTracks.forEach(track => compositeStream.addTrack(track));
    
    const cameraAudioTracks = cameraStream.getAudioTracks();
    cameraAudioTracks.forEach(track => compositeStream.addTrack(track));
    
    // Cleanup function
    const cleanup = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      screenVideo.srcObject = null;
      cameraVideo.srcObject = null;
    };
    
    return { compositeStream, cleanup };
  }, [isVideoOn]);

  // Enhanced screen sharing with dual-stream support
  const startScreenShare = useCallback(async () => {
    if (!supportsScreenShare) {
      alert('Screen sharing is not supported in this browser or requires HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          logicalSurface: true,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Keep camera video in userVideo, put screen share in dedicated element
      if (screenShareVideo.current) {
        screenShareVideo.current.srcObject = stream;
      }

      // Create dual-stream composite (screen + camera)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && userStream && userStream.getVideoTracks().length > 0) {
        try {
          // Create composite stream with both screen and camera
          const { compositeStream, cleanup } = createCompositeStream(stream, userStream);
          
          // Store cleanup function for later
          setCompositeStreamCleanup(() => cleanup);
          
          // Send composite stream to all peers
          const compositeVideoTrack = compositeStream.getVideoTracks()[0];
          if (compositeVideoTrack) {
            peersRef.current.forEach(({ peer }) => {
              if (peer && !peer.destroyed) {
                try {
                  const sender = peer._pc?.getSenders?.()?.find(s => 
                    s.track && s.track.kind === 'video'
                  );
                  
                  if (sender && sender.replaceTrack) {
                    sender.replaceTrack(compositeVideoTrack).catch(error => {
                      console.warn('Failed to send composite stream:', error);
                    });
                  }
                } catch (error) {
                  console.warn('Error sending composite stream to peer:', error);
                }
              }
            });
          }
          
        } catch (error) {
          console.error('Error creating composite stream:', error);
          
          // Fallback to screen share only
          peersRef.current.forEach(({ peer }) => {
            if (peer && !peer.destroyed) {
              try {
                const sender = peer._pc?.getSenders?.()?.find(s => 
                  s.track && s.track.kind === 'video'
                );
                
                if (sender && sender.replaceTrack) {
                  sender.replaceTrack(videoTrack).catch(error => {
                    console.warn('Fallback: Failed to replace video track:', error);
                  });
                }
              } catch (fallbackError) {
                console.warn('Fallback also failed:', fallbackError);
              }
            }
          });
        }
      } else {
        console.log('📺 Sending screen share only (no camera available)');
        
        // Send screen share only if no camera available
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              const sender = peer._pc?.getSenders?.()?.find(s => 
                s.track && s.track.kind === 'video'
              );
              
              if (sender && sender.replaceTrack) {
                sender.replaceTrack(videoTrack).catch(error => {
                  console.warn('Failed to replace video track:', error);
                });
              }
            } catch (error) {
              console.warn('Error replacing track for screen share:', error);
            }
          }
        });
      }

      const screenShareData = { 
        userId: socketRef.current.id, 
        userName,
        hasCamera: !!userStream && userStream.getVideoTracks().length > 0,
        isVideoOn: isVideoOn
      };
      
      console.log('📤 Emitting start-screen-share:', screenShareData);
      socketRef.current?.emit("start-screen-share", screenShareData);

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error("Error starting screen share:", error);
      setIsScreenSharing(false);
      
      const errorMessages = {
        'NotAllowedError': 'Screen sharing permission denied. Please try again.',
        'NotFoundError': 'No screen available for sharing.',
        'NotSupportedError': 'Screen sharing is not supported in this browser.',
        'AbortError': 'Screen sharing was cancelled.'
      };

      const userMessage = errorMessages[error.name] || 'Failed to start screen sharing. Please try again.';
      alert(userMessage);
    }
  }, [supportsScreenShare, userStream, userName]);

  // Enhanced screen share stop with dual-stream support
  const stopScreenShare = useCallback(() => {
    console.log('🚫 Stopping screen share and cleaning up composite stream...');
    
    // Clean up composite stream
    if (compositeStreamCleanup) {
      try {
        compositeStreamCleanup();
        setCompositeStreamCleanup(null);
        console.log('✅ Composite stream cleaned up');
      } catch (error) {
        console.warn('Error cleaning up composite stream:', error);
      }
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping screen share track:', error);
        }
      });
      setScreenStream(null);
    }
    
    setIsScreenSharing(false);
    
    // Camera video stays in userVideo.current (no need to restore)
    // Just clear the screen share video element
    if (screenShareVideo.current) {
      screenShareVideo.current.srcObject = null;
    }

    // Restore camera track in peer connections
    if (userStream) {
      const cameraVideoTrack = userStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              const sender = peer._pc?.getSenders?.()?.find(s => 
                s.track && s.track.kind === 'video'
              );
              
              if (sender && sender.replaceTrack) {
                sender.replaceTrack(cameraVideoTrack).catch(error => {
                  console.warn('Failed to restore camera track:', error);
                });
              }
            } catch (error) {
              console.warn('Error restoring camera track:', error);
            }
          }
        });
      }
    }

    socketRef.current?.emit("stop-screen-share", { userId: socketRef.current.id, userName });
  }, [screenStream, userStream, userName, compositeStreamCleanup]);

  // Enhanced chat functions
  const sendMessage = useCallback(() => {
    if (message.trim() && socketRef.current) {
      const messageData = {
        sender: userName,
        message: message.trim(),
        type: 'text',
        time: new Date().toISOString(),
        id: Date.now() + Math.random()
      };
      
      socketRef.current.emit("chat-message", messageData);
      setMessage("");
      socketRef.current.emit("typing-stop");
    }
  }, [message, userName]);

  // Enhanced typing handler with debounce
  const handleTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("typing-start");
      
      // Debounce typing stop
      clearTimeout(handleTyping.timeoutId);
      handleTyping.timeoutId = setTimeout(() => {
        socketRef.current?.emit("typing-stop");
      }, 2000);
    }
  }, []);

  // Enhanced emoji system
  const sendEmoji = useCallback((emoji) => {
    setShowEmojiPicker(false);
    setShowReactions(false);
    
    const emojiData = { 
      emoji, 
      userId: socketRef.current?.id || `user_${Date.now()}`,
      userName: userName,
      id: `emoji_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      position: {
        left: `${15 + Math.random() * 70}%`,
        animationDelay: `${Math.random() * 0.5}s`
      }
    };
    
    // Add to local state immediately
    setActiveEmojis(prev => [...prev, emojiData]);
    
    // Broadcast to other participants
    if (socketRef.current?.connected) {
      socketRef.current.emit('emoji-reaction', {
        roomId: roomId,
        emojiData: emojiData
      });
    }
  }, [roomId, userName]);

  // Enhanced reaction removal
  const handleReactionComplete = useCallback((reactionId) => {
    setActiveEmojis(prev => prev.filter(e => e.id !== reactionId));
  }, []);

  // Enhanced hand raise toggle
  const toggleHandRaise = useCallback(() => {
    setIsHandRaised(!isHandRaised);
    socketRef.current?.emit('hand-raise-toggle', !isHandRaised);
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [isHandRaised]);

  // Memoized values for performance
  const activePeers = useMemo(() => peers.filter(p => p.peer && !p.peer.destroyed), [peers]);
  const totalParticipants = activePeers.length + 1;

  // showNotification is defined early (line ~354) — duplicate removed

  // Host controls
  const admitParticipant = useCallback((participantId) => {
    console.log('Admit participant called:', { participantId, roomId, isHost, socketConnected: !!socketRef.current });
    if (isHost && socketRef.current) {
      console.log('Emitting admit-participant event...');
      socketRef.current.emit('admit-participant', { participantId, roomId });
      showNotification('Attempting to admit participant...', 'info', 2000);
    } else {
      console.log('Cannot admit participant - not host or no socket connection');
      showNotification('Unable to admit participant', 'error');
    }
  }, [isHost, roomId, showNotification]);

  const rejectParticipant = useCallback((participantId) => {
    console.log('Reject participant called:', { participantId, roomId, isHost, socketConnected: !!socketRef.current });
    if (isHost && socketRef.current) {
      console.log('Emitting reject-participant event...');
      socketRef.current.emit('reject-participant', { participantId, roomId });
      showNotification('Attempting to reject participant...', 'info', 2000);
    } else {
      console.log('Cannot reject participant - not host or no socket connection');
      showNotification('Unable to reject participant', 'error');
    }
  }, [isHost, roomId, showNotification]);

  // Enhanced host controls for individual participants
  const muteParticipant = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Mute ${participantName}?`)) {
        socketRef.current.emit('host-mute-participant', { 
          participantId, 
          roomId,
          hostName: userName 
        });
        
        // Show feedback message
        console.log(`Host muted ${participantName}`);
      }
    }
  }, [isHost, roomId, userName]);

  const disableParticipantVideo = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Stop ${participantName}'s video?`)) {
        socketRef.current.emit('host-disable-video', { 
          participantId, 
          roomId,
          hostName: userName 
        });
        
        console.log(`Host disabled ${participantName}'s video`);
      }
    }
  }, [isHost, roomId, userName]);

  const removeParticipant = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Remove ${participantName} from the meeting?\n\nThis action cannot be undone.`)) {
        socketRef.current.emit('host-remove-participant', { 
          participantId, 
          roomId,
          hostName: userName,
          reason: 'Removed by host'
        });
        
        console.log(`Host removed ${participantName} from meeting`);
      }
    }
  }, [isHost, roomId, userName]);

  // Bulk host controls
  const muteAllParticipants = useCallback(() => {
    if (isHost && socketRef.current && activePeers.length > 0) {
      if (window.confirm(`Mute all participants (${activePeers.length})?`)) {
        socketRef.current.emit('host-mute-all', { 
          roomId,
          hostName: userName 
        });
        
        console.log('Host muted all participants');
      }
    }
  }, [isHost, roomId, userName, activePeers.length]);

  const disableAllVideos = useCallback(() => {
    if (isHost && socketRef.current && activePeers.length > 0) {
      if (window.confirm(`Stop all participants' videos (${activePeers.length})?`)) {
        socketRef.current.emit('host-disable-all-videos', { 
          roomId,
          hostName: userName 
        });
        
        console.log('Host disabled all participant videos');
      }
    }
  }, [isHost, roomId, userName, activePeers.length]);

  // Host Controls: Lock Meeting
  const toggleLockMeeting = useCallback(() => {
    if (!isHost || !socketRef.current) return;
    const newLockState = !meetingLocked;
    if (newLockState) {
      socketRef.current.emit("lock-meeting", { roomId });
    } else {
      socketRef.current.emit("unlock-meeting", { roomId });
    }
  }, [isHost, meetingLocked, roomId]);

  // Host Controls: Make Co-Host
  const makeCohost = useCallback((participantId, participantName) => {
    if (!isHost || !socketRef.current) return;
    if (window.confirm(`Make ${participantName} a co-host?`)) {
      socketRef.current.emit("make-cohost", { participantId, roomId });
    }
  }, [isHost, roomId]);

  // Host Controls: Ask to Unmute
  const askToUnmute = useCallback((participantId, participantName) => {
    if (!isHost || !socketRef.current) return;
    socketRef.current.emit("host-unmute-request", { participantId });
    showNotification(`Requested ${participantName} to unmute.`, 'info');
  }, [isHost, showNotification]);

  // Device Switching & Enumeration
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const microphones = devices.filter(d => d.kind === 'audioinput');
      setAvailableDevices({ cameras, microphones });
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, []);

  const changeDevice = useCallback(async (type, deviceId) => {
    if (!userStream) return;
    setIsSwitchingDevice(true);
    try {
      const currentVideoTrack = userStream.getVideoTracks()[0];
      const currentAudioTrack = userStream.getAudioTracks()[0];
      
      const constraints = {
        video: type === 'video' ? { deviceId: { exact: deviceId } } : (currentVideoTrack ? { deviceId: currentVideoTrack.getSettings().deviceId } : false),
        audio: type === 'audio' ? { deviceId: { exact: deviceId } } : (currentAudioTrack ? { deviceId: currentAudioTrack.getSettings().deviceId } : false)
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (type === 'video') {
        setSelectedCameraId(deviceId);
        const newTrack = newStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          userStream.removeTrack(currentVideoTrack);
          currentVideoTrack.stop();
        }
        userStream.addTrack(newTrack);
        
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            const sender = peer._pc?.getSenders?.()?.find(s => s.track && s.track.kind === 'video');
            if (sender && sender.replaceTrack) {
              sender.replaceTrack(newTrack);
            }
          }
        });
      } else {
        setSelectedMicId(deviceId);
        const newTrack = newStream.getAudioTracks()[0];
        if (currentAudioTrack) {
          userStream.removeTrack(currentAudioTrack);
          currentAudioTrack.stop();
        }
        userStream.addTrack(newTrack);
        
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            const sender = peer._pc?.getSenders?.()?.find(s => s.track && s.track.kind === 'audio');
            if (sender && sender.replaceTrack) {
              sender.replaceTrack(newTrack);
            }
          }
        });
      }
      
      if (userVideo.current) {
        userVideo.current.srcObject = userStream;
      }
      showNotification(`${type === 'video' ? 'Camera' : 'Microphone'} switched successfully!`, 'success');
    } catch (err) {
      console.error("Error switching device:", err);
      showNotification("Failed to switch device. It might be in use.", "error");
    } finally {
      setIsSwitchingDevice(false);
    }
  }, [userStream, showNotification]);

  // Screen recording (WebRTC Local Recording)
  const startRecording = useCallback(() => {
    if (!userStream) {
      showNotification("No stream to record.", "warning");
      return;
    }
    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }
      
      const chunks = [];
      const mediaRecorder = new MediaRecorder(userStream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Meeting_${roomId}_Record_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        showNotification("Recording stopped. File downloading...", "success");
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      showNotification("Recording started.", "success");
    } catch (err) {
      console.error("Error starting recording:", err);
      showNotification("Could not start recording.", "error");
    }
  }, [userStream, roomId, showNotification]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // File Upload Handlers (Max 10MB)
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showNotification("File size exceeds 10MB limit.", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        data: event.target.result // Base64 Data URL
      };
      socketRef.current?.emit("share-file", fileData);
    };
    reader.readAsDataURL(file);
    showNotification(`Uploading ${file.name}...`, 'info');
  }, [showNotification]);

  // Enumerate devices on settings load
  useEffect(() => {
    if (showSettings) {
      enumerateDevices();
    }
  }, [showSettings, enumerateDevices]);

  // Meeting controls & Cleanup
  const cleanup = useCallback(() => {
    peersRef.current.forEach(({ peer }) => {
      try {
        if (peer && !peer.destroyed) {
          peer.destroy();
        }
      } catch (error) {
        console.warn('Error destroying peer during cleanup:', error);
      }
    });
    
    userStream?.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Error stopping user stream track:', error);
      }
    });
    
    screenStream?.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Error stopping screen stream track:', error);
      }
    });
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, [userStream, screenStream]);

  const endCall = useCallback(() => {
    cleanup();
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  }, [onClose, navigate, cleanup]);

  const toggleSecurityPermission = useCallback((key) => {
    if (!isHost || !socketRef.current) return;
    const newPerm = !roomSecurity[key];
    const updated = { ...roomSecurity, [key]: newPerm };
    setRoomSecurity(updated);
    socketRef.current.emit("host-toggle-security", { roomId, permissions: { [key]: newPerm } });
    if (navigator.vibrate) navigator.vibrate(40);
  }, [isHost, roomSecurity, roomId]);

  const endMeetingForAll = useCallback(() => {
    if (!isHost || !socketRef.current) return;
    if (window.confirm("Are you sure you want to end this meeting for everyone?")) {
      socketRef.current.emit("end-meeting-for-all", { roomId });
      setShowEndModal(false);
      
      // Local fallback cleanup and redirect to guarantee the button never fails
      setTimeout(() => {
        cleanup();
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 500);
    }
  }, [isHost, roomId, cleanup, onClose, navigate]);

  // Cyber Score and Rating Functions
  const openRatingModal = useCallback((participant) => {
    if (!isHost) {
      showNotification('Only the host can rate participants', 'warning');
      return;
    }
    
    setSelectedParticipantForRating(participant);
    setShowRatingModal(true);
  }, [isHost, showNotification]);
  
  const openAwardModal = useCallback((participant) => {
    if (!isHost) {
      showNotification('Only the host can award participants', 'warning');
      return;
    }
    
    setSelectedParticipantForAward(participant);
    setShowAwardModal(true);
  }, [isHost, showNotification]);
  
  const submitParticipantRating = useCallback(async (participantSocketId, ratingData) => {
    try {
      // Find the participant by socketId
      const participant = activePeers.find(p => p.socketId === participantSocketId);
      if (!participant) {
        throw new Error('Participant not found');
      }
      
      // Use participant's userId, but fallback to socketId if not available
      const targetUserId = participant.userId || participant.socketId;
      
      if (!targetUserId) {
        throw new Error('Unable to identify participant for rating');
      }
      
      console.log('Submitting rating for participant:', {
        userName: participant.userName,
        userId: participant.userId,
        socketId: participant.socketId,
        targetUserId,
        ratingData
      });
      
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/rate/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ratingData,
          meetingId: roomId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          `${participant.userName} has been rated. Score: ${data.result.previousScore} → ${data.result.newScore}`,
          'success',
          6000
        );
        
        // Update the participant's cyber score in local state
        setPeers(prev => prev.map(p => 
          p.socketId === participantSocketId 
            ? { ...p, cyberScore: { ...p.cyberScore, currentScore: data.result.newScore, reputationLevel: data.result.reputationLevel } }
            : p
        ));
        
        console.log('Rating submitted successfully:', data.result);
      } else {
        throw new Error(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      showNotification(`Failed to submit rating: ${error.message}`, 'error');
    }
  }, [activePeers, roomId, showNotification]);
  
  const submitParticipantAward = useCallback(async (participantSocketId, awardData) => {
    try {
      // Find the participant by socketId
      const participant = activePeers.find(p => p.socketId === participantSocketId);
      if (!participant) {
        throw new Error('Participant not found');
      }
      
      // Use participant's userId, but fallback to socketId if not available
      const targetUserId = participant.userId || participant.socketId;
      
      if (!targetUserId) {
        throw new Error('Unable to identify participant for award');
      }
      
      console.log('Submitting award for participant:', {
        userName: participant.userName,
        userId: participant.userId,
        socketId: participant.socketId,
        targetUserId,
        awardData
      });
      
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/award/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...awardData,
          meetingId: roomId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          `🎉 ${participant.userName} has been awarded! Score: ${data.result.previousScore} → ${data.result.newScore} (+${data.result.pointsAwarded} pts)`,
          'success',
          6000
        );
        
        // Update the participant's cyber score in local state
        setPeers(prev => prev.map(p => 
          p.socketId === participantSocketId 
            ? { ...p, cyberScore: { ...p.cyberScore, currentScore: data.result.newScore, reputationLevel: data.result.reputationLevel } }
            : p
        ));
        
        console.log('Award submitted successfully:', data.result);
      } else {
        throw new Error(data.message || 'Failed to submit award');
      }
    } catch (error) {
      console.error('Error submitting award:', error);
      showNotification(`Failed to submit award: ${error.message}`, 'error');
    }
  }, [activePeers, roomId, showNotification]);
  
  const fetchCyberScores = useCallback(async (userIds) => {
    try {
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds })
      });
      
      const data = await response.json();
      if (data.success) {
        setCyberScores(data.cyberScores);
      }
    } catch (error) {
      console.error('Error fetching cyber scores:', error);
    }
  }, []);
  
  // Fetch cyber scores when participants change
  useEffect(() => {
    const userIds = activePeers.map(p => p.userId || p.socketId).filter(Boolean);
    if (userIds.length > 0) {
      fetchCyberScores(userIds);
    }
  }, [activePeers, fetchCyberScores]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'm':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleAudio();
          }
          break;
        case 'v':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleVideo();
          }
          break;
        case 's':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            isScreenSharing ? stopScreenShare() : startScreenShare();
          }
          break;
        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowReactions(!showReactions);
          }
          break;
        case 'c':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowChat(!showChat);
          }
          break;
        case 'p':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowParticipants(!showParticipants);
          }
          break;
        case 'g':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker');
          }
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleHandRaise();
          }
          break;
        case 'escape':
          setShowChat(false);
          setShowParticipants(false);
          setShowReactions(false);
          setShowMoreOptions(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleAudio, toggleVideo, isScreenSharing, startScreenShare, stopScreenShare, 
      showReactions, showChat, showParticipants, viewMode, toggleHandRaise]);

  // Authentication check - moved after all hooks to comply with Rules of Hooks
  if (!userId && isAuthenticated === false) {
    return (
      <div className="meeting-error">
        <h2>Authentication Required</h2>
        <p>You must be logged in to join meetings.</p>
        <button onClick={() => navigate('/login')}>Login</button>
      </div>
    );
  }

  // Passcode gate UI (Zoom Mode)
  if (!isPasscodeVerified && meetingDetails?.password) {
    return (
      <div className="live-meeting-container passcode-gate">
        <div className="passcode-gate-content glassmorphic-card">
          <div className="passcode-header">
            <div className="passcode-icon-badge">
              <FaLock className="lock-badge-icon" />
            </div>
            <h2>Enter Meeting Passcode</h2>
            <p className="passcode-subtitle">This meeting is passcode-protected. Please enter the correct passcode to enter the waiting room or join the session.</p>
          </div>
          
          <form onSubmit={handlePasscodeSubmit} className="passcode-form">
            <div className="input-group">
              <input
                type="password"
                placeholder="Passcode"
                value={enteredPasscode}
                onChange={(e) => setEnteredPasscode(e.target.value)}
                className={`passcode-input ${passcodeError ? 'input-error' : ''}`}
                autoFocus
                required
              />
              {passcodeError && <span className="error-message-alert">{passcodeError}</span>}
            </div>
            
            <div className="passcode-actions">
              <button 
                type="button" 
                className="control-btn secondary"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
              <button 
                type="submit" 
                className="control-btn primary"
              >
                Verify & Join
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Waiting room UI
  if (isInWaitingRoom && !isAdmitted) {
    return (
      <div className="live-meeting-container waiting-room">
        <div className="waiting-room-content">
          <div className="waiting-room-header">
            <h2>Waiting to join meeting</h2>
            <p>Room ID: {roomId}</p>
          </div>
          
          <div className="waiting-room-body">
            <div className="waiting-icon">
              <FaHourglassHalf className="hourglass-icon" />
            </div>
            
            <h3>Please wait</h3>
            <p className="waiting-message">{waitingMessage}</p>
            
            <div className="waiting-info">
              <div className="user-info">
                <FaUserCheck className="user-icon" />
                <span>Joining as: <strong>{userName}</strong></span>
              </div>
            </div>
            
            <div className="waiting-actions">
              <button 
                className="control-btn secondary"
                onClick={endCall}
              >
                <FaTimes />
                <span>Leave</span>
              </button>
            </div>
          </div>
          
          <div className="waiting-room-footer">
            <p>The host will be notified of your request to join.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-meeting-container">
      {/* Enhanced Top Bar */}
      <div className="meeting-topbar">
        <div className="topbar-left">
          <div className="meeting-info">
            <h3>Meeting Room: {roomId}</h3>
            {isHost && <FaCrown className="host-icon" />}
            {meetingLocked && <FaLock className="lock-icon" />}
          </div>
        </div>
        
        <div className="topbar-center">
          <div className="connection-status">
            <ConnectionQualityIndicator quality={connectionQuality} />
          </div>
        </div>
        
        <div className="topbar-right">
          <button 
            className="view-toggle-btn"
            onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
            title={`Switch to ${viewMode === 'speaker' ? 'gallery' : 'speaker'} view`}
          >
            <FaTh />
            <span>{viewMode === 'speaker' ? 'Gallery' : 'Speaker'} View</span>
          </button>
          
          <div className="participants-count">
            <FaUsers />
            <span>{totalParticipants}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Main Video Area */}
      <div className="meeting-content">
        <div className={`video-area ${viewMode}-view`}>
          {viewMode === 'speaker' ? (
            <div className="speaker-layout">
              <div className="main-video-container">
                {isScreenSharing ? (
                  // When screen sharing, show screen share as main video
                  <>
                    <video 
                      ref={screenShareVideo} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="main-video screen-share-main"
                    />
                    <div className="video-overlay">
                      <div className="participant-name">
                        {userName} (You) - Screen Share
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                        <FaDesktop className="screen-share-icon" />
                      </div>
                    </div>
                    
                    {/* Camera picture-in-picture when screen sharing */}
                    <div className="camera-pip">
                      {!isVideoOn ? (
                        <CameraOffPlaceholder name={userName} isHost={isHost} size="small" />
                      ) : (
                        <video 
                          ref={userVideo} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="pip-video"
                        />
                      )}
                      <div className="pip-overlay">
                        <span className="pip-label">You</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Normal camera view when not screen sharing
                  <>
                    {!isVideoOn ? (
                      <CameraOffPlaceholder name={userName} isHost={isHost} size="normal" />
                    ) : (
                      <video 
                        ref={userVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="main-video"
                      />
                    )}
                    <div className="video-overlay">
                      <div className="participant-name">
                        {userName} (You) - Camera
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {activePeers.length > 0 && (
                <div className="participants-strip">
                  {activePeers.map((peer, index) => (
                    <EnhancedVideoTile 
                      key={peer.socketId || index} 
                      peer={peer.peer} 
                      userName={peer.userName}
                      isSmall={true}
                      isAudioOn={peer.isAudioOn}
                      isVideoOn={peer.isVideoOn}
                      isHandRaised={peer.isHandRaised}
                      isScreenSharing={peer.isScreenSharing}
                      hasCamera={peer.hasCamera !== false}
                      isHost={peer.isHost}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gallery-layout">
              <div className="video-grid">
                {isScreenSharing ? (
                  // Show both camera and screen share in gallery when screen sharing
                  <>
                    <div className="video-tile screen-share-tile">
                      <video 
                        ref={screenShareVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="participant-video screen-share-video"
                      />
                      <div className="video-overlay">
                        <div className="participant-name">
                          {userName} (You) - Screen Share
                          {isHost && <FaCrown className="host-badge" />}
                          {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                          {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                          <FaDesktop className="screen-share-icon" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="video-tile camera-tile">
                      {!isVideoOn ? (
                        <CameraOffPlaceholder name={userName} isHost={isHost} size="normal" />
                      ) : (
                        <video 
                          ref={userVideo} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="participant-video camera-video"
                        />
                      )}
                      <div className="video-overlay">
                        <div className="participant-name">
                          {userName} (You) - Camera
                          {isHost && <FaCrown className="host-badge" />}
                          {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                          {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Normal camera view when not screen sharing
                  <div className="video-tile">
                    {!isVideoOn ? (
                      <CameraOffPlaceholder name={userName} isHost={isHost} size="normal" />
                    ) : (
                      <video 
                        ref={userVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="participant-video"
                      />
                    )}
                    <div className="video-overlay">
                      <div className="participant-name">
                        {userName} (You) - Camera
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                      </div>
                    </div>
                  </div>
                )}
                
                {activePeers.map((peer, index) => (
                  <EnhancedVideoTile 
                    key={peer.socketId || index} 
                    peer={peer.peer} 
                    userName={peer.userName}
                    isAudioOn={peer.isAudioOn}
                    isVideoOn={peer.isVideoOn}
                    isHandRaised={peer.isHandRaised}
                    isScreenSharing={peer.isScreenSharing}
                    hasCamera={peer.hasCamera !== false}
                    isHost={peer.isHost}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Reactions Overlay */}
        {activeEmojis.length > 0 && (
          <div className="reactions-overlay">
            {activeEmojis.map((emojiData) => (
              <FloatingReaction
                key={emojiData.id}
                emoji={emojiData.emoji}
                sender={emojiData.userName}
                position={emojiData.position}
                onComplete={() => handleReactionComplete(emojiData.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Controls Bar */}
      <div className="meeting-controls">
        <div className="controls-left">
          <div className="control-group">
            <button 
              className={`control-btn ${!isAudioOn ? 'danger' : 'primary'}`}
              onClick={toggleAudio}
              title={`${isAudioOn ? 'Mute' : 'Unmute'} (M)`}
            >
              {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <span>{isAudioOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button 
              className="dropdown-btn" 
              onClick={() => setShowSettings(!showSettings)} 
              title="Audio settings"
            >
              <FaChevronUp />
            </button>
          </div>

          <div className="control-group">
            <button 
              className={`control-btn ${!isVideoOn ? 'danger' : 'primary'}`}
              onClick={toggleVideo}
              title={`${isVideoOn ? 'Stop' : 'Start'} Video (V)`}
            >
              {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              <span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>
            <button 
              className="dropdown-btn" 
              onClick={() => setShowSettings(!showSettings)} 
              title="Video settings"
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className="controls-center">
          {supportsScreenShare && (() => {
            const isScreenShareRestricted = !isHost && !roomSecurity.allowScreenShare;
            return (
              <div className="control-group">
                <button 
                  className={`control-btn secondary ${isScreenSharing ? 'active' : ''} ${isScreenShareRestricted ? 'restricted' : ''}`}
                  onClick={() => {
                    if (isScreenShareRestricted) {
                      showNotification("Screen sharing has been disabled by the host.", "warning");
                      return;
                    }
                    isScreenSharing ? stopScreenShare() : startScreenShare();
                  }}
                  title={isScreenShareRestricted ? 'Screen Share disabled by host' : `${isScreenSharing ? 'Stop' : 'Start'} Screen Share (S)`}
                  disabled={(!userStream && !isScreenShareRestricted) || isSwitchingDevice}
                >
                  {isScreenShareRestricted ? <FaLock style={{ color: 'var(--accent-red)' }} /> : <FaDesktop />}
                  <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
                </button>
              </div>
            );
          })()}

          {isHost && (
            <button 
              className={`control-btn secondary ${showSecurityModal ? 'active' : ''}`}
              onClick={() => setShowSecurityModal(!showSecurityModal)}
              title="Security Center"
            >
              <FaShieldAlt style={{ color: 'var(--accent-blue)' }} />
              <span>Security</span>
            </button>
          )}

          <button 
            className={`control-btn secondary ${showParticipants ? 'active' : ''} participants-control-btn`}
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants (P)"
          >
            <div className="icon-wrapper">
              <FaUsers />
              {isHost && waitingParticipants.length > 0 && (
                <span className="waiting-badge">{waitingParticipants.length}</span>
              )}
            </div>
            <span>Participants</span>
          </button>

          <button 
            className={`control-btn secondary ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Chat (C)"
          >
            <FaComment />
            <span>Chat</span>
          </button>

          <button 
            className={`control-btn secondary ${showReactions ? 'active' : ''}`}
            onClick={() => setShowReactions(!showReactions)}
            title="Reactions (R)"
          >
            <FaSmile />
            <span>Reactions</span>
          </button>

          <button 
            className={`control-btn secondary ${isHandRaised ? 'active' : ''}`}
            onClick={toggleHandRaise}
            title={`${isHandRaised ? 'Lower' : 'Raise'} Hand (H)`}
          >
            <FaHandPaper />
            <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>

          <button 
            className={`control-btn secondary ${showMoreOptions ? 'active' : ''}`}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            title="More Options"
          >
            <FaEllipsisH />
            <span>More</span>
          </button>
        </div>

        <div className="controls-right">
          {isHost ? (
            <button 
              className="control-btn danger end-btn"
              onClick={() => setShowEndModal(true)}
              title="End / Leave Meeting"
            >
              <FaPhone />
              <span>Leave / End</span>
            </button>
          ) : (
            <button 
              className="control-btn danger end-btn"
              onClick={endCall}
              title="Leave Meeting"
            >
              <FaPhone />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave vs End Modal for Hosts */}
      {showEndModal && (
        <div className="meeting-modal-overlay">
          <div className="meeting-modal-content">
            <h3>Exit Meeting</h3>
            <p>You are the host. Would you like to end the meeting for everyone or just leave?</p>
            <div className="modal-actions">
              <button className="modal-btn danger" onClick={endMeetingForAll}>
                End Meeting for All
              </button>
              <button className="modal-btn secondary" onClick={endCall}>
                Leave Meeting
              </button>
              <button className="modal-btn" onClick={() => setShowEndModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Options Dropdown Panel */}
      {showMoreOptions && (
        <div className="more-options-dropdown">
          <button 
            className={`dropdown-item ${isRecording ? 'recording-active' : ''}`} 
            onClick={isRecording ? stopRecording : startRecording}
          >
            <FaMicrophone className={isRecording ? 'pulse' : ''} />
            <span>{isRecording ? 'Stop Recording' : 'Record Locally'}</span>
          </button>

          {isHost && (
            <button className="dropdown-item" onClick={toggleLockMeeting}>
              {meetingLocked ? <FaUnlock /> : <FaLock />}
              <span>{meetingLocked ? 'Unlock Meeting' : 'Lock Meeting'}</span>
            </button>
          )}

          <button className="dropdown-item" onClick={() => { setShowSettings(true); setShowMoreOptions(false); }}>
            <FaCog />
            <span>Device Settings</span>
          </button>

          <button className="dropdown-item" onClick={() => {
            const meetingTitle = meetingDetails?.title || "JointRight Meeting";
            const pwd = meetingDetails?.password || "";
            const inviteText = `You're invited to join my meeting!\n\nMeeting: "${meetingTitle}"\n\n🔗 Direct Join Link: ${window.location.origin}/live/${roomId}\n\nOr use credentials:\nMeeting ID: ${roomId}\nPassword: ${pwd}`;
            navigator.clipboard.writeText(inviteText);
            showNotification("Complete invite details copied to clipboard!", "success");
          }}>
            <FaUserPlus />
            <span>Copy Join Details</span>
          </button>
        </div>
      )}

      {/* Device Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="panel-header">
            <h3>Device Settings</h3>
            <button className="close-btn" onClick={() => setShowSettings(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="settings-body">
            {isSwitchingDevice && (
              <div className="switching-overlay">
                <div className="loading-spinner"></div>
                <p>Switching device...</p>
              </div>
            )}
            
            <div className="setting-control">
              <label><FaVideo /> Camera Select</label>
              <select 
                value={selectedCameraId}
                onChange={(e) => changeDevice('video', e.target.value)}
                disabled={isSwitchingDevice}
              >
                <option value="">Default Camera</option>
                {availableDevices.cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-control">
              <label><FaMicrophone /> Microphone Select</label>
              <select 
                value={selectedMicId}
                onChange={(e) => changeDevice('audio', e.target.value)}
                disabled={isSwitchingDevice}
              >
                <option value="">Default Microphone</option>
                {availableDevices.microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reactions Panel */}
      {showReactions && (
        <div className="reactions-panel">
          <div className="panel-header">
            <h4>Quick Reactions</h4>
            <button 
              className="close-btn"
              onClick={() => setShowReactions(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="reactions-grid">
            <button onClick={() => sendEmoji('👍')} title="Thumbs Up">
              <span>👍</span>
              <span>Thumbs Up</span>
            </button>
            <button onClick={() => sendEmoji('❤️')} title="Heart">
              <span>❤️</span>
              <span>Heart</span>
            </button>
            <button onClick={() => sendEmoji('😂')} title="Laugh">
              <span>😂</span>
              <span>Laugh</span>
            </button>
            <button onClick={() => sendEmoji('😢')} title="Sad">
              <span>😢</span>
              <span>Sad</span>
            </button>
            <button onClick={() => sendEmoji('👏')} title="Clap">
              <span>👏</span>
              <span>Clap</span>
            </button>
            <button onClick={() => sendEmoji('🎉')} title="Celebrate">
              <span>🎉</span>
              <span>Celebrate</span>
            </button>
          </div>
          
          <div className="emoji-section">
            <h5>More Emojis</h5>
            <button 
              className={`emoji-picker-btn ${showEmojiPicker ? 'active' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <FaSmile /> <span>Show More</span>
            </button>
            
            {showEmojiPicker && (
              <div className="emoji-picker">
                <div className="emoji-grid">
                  {['😀', '😂', '😍', '🥰', '😎', '🤔', '😮', '😱', '🙄', '😴', '🤗', '🤝', 
                    '👏', '🙌', '👍', '👎', '✊', '👌', '🤟', '✌️', '🤞', '🙏', '💪', '🔥',
                    '⭐', '✨', '🎉', '🎊', '❤️', '💙', '💚', '💛', '💜', '🧡', '🤍', '🖤'].map(emoji => (
                    <button 
                      key={emoji} 
                      className="emoji-btn"
                      onClick={() => sendEmoji(emoji)}
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="panel-header">
            <h3>Chat & Shared Files</h3>
            <button 
              className="close-btn"
              onClick={() => setShowChat(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className="message-header">
                  <span className="sender-name">{msg.sender}</span>
                  <span className="message-time">
                    {new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}

            {/* Shared Files render view with download capability */}
            {sharedFiles.map((file) => (
              <div key={file.id} className={`chat-message shared-file-bubble ${file.isMine ? 'my-file' : ''}`}>
                <div className="message-header">
                  <span className="sender-name">{file.senderName}</span>
                  <span className="message-time">
                    {new Date(file.receivedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="file-box">
                  <div className="file-icon-box">
                    <FaFile className="shared-file-icon" />
                  </div>
                  <div className="file-info-text">
                    <span className="file-name" title={file.fileName}>{file.fileName}</span>
                    <span className="file-size">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <a 
                    href={file.data} 
                    download={file.fileName}
                    className="file-download-btn"
                    title="Download File"
                  >
                    <FaDownload />
                  </a>
                </div>
              </div>
            ))}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.map(user => user.userName).join(', ')} 
                {typingUsers.length === 1 ? ' is' : ' are'} typing...
              </div>
            )}
          </div>
          
          {(() => {
            const isChatRestricted = !isHost && !roomSecurity.allowChat;
            return (
              <div className="chat-input-container">
                <div className="chat-input-row">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (isChatRestricted) return;
                      if (e.key === 'Enter') sendMessage();
                      handleTyping();
                    }}
                    placeholder={isChatRestricted ? "Chat is disabled by the host." : "Type a message..."}
                    className={`chat-input ${isChatRestricted ? 'restricted' : ''}`}
                    maxLength={500}
                    disabled={isChatRestricted}
                  />
                  <label 
                    className={`file-input-btn ${isChatRestricted ? 'disabled' : ''}`} 
                    title={isChatRestricted ? "File sharing disabled by host" : "Share file (Max 10MB)"}
                  >
                    <FaFile />
                    {!isChatRestricted && (
                      <input 
                        type="file" 
                        onChange={handleFileUpload}
                        style={{display: 'none'}}
                      />
                    )}
                  </label>
                  <button 
                    className="send-btn" 
                    onClick={sendMessage}
                    disabled={isChatRestricted || !message.trim()}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Enhanced Participants Panel */}
      {showParticipants && (
        <div className="participants-panel">
          <div className="panel-header">
            <h3>Participants ({totalParticipants})</h3>
            <button 
              className="close-btn"
              onClick={() => setShowParticipants(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          {isHost && (
            <div className="host-controls">
              <button 
                className="host-control-btn"
                onClick={muteAllParticipants}
                disabled={activePeers.length === 0}
                title={`Mute all ${activePeers.length} participants`}
              >
                <FaMicrophoneSlash /> Mute All ({activePeers.length})
              </button>
              <button 
                className="host-control-btn"
                onClick={disableAllVideos}
                disabled={activePeers.length === 0}
                title={`Stop all ${activePeers.length} participants' videos`}
              >
                <FaVideoSlash /> Stop All Video ({activePeers.length})
              </button>
            </div>
          )}
          
          <div className="participants-list">
            <div className="participant-item">
              <div className="participant-info">
                <span className="participant-name">
                  {userName} (You)
                  {isHost && <FaCrown className="host-badge" />}
                </span>
                <div className="participant-status">
                  {!isAudioOn && <FaMicrophoneSlash className="status-muted" />}
                  {!isVideoOn && <FaVideoSlash className="status-video-off" />}
                  {isHandRaised && <FaHandPaper className="status-hand-raised" />}
                </div>
              </div>
            </div>
            
            {activePeers.map((peer, index) => {
              const rawPeerScore = cyberScores[peer.userId || peer.socketId] || peer.cyberScore || {};
              const userScore = {
                currentScore: rawPeerScore.currentScore !== undefined ? rawPeerScore.currentScore : (rawPeerScore.score !== undefined ? rawPeerScore.score : 85),
                reputationLevel: rawPeerScore.reputationLevel !== undefined ? rawPeerScore.reputationLevel : (rawPeerScore.level !== undefined ? rawPeerScore.level : 'good'),
                isRestricted: rawPeerScore.isRestricted || false,
                totalMeetings: rawPeerScore.totalMeetings || 0
              };
              return (
                <div key={peer.socketId || index} className="participant-item">
                  <div className="participant-info">
                    <span className="participant-name">
                      {peer.userName}
                      {peer.isHost && <FaCrown className="host-badge" />}
                    </span>
                    <div className="participant-status">
                      {peer.isAudioOn === false && <FaMicrophoneSlash className="status-muted" />}
                      {peer.isVideoOn === false && <FaVideoSlash className="status-video-off" />}
                      {peer.isHandRaised && <FaHandPaper className="status-hand-raised" />}
                      {peer.isScreenSharing && <FaDesktop className="status-screen-sharing" />}
                    </div>
                    <div className="participant-cyber-score">
                      <CyberScoreBadge 
                        score={userScore.currentScore}
                        reputationLevel={userScore.reputationLevel}
                        size="mini"
                        showLabel={false}
                        isRestricted={userScore.isRestricted}
                        totalMeetings={userScore.totalMeetings}
                      />
                    </div>
                  </div>
                  {isHost && (
                    <div className="participant-controls">
                      <button 
                        title="Make Co-Host" 
                        className="participant-control-btn cohost-btn"
                        onClick={() => makeCohost(peer.socketId, peer.userName)}
                        disabled={peer.isHost}
                      >
                        <FaCrown />
                      </button>
                      <button 
                        title="Ask to Unmute" 
                        className="participant-control-btn unmute-request-btn"
                        onClick={() => askToUnmute(peer.socketId, peer.userName)}
                        disabled={peer.isAudioOn !== false}
                      >
                        <FaMicrophone />
                      </button>
                      <button 
                        title="Award participant" 
                        className="participant-control-btn award-btn"
                        onClick={() => openAwardModal({...peer, cyberScore: userScore})}
                      >
                        <FaStar />
                      </button>
                      <button 
                        title="Rate participant behavior" 
                        className="participant-control-btn rate-btn"
                        onClick={() => openRatingModal({...peer, cyberScore: userScore})}
                      >
                        <FaExclamationTriangle />
                      </button>
                      <button 
                        title="Mute participant" 
                        className="participant-control-btn mute-btn"
                        onClick={() => muteParticipant(peer.socketId, peer.userName)}
                      >
                        <FaMicrophoneSlash />
                      </button>
                      <button 
                        title="Stop participant video" 
                        className="participant-control-btn video-btn"
                        onClick={() => disableParticipantVideo(peer.socketId, peer.userName)}
                      >
                        <FaVideoSlash />
                      </button>
                      <button 
                        title="Remove participant" 
                        className="participant-control-btn remove-btn"
                        onClick={() => removeParticipant(peer.socketId, peer.userName)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Waiting Room Section for Hosts */}
          {isHost && waitingParticipants.length > 0 && (
            <div className="waiting-room-section">
              <h4>Waiting Room ({waitingParticipants.length})</h4>
              <div className="waiting-participants-list">
                {waitingParticipants.map((participant) => {
                  const rawScore = participant.cyberScore || {};
                  const waitingScore = {
                    currentScore: rawScore.currentScore !== undefined ? rawScore.currentScore : (rawScore.score !== undefined ? rawScore.score : 85),
                    reputationLevel: rawScore.reputationLevel !== undefined ? rawScore.reputationLevel : (rawScore.level !== undefined ? rawScore.level : 'good'),
                    isRestricted: rawScore.isRestricted || false,
                    totalMeetings: rawScore.totalMeetings || 0
                  };
                  return (
                    <div key={participant.socketId} className="waiting-participant-item">
                      <div className="participant-info">
                        <span className="participant-name">{participant.userName}</span>
                        <div className="participant-cyber-score">
                          <CyberScoreBadge 
                            score={waitingScore.currentScore}
                            reputationLevel={waitingScore.reputationLevel}
                            size="small"
                            showLabel={true}
                            isRestricted={waitingScore.isRestricted}
                            totalMeetings={waitingScore.totalMeetings}
                          />
                        </div>
                      </div>
                      <div className="admission-controls">
                        <button 
                          className="admit-btn"
                          onClick={() => admitParticipant(participant.socketId)}
                          title="Admit"
                        >
                          <FaCheck />
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => rejectParticipant(participant.socketId)}
                          title="Reject"
                        >
                          <FaBan />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Host Security Center Modal */}
      {showSecurityModal && isHost && (
        <div className="security-modal-overlay" onClick={() => setShowSecurityModal(false)}>
          <div className="security-modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <div className="security-modal-header">
              <FaShieldAlt className="security-header-icon" />
              <h3>Security Center</h3>
              <button className="close-btn" onClick={() => setShowSecurityModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="security-modal-body">
              <div className="security-section">
                <h4>Meeting Lock</h4>
                <div className="security-item">
                  <div className="security-item-info">
                    <span className="item-title">Lock Meeting</span>
                    <span className="item-desc">Prevent any new participants from joining this session.</span>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={meetingLocked} 
                      onChange={toggleLockMeeting}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="security-section border-top">
                <h4>Participant Permissions</h4>
                <p className="section-subtitle">Allow participants to perform the following actions:</p>
                
                <div className="security-item">
                  <div className="security-item-info">
                    <span className="item-title">Share Screen</span>
                    <span className="item-desc">Allow users to share their desktop windows.</span>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={roomSecurity.allowScreenShare} 
                      onChange={() => toggleSecurityPermission('allowScreenShare')}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="security-item-info">
                    <span className="item-title">Chat & Share Files</span>
                    <span className="item-desc">Allow users to send messages and attachments in the chat.</span>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={roomSecurity.allowChat} 
                      onChange={() => toggleSecurityPermission('allowChat')}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="security-item-info">
                    <span className="item-title">Unmute Microphone</span>
                    <span className="item-desc">Allow users to unmute themselves.</span>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={roomSecurity.allowUnmute} 
                      onChange={() => toggleSecurityPermission('allowUnmute')}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Host Rating Modal */}
      <HostRatingModal 
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setSelectedParticipantForRating(null);
        }}
        participant={selectedParticipantForRating}
        onSubmitRating={submitParticipantRating}
        currentUser={currentUser}
        meetingId={roomId}
      />
      
      {/* Host Award Modal */}
      <HostAwardModal 
        isOpen={showAwardModal}
        onClose={() => {
          setShowAwardModal(false);
          setSelectedParticipantForAward(null);
        }}
        participant={selectedParticipantForAward}
        onSubmitAward={submitParticipantAward}
        currentUser={currentUser}
        meetingId={roomId}
      />
      
      {/* Notifications Toast */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification toast ${notification.type}`}
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
              <div className="notification-content">
                <span className="notification-message">{notification.message}</span>
                <button className="notification-close">
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(EnhancedLiveMeeting);