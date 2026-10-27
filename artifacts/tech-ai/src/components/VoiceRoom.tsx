import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Hand, MessageSquare, Share2, LogOut, Plus,
  Trophy, Sparkles, Volume2, Globe, Heart, Flame, ThumbsUp, Send, X,
  Check, Copy, Shield, Award, AudioLines, MoreHorizontal, Radio, Bell,
  Sparkle, Compass
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
  pinnedMessage?: string;
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
  isPinned?: boolean;
}

export function VoiceRoom({ userName = 'Student', userPhoto, onProgress }: VoiceRoomProps) {
  // Current view: lobby or inside a room
  const [activeRoom, setActiveRoom] = useState<RoomItem | null>(null);
  const [topTab, setTopTab] = useState<'Voice' | 'Live' | 'Learn'>('Voice');
  const [categoryTab, setCategoryTab] = useState<string>('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showQuickChips, setShowQuickChips] = useState(true);

  // Inside-room interactive states
  const [mySeat, setMySeat] = useState<number | null>(null); // null = audience, 0..7 = stage seat
  const [isMicOn, setIsMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [showCC, setShowCC] = useState(false);
  const [liveCaption, setLiveCaption] = useState('');

  // Form states for creating a room
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('English');
  const [newRoomTag, setNewRoomTag] = useState('#English Learning');

  // Room messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Pre-populated realistic English practice rooms (matching HelloTalk screenshots 3 & 4)
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
      listenerCount: 40,
      tags: ['#English Learning', '#Global Lounge', '#Fluency Practice'],
      pinnedMessage: 'If you speak English or want to practice, you can come up on stage! Everyone is welcome.',
      speakers: [
        { id: 's1', name: 'MH SA', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', flag: '🇰🇷', isHost: true, isSpeaking: false, isMuted: false, level: 'Lv.15' },
        { id: 's2', name: 'Cephas 石谦', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, isMuted: true, level: 'Lv.12' },
        { id: 's3', name: 'Tayla', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', flag: '🇬🇧', isSpeaking: false, isMuted: false, level: 'Lv.10' },
        { id: 's4', name: 'WW', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: true, isMuted: false, level: 'Lv.16' }
      ]
    },
    {
      id: 'room-2',
      title: 'No Jihadis · Peaceful Discussion & English Chat',
      category: 'Interaction',
      badge: 'EN',
      hourlyRank: 'Live 🔥',
      hostName: 'Hills',
      hostAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇬🇭',
      listenerCount: 14,
      tags: ['#Bunka-no-Hi', '#Cultural Exchange', '#Respectful Debates'],
      pinnedMessage: 'Hills: If you speak English, you can come to stage and introduce yourself.',
      speakers: [
        { id: 's5', name: 'Hills', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', flag: '🇬🇭', isHost: true, isSpeaking: false, isMuted: false, level: 'Lv.10' },
        { id: 's6', name: 'Cephas 石谦', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, isMuted: true, level: 'Lv.20' },
        { id: 's7', name: 'Tayla', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', flag: '🇬🇧', isSpeaking: false, isMuted: false, level: 'Lv.10' },
        { id: 's8', name: 'WW', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: true, isMuted: false, level: 'Lv.16' }
      ]
    },
    {
      id: 'room-3',
      title: 'English chat 💬 - Daily Confidence Lab',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Active ⭐',
      hostName: 'anthony 安瀚辰',
      hostAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇺🇸',
      listenerCount: 21,
      tags: ['#English Learning', '#Confidence', '#Fluency'],
      pinnedMessage: 'Welcome! Today we talk about daily routines and college life.',
      speakers: [
        { id: 's9', name: 'anthony 安瀚辰', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isHost: true, isSpeaking: true, level: 'Lv.14' },
        { id: 's10', name: 'Priya S.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isSpeaking: false, level: 'Lv.9' },
        { id: 's11', name: 'Kenji', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', flag: '🇯🇵', isSpeaking: false, level: 'Lv.11' }
      ]
    },
    {
      id: 'room-4',
      title: 'Life without TikTok & Social Media',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Top Discussion',
      hostName: 'Nadir',
      hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇺🇿',
      listenerCount: 18,
      tags: ['#English Learning', '#Digital Well-being', '#Focus'],
      pinnedMessage: 'How do you spend your free time when you stay off short videos?',
      speakers: [
        { id: 's12', name: 'Nadir', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', flag: '🇺🇿', isHost: true, isSpeaking: false, level: 'Lv.9' },
        { id: 's13', name: 'Emma Watson', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', flag: '🇨🇦', isSpeaking: true, level: 'Lv.13' }
      ]
    },
    {
      id: 'room-5',
      title: 'Help Me Translate · Hindi & English Language Exchange',
      category: 'Hindi',
      badge: 'EN',
      hourlyRank: 'Popular 🇮🇳',
      hostName: 'Rohan Verma',
      hostAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 32,
      tags: ['#Help me translate', '#Hindi-English', '#Speaking Practice'],
      pinnedMessage: 'Practice speaking English and Hindi freely without fear of making mistakes!',
      speakers: [
        { id: 's14', name: 'Rohan Verma', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isHost: true, isSpeaking: true, level: 'Lv.11' },
        { id: 's15', name: 'Sarah B.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, level: 'Lv.14' }
      ]
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Join a room (matching screenshot 4 inside room view)
  const handleJoinRoom = (room: RoomItem) => {
    setActiveRoom(room);
    setMySeat(null);
    setIsMicOn(false);
    setIsHandRaised(false);
    setIsFollowing(false);

    // Initial messages matching screenshot 4
    setChatMessages([
      {
        id: 'pin1',
        sender: room.hostName,
        flag: room.hostFlag,
        level: 10,
        text: room.pinnedMessage || 'If you speak English, you can come to stage and speak.',
        time: 'Pinned',
        isPinned: true
      },
      {
        id: 'notice1',
        sender: 'Notice',
        flag: '📢',
        level: 1,
        text: 'HelloTalk is a language learning app. Please communicate using the chosen Voiceroom language. Avoid offensive content related to violence, abuse, politics, discrimination, drugs, guns, religion, etc. Thank you for maintaining a safe and inclusive learning environment.',
        time: 'System',
        isNotice: true
      },
      {
        id: 'm1',
        sender: 'Mr.Rage...',
        flag: '🇺🇸',
        level: 19,
        text: 'Move to Jersey bro',
        time: 'now'
      },
      {
        id: 'm2',
        sender: 'Mr.Rage...',
        flag: '🇺🇸',
        level: 19,
        text: 'Elizabeth to be exact lmao',
        time: 'now'
      },
      {
        id: 'm3',
        sender: 'Mr.Rage...',
        flag: '🇺🇸',
        level: 19,
        text: "Bro it's Eric",
        time: 'now'
      },
      {
        id: 'm4',
        sender: 'Cephas ...',
        flag: '🇺🇸',
        level: 20,
        badge: 'Bestie',
        text: 'Bolsonaro',
        time: 'now'
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
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
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
      badge: 'EN',
      hourlyRank: 'Created by You',
      hostName: userName,
      hostAvatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 1,
      tags: [newRoomTag, '#Student Room', '#Free Practice'],
      pinnedMessage: `Welcome to ${newRoomTitle}! Speak freely and have fun practicing.`,
      speakers: [
        {
          id: 'me',
          name: userName,
          avatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          flag: '🇮🇳',
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          level: 'Lv.10'
        }
      ]
    };

    setRooms([newRoom, ...rooms]);
    setCreateModalOpen(false);
    setNewRoomTitle('');
    handleJoinRoom(newRoom);
    setMySeat(0); // Take host seat
    showToast('Voice room created! You can now invite friends to speak together.');
  };

  // Toggle Microphone when on stage
  const handleToggleMic = async () => {
    if (mySeat === null) {
      showToast('Take an open seat on stage first to speak!');
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
        showToast('Microphone unmuted 🎙️ You are live on stage!');
      } catch {
        showToast('Microphone permission needed to speak on stage.');
      }
    }
  };

  // Click on open seat (Seat 5, 6, 7, 8)
  const handleTakeSeat = (seatIdx: number) => {
    if (mySeat === seatIdx) {
      // Step down to audience
      setMySeat(null);
      setIsMicOn(false);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      showToast('Moved down to audience');
      return;
    }

    setMySeat(seatIdx);
    setIsHandRaised(false);
    showToast(`You took Seat ${seatIdx + 1}! Tap the microphone to talk with friends.`);
  };

  const handleRaiseHand = () => {
    if (mySeat !== null) {
      showToast('You are already on stage!');
      return;
    }
    setIsHandRaised(!isHandRaised);
    showToast(isHandRaised ? 'Hand lowered' : 'Hand raised! ✋ Host or speaker can invite you.');
  };

  // Send message in room chat
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: userName,
      flag: '🇮🇳',
      level: 12,
      text,
      time: 'now'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  // Floating reaction emojis (clap, heart, fire, sparkles)
  const handleSendReaction = (emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      left: 15 + Math.random() * 70
    };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 2200);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyShareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?voiceroom=${activeRoom?.id || 'room-1'}`;
    navigator.clipboard?.writeText(link).then(() => {
      showToast('Invite link copied! Send to friends on WhatsApp or Discord.');
    }).catch(() => {
      showToast(`Room code: ${activeRoom?.id || 'VR-108'}`);
    });
  };

  // =========================================================================
  // VIEW 1: INSIDE ACTIVE VOICE ROOM (MATCHING SCREENSHOT 4)
  // =========================================================================
  if (activeRoom) {
    const audienceMembers = [
      { name: 'Märcö', flag: '🇮🇳', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' },
      { name: 'Fiona', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
      { name: 'Aline Alv...', flag: '🇧🇷', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
      { name: '竹子leon', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
      { name: 'Lee', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
      { name: 'Mik', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80' }
    ];

    return (
      <div className="active-voiceroom-wrapper">
        {/* Floating animated reactions */}
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

        {/* Top Header Matching Screenshot 4 */}
        <div className="ht-room-header">
          <div className="ht-header-left">
            <h2 className="ht-room-title">{activeRoom.title.split('·')[0].trim()}</h2>
            <button
              type="button"
              className={`ht-follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={() => {
                setIsFollowing(!isFollowing);
                showToast(isFollowing ? 'Unfollowed room' : 'Following room ⭐');
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <span className="ht-pill-tag ht-tag-en">{activeRoom.badge || 'EN'}</span>
            <span className="ht-pill-tag ht-tag-level">🏠 Lv.10</span>
          </div>

          <div className="ht-header-right">
            <button
              type="button"
              className="ht-icon-btn"
              onClick={copyShareLink}
              title="Share Room"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              className="ht-icon-btn"
              onClick={() => showToast('Room options: Notifications ON, Audio HD, Auto-translate')}
              title="More Options"
            >
              <MoreHorizontal size={20} />
            </button>
            <button
              type="button"
              className="ht-leave-btn"
              onClick={handleLeaveRoom}
              title="Leave Room"
            >
              <LogOut size={16} /> Leave
            </button>
          </div>
        </div>

        {/* 8-Seat Stage Section Matching Screenshot 4 */}
        <div className="ht-stage-container">
          {/* Row 1: Active Speakers (Seats 1-4) */}
          <div className="ht-stage-row">
            {activeRoom.speakers.slice(0, 4).map((spk, idx) => {
              const isMe = mySeat === idx;
              return (
                <div key={spk.id} className="ht-speaker-seat">
                  <div className={`ht-avatar-circle ${spk.isSpeaking ? 'is-speaking-ring' : ''}`}>
                    <img src={spk.avatar} alt={spk.name} className="ht-avatar-img" />
                    <span className="ht-country-flag">{spk.flag}</span>
                    {spk.isMuted && (
                      <span className="ht-mute-badge">
                        <MicOff size={11} />
                      </span>
                    )}
                    {spk.isSpeaking && (
                      <span className="ht-speaking-badge">
                        <AudioLines size={12} />
                      </span>
                    )}
                  </div>
                  <div className="ht-speaker-name-row">
                    {spk.isHost && <span className="ht-host-icon">🏠</span>}
                    <span className="ht-speaker-name">{isMe ? `${userName} (You)` : spk.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 2: Joinable Stage Seats (Seats 5-8) */}
          <div className="ht-stage-row ht-empty-seats-row">
            {[4, 5, 6, 7].map((seatIdx) => {
              const isMySeat = mySeat === seatIdx;
              return (
                <div key={seatIdx} className="ht-speaker-seat">
                  {isMySeat ? (
                    <div
                      className={`ht-avatar-circle my-seat-active ${isMicOn ? 'is-speaking-ring' : ''}`}
                      onClick={() => handleTakeSeat(seatIdx)}
                      title="Click to step down to audience"
                    >
                      {userPhoto ? (
                        <img src={userPhoto} alt={userName} className="ht-avatar-img" />
                      ) : (
                        <div className="ht-avatar-initials">{userName.slice(0, 2).toUpperCase()}</div>
                      )}
                      <span className="ht-country-flag">🇮🇳</span>
                      {isMicOn ? (
                        <span className="ht-speaking-badge"><Mic size={11} /></span>
                      ) : (
                        <span className="ht-mute-badge"><MicOff size={11} /></span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ht-empty-seat-button"
                      onClick={() => handleTakeSeat(seatIdx)}
                      title={`Click to take Seat ${seatIdx + 1} and speak with everyone`}
                    >
                      <div className="ht-empty-seat-icon">
                        <Hand size={18} />
                      </div>
                    </button>
                  )}
                  <span className="ht-seat-number">
                    {isMySeat ? 'You' : seatIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Audience Row Matching Screenshot 4 */}
          <div className="ht-audience-row">
            {audienceMembers.map((aud, i) => (
              <div key={i} className="ht-audience-item">
                <div className="ht-audience-avatar-wrap">
                  <img src={aud.photo} alt={aud.name} className="ht-audience-img" />
                  <span className="ht-audience-flag">{aud.flag}</span>
                </div>
                <span className="ht-audience-name">{aud.name}</span>
              </div>
            ))}
            <div className="ht-audience-more-pill">
              <span>{activeRoom.listenerCount - 6 > 0 ? activeRoom.listenerCount - 6 : 11}</span>
              <small>Others in...</small>
            </div>
          </div>
        </div>

        {/* Live Chat Area Matching Screenshot 4 */}
        <div className="ht-chat-stream-section" role="log" aria-live="polite">
          {chatMessages.map(msg => (
            <div key={msg.id} className="ht-chat-message-item">
              {msg.isPinned ? (
                <div className="ht-pinned-card">
                  <span className="ht-pin-icon">📌</span>
                  <span className="ht-pinned-author">{msg.sender}:</span>
                  <p className="ht-pinned-text">{msg.text}</p>
                </div>
              ) : msg.isNotice ? (
                <div className="ht-notice-box">
                  <div className="ht-notice-title-row">
                    <span className="ht-notice-badge">Notice</span>
                    <span className="ht-notice-horn">📢</span>
                  </div>
                  <p className="ht-notice-content">{msg.text}</p>
                </div>
              ) : (
                <div className="ht-user-comment-row">
                  <span className="ht-user-flag">{msg.flag}</span>
                  <span className="ht-user-level-badge">💎 {msg.level}</span>
                  {msg.badge && <span className="ht-user-bestie-badge">{msg.badge}</span>}
                  <span className="ht-user-sender">{msg.sender}:</span>
                  <span className="ht-comment-text">{msg.text}</span>
                  <button
                    type="button"
                    className="ht-translate-mini-btn"
                    onClick={() => showToast(`Translated: "${msg.text}"`)}
                    title="Translate comment"
                  >
                    文
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Mascot Widget on right */}
        <div className="ht-floating-mascot">
          <button
            type="button"
            className="ht-mascot-btn"
            onClick={() => showToast('TECH AI Live Room: Practice freely & make friends!')}
            title="Live speaking buddy"
          >
            <span className="mascot-badge">Live</span>
            <span className="mascot-emoji">🐾</span>
          </button>
        </div>

        {/* Bottom Bar: Quick Reply Chips + Comment Bar Matching Screenshot 4 */}
        <div className="ht-bottom-controls-section">
          {/* Quick Reply Chips Row */}
          {showQuickChips && (
            <div className="ht-quick-chips-row">
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage('Hey, everyone!')}
              >
                Hey, everyone!
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage("What's the topic?")}
              >
                What's the topic?
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage("I'm new here.")}
              >
                I'm new here.
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage('Can I take a turn on stage?')}
              >
                Can I speak next?
              </button>
              <button
                type="button"
                className="ht-close-chips-btn"
                onClick={() => setShowQuickChips(false)}
                title="Dismiss quick chips"
              >
                ✕
              </button>
            </div>
          )}

          {/* Comment & Interaction Bar */}
          <div className="ht-action-bar-row">
            <input
              type="text"
              className="ht-comment-input"
              placeholder="Comment…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* CC Live Captions Toggle */}
            <button
              type="button"
              className={`ht-action-btn ${showCC ? 'active' : ''}`}
              onClick={() => {
                setShowCC(!showCC);
                showToast(showCC ? 'Live captions OFF' : 'Live captions ON');
              }}
              title="Toggle Live Speech Subtitles (CC)"
            >
              CC
            </button>

            {/* Mic / Seat Button */}
            {mySeat !== null ? (
              <button
                type="button"
                className={`ht-action-btn ht-mic-active ${isMicOn ? 'mic-speaking' : 'mic-muted'}`}
                onClick={handleToggleMic}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            ) : (
              <button
                type="button"
                className={`ht-action-btn ${isHandRaised ? 'hand-active' : ''}`}
                onClick={handleRaiseHand}
                title="Raise Hand to Speak"
              >
                <Hand size={18} />
              </button>
            )}

            {/* Reaction / Gifts Button */}
            <button
              type="button"
              className="ht-action-btn ht-gift-btn"
              onClick={() => handleSendReaction('🎁')}
              title="Send Gift / Reaction"
            >
              🎁
            </button>

            {/* Reactions quick row */}
            <div className="ht-reactions-mini">
              <button type="button" onClick={() => handleSendReaction('❤️')}>❤️</button>
              <button type="button" onClick={() => handleSendReaction('👏')}>👏</button>
              <button type="button" onClick={() => handleSendReaction('🔥')}>🔥</button>
            </div>

            {/* Send Button */}
            <button
              type="button"
              className="ht-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Toast Pill */}
        {toastMessage && <div className="ht-toast-pill">{toastMessage}</div>}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: VOICE ROOM LOBBY (MATCHING SCREENSHOT 3)
  // =========================================================================
  const filteredRooms = categoryTab === 'All'
    ? rooms
    : rooms.filter(r => r.category === categoryTab || r.tags.some(t => t.toLowerCase().includes(categoryTab.toLowerCase())));

  return (
    <div className="voiceroom-lobby-container">
      {/* Top Bar Matching Screenshot 3: VIP pill on left, Voice/Live/Learn in center, Mic button on right */}
      <div className="ht-lobby-topbar">
        <div className="ht-vip-badge-pill" title="Free VIP Speaking Access for Students">
          <span className="ht-vip-sub">Upgrade</span>
          <span className="ht-vip-bold">VIP</span>
        </div>

        <div className="ht-top-tabs">
          {(['Voice', 'Live', 'Learn'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              className={`ht-top-tab ${topTab === tab ? 'active' : ''}`}
              onClick={() => setTopTab(tab)}
            >
              {tab}
              {topTab === tab && <span className="ht-tab-active-indicator" />}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ht-create-mic-btn"
          onClick={() => setCreateModalOpen(true)}
          title="Create a Free Voice Room"
        >
          <Mic size={20} />
        </button>
      </div>

      {/* Category Pills Row Matching Screenshot 3 */}
      <div className="ht-category-pills-row">
        {['All', 'English', 'Hindi', 'Interaction', 'Music', 'Gaming'].map(cat => (
          <button
            key={cat}
            type="button"
            className={`ht-category-pill ${categoryTab === cat ? 'active' : ''}`}
            onClick={() => setCategoryTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hall of Fame Banner Matching Screenshot 3 */}
      <div className="ht-hall-of-fame-banner">
        <div className="ht-hof-text-side">
          <h2 className="ht-hof-title">Hall of Fame</h2>
          <p className="ht-hof-subtitle">Practice speaking with friends to top today's leaderboard.</p>
          <div className="ht-hof-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
        <div className="ht-hof-graphic-side">
          <Trophy size={68} className="ht-trophy-icon" />
          <div className="ht-trophy-glow" />
        </div>
      </div>

      {/* Room Cards List Matching Screenshot 3 */}
      <div className="ht-rooms-list">
        {filteredRooms.map(room => (
          <div key={room.id} className="ht-room-card" onClick={() => handleJoinRoom(room)}>
            {/* Top Badges Row */}
            <div className="ht-card-tags-row">
              <span className="ht-card-badge-black">{room.badge || 'EN'}</span>
              {room.tags.slice(0, 1).map((tg, i) => (
                <span key={i} className="ht-card-badge-purple">{tg}</span>
              ))}
              {room.hourlyRank && (
                <span className="ht-card-badge-rank">{room.hourlyRank}</span>
              )}
            </div>

            {/* Title with Equalizer Wave Icon */}
            <div className="ht-card-title-row">
              <span className="ht-card-audio-bars">
                <span className="b1" />
                <span className="b2" />
                <span className="b3" />
              </span>
              <h3 className="ht-card-title">{room.title}</h3>
            </div>

            {/* Bottom Row: Host info on left, Listener Overlap Avatars on right */}
            <div className="ht-card-bottom-row">
              <div className="ht-host-info-block">
                <div className="ht-host-avatar-wrap">
                  <img src={room.hostAvatar} alt={room.hostName} className="ht-host-img" />
                  <span className="ht-host-country-flag">{room.hostFlag}</span>
                </div>
                <div className="ht-host-text">
                  <span className="ht-creator-tag">★ Creator</span>
                  <span className="ht-host-name-label">{room.hostName}</span>
                </div>
              </div>

              {/* Overlapping listener avatars + count pill */}
              <div className="ht-listeners-overlap-block">
                <div className="ht-overlap-avatars">
                  {room.speakers.slice(0, 4).map((spk, idx) => (
                    <div key={idx} className="ht-overlap-circle">
                      <img src={spk.avatar} alt={spk.name} className="ht-overlap-img" />
                      <span className="ht-overlap-flag">{spk.flag}</span>
                    </div>
                  ))}
                </div>
                <span className="ht-listeners-count-pill">{room.listenerCount}</span>
              </div>
            </div>
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
                  placeholder="e.g. Daily English Speaking Practice with Friends"
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  required
                />
              </label>

              <div className="vr-form-two-col">
                <label className="vr-field">
                  <span>Category</span>
                  <select
                    value={newRoomCategory}
                    onChange={e => setNewRoomCategory(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Interaction">Interaction</option>
                    <option value="Exam Prep">Exam Prep</option>
                  </select>
                </label>

                <label className="vr-field">
                  <span>Topic Tag</span>
                  <select
                    value={newRoomTag}
                    onChange={e => setNewRoomTag(e.target.value)}
                  >
                    <option value="#English Learning">#English Learning</option>
                    <option value="#Daily Speaking">#Daily Speaking</option>
                    <option value="#Confidence">#Confidence</option>
                    <option value="#Interview Prep">#Interview Prep</option>
                    <option value="#Help me translate">#Help me translate</option>
                  </select>
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
                <button type="submit" className="vr-btn-create">
                  <Plus size={16} /> Create Room & Start Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="ht-toast-pill">{toastMessage}</div>}
    </div>
  );
}
