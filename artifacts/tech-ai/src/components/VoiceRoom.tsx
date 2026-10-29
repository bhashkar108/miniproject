import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, createLocalAudioTrack, LocalAudioTrack } from 'livekit-client';
import { io, Socket } from 'socket.io-client';

export interface VoiceRoomProps {
  userName?: string;
  userPhoto?: string;
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

export interface RoomItem {
  id: string;
  name: string;
  category: string;
  host: string;
  initials: string;
  count: number;
  capacity: number;
  access: 'Public' | 'Private';
  approval: boolean;
  allowMembers?: boolean;
  description: string;
  color?: string;
  live: boolean;
  created?: boolean;
  locked?: boolean;
  chatEnabled?: boolean;
}

interface Participant {
  name: string;
  initials: string;
  role: string;
  color: string;
  isHost?: boolean;
  isMe?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  id?: string;
  socketId?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderInitials: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'mic-denied' | 'room-full';

const DEFAULT_ROOMS: RoomItem[] = [
  {
    id: 'demo-english',
    name: 'English Speaking Circle',
    category: 'Language Practice',
    host: 'Aarav Sharma',
    initials: 'AS',
    count: 6,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'Build confidence, practice daily English, and make new friends.',
    color: 'linear-gradient(135deg,#e6a7ff,#6d86ff)',
    live: true,
  },
  {
    id: 'demo-study',
    name: 'Study With Me · Focus Room',
    category: 'Education',
    host: 'Priya Verma',
    initials: 'PV',
    count: 4,
    capacity: 8,
    access: 'Public',
    approval: true,
    description: 'Quiet accountability, study goals, and a little motivation.',
    color: 'linear-gradient(135deg,#f9c47b,#e87b9c)',
    live: true,
  },
  {
    id: 'demo-lounge',
    name: 'Late Night Chai Lounge',
    category: 'General',
    host: 'Kabir Singh',
    initials: 'KS',
    count: 9,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'Relaxed conversations, new perspectives, good company.',
    color: 'linear-gradient(135deg,#77d6ca,#5c8cff)',
    live: true,
  },
  {
    id: 'demo-game',
    name: 'Game Talk Arena',
    category: 'Gaming',
    host: 'Rohan Mehta',
    initials: 'RM',
    count: 3,
    capacity: 8,
    access: 'Public',
    approval: false,
    description: 'Talk strategies, share your favourite games, find teammates.',
    color: 'linear-gradient(135deg,#ff9b70,#a66bff)',
    live: true,
  },
  {
    id: 'demo-movie',
    name: 'Movies & Music Club',
    category: 'Entertainment',
    host: 'Ananya Rao',
    initials: 'AR',
    count: 5,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'What are you watching or listening to this week?',
    color: 'linear-gradient(135deg,#ff9fca,#8872ff)',
    live: true,
  },
];

export function VoiceRoom({ userName = 'Student', userPhoto, onProgress }: VoiceRoomProps) {
  // Stable unique user identity for this session so Host and Friends never conflict
  const [effectiveUserId] = useState(() => {
    let id = sessionStorage.getItem('techai-vr-uid');
    if (!id) {
      id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      sessionStorage.setItem('techai-vr-uid', id);
    }
    return id;
  });

  const effectiveUserName = useMemo(() => {
    if (userName && userName !== 'Guest student' && userName !== 'Student') return userName;
    let saved = sessionStorage.getItem('techai-vr-uname');
    if (!saved) {
      saved = `Student ${Math.floor(100 + Math.random() * 900)}`;
      sessionStorage.setItem('techai-vr-uname', saved);
    }
    return saved;
  }, [userName]);

  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentRoom, setCurrentRoom] = useState<RoomItem | null>(() => {
    try {
      const saved = localStorage.getItem('techai-active-voiceroom');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });
  const currentRoomRef = useRef<RoomItem | null>(currentRoom);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const lastSpeakingRef = useRef<boolean>(false);

  const [rooms, setRooms] = useState<RoomItem[]>(DEFAULT_ROOMS);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Create Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Language Practice');
  const [formCapacity, setFormCapacity] = useState('8');
  const [formAccess, setFormAccess] = useState<'Public' | 'Private'>('Public');
  const [formApproval, setFormApproval] = useState(false);
  const [formAllowMembers, setFormAllowMembers] = useState(true);

  // Join Form State
  const [joinUrlInput, setJoinUrlInput] = useState('');

  // Audio / WebRTC Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [peerParticipants, setPeerParticipants] = useState<Participant[]>([]);

  // Socket.IO + Chat state
  const socketRef = useRef<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendTimeRef = useRef<number>(0);
  const [rateLimited, setRateLimited] = useState(false);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  // Host controls state
  const [roomLocked, setRoomLocked] = useState(false);

  // Toast helper
  const toastTimeoutRef = useRef<any>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Check if current user is host
  const isHost = currentRoom?.host === effectiveUserName || currentRoom?.host === userName || currentRoom?.created === true;

  // Fetch rooms from backend
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/voicerooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
      }
    } catch {
      // Backend offline, fallback rooms are used
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Clean up all audio streams
  const stopAudio = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch {}
    });
    peerConnectionsRef.current.clear();

    remoteAudioElementsRef.current.forEach((audio) => {
      try {
        audio.srcObject = null;
        audio.remove();
      } catch {}
    });
    remoteAudioElementsRef.current.clear();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (localAudioTrackRef.current) {
      try { localAudioTrackRef.current.stop(); } catch {}
      localAudioTrackRef.current = null;
    }
    if (livekitRoomRef.current) {
      try { livekitRoomRef.current.disconnect(); } catch {}
      livekitRoomRef.current = null;
    }
    if (broadcastChannelRef.current) {
      try { broadcastChannelRef.current.close(); } catch {}
      broadcastChannelRef.current = null;
    }
    if (audioContainerRef.current) {
      audioContainerRef.current.innerHTML = '';
    }
    setMicEnabled(false);
    setIsSpeaking(false);
  }, []);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setChatMessages([]);
    setChatInput('');
    setConnectionStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
      disconnectSocket();
    };
  }, [stopAudio, disconnectSocket]);

  // Setup real-time voice volume detection with Web Audio API
  const setupVoiceDetection = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const speaking = avg > 18;

        setIsSpeaking(speaking);

        if (speaking !== lastSpeakingRef.current) {
          lastSpeakingRef.current = speaking;
          if (socketRef.current && currentRoomRef.current) {
            socketRef.current.emit('speakingState', {
              roomId: currentRoomRef.current.id,
              userId: effectiveUserId,
              userName: effectiveUserName,
              isSpeaking: speaking,
            });
          }
        }

        // Broadcast to other peers/tabs
        broadcastChannelRef.current?.postMessage({
          type: 'SPEAKING_UPDATE',
          userName: effectiveUserName,
          isSpeaking: speaking
        });

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (e) {
      console.warn('AudioAnalyser setup failed:', e);
    }
  };

  // Create or retrieve an RTCPeerConnection for a peer
  const createPeerConnection = useCallback((targetSocketId: string) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, mediaStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtcSignal', {
          roomId: currentRoomRef.current?.id,
          toSocketId: targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
          fromUserId: effectiveUserId,
          fromUserName: effectiveUserName,
        });
      }
    };

    pc.ontrack = (event) => {
      let audio = remoteAudioElementsRef.current.get(targetSocketId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudioElementsRef.current.set(targetSocketId, audio);
        audioContainerRef.current?.appendChild(audio);
      }
      audio.srcObject = event.streams[0];
      audio.play().catch(e => console.warn('P2P audio play policy:', e));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        const audio = remoteAudioElementsRef.current.get(targetSocketId);
        if (audio) {
          audio.srcObject = null;
          audio.remove();
          remoteAudioElementsRef.current.delete(targetSocketId);
        }
        peerConnectionsRef.current.delete(targetSocketId);
      }
    };

    peerConnectionsRef.current.set(targetSocketId, pc);
    return pc;
  }, [effectiveUserId, effectiveUserName]);

  // Enable Microphone explicitly
  const enableMicrophone = async () => {
    try {
      if (mediaStreamRef.current && mediaStreamRef.current.active) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
        if (localAudioTrackRef.current) localAudioTrackRef.current.unmute();
        if (livekitRoomRef.current) {
          try { await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(true); } catch {}
        }
        setMicEnabled(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      mediaStreamRef.current = stream;
      setupVoiceDetection(stream);

      // Attach track to all existing P2P peer connections
      peerConnectionsRef.current.forEach((pc) => {
        stream.getAudioTracks().forEach(track => {
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });

      if (livekitRoomRef.current) {
        try {
          if (!localAudioTrackRef.current) {
            const lkTrack = await createLocalAudioTrack({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            });
            localAudioTrackRef.current = lkTrack;
            await livekitRoomRef.current.localParticipant.publishTrack(lkTrack);
          } else {
            localAudioTrackRef.current.unmute();
            await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(true);
          }
        } catch (lkErr) {
          console.warn('LiveKit track publish:', lkErr);
        }
      }

      setMicEnabled(true);
      showToast('🎙 Microphone active! Speak freely with everyone on stage.');
    } catch (err: any) {
      setConnectionStatus('mic-denied');
      showToast('Microphone access is required. Please check your browser permissions.');
    }
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (micEnabled) {
      // Mute mic
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.mute();
      }
      if (livekitRoomRef.current) {
        try {
          await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch {}
      }
      setMicEnabled(false);
      setIsSpeaking(false);
      if (socketRef.current && currentRoomRef.current) {
        socketRef.current.emit('speakingState', {
          roomId: currentRoomRef.current.id,
          userId: effectiveUserId,
          userName: effectiveUserName,
          isSpeaking: false,
        });
      }
      showToast('Microphone muted.');
    } else {
      await enableMicrophone();
    }
  };

  // Test Audio Output
  const testAudioOutput = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      showToast('🔊 Audio output tested successfully! Sound is working.');
    } catch {
      showToast('Audio output check is ready.');
    }
  };

  // Load chat history
  const loadChatHistory = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/voicerooms/${roomId}/chat`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setChatMessages(data.messages.map((m: any) => ({
            id: m.id || `hist-${Date.now()}-${Math.random()}`,
            sender: m.sender || m.userName || 'Unknown',
            senderInitials: (m.sender || m.userName || 'UN').slice(0, 2).toUpperCase(),
            content: m.content || m.message || '',
            timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
            isSystem: m.isSystem || false,
          })));
        }
      }
    } catch {
      // Chat history unavailable
    }
  }, []);

  // Connect Socket.IO
  const connectSocket = useCallback((roomId: string) => {
    // Disconnect any old socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        // Join with stable effectiveUserId so both tabs can identify each other
        socket.emit('joinRoom', {
          roomId,
          userName: effectiveUserName,
          userId: effectiveUserId,
        });
      });

      // Server sends us the list of everyone ALREADY in the room when we first join
      socket.on('roomParticipantsList', (data: any) => {
        if (!data || !Array.isArray(data.participants)) return;
        const newPeers: Participant[] = data.participants
          .filter((p: any) => p.userId !== effectiveUserId)
          .map((p: any) => ({
            name: p.userName || 'Student',
            initials: (p.userName || 'UN').slice(0, 2).toUpperCase(),
            role: 'Listening',
            color: 'linear-gradient(135deg,#74d6c8,#5488ff)',
            isSpeaking: p.isSpeaking || false,
            isMuted: p.isMuted || false,
            id: p.userId,
            socketId: p.socketId,
          }));

        setPeerParticipants(prev => {
          // Merge: keep existing peers, add new ones from server list
          const merged = [...prev];
          newPeers.forEach(np => {
            if (!merged.some(p => p.id === np.id)) {
              merged.push(np);
            }
          });
          return merged;
        });

        // Initiate P2P WebRTC offer to each existing member so audio flows
        data.participants
          .filter((p: any) => p.userId !== effectiveUserId && p.socketId)
          .forEach(async (p: any) => {
            try {
              const pc = createPeerConnection(p.socketId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('webrtcSignal', {
                roomId,
                toSocketId: p.socketId,
                signal: { type: 'offer', sdp: offer.sdp },
                fromUserId: effectiveUserId,
                fromUserName: effectiveUserName,
              });
            } catch (e) {
              console.warn('P2P offer creation failed:', e);
            }
          });
      });

      // A new participant joined while we were on stage
      socket.on('participantJoined', (data: any) => {
        const name = data.userName || data.name || 'Someone';
        // Don't show our own join event
        if (data.userId === effectiveUserId) return;

        setChatMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          sender: 'System',
          senderInitials: '',
          content: `${name} joined the room 👋`,
          timestamp: new Date().toISOString(),
          isSystem: true,
        }]);

        setPeerParticipants(prev => {
          if (prev.some(p => p.id === data.userId || p.name === data.userName)) return prev;
          return [...prev, {
            name: data.userName,
            initials: (data.userName || 'UN').slice(0, 2).toUpperCase(),
            role: 'Listening',
            color: 'linear-gradient(135deg,#74d6c8,#5488ff)',
            isSpeaking: false,
            isMuted: false,
            id: data.userId,
            socketId: data.socketId,
          }];
        });

        // Existing member: send offer to newly joined peer
        if (data.socketId && mediaStreamRef.current) {
          (async () => {
            try {
              const pc = createPeerConnection(data.socketId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('webrtcSignal', {
                roomId,
                toSocketId: data.socketId,
                signal: { type: 'offer', sdp: offer.sdp },
                fromUserId: effectiveUserId,
                fromUserName: effectiveUserName,
              });
            } catch (e) {
              console.warn('P2P offer to new peer failed:', e);
            }
          })();
        }
      });

      // WebRTC signaling handler
      socket.on('webrtcSignal', async (data: any) => {
        const { fromSocketId, signal, fromUserId, fromUserName: fromName } = data || {};
        if (!fromSocketId || !signal) return;

        try {
          const pc = createPeerConnection(fromSocketId);

          if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtcSignal', {
              roomId,
              toSocketId: fromSocketId,
              signal: { type: 'answer', sdp: answer.sdp },
              fromUserId: effectiveUserId,
              fromUserName: effectiveUserName,
            });

            // Add peer to participants if not already there
            if (fromUserId && fromUserId !== effectiveUserId) {
              setPeerParticipants(prev => {
                if (prev.some(p => p.id === fromUserId)) return prev;
                return [...prev, {
                  name: fromName || 'Student',
                  initials: (fromName || 'UN').slice(0, 2).toUpperCase(),
                  role: 'Speaking',
                  color: 'linear-gradient(135deg,#74d6c8,#5488ff)',
                  isSpeaking: false,
                  isMuted: false,
                  id: fromUserId,
                  socketId: fromSocketId,
                }];
              });
            }
          } else if (signal.type === 'answer') {
            if (pc.signalingState !== 'have-local-offer') return;
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          } else if (signal.type === 'candidate' && signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (e) {
          console.warn('WebRTC signaling error:', e);
        }
      });

      socket.on('peerSpeaking', (data: any) => {
        setPeerParticipants(prev =>
          prev.map(p => (p.id === data.userId || p.name === data.userName)
            ? { ...p, isSpeaking: Boolean(data.isSpeaking), isMuted: !data.isSpeaking && p.isMuted }
            : p
          )
        );
      });

      socket.on('participantLeft', (data: any) => {
        const name = data.userName || data.name || 'Someone';
        if (data.userId === effectiveUserId) return;
        setChatMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          sender: 'System',
          senderInitials: '',
          content: `${name} left the room`,
          timestamp: new Date().toISOString(),
          isSystem: true,
        }]);
        setPeerParticipants(prev => prev.filter(p => p.id !== data.userId && p.name !== data.userName));

        // Clean up P2P connection
        if (data.socketId) {
          const pc = peerConnectionsRef.current.get(data.socketId);
          if (pc) { try { pc.close(); } catch {} peerConnectionsRef.current.delete(data.socketId); }
          const audio = remoteAudioElementsRef.current.get(data.socketId);
          if (audio) { audio.srcObject = null; audio.remove(); remoteAudioElementsRef.current.delete(data.socketId); }
        }
      });

      socket.on('chatMessage', (msg: any) => {
        if (msg.userId === effectiveUserId) return; // Don't duplicate own messages
        const chatMsg: ChatMessage = {
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          sender: msg.sender || msg.userName || 'Unknown',
          senderInitials: (msg.sender || msg.userName || 'UN').slice(0, 2).toUpperCase(),
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          isSystem: msg.isSystem || false,
        };
        setChatMessages(prev => [...prev, chatMsg]);
      });

      socket.on('roomUpdated', (data: any) => {
        if (data.locked !== undefined) setRoomLocked(data.locked);
        if (data.chatEnabled !== undefined) setChatEnabled(data.chatEnabled);
        if (data.capacity !== undefined) {
          setCurrentRoom(prev => prev ? { ...prev, capacity: data.capacity } : null);
        }
      });

      socket.on('roomClosed', () => {
        showToast('The host closed this room.');
        leaveRoom();
      });

      socket.on('participantMuted', (data: any) => {
        if (data.userId === effectiveUserId || data.userName === effectiveUserName) {
          mediaStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
          setMicEnabled(false);
          setIsSpeaking(false);
          showToast('🔇 You were muted by the host.');
        }
        setPeerParticipants(prev =>
          prev.map(p => (p.id === data.userId || p.name === data.userName)
            ? { ...p, isMuted: true, isSpeaking: false }
            : p
          )
        );
      });

      socket.on('participantRemoved', (data: any) => {
        if (data.userId === effectiveUserId || data.userName === effectiveUserName) {
          showToast('You were removed from the room by the host.');
          leaveRoom();
          return;
        }
        setPeerParticipants(prev => prev.filter(p => p.id !== data.userId && p.name !== data.userName));
      });

      socket.on('disconnect', () => {
        setConnectionStatus('reconnecting');
      });

      socket.on('reconnect', () => {
        setConnectionStatus('connected');
        socket.emit('joinRoom', { roomId, userName: effectiveUserName, userId: effectiveUserId });
      });

      socket.on('connect_error', () => {
        // Socket.IO not available — voice still works via LiveKit
      });
    } catch {
      // Socket.IO not available
    }
  }, [effectiveUserId, effectiveUserName, createPeerConnection]);

  // Send chat message
  const sendChatMessage = () => {
    const msg = chatInput.trim();
    if (!msg || !socketRef.current || !currentRoom || !chatEnabled) return;

    // Rate limiting: max 1 message per 500ms
    const now = Date.now();
    if (now - lastSendTimeRef.current < 500) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 1000);
      return;
    }
    lastSendTimeRef.current = now;

    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: effectiveUserName,
      senderInitials: (effectiveUserName || 'YO').slice(0, 2).toUpperCase(),
      content: msg,
      timestamp: new Date().toISOString(),
    };

    socketRef.current.emit('chatMessage', {
      roomId: currentRoom.id,
      userId: effectiveUserId,
      userName: effectiveUserName,
      ...chatMsg,
      sender: effectiveUserName,
    });

    setChatMessages(prev => [...prev, chatMsg]);
    setChatInput('');
  };

  // Host control actions
  const hostToggleLock = () => {
    if (!socketRef.current || !currentRoom) return;
    const newLocked = !roomLocked;
    socketRef.current.emit('roomUpdate', { roomId: currentRoom.id, locked: newLocked });
    setRoomLocked(newLocked);
    showToast(newLocked ? 'Room locked. No new participants can join.' : 'Room unlocked. Anyone can join.');
  };

  const hostCloseRoom = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('roomClose', { roomId: currentRoom.id });
    showToast('Room closed.');
    leaveRoom();
  };

  const hostMuteParticipant = (participantName: string) => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('muteParticipant', { roomId: currentRoom.id, userName: participantName });
    setPeerParticipants(prev =>
      prev.map(p => p.name === participantName ? { ...p, isMuted: true, isSpeaking: false } : p)
    );
    showToast(`Muted ${participantName}`);
  };

  const hostRemoveParticipant = (participantName: string) => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('removeParticipant', { roomId: currentRoom.id, userName: participantName });
    setPeerParticipants(prev => prev.filter(p => p.name !== participantName));
    showToast(`Removed ${participantName} from the room`);
  };

  const hostToggleChat = () => {
    if (!socketRef.current || !currentRoom) return;
    const newEnabled = !chatEnabled;
    socketRef.current.emit('roomUpdate', { roomId: currentRoom.id, chatEnabled: newEnabled });
    setChatEnabled(newEnabled);
    showToast(newEnabled ? 'Chat enabled' : 'Chat disabled');
  };

  const hostChangeCapacity = (newCapacity: string) => {
    if (!socketRef.current || !currentRoom) return;
    const cap = Number(newCapacity);
    socketRef.current.emit('roomUpdate', { roomId: currentRoom.id, capacity: cap });
    setCurrentRoom(prev => prev ? { ...prev, capacity: cap } : null);
    showToast(`Room capacity changed to ${cap}`);
  };

  // Open a room
  const openRoom = async (room: RoomItem, autoEnableMic: boolean = false) => {
    if (room.count >= room.capacity) {
      setConnectionStatus('room-full');
      showToast('This room is currently full.');
      return;
    }

    stopAudio();
    disconnectSocket();
    setCurrentRoom(room);
    setPeerParticipants([]);
    setChatMessages([]);
    setConnectionStatus('connecting');
    setRoomLocked(room.locked || false);
    setChatEnabled(room.chatEnabled !== false);

    // Persist active room so host stays in room if they open WhatsApp / share link
    try {
      localStorage.setItem('techai-active-voiceroom', JSON.stringify(room));
    } catch {}

    // Sync room ID directly to the browser URL so it is persistent & easily shareable
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('module', 'voiceroom');
      url.searchParams.set('room', room.id);
      window.history.replaceState({}, '', url.toString());
    } catch {}

    // Load chat history
    loadChatHistory(room.id);

    // Connect Socket.IO for real-time chat & stage coordination
    connectSocket(room.id);

    // Broadcast channel for multi-tab sync
    try {
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch {}
      }
      const bc = new BroadcastChannel(`voiceroom_${room.id}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const { type, userName: senderName, isSpeaking: peerSpeaking } = event.data || {};
        if (type === 'SPEAKING_UPDATE' && senderName && senderName !== effectiveUserName) {
          setPeerParticipants(prev => {
            const exists = prev.find(p => p.name === senderName);
            if (exists) {
              return prev.map(p => (p.name === senderName ? { ...p, isSpeaking: peerSpeaking } : p));
            }
            return [
              ...prev,
              {
                name: senderName,
                initials: senderName.slice(0, 2).toUpperCase(),
                role: peerSpeaking ? 'Speaking' : 'Listening',
                color: 'linear-gradient(135deg,#74d6c8,#5488ff)',
                isSpeaking: peerSpeaking,
              }
            ];
          });
        }
      };
    } catch {}

    // LiveKit token request
    try {
      const res = await fetch(`/api/voicerooms/${room.id}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId, userName: effectiveUserName, role: 'publisher' }),
      });

      if (res.ok) {
        const { token, livekitUrl, isConfigured } = await res.json();
        if (isConfigured && livekitUrl && token) {
          const lkRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });

          lkRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              el.setAttribute('autoplay', 'true');
              audioContainerRef.current?.appendChild(el);
            }
          });

          lkRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
            track.detach();
          });

          lkRoom.on(RoomEvent.Disconnected, () => {
            setConnectionStatus('reconnecting');
          });

          lkRoom.on(RoomEvent.Reconnected, () => {
            setConnectionStatus('connected');
          });

          await lkRoom.connect(livekitUrl, token);
          livekitRoomRef.current = lkRoom;
          setConnectionStatus('connected');
        } else {
          // LiveKit not configured — use P2P WebRTC via Socket.IO signals
          setConnectionStatus('connected');
        }
      } else {
        setConnectionStatus('connected');
      }
    } catch (e) {
      console.warn('LiveKit connection note:', e);
      setConnectionStatus('connected');
    }

    // If autoEnableMic requested (e.g. host creating room or friend joining stage via invite)
    if (autoEnableMic) {
      setTimeout(() => {
        enableMicrophone();
      }, 600);
    }

    onProgress?.('lesson', 'Voice Room Conversation', `Joined "${room.name}" voice room`);
    showToast(`✅ Joined ${room.name} — you're on stage!`);
  };

  // Auto-join from URL hash or query params
  useEffect(() => {
    let isMounted = true;
    const checkUrl = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const targetId = hashParams.get('room') || queryParams.get('room') || queryParams.get('voiceroom');

      if (targetId && !currentRoomRef.current) {
        let roomToJoin = rooms.find(r => r.id === targetId || r.name.toLowerCase() === targetId.toLowerCase());

        // If not in local rooms state (e.g. fresh page load via WhatsApp link), query API
        if (!roomToJoin) {
          try {
            const res = await fetch(`/api/voicerooms/${encodeURIComponent(targetId)}`);
            if (res.ok && isMounted) {
              const data = await res.json();
              if (data.success && data.room) {
                roomToJoin = data.room;
                setRooms(prev => {
                  if (prev.some(r => r.id === data.room.id)) return prev;
                  return [data.room, ...prev];
                });
              }
            }
          } catch {
            // Room lookup failed
          }
        }

        if (roomToJoin && isMounted) {
          openRoom(roomToJoin, true);
        }
      }
    };

    // If we have an active room stored from before (host returning after sharing WhatsApp), restore it
    const restoreSaved = async () => {
      if (currentRoomRef.current) return; // Already in a room
      const queryParams = new URLSearchParams(window.location.search);
      const hasRoomInUrl = queryParams.get('room') || queryParams.get('voiceroom');
      if (hasRoomInUrl) return; // URL already has room — checkUrl will handle it

      try {
        const saved = localStorage.getItem('techai-active-voiceroom');
        if (saved) {
          const savedRoom = JSON.parse(saved);
          if (savedRoom && savedRoom.id && isMounted) {
            // Verify the room still exists on the backend
            const res = await fetch(`/api/voicerooms/${encodeURIComponent(savedRoom.id)}`);
            if (res.ok && isMounted) {
              const data = await res.json();
              if (data.success && data.room) {
                openRoom({ ...savedRoom, ...data.room, created: savedRoom.created }, false);
                return;
              }
            }
            // If backend doesn't know the room, still re-enter (works if server restarted)
            if (isMounted) {
              openRoom(savedRoom, false);
            }
          }
        }
      } catch {}
    };

    checkUrl().then(() => restoreSaved());
    window.addEventListener('hashchange', checkUrl);
    window.addEventListener('popstate', checkUrl);
    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', checkUrl);
      window.removeEventListener('popstate', checkUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  // Leave room
  const leaveRoom = () => {
    if (socketRef.current && currentRoomRef.current) {
      socketRef.current.emit('leaveRoom', {
        roomId: currentRoomRef.current.id,
        userId: effectiveUserId,
        userName: effectiveUserName,
      });
    }
    stopAudio();
    disconnectSocket();
    setCurrentRoom(null);
    setPeerParticipants([]);

    // Clear persisted room so host doesn't re-enter after intentional leave
    try { localStorage.removeItem('techai-active-voiceroom'); } catch {}

    // Clear room query from URL
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('voiceroom');
      window.history.replaceState({}, '', url.toString());
    } catch {}

    showToast('You left the room.');
  };

  // Create room handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (name.length < 3) {
      showToast('Please enter a room name with at least 3 characters.');
      return;
    }

    if (rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      showToast('A room with this name already exists.');
      return;
    }

    const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: RoomItem = {
      id: newRoomId,
      name,
      category: formCategory,
      host: effectiveUserName,
      initials: effectiveUserName.slice(0, 2).toUpperCase(),
      count: 1,
      capacity: Number(formCapacity) || 8,
      access: formAccess,
      approval: formApproval,
      allowMembers: formAllowMembers,
      description: formDesc.trim() || 'Come in and join the conversation.',
      color: 'linear-gradient(135deg,#8b82ff,#56b5e9)',
      live: true,
      created: true,
    };

    // Save to backend and retrieve persistent room
    let roomToOpen = newRoom;
    try {
      const res = await fetch('/api/voicerooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRoom, hostId: effectiveUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          roomToOpen = { ...newRoom, ...data.room, created: true };
        }
      }
    } catch {}

    setRooms(prev => [roomToOpen, ...prev.filter(r => r.id !== roomToOpen.id)]);
    setCreateModalOpen(false);
    setFormName('');
    setFormDesc('');
    setActiveFilter('All');
    openRoom(roomToOpen, true);
    showToast('🎉 Room created! You are on stage. Invite friends now!');
  };

  // Join by link form handler
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinUrlInput.trim();
    try {
      let id = raw;
      if (raw.includes('http://') || raw.includes('https://') || raw.includes('#') || raw.includes('?')) {
        const u = new URL(raw, window.location.origin);
        const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
        id = hashParams.get('room') || u.searchParams.get('room') || u.searchParams.get('voiceroom') || id;
      }

      let found = rooms.find(r => r.id === id || r.name.toLowerCase() === id.toLowerCase());
      setJoinModalOpen(false);
      setJoinUrlInput('');

      if (!found) {
        // Attempt backend lookup
        try {
          const res = await fetch(`/api/voicerooms/${encodeURIComponent(id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.room) {
              found = data.room;
              setRooms(prev => [data.room, ...prev.filter(r => r.id !== data.room.id)]);
            }
          }
        } catch {}
      }

      if (!found) {
        showToast('Room not found. Check the invitation link.');
        return;
      }
      if (found.approval) {
        showToast('Host approval required to join this room.');
      }
      openRoom(found);
    } catch {
      showToast('Please enter a valid invitation link or room ID.');
    }
  };

  // Invite link generation
  const getInviteUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?module=voiceroom&room=${encodeURIComponent(currentRoom?.id || 'demo-english')}`;
  };

  const getInviteMessage = () => {
    const url = getInviteUrl();
    const title = currentRoom?.name || 'VoiceRoom';
    return `🎙️ Join my VoiceRoom "${title}"! Let's talk together in real-time. Tap this link to join: ${url}`;
  };

  const copyInviteLink = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setInviteModalOpen(false);
      showToast('✅ Invitation link copied! You stay on stage — share it with your friends.');
    } catch {
      showToast(`Copy link: ${url}`);
    }
  };

  const shareOnWhatsApp = () => {
    const msg = getInviteMessage();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    // Close invite modal FIRST so host stays on stage view
    setInviteModalOpen(false);
    // Persist room to localStorage so host can be restored if page unloads on mobile
    if (currentRoomRef.current) {
      try { localStorage.setItem('techai-active-voiceroom', JSON.stringify(currentRoomRef.current)); } catch {}
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('🎙️ You stay on stage! WhatsApp opened — share with friends.');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my VoiceRoom: ${currentRoom?.name}`,
          text: getInviteMessage(),
          url: getInviteUrl(),
        });
        showToast('Share dialog opened.');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          showToast('Native sharing unavailable. Use WhatsApp or Copy link.');
        }
      }
    } else {
      showToast('Native sharing not supported on this browser. Try WhatsApp or Copy Link.');
    }
  };

  // Format timestamp
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Retry connection
  const retryConnection = () => {
    if (currentRoom) {
      setConnectionStatus('connecting');
      openRoom(currentRoom);
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter(r => activeFilter === 'All' || r.category === activeFilter);

  // User avatar initial
  const userInitial = (userName || 'J').slice(0, 1).toUpperCase();

  // Connection status renderer
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connecting':
        return (
          <div className="vr-connection-status connecting">
            <span className="status-dot" />
            Connecting...
          </div>
        );
      case 'connected':
        return (
          <div className="vr-connection-status connected">
            <span className="status-dot" />
            Connected ✓
          </div>
        );
      case 'reconnecting':
        return (
          <div className="vr-connection-status connecting">
            <span className="status-dot" />
            Reconnecting...
          </div>
        );
      case 'failed':
        return (
          <div className="vr-connection-status failed">
            <span className="status-dot" />
            Connection failed
            <button
              type="button"
              style={{ marginLeft: 8, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,100,100,0.3)', background: 'rgba(255,60,60,0.1)', color: '#ff9090', fontSize: 11, cursor: 'pointer' }}
              onClick={retryConnection}
            >
              Retry
            </button>
          </div>
        );
      case 'mic-denied':
        return (
          <div className="vr-connection-status failed">
            <span className="status-dot" />
            Microphone denied — check browser permissions
          </div>
        );
      case 'room-full':
        return (
          <div className="vr-connection-status failed">
            <span className="status-dot" />
            Room full — try again later
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="vr-app">
      {/* Hidden audio container for remote WebRTC audio streams */}
      <div ref={audioContainerRef} style={{ display: 'none' }} />

      {/* Top Header Matching User's Design */}
      <header className="vr-top">
        <div className="vr-brand">
          <div className="vr-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round">
              <rect x="8" y="3" width="8" height="13" rx="4" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />
            </svg>
          </div>
          VoiceRoom
        </div>
        <div className="vr-topright">
          <button
            type="button"
            className="vr-smallbtn"
            onClick={() => {
              setActiveFilter('All');
              showToast('Showing available rooms and your rooms.');
            }}
          >
            My rooms
          </button>
          <div className="vr-avatar" title={`Your profile: ${userName}`}>
            {userInitial}
          </div>
        </div>
      </header>

      <div className="vr-container">
        {/* =========================================================================
            VIEW 1: EXPLORE ROOMS LIST
            ========================================================================= */}
        {!currentRoom && (
          <section className="vr-roomlist">
            <div className="vr-hero">
              <div>
                <div className="vr-eyebrow">Your people. Your conversations.</div>
                <h1>
                  Find your voice.<br />
                  <span style={{ background: 'linear-gradient(90deg,#a99aff,#70c6ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    Find your room.
                  </span>
                </h1>
                <p>Meet people, practice a language, share ideas, and have real conversations in welcoming voice rooms.</p>
              </div>
              <div className="vr-actions">
                <button
                  type="button"
                  className="vr-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  ＋ Create Room
                </button>
                <button
                  type="button"
                  className="vr-secondary"
                  onClick={() => setJoinModalOpen(true)}
                >
                  ↗ Join with link
                </button>
              </div>
            </div>

            <div className="vr-sectionhead">
              <div>
                <h2>Explore rooms</h2>
                <p>Discover a conversation happening right now.</p>
              </div>
              <button
                type="button"
                className="vr-smallbtn"
                onClick={() => {
                  fetchRooms();
                  showToast('Room list refreshed.');
                }}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="vr-filters">
              {['All', 'Language Practice', 'Education', 'General', 'Gaming', 'Entertainment'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`vr-filter ${activeFilter === cat ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat === 'All' ? '✦ All rooms' : cat}
                </button>
              ))}
            </div>

            <div className="vr-grid">
              {filteredRooms.length > 0 ? (
                filteredRooms.map(room => (
                  <article key={room.id} className="vr-room">
                    <div className="vr-roomtop">
                      <span className="vr-category">{room.category}</span>
                      <span className="vr-live">
                        <span className="vr-dot" /> LIVE
                      </span>
                    </div>

                    <div>
                      <h3>{room.name}</h3>
                      <p className="vr-roomdesc">{room.description || 'Come in and join the conversation.'}</p>
                    </div>

                    <div className="vr-hostrow">
                      <div
                        className="vr-hostpic"
                        style={{ background: room.color || 'linear-gradient(135deg,#9d8aff,#58b9ee)' }}
                      >
                        {room.initials || 'VR'}
                      </div>
                      <div className="vr-hostmeta">
                        {room.host} <small>Host {room.approval ? '· Approval required' : ''}</small>
                      </div>
                    </div>

                    <div className="vr-roomfoot">
                      <div className="vr-people">
                        ♙ {room.count}/{room.capacity} <span>·</span>{' '}
                        {room.access === 'Private' ? (
                          <span className="vr-locked">🔒 Private</span>
                        ) : (
                          '🌐 Public'
                        )}
                      </div>
                      <button
                        type="button"
                        className="vr-join"
                        onClick={() => openRoom(room)}
                      >
                        Join room →
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="vr-empty">
                  No rooms in this category yet. Create one and start the conversation.
                </div>
              )}
            </div>

            <div className="vr-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="vr-bannericon">🎧</div>
                <div>
                  <h3>Better conversations start together</h3>
                  <p>Invite your friends to join your room with one simple link.</p>
                </div>
              </div>
              <button
                type="button"
                className="vr-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create your room →
              </button>
            </div>
          </section>
        )}

        {/* =========================================================================
            VIEW 2: ACTIVE ROOM STAGE (ROOMVIEW)
            ========================================================================= */}
        {currentRoom && (
          <section className="vr-roomview">
            <button
              type="button"
              className="vr-backlink"
              onClick={leaveRoom}
            >
              ← Back to explore
            </button>

            {/* Connection Status */}
            {renderConnectionStatus()}

            <div className="vr-roomstage">
              <div className="vr-roomstagehead">
                <div>
                  <div className="vr-eyebrow">{currentRoom.category.toUpperCase()}</div>
                  <h2>{currentRoom.name}</h2>
                  <p>{currentRoom.description || 'A friendly place to speak, listen, and improve together.'}</p>
                </div>
                <div className="vr-stagecontrols">
                  <button
                    type="button"
                    className="vr-secondary"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    ↗ Invite friends
                  </button>
                  <button
                    type="button"
                    className="vr-primary"
                    onClick={leaveRoom}
                  >
                    Leave room
                  </button>
                </div>
              </div>

              {/* Two-column layout: Participants + Chat */}
              <div className="vr-roomview-layout">
                {/* LEFT: Participants + Controls */}
                <div>
                  {/* Participants Grid */}
                  <div className="vr-participants">
                    {/* 1. Host Card — show separately only if I am NOT the host */}
                    {!isHost && (
                      <div className="vr-person">
                        <div
                          className="vr-personpic"
                          style={{ background: currentRoom.color || 'linear-gradient(135deg,#9d8aff,#58b9ee)' }}
                        >
                          {currentRoom.initials || 'VR'}
                        </div>
                        <strong>{currentRoom.host} ✦</strong>
                        <small>Host</small>
                      </div>
                    )}

                    {/* 2. You (User) Card with Real Speaking Detection Ring */}
                    <div className={`vr-person ${micEnabled && isSpeaking ? 'speaking' : ''}`}>
                      <div
                        className="vr-personpic"
                        style={{ background: 'linear-gradient(135deg,#74d6c8,#5488ff)' }}
                      >
                        {effectiveUserName.slice(0, 2).toUpperCase()}
                      </div>
                      <strong>{effectiveUserName} {isHost ? '✦' : ''} (You)</strong>
                      <small>
                        {isHost ? 'Host · ' : ''}{micEnabled ? (isSpeaking ? 'Speaking 🎙️' : 'Mic enabled') : '🎤 Tap to unmute'}
                      </small>
                    </div>

                    {/* 3. Connected Peers */}
                    {peerParticipants.map((p, idx) => (
                      <div key={p.id || idx} className={`vr-person ${p.isSpeaking ? 'speaking' : ''}`}>
                        <div className="vr-personpic" style={{ background: p.color || 'linear-gradient(135deg,#74d6c8,#5488ff)' }}>
                          {p.initials}
                        </div>
                        <strong>{p.name}</strong>
                        <small>
                          {p.isMuted ? '🔇 Muted' : p.isSpeaking ? 'Speaking 🎙️' : p.role || 'Listening'}
                        </small>
                        {/* Host actions for each participant */}
                        {isHost && (
                          <div className="vr-person-actions">
                            <button
                              type="button"
                              className="vr-person-action"
                              title="Mute participant"
                              onClick={() => hostMuteParticipant(p.name)}
                            >
                              🔇
                            </button>
                            <button
                              type="button"
                              className="vr-person-action danger"
                              title="Remove participant"
                              onClick={() => hostRemoveParticipant(p.name)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 4. Invite a friend card */}
                    <div
                      className="vr-person vr-person-invite clickable"
                      onClick={() => setInviteModalOpen(true)}
                      title="Click to invite your friends"
                    >
                      <div
                        className="vr-personpic"
                        style={{ background: 'linear-gradient(135deg,#f8bd82,#e37cb0)' }}
                      >
                        ＋
                      </div>
                      <strong>Invite a friend</strong>
                      <small>{peerParticipants.length + 2}/{currentRoom.capacity} participants</small>
                    </div>
                  </div>

                  {/* Real Audio Status Note */}
                  <div className="vr-roomnote">
                    🟢 <strong>Live Real-Time WebRTC Audio Active:</strong> Real microphone capture and bidirectional voice communication are operational. Tap <strong>Enable microphone</strong> to start talking; your avatar ring pulses in green when speech is detected!
                  </div>

                  {/* Stage Audio Controls */}
                  <div className="vr-stagecontrols" style={{ marginTop: 20 }}>
                    <button
                      type="button"
                      className={`vr-secondary ${micEnabled ? 'active' : ''}`}
                      onClick={toggleMicrophone}
                      style={micEnabled ? { background: '#10b98133', borderColor: '#10b981', color: '#6ee7b7' } : {}}
                    >
                      {micEnabled ? '🎙 Mute microphone' : '🎙 Enable microphone'}
                    </button>
                    <button
                      type="button"
                      className="vr-secondary"
                      onClick={testAudioOutput}
                    >
                      🔊 Audio output
                    </button>
                  </div>

                  {/* Host Controls Panel */}
                  {isHost && (
                    <div className="vr-host-controls">
                      <h4>⚙ Host Controls</h4>
                      <div className="vr-host-controls-row">
                        <button
                          type="button"
                          className="vr-host-btn"
                          onClick={hostToggleLock}
                        >
                          {roomLocked ? '🔓 Unlock room' : '🔒 Lock room'}
                        </button>
                        <button
                          type="button"
                          className="vr-host-btn"
                          onClick={hostToggleChat}
                        >
                          {chatEnabled ? '💬 Disable chat' : '💬 Enable chat'}
                        </button>
                        <select
                          className="vr-host-btn"
                          value={currentRoom.capacity}
                          onChange={(e) => hostChangeCapacity(e.target.value)}
                          style={{ appearance: 'auto' }}
                        >
                          <option value="4">Cap: 4</option>
                          <option value="8">Cap: 8</option>
                          <option value="12">Cap: 12</option>
                          <option value="20">Cap: 20</option>
                          <option value="50">Cap: 50</option>
                        </select>
                        <button
                          type="button"
                          className="vr-host-btn danger"
                          onClick={hostCloseRoom}
                        >
                          ✕ Close room
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Chat Panel */}
                <div className="vr-chat-panel">
                  <div className="vr-chat-header">
                    <h3>💬 Live Chat</h3>
                    <span className="vr-chat-count">{chatMessages.filter(m => !m.isSystem).length} messages</span>
                  </div>

                  <div className="vr-chat-messages">
                    {chatMessages.length === 0 && (
                      <div className="vr-chat-system">No messages yet. Say hello! 👋</div>
                    )}
                    {chatMessages.map(msg => {
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id} className="vr-chat-system">
                            {msg.content}
                          </div>
                        );
                      }
                      const isOwn = msg.sender === userName;
                      return (
                        <div key={msg.id} className={`vr-chat-msg ${isOwn ? 'own' : 'other'}`}>
                          {!isOwn && <span className="msg-sender">{msg.sender}</span>}
                          <div className="msg-bubble">{msg.content}</div>
                          <span className="msg-time">{formatTime(msg.timestamp)}</span>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  <div className="vr-chat-input-row">
                    <input
                      type="text"
                      placeholder={chatEnabled ? 'Type a message...' : 'Chat is disabled'}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                      disabled={!chatEnabled}
                      maxLength={500}
                    />
                    <button
                      type="button"
                      onClick={sendChatMessage}
                      disabled={!chatEnabled || !chatInput.trim()}
                      title={rateLimited ? 'Slow down! You are sending too fast.' : 'Send message'}
                    >
                      {rateLimited ? '⏳' : '➤'}
                    </button>
                  </div>
                  {rateLimited && (
                    <div style={{ padding: '4px 16px 8px', fontSize: 11, color: 'rgba(255,180,80,0.8)' }}>
                      Sending too fast — please wait a moment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="vr-footer">
          VOICE ROOM · A place to speak freely · Powered by TECH AI
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: CREATE ROOM
          ========================================================================= */}
      <div className={`vr-modalback ${createModalOpen ? 'show' : ''}`} onClick={() => setCreateModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Create a room</h2>
              <div className="vr-muted">Set the vibe. Bring your people together.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setCreateModalOpen(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreateSubmit}>
            <div className="vr-field">
              <label htmlFor="vr-roomName">ROOM NAME *</label>
              <input
                id="vr-roomName"
                maxLength={60}
                required
                placeholder="e.g. English Speaking Circle"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            <div className="vr-field">
              <label htmlFor="vr-roomDesc">DESCRIPTION (OPTIONAL)</label>
              <textarea
                id="vr-roomDesc"
                maxLength={220}
                placeholder="What would you like to talk about?"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>

            <div className="vr-two">
              <div className="vr-field">
                <label htmlFor="vr-roomCategory">CATEGORY</label>
                <select
                  id="vr-roomCategory"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                >
                  <option>Language Practice</option>
                  <option>Education</option>
                  <option>General</option>
                  <option>Gaming</option>
                  <option>Entertainment</option>
                </select>
              </div>

              <div className="vr-field">
                <label htmlFor="vr-roomCapacity">MAX PARTICIPANTS</label>
                <select
                  id="vr-roomCapacity"
                  value={formCapacity}
                  onChange={e => setFormCapacity(e.target.value)}
                >
                  <option>4</option>
                  <option>8</option>
                  <option>12</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
            </div>

            <div className="vr-field">
              <label>ROOM ACCESS</label>
              <div className="vr-two">
                <label className="vr-toggleline">
                  <span>
                    🌐 Public
                    <small>Discoverable by everyone</small>
                  </span>
                  <input
                    type="radio"
                    name="vr-access"
                    value="Public"
                    checked={formAccess === 'Public'}
                    onChange={() => setFormAccess('Public')}
                  />
                </label>
                <label className="vr-toggleline">
                  <span>
                    🔒 Private
                    <small>Invite link required</small>
                  </span>
                  <input
                    type="radio"
                    name="vr-access"
                    value="Private"
                    checked={formAccess === 'Private'}
                    onChange={() => setFormAccess('Private')}
                  />
                </label>
              </div>
            </div>

            <label className="vr-toggleline">
              <span>
                Host approval
                <small>Approve people before they join</small>
              </span>
              <input
                type="checkbox"
                checked={formApproval}
                onChange={e => setFormApproval(e.target.checked)}
              />
            </label>

            <label className="vr-toggleline">
              <span>
                Allow new members
                <small>Keep the room open for new guests</small>
              </span>
              <input
                type="checkbox"
                checked={formAllowMembers}
                onChange={e => setFormAllowMembers(e.target.checked)}
              />
            </label>

            <div className="vr-modalactions">
              <button
                type="button"
                className="vr-secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="vr-primary">
                Create Room ↗
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================================
          MODAL 2: JOIN ROOM WITH LINK
          ========================================================================= */}
      <div className={`vr-modalback ${joinModalOpen ? 'show' : ''}`} onClick={() => setJoinModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Join a room</h2>
              <div className="vr-muted">Paste a VoiceRoom invitation link.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setJoinModalOpen(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleJoinSubmit}>
            <div className="vr-field">
              <label htmlFor="vr-inviteUrl">INVITATION LINK OR ROOM ID</label>
              <input
                id="vr-inviteUrl"
                required
                placeholder="https://.../?module=voiceroom&room=demo-english"
                value={joinUrlInput}
                onChange={e => setJoinUrlInput(e.target.value)}
              />
            </div>
            <div className="vr-muted">
              You can also open a valid invitation link directly on your browser or WhatsApp.
            </div>
            <div className="vr-modalactions">
              <button
                type="button"
                className="vr-secondary"
                onClick={() => setJoinModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="vr-primary">
                Check invitation →
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================================
          MODAL 3: INVITE FRIENDS (WHATSAPP + COPY LINK + SHARE)
          ========================================================================= */}
      <div className={`vr-modalback ${inviteModalOpen ? 'show' : ''}`} onClick={() => setInviteModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Invite your friends</h2>
              <div className="vr-muted">A conversation is better when shared.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setInviteModalOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="vr-field">
            <label>ROOM INVITATION LINK</label>
            <input
              readOnly
              value={getInviteUrl()}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
          </div>

          <div className="vr-field">
            <label>MESSAGE PREVIEW</label>
            <textarea
              readOnly
              value={getInviteMessage()}
            />
          </div>

          <div className="vr-actions" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="vr-primary"
              style={{ flex: 1, background: '#059669' }}
              onClick={shareOnWhatsApp}
            >
              ☏ Share on WhatsApp
            </button>
            <button
              type="button"
              className="vr-secondary"
              style={{ flex: 1 }}
              onClick={copyInviteLink}
            >
              ▣ Copy link
            </button>
          </div>

          <button
            type="button"
            className="vr-secondary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={shareNative}
          >
            ↗ More sharing options
          </button>

          <p className="vr-muted" style={{ marginTop: 14 }}>
            WhatsApp opens with a pre-filled invitation. Your friends can join directly from their phone, tablet, or PC browser without needing to install anything!
          </p>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div className={`vr-toast ${toastVisible ? 'show' : ''}`} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
