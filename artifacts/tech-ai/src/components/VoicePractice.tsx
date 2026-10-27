import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, Sparkles, Copy,
  Play, Pause, Repeat, X
} from 'lucide-react';

interface VoicePracticeProps {
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  correction?: string;
  time: string;
}

export function VoicePractice({ onProgress }: VoicePracticeProps) {
  // Practice states
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [autoVoice, setAutoVoice] = useState(true);
  const [listening, setListening] = useState(false);
  const [micMode, setMicMode] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [currentTopic, setCurrentTopic] = useState('Daily life');
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'paused' | 'stopped'>('idle');
  const [orbCaption, setOrbCaption] = useState('Tap the microphone or type a reply to start practising. The sky orb animates with the conversation.');
  const [supportLang, setSupportLang] = useState('hi');
  const [practiceLang, setPracticeLang] = useState('en-US');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [isPaused, setIsPaused] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('techai_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [favModalOpen, setFavModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const starterGreeting = "Hello! 👋 Welcome to your English practice session. Let's talk about your day.\n\nQuestion: What do you usually like to do in your free time?";

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: starterGreeting,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [currentQuestion, setCurrentQuestion] = useState('What do you usually like to do in your free time?');
  const [lastAIReply, setLastAIReply] = useState('What do you usually like to do in your free time?');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechAccumulatorRef = useRef<string>('');

  // Suggestions Dictionary matching user speaking level
  const suggestions: Record<string, Record<'Beginner' | 'Intermediate' | 'Advanced', string>> = {
    'free time': {
      Beginner: 'In my free time, I like playing cricket.',
      Intermediate: 'In my free time, I enjoy playing cricket with my friends because it keeps me active.',
      Advanced: 'During my leisure hours, I usually engage in cricket, which not only keeps me physically active but also hones my leadership skills.'
    },
    'cricket': {
      Beginner: 'I play cricket every Sunday morning.',
      Intermediate: 'Cricket is my favourite sport because it teaches teamwork and focus.',
      Advanced: 'Competitive sports like cricket require both rigorous physical endurance and strategic foresight.'
    },
    'college': {
      Beginner: 'I study engineering in college.',
      Intermediate: 'I am currently pursuing my degree in college and learning new technical skills.',
      Advanced: 'I am an undergraduate student focused on mastering core engineering principles while building practical applications.'
    },
    'day': {
      Beginner: 'My day was really good and productive.',
      Intermediate: 'My day was quite productive because I attended classes and finished my tasks.',
      Advanced: 'It was a highly productive day; I managed to balance coursework with practical project implementation.'
    },
    'default': {
      Beginner: 'In my free time, I like playing cricket.',
      Intermediate: 'I want to improve my spoken English so that I can communicate confidently in my career.',
      Advanced: 'Developing strong communication skills is essential for effective cross-cultural collaboration and career growth.'
    }
  };

  const getSuggestion = () => {
    const qLower = currentQuestion.toLowerCase();
    if (qLower.includes('free time') || qLower.includes('spare time') || qLower.includes('hobby')) {
      return suggestions['free time'][level];
    }
    if (qLower.includes('cricket') || qLower.includes('sport') || qLower.includes('game')) {
      return suggestions['cricket'][level];
    }
    if (qLower.includes('college') || qLower.includes('study') || qLower.includes('major') || qLower.includes('engineering')) {
      return suggestions['college'][level];
    }
    if (qLower.includes('day') || qLower.includes('today') || qLower.includes('feeling')) {
      return suggestions['day'][level];
    }
    return suggestions['default'][level];
  };

  // Toast Helper
  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // Sync favorites to local storage
  useEffect(() => {
    try {
      localStorage.setItem('techai_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // Load available browser TTS voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, orbState]);

  // Polite grammar checking
  const checkGrammar = (text: string): string | null => {
    const t = text.trim();
    if (/\bi\s+(is|am\s+play|go\s+yesterday)\b/i.test(t)) {
      return 'Helpful tip: Use "I am" or "I went yesterday" for natural past tense.';
    }
    if (/\bhe\s+don't\b/i.test(t)) {
      return 'Helpful tip: "He doesn\'t" is standard for third-person singular.';
    }
    if (/\bi\s+like\s+play\b/i.test(t)) {
      return 'Polite upgrade: In natural English, say "I like playing cricket" or "I like to play cricket".';
    }
    return null;
  };

  // Text-To-Speech with animated living sky orb
  const readText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*#_~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;

    // Select matched voice
    if (selectedVoice !== 'default') {
      const idx = Number(selectedVoice);
      if (voices[idx]) utterance.voice = voices[idx];
    } else {
      const preferred = voices.find(v => v.lang.startsWith(practiceLang.slice(0, 2)) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      setOrbState('speaking');
      setOrbCaption('AI is speaking… The sky orb flows with the voice.');
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setOrbState('paused');
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setOrbState('speaking');
      setIsPaused(false);
    };

    utterance.onend = () => {
      setOrbState('idle');
      setOrbCaption('AI is ready. Tap the microphone or type a reply to practise.');
      setIsPaused(false);

      // If continuous mic mode is active, resume listening after speech completes
      if (micMode) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    utterance.onerror = () => {
      setOrbState('idle');
      setOrbCaption('Speech playback encountered a browser pause.');
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Generate dynamic AI responses tailored to selected level
  const generateAIResponse = (userText: string): string => {
    const t = userText.toLowerCase();

    if (/cricket|football|game|sport|play/.test(t)) {
      if (level === 'Beginner') return "That sounds like a lot of fun! Who do you usually play sports with?";
      if (level === 'Intermediate') return "Sports are wonderful for fitness and teamwork. How often do you play, and what role do you enjoy most?";
      return "Engaging in sports cultivates discipline and strategic thinking. In your view, how does playing sports influence your daily focus?";
    }

    if (/college|school|study|engineering|student|class/.test(t)) {
      if (level === 'Beginner') return "Nice! Which subject or class do you enjoy the most in your studies?";
      if (level === 'Intermediate') return "College gives you great opportunities. Which subject do you find most interesting, and why?";
      return "Balancing academic rigor with practical skill development is key for modern students. What specific academic project has challenged you the most this year?";
    }

    if (/good|fine|great|happy|awesome|well/.test(t)) {
      if (level === 'Beginner') return "I'm glad to hear that! What was the best part of your day?";
      if (level === 'Intermediate') return "That's wonderful to hear! Can you tell me about one interesting thing that happened today?";
      return "Positive momentum makes a significant difference in productivity. What key goal or milestone did you focus on today?";
    }

    if (/tech|coding|programming|computer|ai/.test(t)) {
      if (level === 'Beginner') return "Technology is so cool! What do you like making with computers?";
      if (level === 'Intermediate') return "That's great! Working with technology opens up a lot of career paths. Which programming language or tool are you exploring currently?";
      return "Artificial intelligence and software engineering are evolving rapidly. How do you envision AI shaping your target industry over the next five years?";
    }

    if (level === 'Beginner') return "Good answer! 😊 Can you tell me a little bit more about that in one simple sentence?";
    if (level === 'Intermediate') return "Thanks for sharing that! Could you elaborate further or give me a practical example from your experience?";
    return "That is a well-articulated perspective. Could you expand on the underlying reasoning behind that point of view?";
  };

  // Send message
  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || orbState === 'thinking') return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    speechAccumulatorRef.current = '';

    if (recognitionRef.current && listening) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const correction = checkGrammar(text);

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      correction: correction || undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setOrbState('thinking');
    setOrbCaption('Analyzing your reply and preparing the next question…');

    setTimeout(() => {
      const reply = generateAIResponse(text);
      setLastAIReply(reply);
      setCurrentQuestion(reply);

      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
      onProgress?.('lesson', 'English Speaking Practice', `Practiced ${level} conversational English`);

      if (autoVoice) {
        readText(reply);
      } else {
        setOrbState('idle');
        setOrbCaption('AI is ready. Tap the microphone or type a reply to practise.');
      }
    }, 650);
  };

  // Continuous speech recognition that waits until the user finishes talking
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setMicMode(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = practiceLang;

      rec.onstart = () => {
        setListening(true);
        setOrbState('listening');
        setOrbCaption('Listening to you speak… Take your time, AI will not interrupt.');
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const heard = (finalTranscript || interimTranscript).trim();
        if (heard) {
          speechAccumulatorRef.current = heard;
          setOrbState('listening');
          setOrbCaption(`Listening: "${heard}"…`);

          // Clear previous silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Wait 1.6s of silence after speaking to ensure user has completed sentence
          silenceTimerRef.current = setTimeout(() => {
            const completePhrase = speechAccumulatorRef.current.trim();
            if (completePhrase) {
              speechAccumulatorRef.current = '';
              try { rec.stop(); } catch {}
              setListening(false);
              handleSend(completePhrase);
            }
          }, 1600);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Microphone notice:', e.error);
        }
      };

      rec.onend = () => {
        setListening(false);
        if (micMode && orbState !== 'thinking' && orbState !== 'speaking') {
          setTimeout(() => {
            if (micMode) startListening();
          }, 400);
        }
      };

      rec.start();
    } catch {
      setTimeout(() => {
        if (micMode) startListening();
      }, 500);
    }
  };

  // Toggle mic mode
  const toggleMic = () => {
    if (micMode) {
      setMicMode(false);
      setListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setOrbState('idle');
      showToast('Continuous microphone turned off.');
    } else {
      setMicMode(true);
      showToast('Microphone on. Speak naturally; AI will not interrupt until you finish.');
      startListening();
    }
  };

  // Explain in selected language
  const explainInLanguage = (sentence: string) => {
    const explanations: Record<string, string> = {
      hi: `🇮🇳 हिंदी में अर्थ / व्याख्या:
"${sentence}"
यह सवाल आपसे आपके विचारों या अनुभवों को शेयर करने के लिए पूछा गया है। आप सरल और पूरे वाक्यों में जवाब दे सकते हैं।`,
      bn: `🇧🇩 বাংলায় অর্থ / ব্যাখ্যা:
"${sentence}"
এই প্রশ্নটি আপনার অভিজ্ঞতা এবং মতামত শেয়ার করার জন্য জিজ্ঞেস করা হয়েছে।`,
      ta: `🇮🇳 தமிழில் விளக்கம்:
"${sentence}"
இந்த கேள்வி உங்கள் கருத்துக்களை பகிர்ந்து கொள்ள கேட்கப்பட்டுள்ளது.`,
      te: `🇮🇳 తెలుగులో వివరణ:
"${sentence}"
ఈ ప్రశ్న మీ అనుభవాలను పంచుకోవడానికి అడగబడింది.`,
      mr: `🇮🇳 मराठीत अर्थ / स्पष्टीकरण:
"${sentence}"
हा प्रश्न तुमचे अनुभव आणि विचार मांडण्यासाठी विचारला गेला आहे.`,
      gu: `🇮🇳 ગુજરાતીમાં અર્થ:
"${sentence}"
આ પ્રશ્ન તમારા વિચારો વ્યક્ત કરવા માટે પૂછવામાં આવ્યો છે.`,
      en: `💡 Explanation:
"${sentence}"
This question invites you to share your thoughts. Try responding in 1 or 2 complete sentences with an example.`,
      es: `🇪🇸 Explicación:
"${sentence}"
Esta pregunta te invita a compartir tus ideas.`,
      fr: `🇫🇷 Explication:
"${sentence}"
Cette question vous invite à partager vos idées.`
    };

    const exp = explanations[supportLang] || explanations.hi;
    setMessages(prev => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        sender: 'ai',
        text: exp,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Select Topic
  const handleSelectTopic = (top: string) => {
    setCurrentTopic(top);
    setTopicModalOpen(false);

    const starters: Record<string, string> = {
      'Daily life': 'Let’s talk about daily life! What is your favorite time of the day and why?',
      'College & studies': 'Awesome, let’s focus on college & studies! What is your major, and what project are you working on?',
      'Hobbies & sports': 'Great choice! What hobby or sport brings you the most joy when you have free time?',
      'Travel & culture': 'Travel is exciting! If you could travel to any place in the world tomorrow, where would you go?',
      'Job interviews': 'Interview practice mode: Can you introduce yourself and tell me why you chose your field of study?',
      'Food & cooking': 'Food is a universal topic! What is your favorite dish to eat or cook?',
      'Technology & AI': 'Tech & AI: What exciting technology or tool do you use most frequently every day?',
      'Friendship & family': 'Let’s talk about people close to you: What quality do you value most in a true friend?'
    };

    const q = starters[top] || `Let's talk about ${top}! What are your thoughts on this?`;
    setCurrentQuestion(q);
    setLastAIReply(q);

    setMessages(prev => [
      ...prev,
      {
        id: `topic-${Date.now()}`,
        sender: 'ai',
        text: `Topic changed to: ${top}\n\n${q}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(q);
    showToast(`Topic set to: ${top}`);
  };

  // Pick random topic
  const pickRandomTopic = () => {
    const list = topicsList.filter(t => t !== currentTopic);
    const chosen = list[Math.floor(Math.random() * list.length)] || 'Hobbies & sports';
    handleSelectTopic(chosen);
  };

  // Voice Controls
  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setMicMode(false);
    setListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setOrbState('stopped');
    setOrbCaption('Speech stopped. You can continue whenever you are ready.');
    showToast('Speech playback and microphone stopped.');
  };

  const handlePauseResume = () => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setOrbState('paused');
      setOrbCaption('Voice paused. Click Resume to continue listening.');
      showToast('Voice paused.');
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setOrbState('speaking');
      setOrbCaption('Voice resumed.');
      showToast('Voice resumed.');
    } else {
      readText(lastAIReply);
    }
  };

  const handleRepeat = () => {
    if (lastAIReply) {
      showToast('Repeating last sentence…');
      readText(lastAIReply);
    }
  };

  const resetSession = () => {
    if (!confirm('Start a fresh practice session? Previous messages will be cleared.')) return;
    const starter = `Welcome back! Let's practise talking about ${currentTopic}. How are you feeling right now?`;
    setCurrentQuestion(starter);
    setLastAIReply(starter);
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        sender: 'ai',
        text: starter,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setOrbState('idle');
    setOrbCaption('Tap the microphone or choose a reply to start practising.');
    if (autoVoice) readText(starter);
  };

  // Favorites toggle
  const toggleFavorite = (text: string) => {
    if (favorites.includes(text)) {
      setFavorites(favorites.filter(f => f !== text));
      showToast('Removed from favorites.');
    } else {
      setFavorites([...favorites, text]);
      showToast('Saved to your favorites ⭐');
    }
  };

  // Copy text helper
  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    showToast('Copied to clipboard!');
  };

  const topicsList = [
    'Daily life', 'College & studies', 'Hobbies & sports', 'Travel & culture',
    'Job interviews', 'Food & cooking', 'Technology & AI', 'Friendship & family'
  ];

  return (
    <div className="voice-studio-container">
      {/* Top Header Bar Matching Image 2 */}
      <header className="voice-header-bar">
        <div className="brand">
          <div className="brand-avatar">N</div>
          <div>
            <div className="brand-title">NEXORA-07 / Voice Studio</div>
            <div className="brand-sub">Speak. Learn. Grow.</div>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="pill pill-topic" onClick={() => setTopicModalOpen(true)}>
            ▦ Topic
          </button>
          <button type="button" className="pill pill-translate" onClick={() => explainInLanguage(lastAIReply)}>
            文 Translate
          </button>
          <button type="button" className="pill pill-new" onClick={resetSession}>
            + New chat
          </button>
        </div>
      </header>

      {/* Main Studio Dual-Panel Grid: LEFT = Visualizer, RIGHT = Conversation */}
      <div className="voice-studio-grid">
        {/* ============================================================== */}
        {/* LEFT PANEL: AI Voice Visualizer (Laptop / Desktop LEFT)          */}
        {/* ============================================================== */}
        <aside className="panel voice-visualizer-card">
          <div className="right-head">
            <div>
              <h2>AI Voice Visualizer</h2>
              <div className="sub">Your conversation, brought to life</div>
            </div>
            <select
              className="select select-voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              aria-label="AI voice"
            >
              <option value="default">✨ Default voice</option>
              {voices.map((v, i) => (
                <option key={v.voiceURI || i} value={String(i)}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Large Living Sky-Blue Orb Matching Image 1 */}
          <div className={`orb-wrap ${orbState}`}>
            <div className="orb-halo" />
            <div className="orb-wave" />
            <div className="orb">
              <div className="cloud" />
              <div className="cloud two" />
              <div className="cloud three" />
              <div className="orb-ring" />
              <div className="orb-core">✦</div>
            </div>
          </div>

          {/* Equalizer Audio Waves */}
          <div className={`audio-bars ${orbState === 'speaking' || orbState === 'listening' ? 'active' : ''}`}>
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </div>

          {/* State & Dynamic Caption */}
          <div className="orb-state">
            {orbState === 'speaking' && 'AI is speaking…'}
            {orbState === 'listening' && 'Listening to you…'}
            {orbState === 'thinking' && 'Thinking & analyzing…'}
            {orbState === 'paused' && 'Speech paused'}
            {orbState === 'stopped' && 'Speech stopped'}
            {orbState === 'idle' && 'AI is ready'}
          </div>
          <div className="orb-caption">{orbCaption}</div>

          {/* Primary Controls Matching Image 1 */}
          <div className="visual-controls">
            <button
              type="button"
              className="control"
              id="stopBtn"
              onClick={handleStopSpeech}
              title="Stop audio playback immediately"
            >
              ■ Stop speech
            </button>
            <button
              type="button"
              className={`control primary ${autoVoice ? 'on' : ''}`}
              id="autoBtn"
              onClick={() => {
                setAutoVoice(!autoVoice);
                showToast(autoVoice ? 'Auto-voice speech turned OFF' : 'Auto-voice speech turned ON');
              }}
              title="Toggle automatic speech playback"
            >
              ● AI Voice: {autoVoice ? 'On' : 'Off'}
            </button>
          </div>

          {/* Practice & Explanation Language Box Matching Image 1 */}
          <div className="language-box">
            <div className="lang-title">
              <span>🌐 Practice language</span>
              <span className="choose-lang-sub">Choose language</span>
            </div>
            <div className="lang-row">
              <select
                className="select"
                value={practiceLang}
                onChange={(e) => {
                  setPracticeLang(e.target.value);
                  showToast(`Practice language set to ${e.target.value}`);
                }}
                aria-label="Practice language"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
                <option value="en-AU">English (Australia)</option>
                <option value="en-CA">English (Canada)</option>
              </select>
              <select
                className="select"
                value={supportLang}
                onChange={(e) => {
                  setSupportLang(e.target.value);
                  showToast(`Explanation language set to ${e.target.value}`);
                }}
                aria-label="Explanation language"
              >
                <option value="hi">Explain in Hindi</option>
                <option value="en">Explain in English</option>
                <option value="bn">Explain in Bengali</option>
                <option value="ta">Explain in Tamil</option>
                <option value="te">Explain in Telugu</option>
                <option value="mr">Explain in Marathi</option>
                <option value="gu">Explain in Gujarati</option>
                <option value="es">Explain in Spanish</option>
                <option value="fr">Explain in French</option>
              </select>
            </div>
          </div>

          {/* Secondary Controls: Pause, Resume, Repeat & Speaking Speed */}
          <div className="secondary-voice-controls">
            <div className="secondary-btn-row">
              <button
                type="button"
                className="sec-ctrl-btn"
                onClick={handlePauseResume}
                title="Pause or Resume speech"
              >
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                type="button"
                className="sec-ctrl-btn"
                onClick={handleRepeat}
                title="Repeat the last sentence"
              >
                <Repeat size={12} />
                <span>Repeat</span>
              </button>
            </div>
            <div className="voice-speed-row">
              <span>Speed: <b>{speechRate.toFixed(1)}x</b></span>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>

          <div className="footnote">
            Microphone and speech features depend on your browser. AI replies in this preview are conversational practice responses.
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Conversation Panel (Laptop / Desktop RIGHT)        */}
        {/* ============================================================== */}
        <section className="panel chat-panel voice-conversation-card">
          <div className="panel-head">
            <div>
              <h2>Conversation</h2>
              <div className="sub">Practise speaking with your AI tutor</div>
            </div>
            <div className="status">
              <span className="dot" />
              <span>Ready to practise</span>
            </div>
          </div>

          {/* Quick Toolbar Matching Image 2 */}
          <div className="toolbar">
            <button
              type="button"
              className="tool"
              id="changeBtn"
              onClick={pickRandomTopic}
              title="Switch conversation topic"
            >
              ⇄ Change topic
            </button>
            <button
              type="button"
              className="tool"
              id="topicBtn"
              onClick={() => setTopicModalOpen(true)}
              title="Browse topic list"
            >
              ▦ Topic
            </button>
            <button
              type="button"
              className="tool"
              id="translateBtn"
              onClick={() => explainInLanguage(lastAIReply)}
              title="Translate current question"
            >
              文 Translate
            </button>
            <button
              type="button"
              className="tool"
              id="favoriteView"
              onClick={() => setFavModalOpen(true)}
              title="View saved favorites"
            >
              ▮ Favorites {favorites.length}
            </button>
          </div>

          {/* Messages Container Matching Image 2 */}
          <div className="messages" role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.sender}`}>
                <span className="sender">{m.sender === 'ai' ? 'Nexora AI · now' : 'You · now'}</span>
                <div className="bubble">{m.text}</div>

                {/* Grammar Correction Tip */}
                {m.correction && (
                  <div className="grammar-tip-pill">
                    <div className="grammar-header">
                      <Sparkles size={13} />
                      <span>Polite Grammar Tip</span>
                    </div>
                    <p className="grammar-body">{m.correction}</p>
                  </div>
                )}

                {/* Message Quick Actions Matching Image 2 */}
                <div className="msg-actions">
                  <button
                    type="button"
                    className="mini"
                    onClick={() => readText(m.text)}
                    title="Listen to sentence"
                  >
                    <Volume2 size={12} /> Read
                  </button>
                  <button
                    type="button"
                    className="mini"
                    onClick={() => explainInLanguage(m.text)}
                    title="Translate to explanation language"
                  >
                    文 Translate
                  </button>
                  <button
                    type="button"
                    className="mini"
                    onClick={() => toggleFavorite(m.text)}
                    title={favorites.includes(m.text) ? 'Saved' : 'Save as favorite'}
                  >
                    {favorites.includes(m.text) ? '★ Favorited' : '▮ Favorite'}
                  </button>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer: Level selector, Suggestion pill, and Send row */}
          <div className="composer">
            <p className="level-label">CHOOSE YOUR SPEAKING LEVEL</p>
            <div className="levels">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`level ${level === lvl ? 'selected' : ''}`}
                  onClick={() => {
                    setLevel(lvl);
                    showToast(`Speaking level set to: ${lvl}`);
                  }}
                >
                  <b>
                    {lvl === 'Beginner' && '🌱 Beginner'}
                    {lvl === 'Intermediate' && '✨ Intermediate'}
                    {lvl === 'Advanced' && '🚀 Advanced'}
                  </b>
                  <small>
                    {lvl === 'Beginner' && 'Simple & short'}
                    {lvl === 'Intermediate' && 'Natural sentences'}
                    {lvl === 'Advanced' && 'Fluent & detailed'}
                  </small>
                </button>
              ))}
            </div>

            {/* Suggestion Pill Matching Image 2 */}
            <div className="suggestion">
              <div className="suggestion-text">"{getSuggestion()}"</div>
              <button
                type="button"
                onClick={() => readText(getSuggestion())}
                title="Listen to pronunciation"
              >
                <Volume2 size={13} />
              </button>
              <button
                type="button"
                className="suggest-use-btn"
                onClick={() => setInputVal(getSuggestion())}
              >
                Use reply
              </button>
            </div>

            {/* Send Row Matching Image 2 */}
            <div className="sendrow">
              <input
                type="text"
                className="text-input"
                placeholder="Type your answer or tap the mic…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                className={`mic ${micMode ? 'listening' : ''}`}
                onClick={toggleMic}
                title={micMode ? 'Turn off mic' : 'Tap to speak (will not interrupt while you speak)'}
              >
                🎙️
              </button>
              <button
                type="button"
                className="send"
                onClick={() => handleSend()}
                disabled={!inputVal.trim() && orbState === 'thinking'}
              >
                Send ↑
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Topic Picker Modal */}
      {topicModalOpen && (
        <div className="voice-modal-backdrop" onClick={() => setTopicModalOpen(false)}>
          <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-modal-header">
              <h4>▦ Choose Conversation Topic</h4>
              <button type="button" className="close-btn" onClick={() => setTopicModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="voice-modal-list">
              {topicsList.map((top) => (
                <div key={top} className="voice-modal-item">
                  <span>
                    <b>{top}</b> {top === currentTopic ? '✓ (Current)' : ''}
                  </span>
                  <button type="button" className="select-topic-btn" onClick={() => handleSelectTopic(top)}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {favModalOpen && (
        <div className="voice-modal-backdrop" onClick={() => setFavModalOpen(false)}>
          <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-modal-header">
              <h4>⭐ Saved Favorite Expressions</h4>
              <button type="button" className="close-btn" onClick={() => setFavModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="fav-modal-content">
              {favorites.length === 0 ? (
                <p className="empty-fav-note">
                  No expressions saved yet. Click the bookmark icon on any message to save it here.
                </p>
              ) : (
                <div className="fav-list">
                  {favorites.map((fav, i) => (
                    <div key={i} className="fav-item-row">
                      <p>{fav}</p>
                      <div className="fav-actions">
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => readText(fav)}
                          title="Listen"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => copyText(fav)}
                          title="Copy"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => toggleFavorite(fav)}
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Pill */}
      {toastMessage && <div className="voice-toast-pill">{toastMessage}</div>}
    </div>
  );
}
