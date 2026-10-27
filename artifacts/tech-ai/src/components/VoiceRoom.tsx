import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Mic, MicOff, Users, Hand, MessageSquare, Share2, LogOut, Plus,
  Trophy, Sparkles, Volume2, Globe, Heart, Flame, ThumbsUp, Send, X,
  Check, Copy, Shield, Award, AudioLines
} from 'lucide-react';

export interface VoiceRoomProps {
  userName?: string;
  userPhoto?: string;
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

interface Speaker {
  id: string;
  name: string;
  avatar: string;
  flag: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  level?: string;
}

interface RoomItem {
  id: string;
  title: string;
  category: string;
  badge?: string;
  hourlyRank?: string;
  hostName: string;
  hostAvatar: string;
  hostFlag: string;
  listenerCount: number;
  speakers: Speaker[];
  tags: string[];
}

interface ChatMessage {
  id: string;
  sender: string;
  flag: string;
  level: number;
  badge?: string;
  text: string;
  time: string;
  isNotice?: boolean;
}

export function VoiceRoom({ userName = 'Student', userPhoto, onProgress }: VoiceRoomProps) {
  // Current view: lobby or inside a room
  const [activeRoom, setActiveRoom] = useState<RoomItem | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'English' | 'Hindi' | 'Interaction' | 'Exam Prep'>('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Inside-room interactive states
  const [mySeat, setMySeat] = useState<number | null>(null); // null = audience, 0..7 = stage seat
  const [isMicOn, setIsMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);

  // Form states for creating a room
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('English');
  const [newRoomTag, setNewRoomTag] = useState('#English Learning');

  // Room messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Pre-populated realistic English practice rooms (matching HelloTalk screenshots)
  const [rooms, setRooms] = useState<RoomItem[]>([
    {
      id: 'room-1',
      title: 'MH Radio 👻 The Global Lounge',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Hourly No. 1',
      hostName: 'MH SA',
      hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇰🇷',
      listenerCount: 42,
      tags: ['#English Learning', '#Global Friends', '#Daily Speaking'],
      speakers: [
        { id: 's1', name: 'MH SA', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', flag: '🇰🇷', isHost: true, isSpeaking: true, isMuted: false, level: 'Lv.15' },
        { id: 's2', name: 'Cephas 石谦', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, isMuted: false, level: 'Lv.12' },
        { id: 's3', name: 'Tayla', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', flag: '🇬🇧', isSpeaking: false, isMuted: true, level: 'Lv.10' },
        { id: 's4', name: 'Arjun M.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isSpeaking: false, isMuted: false, level: 'Lv.8' }
      ]
    },
    {
      id: 'room-2',
      title: 'English Chat 💬 - Confidence Builder',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Hot 🔥',
      hostName: 'Anthony 安瀚辰',
      hostAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇺🇸',
      listenerCount: 28,
      tags: ['#English Learning', '#Confidence', '#Fluency'],
      speakers: [
        { id: 's5', name: 'Anthony 安瀚辰', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isHost: true, isSpeaking: true, level: 'Lv.14' },
        { id: 's6', name: 'Priya S.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isSpeaking: false, level: 'Lv.9' },
        { id: 's7', name: 'Kenji', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', flag: '🇯🇵', isSpeaking: false, level: 'Lv.11' }
      ]
    },
    {
      id: 'room-3',
      title: 'College GD & Job Interview Practice',
      category: 'Exam Prep',
      badge: 'GD',
      hourlyRank: 'Popular',
      hostName: 'Rohan Verma',
      hostAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 21,
      tags: ['#Interview Prep', '#Group Discussion', '#Placement'],
      speakers: [
        { id: 's8', name: 'Rohan Verma', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isHost: true, isSpeaking: true, level: 'Lv.11' },
        { id: 's9', name: 'Aakash K.', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isSpeaking: false, level: 'Lv.7' }
      ]
    },
    {
      id: 'room-4',
      title: 'Life & Hobbies without Screen Addiction',
      category: 'Interaction',
      badge: 'EN',
      hourlyRank: 'Live',
      hostName: 'Nadir',
      hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇺🇿',
      listenerCount: 18,
      tags: ['#Casual Chat', '#Daily Life', '#Mindfulness'],
      speakers: [
        { id: 's10', name: 'Nadir', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', flag: '🇺🇿', isHost: true, isSpeaking: false, level: 'Lv.9' },
        { id: 's11', name: 'Emma Watson', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', flag: '🇨🇦', isSpeaking: true, level: 'Lv.13' }
      ]
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Join a room
  const handleJoinRoom = (room: RoomItem) => {
    setActiveRoom(room);
    setMySeat(null);
    setIsMicOn(false);
    setIsHandRaised(false);
    setChatMessages([
      {
        id: 'n1',
        sender: 'System Notice',
        flag: '📢',
        level: 1,
        text: `Welcome to "${room.title}"! This is a free speaking practice room. Please communicate politely, encourage each other, and have fun building confidence!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotice: true
      },
      {
        id: 'm1',
        sender: room.hostName,
        flag: room.hostFlag,
        level: 14,
        text: 'Hello everyone! Welcome to the room. Feel free to raise your hand to speak on stage! 👋',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'm2',
        sender: 'Märcö',
        flag: '🇮🇳',
        level: 8,
        text: 'Hey guys! Glad to join today’s practice.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    onProgress?.('lesson', 'Voice Room Practice', `Joined "${room.title}" with friends`);
    showToast(`Joined ${room.title}`);
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    setActiveRoom(null);
    setMySeat(null);
    setIsMicOn(false);
    setIsHandRaised(false);
    showToast('Left voice room');
  };

  // Create new room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const newRoom: RoomItem = {
      id: `custom-room-${Date.now()}`,
      title: newRoomTitle.trim(),
      category: newRoomCategory,
      badge: 'LIVE',
      hourlyRank: 'Created by You',
      hostName: userName,
      hostAvatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 1,
      tags: [newRoomTag, '#Student Room', '#Free Practice'],
      speakers: [
        {
          id: 'me',
          name: userName,
          avatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          flag: '🇮🇳',
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          level: 'Lv.1'
        }
      ]
    };

    setRooms([newRoom, ...rooms]);
    setCreateModalOpen(false);
    setNewRoomTitle('');
    handleJoinRoom(newRoom);
    setMySeat(0); // Take host seat
    showToast('Voice room created! Share with your friends to join.');
  };

  // Toggle Microphone when on stage
  const handleToggleMic = async () => {
    if (mySeat === null) {
      showToast('Take a seat on stage first to speak!');
      return;
    }

    if (isMicOn) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      setIsMicOn(false);
      showToast('Microphone muted 🔇');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        setIsMicOn(true);
        showToast('Microphone unmuted 🎙️ Speak naturally!');
      } catch {
        showToast('Could not access microphone. Please check browser permission.');
      }
    }
  };

  // Raise hand or take seat
  const handleTakeSeat = (seatIdx: number) => {
    if (mySeat === seatIdx) {
      // Step down to audience
      setMySeat(null);
      setIsMicOn(false);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      showToast('Moved back to audience');
      return;
    }

    setMySeat(seatIdx);
    setIsHandRaised(false);
    showToast(`You are now on Stage (Seat ${seatIdx + 1})! Tap mic to speak.`);
  };

  const handleRaiseHand = () => {
    if (mySeat !== null) {
      showToast('You are already on stage!');
      return;
    }
    setIsHandRaised(!isHandRaised);
    showToast(isHandRaised ? 'Hand lowered' : 'Hand raised! ✋ Host will invite you to stage.');
  };

  // Send message in room chat
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: userName,
      flag: '🇮🇳',
      level: 1,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  // Send Floating reaction emoji
  const handleSendReaction = (emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      left: 20 + Math.random() * 60
    };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 2000);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyShareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?voiceroom=${activeRoom?.id || 'room-1'}`;
    navigator.clipboard?.writeText(link).then(() => {
      showToast('Invite link copied! Send to friends on WhatsApp or Telegram.');
    }).catch(() => {
      showToast(`Room code: ${activeRoom?.id || 'VR-108'}`);
    });
  };

  // =========================================================================
  // VIEW 1: INSIDE ACTIVE VOICE ROOM (MATCHING SCREENSHOT 2)
  // =========================================================================
  if (activeRoom) {
    const emptySeats = [4, 5, 6, 7];

    return (
      <div className="active-voiceroom-wrapper">
        {/* Floating animated reaction emojis */}
        <div className="floating-reactions-container">
          {floatingEmojis.map(item => (
            <span
              key={item.id}
              className="floating-emoji"
              style={{ left: `${item.left}%` }}
            >
              {item.emoji}
            </span>
          ))}
        </div>

        {/* Room Header */}
        <div className="vr-header">
          <div className="vr-title-group">
            <span className="vr-badge">{activeRoom.badge || 'EN'}</span>
            <div>
              <h2 className="vr-title">{activeRoom.title}</h2>
              <span className="vr-sub-tag">Level: High Practice · {activeRoom.tags[0]}</span>
            </div>
          </div>
          <div className="vr-header-actions">
            <button
              type="button"
              className="vr-share-btn"
              onClick={copyShareLink}
              title="Share Room with friends"
            >
              <Share2 size={16} /> Share
            </button>
            <button
              type="button"
              className="vr-leave-btn"
              onClick={handleLeaveRoom}
              title="Leave Room"
            >
              <LogOut size={16} /> Leave
            </button>
          </div>
        </div>

        {/* Stage Grid (Host & Speaker Seats) */}
        <div className="vr-stage-section">
          <div className="vr-stage-grid">
            {/* Active Speakers on Stage */}
            {activeRoom.speakers.map((spk, idx) => (
              <div key={spk.id} className="vr-speaker-seat">
                <div className={`vr-avatar-wrap ${spk.isSpeaking ? 'speaking-ripple' : ''}`}>
                  <img src={spk.avatar} alt={spk.name} className="vr-avatar-img" />
                  <span className="vr-flag-badge">{spk.flag}</span>
                  {spk.isSpeaking && (
                    <span className="vr-audio-icon">
                      <AudioLines size={12} />
                    </span>
                  )}
                  {spk.isMuted && (
                    <span className="vr-muted-badge">
                      <MicOff size={10} />
                    </span>
                  )}
                </div>
                <div className="vr-speaker-info">
                  <span className="vr-speaker-name">
                    {spk.isHost && <span className="vr-host-pill">★ Host</span>}
                    {spk.name}
                  </span>
                  <span className="vr-speaker-lvl">{spk.level || `Lv.${idx + 5}`}</span>
                </div>
              </div>
            ))}

            {/* My Seat if on stage */}
            {mySeat !== null && (
              <div className="vr-speaker-seat">
                <div className={`vr-avatar-wrap ${isMicOn ? 'speaking-ripple' : ''} my-seat-avatar`}>
                  {userPhoto ? (
                    <img src={userPhoto} alt={userName} className="vr-avatar-img" />
                  ) : (
                    <div className="vr-avatar-initials">{userName.slice(0, 2).toUpperCase()}</div>
                  )}
                  <span className="vr-flag-badge">🇮🇳</span>
                  {isMicOn ? (
                    <span className="vr-audio-icon"><Mic size={12} /></span>
                  ) : (
                    <span className="vr-muted-badge"><MicOff size={10} /></span>
                  )}
                </div>
                <div className="vr-speaker-info">
                  <span className="vr-speaker-name">{userName} (You)</span>
                  <span className="vr-speaker-lvl">Speaker</span>
                </div>
              </div>
            )}

            {/* Empty Chairs: Take a seat */}
            {emptySeats.slice(mySeat !== null ? 1 : 0).map((seatNum) => (
              <button
                key={seatNum}
                type="button"
                className="vr-empty-seat"
                onClick={() => handleTakeSeat(seatNum)}
                title={`Click to take Seat ${seatNum + 1} and speak`}
              >
                <div className="vr-empty-chair-circle">
                  <Hand size={18} />
                </div>
                <span className="vr-seat-num">{seatNum + 1}</span>
              </button>
            ))}
          </div>

          {/* Active Listeners Row */}
          <div className="vr-listeners-row">
            <span className="vr-listeners-label">Audience ({activeRoom.listenerCount}):</span>
            <div className="vr-listeners-avatars">
              <span className="vr-listener-chip">🇮🇳 Arjun</span>
              <span className="vr-listener-chip">🇺🇸 Cephas</span>
              <span className="vr-listener-chip">🇯🇵 Fiona</span>
              <span className="vr-listener-chip">🇧🇷 Aline</span>
              <span className="vr-listener-chip">🇩🇪 Leon</span>
              <span className="vr-listener-more">+ {activeRoom.listenerCount - 5} Others</span>
            </div>
          </div>
        </div>

        {/* Live Room Chat Messages */}
        <div className="vr-chat-section" role="log" aria-live="polite">
          {chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`vr-chat-bubble-wrap ${msg.isNotice ? 'notice-bubble' : ''}`}
            >
              {msg.isNotice ? (
                <div className="vr-notice-card">
                  <div className="vr-notice-head">
                    <Shield size={14} />
                    <span>Community Guidelines</span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              ) : (
                <div className="vr-user-msg">
                  <div className="vr-msg-meta">
                    <span className="vr-user-flag">{msg.flag}</span>
                    <span className="vr-user-lvl">Lv.{msg.level}</span>
                    <span className="vr-user-name">{msg.sender}</span>
                    <span className="vr-msg-time">{msg.time}</span>
                  </div>
                  <p className="vr-msg-content">{msg.text}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Action Bar */}
        <div className="vr-bottom-bar">
          {/* Quick chips */}
          <div className="vr-quick-chips">
            <button
              type="button"
              className="vr-chip"
              onClick={() => handleSendMessage('Hey, everyone!')}
            >
              Hey, everyone! 👋
            </button>
            <button
              type="button"
              className="vr-chip"
              onClick={() => handleSendMessage('What is the discussion topic?')}
            >
              What's the topic?
            </button>
            <button
              type="button"
              className="vr-chip"
              onClick={() => handleSendMessage('I am new here, excited to practice!')}
            >
              I'm new here 👋
            </button>
            <button
              type="button"
              className="vr-chip"
              onClick={() => handleSendMessage('Can I take the next turn to speak?')}
            >
              Can I speak next? 🎙️
            </button>
          </div>

          {/* Interactive controls */}
          <div className="vr-input-row">
            <input
              type="text"
              className="vr-text-input"
              placeholder="Comment in room…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Stage Mic Button */}
            <button
              type="button"
              className={`vr-ctrl-btn vr-mic-btn ${isMicOn ? 'active-speaking' : ''} ${mySeat === null ? 'disabled' : ''}`}
              onClick={handleToggleMic}
              title={mySeat === null ? 'Take a seat to use mic' : isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              <span>{isMicOn ? 'Speaking' : mySeat !== null ? 'Mic Off' : 'Mic'}</span>
            </button>

            {/* Raise Hand Button */}
            <button
              type="button"
              className={`vr-ctrl-btn ${isHandRaised ? 'hand-active' : ''}`}
              onClick={handleRaiseHand}
              title="Raise hand to request stage"
            >
              <Hand size={18} />
              <span>{isHandRaised ? 'Raised' : 'Raise'}</span>
            </button>

            {/* Emoji Reactions */}
            <div className="vr-reaction-bar">
              <button type="button" onClick={() => handleSendReaction('👏')} title="Clap">👏</button>
              <button type="button" onClick={() => handleSendReaction('❤️')} title="Love">❤️</button>
              <button type="button" onClick={() => handleSendReaction('🔥')} title="Fire">🔥</button>
              <button type="button" onClick={() => handleSendReaction('💡')} title="Idea">💡</button>
            </div>

            {/* Send Message */}
            <button
              type="button"
              className="vr-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && <div className="vr-toast-pill">{toastMessage}</div>}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: VOICE ROOM LOBBY (MATCHING SCREENSHOT 1)
  // =========================================================================
  const filteredRooms = activeTab === 'All'
    ? rooms
    : rooms.filter(r => r.category === activeTab || r.tags.some(t => t.toLowerCase().includes(activeTab.toLowerCase())));

  return (
    <div className="voiceroom-lobby-container">
      {/* Lobby Header */}
      <div className="vr-lobby-header">
        <div className="vr-lobby-brand">
          <div className="vr-brand-icon">
            <Radio size={24} />
          </div>
          <div>
            <h1>Student Voice Rooms</h1>
            <p>Practice speaking live with friends, build confidence, and speak freely — 100% Free.</p>
          </div>
        </div>

        <div className="vr-lobby-actions">
          <button
            type="button"
            className="vr-create-room-btn"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={18} /> Create Voice Room
          </button>
        </div>
      </div>

      {/* Hall of Fame Banner (Matching Screenshot 1) */}
      <div className="vr-hall-of-fame-card">
        <div className="hof-content">
          <div className="hof-tag">
            <Award size={15} />
            <span>DAILY LEADERS</span>
          </div>
          <h2>Hall of Fame · Top English Speakers</h2>
          <p>Join live rooms to earn confidence badges and top the daily practice leaderboard.</p>
          <div className="hof-speakers-row">
            <span className="hof-avatar">🥇 MH SA (42 min)</span>
            <span className="hof-avatar">🥈 Anthony (35 min)</span>
            <span className="hof-avatar">🥉 Rohan (28 min)</span>
          </div>
        </div>
        <div className="hof-trophy-graphic">
          <Trophy size={64} className="trophy-svg" />
          <span className="hof-glow" />
        </div>
      </div>

      {/* Category Tabs (All, English, Hindi, Interaction, Exam Prep) */}
      <div className="vr-category-tabs">
        {(['All', 'English', 'Hindi', 'Interaction', 'Exam Prep'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            className={`vr-category-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Voice Rooms Grid (Matching Screenshot 1 Cards) */}
      <div className="vr-rooms-grid">
        {filteredRooms.map(room => (
          <div key={room.id} className="vr-room-card" onClick={() => handleJoinRoom(room)}>
            {/* Card Top Metadata */}
            <div className="room-card-head">
              <div className="room-card-tags">
                <span className="room-badge">{room.badge || 'EN'}</span>
                {room.tags.slice(0, 2).map((tg, i) => (
                  <span key={i} className="room-topic-tag">{tg}</span>
                ))}
              </div>
              {room.hourlyRank && (
                <span className="room-rank-pill">{room.hourlyRank}</span>
              )}
            </div>

            {/* Room Title with Audio Wave */}
            <div className="room-card-title-row">
              <span className="room-audio-bars">
                <span className="bar" />
                <span className="bar" />
                <span className="bar" />
              </span>
              <h3>{room.title}</h3>
            </div>

            {/* Host info and Participants */}
            <div className="room-card-footer">
              <div className="room-host-block">
                <div className="room-host-avatar-wrap">
                  <img src={room.hostAvatar} alt={room.hostName} className="room-host-img" />
                  <span className="room-host-flag">{room.hostFlag}</span>
                </div>
                <div className="room-host-names">
                  <span className="host-creator-badge">★ Creator</span>
                  <span className="host-name">{room.hostName}</span>
                </div>
              </div>

              {/* Listener Avatars & Count */}
              <div className="room-listeners-stack">
                <div className="listeners-avatar-overlap">
                  {room.speakers.slice(0, 3).map((sp, i) => (
                    <img key={i} src={sp.avatar} alt={sp.name} className="overlap-img" />
                  ))}
                </div>
                <span className="room-count-pill">{room.listenerCount} in room</span>
              </div>
            </div>

            {/* Join Button */}
            <button
              type="button"
              className="room-join-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleJoinRoom(room);
              }}
            >
              <Volume2 size={15} /> Join & Practice
            </button>
          </div>
        ))}
      </div>

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="vr-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="vr-modal-card" onClick={e => e.stopPropagation()}>
            <div className="vr-modal-header">
              <div className="vr-modal-title">
                <Radio size={20} className="modal-icon" />
                <h3>Create Free Voice Room</h3>
              </div>
              <button
                type="button"
                className="vr-close-btn"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="vr-create-form">
              <label className="vr-field">
                <span>Room Title</span>
                <input
                  type="text"
                  placeholder="e.g. Daily English Conversation with Friends"
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <div className="vr-form-two-col">
                <label className="vr-field">
                  <span>Category</span>
                  <select
                    value={newRoomCategory}
                    onChange={e => setNewRoomCategory(e.target.value)}
                  >
                    <option value="English">English Learning</option>
                    <option value="Interaction">Casual Chat & Friends</option>
                    <option value="Exam Prep">College GD & Interview</option>
                    <option value="Hindi">Hindi / Hinglish Exchange</option>
                  </select>
                </label>

                <label className="vr-field">
                  <span>Topic Tag</span>
                  <input
                    type="text"
                    placeholder="#English Learning"
                    value={newRoomTag}
                    onChange={e => setNewRoomTag(e.target.value)}
                  />
                </label>
              </div>

              <div className="vr-modal-footer">
                <button
                  type="button"
                  className="vr-btn-cancel"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vr-btn-create"
                  disabled={!newRoomTitle.trim()}
                >
                  <Sparkles size={16} /> Launch Voice Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && <div className="vr-toast-pill">{toastMessage}</div>}
    </div>
  );
}
