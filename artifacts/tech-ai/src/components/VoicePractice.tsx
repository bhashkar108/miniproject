import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, Globe, Sparkles, Check, Copy, Bookmark, BookmarkCheck,
  RotateCcw, Play, Pause, Square, Repeat, MessageSquare, ArrowRight, X, Shuffle
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

interface QuestionItem {
  question: string;
  suggestion: string;
}

// Comprehensive Question & Suggestion Bank across 8 Topics & 3 Levels
const TOPIC_QUESTIONS: Record<string, Record<'Beginner' | 'Intermediate' | 'Advanced', QuestionItem[]>> = {
  'Daily life': {
    Beginner: [
      { question: 'What do you usually like to do in your free time?', suggestion: 'In my free time, I like playing cricket with my friends.' },
      { question: 'What time do you usually wake up every morning?', suggestion: 'I usually wake up at 7 AM every morning and get ready for college.' },
      { question: 'What is your favorite time of the day and why?', suggestion: 'My favorite time is evening because I can relax and chat with my family.' },
      { question: 'How do you like to spend your weekends?', suggestion: 'On weekends, I enjoy watching movies, listening to music, and helping with home chores.' }
    ],
    Intermediate: [
      { question: 'How do you manage your daily routine to stay productive throughout the day?', suggestion: 'I maintain a simple to-do list every morning and take short study breaks to stay focused.' },
      { question: 'Can you describe a typical morning routine before heading to college or work?', suggestion: 'I usually have a quick workout, eat a healthy breakfast, and review my schedule for the day.' },
      { question: 'What is a positive daily habit you have recently developed?', suggestion: 'I have started reading educational articles for twenty minutes before going to bed.' },
      { question: 'How do you usually unwind and destress after an exhausting day?', suggestion: 'I like listening to relaxing music or going for an evening walk in the nearby park.' }
    ],
    Advanced: [
      { question: 'In our fast-paced society, how do you maintain a healthy equilibrium between your academic ambitions and personal well-being?', suggestion: 'I practice deliberate time blocking, prioritizing critical cognitive tasks during peak morning hours and reserving evenings for mental rejuvenation.' },
      { question: 'To what extent do modern digital distractions hamper the cultivation of sustained focus in your daily life?', suggestion: 'Excessive notifications fragment our cognitive throughput; consequently, I enforce strict digital detox intervals during intensive study periods.' },
      { question: 'Reflect on a lifestyle modification that fundamentally upgraded your energy levels and intellectual clarity.', suggestion: 'Embracing consistent sleep hygiene and eliminating late-night screen exposure dramatically elevated my cognitive clarity and retention.' },
      { question: 'How has your perception of work-life balance evolved over the past few years?', suggestion: 'I have transitioned from equating productivity with long hours to valuing high-impact focused effort and proactive rest.' }
    ]
  },
  'College & studies': {
    Beginner: [
      { question: 'Which subject do you enjoy the most in college?', suggestion: 'I really enjoy computer science because I love learning to code.' },
      { question: 'Do you prefer studying alone or studying with friends?', suggestion: 'I prefer studying with friends because we can solve doubts together.' },
      { question: 'What are you currently studying this semester?', suggestion: 'This semester, I am studying engineering mathematics and web development.' },
      { question: 'What is your favorite place on your college campus?', suggestion: 'My favorite place is the college library because it is quiet and peaceful.' }
    ],
    Intermediate: [
      { question: 'What inspired you to choose your current field of study, and what are your goals?', suggestion: 'I chose engineering because I want to design software applications that solve everyday problems for people.' },
      { question: 'How do you prepare for challenging college exams without getting overwhelmed?', suggestion: 'I break complex syllabus chapters into weekly milestones and practice past question papers.' },
      { question: 'Can you describe a meaningful group project you worked on recently?', suggestion: 'Our team built an online quiz portal, where I contributed to frontend styling and responsive design.' },
      { question: 'What role does practical lab work play in helping you understand theoretical concepts?', suggestion: 'Lab experiments transform abstract equations into tangible results, reinforcing fundamental principles.' }
    ],
    Advanced: [
      { question: 'How should academic institutions restructure higher education to bridge the gap between classroom theory and industry demands?', suggestion: 'Universities must integrate hands-on project incubators, continuous industry mentorship, and dynamic real-world case studies into their core curricula.' },
      { question: 'Evaluate the pedagogical shift from rote memorization toward problem-based learning in technical disciplines.', suggestion: 'Problem-based methodologies cultivate heuristic critical thinking and resilience, whereas rote memorization produces fragile, unadaptable knowledge.' },
      { question: 'What ethical responsibilities do emerging technologists bear regarding the societal ramifications of their software?', suggestion: 'Engineers must proactively address algorithmic bias, user data sovereignty, and the socioeconomic displacement caused by rapid automation.' },
      { question: 'Discuss how interdisciplinary research across mathematics, computing, and social sciences drives modern innovation.', suggestion: 'The intersection of algorithmic efficiency with human-centered design yields technological tools that are both functionally robust and socially impactful.' }
    ]
  },
  'Hobbies & sports': {
    Beginner: [
      { question: 'What sport or game do you enjoy playing the most?', suggestion: 'I love playing cricket on weekends with my neighborhood friends.' },
      { question: 'Do you like listening to music, and who is your favorite singer?', suggestion: 'Yes, I listen to melodious music every evening, and Arijit Singh is my favorite.' },
      { question: 'Do you have any creative hobbies like drawing, photography, or cooking?', suggestion: 'I enjoy taking photography of nature and city streets on my smartphone.' },
      { question: 'What is a new hobby you would love to start this year?', suggestion: 'I would love to learn how to play the acoustic guitar this year.' }
    ],
    Intermediate: [
      { question: 'Why do you think engaging in physical sports is crucial for students dealing with exam stress?', suggestion: 'Physical exercise releases endorphins, boosts cardiovascular health, and clears mental fog accumulated from hours of studying.' },
      { question: 'How did you first get into your primary hobby, and how has it helped you grow?', suggestion: 'I started coding mini web pages during vacation, which gradually taught me patience and structured logical thinking.' },
      { question: 'What qualities make someone an effective team player on the sports field?', suggestion: 'Clear communication, trusting your teammates, and putting team victory ahead of personal statistics make a great player.' },
      { question: 'Do you prefer outdoor adventures like trekking or indoor creative pursuits like reading?', suggestion: 'I enjoy both, but trekking across mountain trails provides an unmatched sense of freedom and endurance.' }
    ],
    Advanced: [
      { question: 'How does active participation in competitive sports shape emotional resilience and strategic decision-making under intense pressure?', suggestion: 'Competitive sports simulate high-stakes environments where immediate tactical adaptability, emotional regulation, and graceful recovery from failure become second nature.' },
      { question: 'In an increasingly algorithmic and commodified world, what intrinsic value does creative self-expression retain?', suggestion: 'Creative pursuits preserve our authentic humanity, serving as non-utilitarian spaces where imagination and self-discovery flourish independent of metrics.' },
      { question: 'Analyze how the discipline cultivated through daily deliberate practice in hobbies transfers into professional excellence.', suggestion: 'The neurological feedback loops developed through deliberate skill refinement foster grit, iterative problem solving, and intellectual humility.' },
      { question: 'Can esports and digital competitions substitute the physical and psychosocial benefits of traditional athletics?', suggestion: 'While esports stimulate rapid cognitive processing and tactical coordination, they cannot replicate the neurobiological and cardiovascular benefits of physical athletics.' }
    ]
  },
  'Travel & culture': {
    Beginner: [
      { question: 'If you could visit any city in the world tomorrow, where would you go?', suggestion: 'I would love to visit Tokyo because I want to experience its technology and culture.' },
      { question: 'Do you prefer traveling to the mountains or going to the beach?', suggestion: 'I prefer traveling to the cool mountains because the natural scenery is breathtaking.' },
      { question: 'What is your favorite local festival, and how does your family celebrate it?', suggestion: 'Diwali is my favorite festival, which we celebrate with lights, sweets, and family gatherings.' },
      { question: 'What is the most interesting place you have traveled to so far?', suggestion: 'The most memorable trip was visiting Jaipur and seeing the historic palaces.' }
    ],
    Intermediate: [
      { question: 'How does traveling to diverse cultural regions broaden a young person’s worldview?', suggestion: 'Traveling exposes us to unfamiliar customs and traditions, fostering empathy and dismantling preconceived stereotypes.' },
      { question: 'What is the most adventurous experience you have encountered during a trip?', suggestion: 'While trekking through a dense forest trail, sudden rain tested our navigation skills and made the journey unforgettable.' },
      { question: 'If you were guiding a foreign tourist around your home state, what places and cuisines would you recommend?', suggestion: 'I would guide them to our architectural heritage sites, historical temples, and offer authentic regional thalis.' },
      { question: 'Why is preserving regional cultural traditions important in the modern era of globalization?', suggestion: 'Traditional heritage anchors a community’s identity, providing rich historical wisdom amidst homogenization.' }
    ],
    Advanced: [
      { question: 'Critically evaluate the paradoxical impact of mass tourism on local ecological sustainability and intangible cultural heritage.', suggestion: 'While tourism generates vital economic revenue, unchecked commercialization often degrades fragile ecosystems and reduces authentic rituals into superficial consumer spectacles.' },
      { question: 'How does linguistic diversity shape the cognitive frameworks and perceptual boundaries of different civilizations?', suggestion: 'Language is not merely a communicative medium but an ontological framework; unique linguistic idioms embody nuanced philosophical perspectives on time, agency, and community.' },
      { question: 'In what ways can immersive cultural exchange dismantle geopolitical polarization among younger generations?', suggestion: 'Grassroots human connections foster deep intercultural literacy, cultivating nuanced mutual respect that transcends reductionist political rhetoric.' },
      { question: 'Discuss the philosophical distinction between superficial sight-seeing tourism and transformative experiential travel.', suggestion: 'Tourism consumes pre-packaged visual commodities, whereas transformative travel demands vulnerability, introspection, and profound engagement with unfamiliar realities.' }
    ]
  },
  'Job interviews': {
    Beginner: [
      { question: 'Can you introduce yourself in two or three sentences?', suggestion: 'My name is Bhashkar, I am an engineering student, and I am passionate about technology and problem solving.' },
      { question: 'What are your greatest personal strengths when working on a task?', suggestion: 'My greatest strengths are quick learning, honesty, and staying calm under pressure.' },
      { question: 'Why are you interested in working in this career field?', suggestion: 'I am excited about this field because it allows me to build real-world tools that help people.' },
      { question: 'Where do you see yourself in two years after graduating?', suggestion: 'In two years, I see myself working as a skilled software developer contributing to impactful projects.' }
    ],
    Intermediate: [
      { question: 'Tell me about a time you faced a difficult technical challenge and how you solved it.', suggestion: 'During a project deadline, our database integration failed; I researched documentation, isolated the bug, and resolved it systematically.' },
      { question: 'How do you handle constructive criticism from team leaders or professors?', suggestion: 'I view feedback as a valuable learning opportunity, analyze actionable insights objectively, and apply adjustments immediately.' },
      { question: 'Why should our organization hire you over other qualified candidates?', suggestion: 'Beyond technical fundamentals, I bring relentless curiosity, a collaborative mindset, and a proven drive to execute reliably.' },
      { question: 'Can you describe a situation where you had to work with a challenging teammate?', suggestion: 'I initiated an open, respectful conversation to clarify individual responsibilities, aligning our efforts with team goals.' }
    ],
    Advanced: [
      { question: 'Walk me through how you architect and prioritize competing high-stakes deliverables when resources are constrained.', suggestion: 'I deploy rigorous impact-versus-effort matrices, align deliverables with organizational objectives, and communicate transparent trade-offs proactively to stakeholders.' },
      { question: 'Describe a scenario where an analytical decision you championed failed, and detail the systemic lessons you distilled.', suggestion: 'When an early deployment suffered scalability bottlenecks due to optimistic assumptions, I instituted rigorous load-testing pipelines and decentralized telemetry.' },
      { question: 'How do you cultivate cross-functional synergy between non-technical business stakeholders and technical engineering squads?', suggestion: 'I translate complex architectural trade-offs into quantifiable business risks and strategic outcomes, establishing shared vocabulary and mutual trust.' },
      { question: 'What leadership philosophy guides your approach when mentoring junior peers or driving team accountability?', suggestion: 'I subscribe to servant leadership—fostering psychological safety, establishing uncompromising quality benchmarks, and empowering individuals with autonomous ownership.' }
    ]
  },
  'Food & cooking': {
    Beginner: [
      { question: 'What is your favorite dish to eat for dinner?', suggestion: 'My favorite dinner is paneer butter masala with fresh rotis.' },
      { question: 'Do you know how to cook any simple meals yourself?', suggestion: 'Yes, I can cook delicious tea, noodles, and vegetable fried rice.' },
      { question: 'Do you prefer eating home-cooked food or ordering from restaurants?', suggestion: 'I prefer nutritious home-cooked meals, but I enjoy dining out on special occasions.' },
      { question: 'What is a sweet dish or dessert that you really love?', suggestion: 'I really love warm gulab jamun with vanilla ice cream.' }
    ],
    Intermediate: [
      { question: 'Why has traditional cooking become an important life skill for university students living independently?', suggestion: 'Cooking teaches budget management, ensures optimal nutritional balance, and promotes self-sufficiency.' },
      { question: 'If you were hosting a dinner for your close friends, what special three-course menu would you prepare?', suggestion: 'I would start with crispy paneer starters, followed by aromatic biryani with raita, and conclude with mango kulfi.' },
      { question: 'How does the culinary diversity of India reflect its rich regional history and agriculture?', suggestion: 'Each state’s cuisine reflects indigenous crops, local spices, and climate adaptations, creating vibrant culinary heritage.' },
      { question: 'What are some simple dietary habits that students can adopt to maintain sustained mental energy?', suggestion: 'Staying properly hydrated, consuming whole grains, and avoiding excessive refined sugar keeps energy stable.' }
    ],
    Advanced: [
      { question: 'Examine the sociopolitical and environmental ramifications of industrialized ultra-processed foods versus sustainable local food sovereignty.', suggestion: 'Industrial agriculture prioritizes hyper-palatability and profit over biodiversity and metabolic health, necessitating a structural shift toward regenerative, locally sourced food ecosystems.' },
      { question: 'In what ways does gastro-diplomacy serve as a potent vector of soft power and intercultural diplomacy?', suggestion: 'Culinary heritage transcends linguistic barriers, providing visceral, shared sensorial experiences that humanize foreign cultures and stimulate global appreciation.' },
      { question: 'Analyze the correlation between nutritional neuroscience, gut microbiota health, and cognitive performance in academia.', suggestion: 'Emerging bi-directional gut-brain axis research demonstrates that nutrient-dense, fiber-rich diets directly optimize neurogenesis, neurotransmitter synthesis, and affective equilibrium.' },
      { question: 'How does the commercialization of ancestral culinary recipes threaten their authenticity?', suggestion: 'Mass homogenization alters ancestral fermentation techniques and seasonal ingredients to meet industrialized shelf-life standards, flattening cultural depth.' }
    ]
  },
  'Technology & AI': {
    Beginner: [
      { question: 'What smartphone app or computer software do you use the most every day?', suggestion: 'I use YouTube and web browsers every day to learn coding and watch educational lectures.' },
      { question: 'In what ways do computers make studying easier for you?', suggestion: 'Computers help me search information instantly, read digital books, and practice interactive quizzes.' },
      { question: 'What do you think is the coolest gadget invented in recent years?', suggestion: 'Smartphones with AI voice assistants are the most amazing gadgets because they assist with daily tasks.' },
      { question: 'Would you like to learn how to create your own mobile app or website?', suggestion: 'Yes, I am very excited to build interactive websites and web applications.' }
    ],
    Intermediate: [
      { question: 'How is artificial intelligence changing the way college students research and study complex topics?', suggestion: 'AI acts as a personalized tutor, explaining difficult concepts in simple terms and generating custom practice exercises.' },
      { question: 'What precautions should students take to safeguard their personal privacy and cybersecurity online?', suggestion: 'Students should use strong unique passwords, enable two-factor authentication, and avoid clicking suspicious download links.' },
      { question: 'Do you think artificial intelligence will replace software developers, or empower them to build faster?', suggestion: 'AI will automate repetitive boilerplate code, allowing developers to focus on higher-level architecture and complex problem-solving.' },
      { question: 'What emerging technological innovation in healthcare or education excites you the most?', suggestion: 'Personalized AI diagnostics and adaptive digital learning platforms will democratize quality education and medical care globally.' }
    ],
    Advanced: [
      { question: 'Critically analyze the epistemological implications of large language models on authentic critical thinking and student cognitive development.', suggestion: 'While LLMs democratize immediate synthesized information, uncritical reliance risks cognitive offloading and superficial comprehension; pedagogy must pivot toward evaluating epistemic veracity, rigorous synthesis, and heuristic problem discovery.' },
      { question: 'Address the alignment problem and systemic existential risks associated with rapid deployment of autonomous agentic systems.', suggestion: 'Ensuring that autonomous goal-directed systems remain strictly aligned with pluralistic human welfare requires provable safety guarantees, interpretable activations, and decentralized oversight mechanisms.' },
      { question: 'How should legal and economic frameworks adapt to address copyright infringement and intellectual property ownership in AI generation?', suggestion: 'Legal doctrines must transcend legacy fair-use paradigms, instituting collective licensing frameworks and cryptographic provenance tracking to remunerate human creators justly.' },
      { question: 'Evaluate the ecological footprint of massive hyperscale AI datacenters and the imperative for green, energy-efficient computing.', suggestion: 'The exponential megawatt demands of training Frontier models necessitate architectural breakthroughs in neuromorphic computing, algorithmic distillation, and dedicated clean-energy co-location.' }
    ]
  },
  'Friendship & family': {
    Beginner: [
      { question: 'What qualities do you appreciate most in your best friend?', suggestion: 'I appreciate that my best friend is always supportive, honest, and fun to talk with.' },
      { question: 'How do you like to spend quality time with your family members?', suggestion: 'We enjoy having dinner together and sharing funny stories about our day.' },
      { question: 'Who is a person in your family that inspires you the most?', suggestion: 'My parents inspire me the most because of their hard work, patience, and kindness.' },
      { question: 'How do you and your friends celebrate birthdays or exam achievements?', suggestion: 'We usually gather together, cut a cake, and treat each other to snacks.' }
    ],
    Intermediate: [
      { question: 'How do meaningful friendships contribute to emotional well-being and academic success?', suggestion: 'Close friends provide a trusted support system, celebrate your achievements, and motivate you during difficult times.' },
      { question: 'In this digital era, how do you maintain genuine connections with old friends who live far away?', suggestion: 'I schedule periodic voice calls and share thoughtful messages rather than relying only on superficial social media likes.' },
      { question: 'What is an important life lesson your parents or grandparents passed down to you?', suggestion: 'They taught me that consistent effort and integrity matter far more than temporary shortcuts to success.' },
      { question: 'How do you resolve disagreements or misunderstandings with someone close to you?', suggestion: 'I listen calmly to their perspective without interrupting, acknowledge their feelings, and focus on mutual compromise.' }
    ],
    Advanced: [
      { question: 'Examine how hyper-individualism and algorithmic social networking have fragmented traditional communal and kinship structures.', suggestion: 'Ubiquitous digital connectivity paradoxically generates profound psychosocial atomization, commodifying human relationships into performative metrics while degrading visceral communal solidarity.' },
      { question: 'What constitutes the philosophical foundation of enduring, unconditional friendship in classical virtue ethics?', suggestion: 'In Aristotelian virtue friendship, affection is predicated upon mutual admiration of character and moral excellence, transcending utilitarian expedience or transient pleasure.' },
      { question: 'How do generational value divergences reshape family dynamics in rapidly transitioning developing economies?', suggestion: 'As younger cohorts embrace autonomy and digital borderlessness, families must renegotiate traditional hierarchical deference into collaborative, empathetic intergenerational dialogue.' },
      { question: 'Discuss the psychological resilience derived from secure attachment frameworks within close-knit family units.', suggestion: 'Secure relational anchors instill foundational epistemic trust, empowering individuals to take exploratory risks and navigate existential adversity with emotional equilibrium.' }
    ]
  }
};

export function VoicePractice({ onProgress }: VoicePracticeProps) {
  // State
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [autoVoice, setAutoVoice] = useState(true);
  const [listening, setListening] = useState(false);
  const [micMode, setMicMode] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'paused' | 'stopped'>('idle');
  const [orbCaption, setOrbCaption] = useState('Tap the microphone or choose a reply to start practising.');
  const [currentTopic, setCurrentTopic] = useState('Daily life');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [practiceLang, setPracticeLang] = useState('en-US');
  const [supportLang, setSupportLang] = useState('hi');
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

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! 👋 Welcome to your English speaking practice session. Let's talk about your daily life.\n\nQuestion: What do you usually like to do in your free time?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [currentQuestion, setCurrentQuestion] = useState('What do you usually like to do in your free time?');
  const [lastAIReply, setLastAIReply] = useState("What do you usually like to do in your free time?");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);

  const getSuggestion = () => {
    const pool = TOPIC_QUESTIONS[currentTopic]?.[level] || TOPIC_QUESTIONS['Daily life'][level];
    const match = pool.find(item => item.question.toLowerCase() === currentQuestion.toLowerCase());
    if (match) return match.suggestion;
    if (pool.length > 0) return pool[0].suggestion;
    if (level === 'Beginner') return 'I like practicing spoken English with AI every day.';
    if (level === 'Intermediate') return 'I want to speak English fluently so I can excel in college and job interviews.';
    return 'Developing articulate spoken communication is essential for professional leadership and cross-cultural dialogue.';
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2500);
  };

  // Populate Voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save favorites
  useEffect(() => {
    localStorage.setItem('techai_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Speech playback
  const readText = (text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech playback is not supported in this browser.');
      onComplete?.();
      return;
    }

    window.speechSynthesis.cancel();
    setIsPaused(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = practiceLang;
    utterance.rate = speechRate;

    if (selectedVoice !== 'default') {
      const v = voices[Number(selectedVoice)];
      if (v) utterance.voice = v;
    } else {
      const match = voices.find(v => v.lang === practiceLang) ||
                    voices.find(v => v.lang.startsWith(practiceLang.slice(0, 2)));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      setOrbState('speaking');
      setOrbCaption('Listen carefully to pronunciation, then try repeating.');
    };

    utterance.onend = () => {
      setOrbState('idle');
      setOrbCaption('Tap the microphone or choose a reply to start practising.');
      onComplete?.();
    };

    utterance.onerror = () => {
      setOrbState('idle');
      setOrbCaption('Playback encountered an issue.');
      onComplete?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Evaluate grammar mistakes politely
  const checkGrammar = (raw: string) => {
    const lower = raw.toLowerCase().trim();
    if (/\bi am agree\b/i.test(lower)) {
      return 'Say “I agree” instead of “I am agree”. In English, “agree” is already a verb.';
    }
    if (/\bi likes\b/i.test(lower)) {
      return 'Use “I like” with the first person (e.g. “I like reading”, not “I likes”).';
    }
    if (/\bmyself\s+[a-z]+/i.test(lower)) {
      return 'In English introductions, say “My name is …” or “I am …” instead of “Myself …”.';
    }
    if (/\bhe go\b/i.test(lower)) {
      return 'With third-person singular (he/she/it), use “goes” (e.g. “He goes to college”).';
    }
    if (/\bi have\s+\d+\s+years\b/i.test(lower)) {
      return 'For age, say “I am … years old” rather than “I have … years”.';
    }
    if (/\bme and my friend\b/i.test(lower)) {
      return 'When acting as the subject, say “My friend and I” instead of “Me and my friend”.';
    }
    return '';
  };

  // Generate dynamic response with level-appropriate random follow-up questions
  const generateAIResponse = (userText: string) => {
    const t = userText.toLowerCase();
    const pool = TOPIC_QUESTIONS[currentTopic]?.[level] || TOPIC_QUESTIONS['Daily life'][level];
    const nextQItem = pool[Math.floor(Math.random() * pool.length)];

    let acknowledgment = '';
    if (/cricket|football|game|sport|play|match/.test(t)) {
      acknowledgment = level === 'Beginner'
        ? "That sounds like a lot of fun!"
        : level === 'Intermediate'
        ? "Sports and games are fantastic for teamwork, discipline, and endurance."
        : "Active participation in sports sharpens analytical intuition and collaborative reflexes under pressure.";
    } else if (/college|school|study|engineering|student|class|exam|subject/.test(t)) {
      acknowledgment = level === 'Beginner'
        ? "That's great! Education helps you build a wonderful future."
        : level === 'Intermediate'
        ? "Balancing coursework with practical projects is a key ingredient for academic achievement."
        : "Synthesizing deep theoretical understanding with applied engineering builds foundational problem-solving mastery.";
    } else if (/tech|coding|programming|computer|ai|software|python|web/.test(t)) {
      acknowledgment = level === 'Beginner'
        ? "Technology is so exciting and full of opportunities!"
        : level === 'Intermediate'
        ? "Developing technical and programming skills is one of the most rewarding pursuits in modern education."
        : "The rapid convergence of software architecture and artificial intelligence presents immense transformative potential.";
    } else if (/good|fine|great|happy|awesome|well|enjoy/.test(t)) {
      acknowledgment = level === 'Beginner'
        ? "I am glad to hear that!"
        : level === 'Intermediate'
        ? "Having a positive and enthusiastic outlook makes all the difference in daily practice."
        : "Cultivating mental clarity and purposeful momentum fundamentally elevates overall performance.";
    } else {
      acknowledgment = level === 'Beginner'
        ? "Well said! Thank you for sharing your thoughts."
        : level === 'Intermediate'
        ? "Thank you for explaining that so clearly."
        : "That is an articulate observation with compelling reasoning.";
    }

    return `${acknowledgment}\n\nQuestion: ${nextQItem.question}`;
  };

  // Send message
  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || orbState === 'thinking') return;

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
      const qIndex = reply.indexOf('Question: ');
      if (qIndex !== -1) {
        setCurrentQuestion(reply.slice(qIndex + 10).trim());
      } else {
        setCurrentQuestion(reply);
      }

      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);

      if (autoVoice) {
        readText(reply, () => {
          if (micMode) startListening();
        });
      } else {
        setOrbState('idle');
        setOrbCaption('Tap the microphone or choose a reply to start practising.');
        if (micMode) startListening();
      }

      onProgress?.('lesson', 'English Practice', `Practised speaking: "${text.slice(0, 30)}…"`);
    }, 600);
  };

  // Start microphone recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please type.');
      setMicMode(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.lang = practiceLang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setListening(true);
        setOrbState('listening');
        setOrbCaption('Listening to you… Speak clearly.');
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setListening(false);
        handleSend(transcript);
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          showToast(`Microphone notice: ${e.error}`);
        }
      };

      rec.onend = () => {
        setListening(false);
        if (micMode && orbState !== 'thinking' && orbState !== 'speaking') {
          setTimeout(() => {
            if (micMode) startListening();
          }, 350);
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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setOrbState('idle');
      showToast('Continuous microphone turned off.');
    } else {
      setMicMode(true);
      showToast('Microphone on. Speak naturally; it pauses during AI replies.');
      startListening();
    }
  };

  // Explain in selected language
  const explainInLanguage = (sentence: string) => {
    const explanations: Record<string, string> = {
      hi: `🇮🇳 हिंदी में अर्थ / व्याख्या:
"${sentence}"
यह सवाल आपसे आपके विचारों या अनुभवों को शेयर करने के लिए पूछा गया है। आप सरल और पूरे वाक्यों में जवाब दे सकते हैं।`,
      en: `💡 Explanation:
"${sentence}"
This question invites you to share your thoughts. Try responding in 1 or 2 complete sentences with an example.`,
      es: `🇪🇸 Explicación:
"${sentence}"
Esta pregunta te invita a compartir tus ideas.`,
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

  // Shuffle / Pick next question
  const pickNextQuestion = () => {
    const pool = TOPIC_QUESTIONS[currentTopic]?.[level] || TOPIC_QUESTIONS['Daily life'][level];
    const candidates = pool.filter(p => p.question !== currentQuestion);
    const chosen = (candidates.length > 0 ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
    setCurrentQuestion(chosen.question);
    setLastAIReply(chosen.question);

    setMessages(prev => [
      ...prev,
      {
        id: `ai-next-${Date.now()}`,
        sender: 'ai',
        text: `🎲 Next Question (${level}):\n\n${chosen.question}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Randomized new question!');
    if (autoVoice) readText(chosen.question);
  };

  // Level selector with random question update
  const handleSelectLevel = (newLevel: 'Beginner' | 'Intermediate' | 'Advanced') => {
    setLevel(newLevel);
    const pool = TOPIC_QUESTIONS[currentTopic]?.[newLevel] || TOPIC_QUESTIONS['Daily life'][newLevel];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion(chosen.question);
    setLastAIReply(chosen.question);

    setMessages(prev => [
      ...prev,
      {
        id: `ai-level-${Date.now()}`,
        sender: 'ai',
        text: `🎯 Speaking level switched to: ${newLevel}.\n\nAI Question: ${chosen.question}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(chosen.question);
    showToast(`Level set to: ${newLevel}`);
  };

  // Topic selector with random question update
  const handleSelectTopic = (top: string) => {
    setCurrentTopic(top);
    setTopicModalOpen(false);
    const pool = TOPIC_QUESTIONS[top]?.[level] || TOPIC_QUESTIONS['Daily life'][level];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion(chosen.question);
    setLastAIReply(chosen.question);

    setMessages(prev => [
      ...prev,
      {
        id: `ai-top-${Date.now()}`,
        sender: 'ai',
        text: `📚 Topic changed to: ${top}.\n\nAI Question: ${chosen.question}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(chosen.question);
    showToast(`Topic set to: ${top}`);
  };

  // Voice Controls
  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setMicMode(false);
    setListening(false);
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
    const pool = TOPIC_QUESTIONS[currentTopic]?.[level] || TOPIC_QUESTIONS['Daily life'][level];
    const starter = pool[0];
    setCurrentQuestion(starter.question);
    setLastAIReply(starter.question);
    setMessages([
      {
        id: `fresh-${Date.now()}`,
        sender: 'ai',
        text: `Welcome to a fresh practice session! Let’s talk about ${currentTopic}.\n\nQuestion: ${starter.question}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    if (autoVoice) readText(starter.question);
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

  const topicsList = Object.keys(TOPIC_QUESTIONS);

  return (
    <div className="voice-studio-container">
      {/* Top Header Row with Practice Badges and Action Controls */}
      <div className="voice-studio-header">
        <div className="left-brand">
          <span className="coach-badge">
            <span className="dot pulse" /> English Practice · AI Voice Studio
          </span>
          <span className="module-title">AI English Speaking Practice</span>
        </div>
        <div className="voice-header-pills">
          <button type="button" className="pill-btn" onClick={() => setTopicModalOpen(true)}>
            ▦ Topics ({currentTopic})
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={pickNextQuestion}
            title="Randomize to another question for this level"
          >
            <Shuffle size={13} /> Next Question
          </button>
          <button type="button" className="pill-btn" onClick={() => explainInLanguage(lastAIReply)}>
            文 Hindi Meaning
          </button>
          <button type="button" className="pill-btn" onClick={() => setFavModalOpen(true)}>
            ★ Favorites ({favorites.length})
          </button>
          <button type="button" className="pill-btn" onClick={resetSession}>
            ＋ New Session
          </button>
        </div>
      </div>

      {/* Main Studio Dual-Panel Grid: LEFT = Visualizer, RIGHT = Conversation */}
      <div className="voice-studio-grid">
        {/* ============================================================== */}
        {/* LEFT PANEL: AI Voice Visualizer (Laptop / Desktop LEFT)          */}
        {/* ============================================================== */}
        <div className="panel voice-visualizer-card">
          <div className="visualizer-card-header">
            <div>
              <span className="card-eyebrow">AI VOICE VISUALIZER</span>
              <h3>Active Voice Coach</h3>
            </div>
            <div className="visualizer-badges">
              <span className={`status-pill ${orbState}`}>
                <span className="status-indicator" />
                {orbState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Voice Selector Dropdown */}
          <div className="voice-select-box">
            <label className="voice-select-label">
              <Globe size={13} /> AI Voice Engine:
            </label>
            <select
              className="select-voice-dropdown"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              aria-label="Select AI Voice"
            >
              <option value="default">✨ Default Voice</option>
              {voices.map((v, i) => (
                <option key={v.voiceURI || i} value={String(i)}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Animated Sky-Blue & Cyan AI Orb (Living Swirling Energy) */}
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
          <div className="orb-state-text">
            {orbState === 'speaking' && 'AI is speaking…'}
            {orbState === 'listening' && 'Listening to you…'}
            {orbState === 'thinking' && 'Thinking & analyzing…'}
            {orbState === 'paused' && 'Speech paused'}
            {orbState === 'stopped' && 'Speech stopped'}
            {orbState === 'idle' && 'AI is ready'}
          </div>
          <p className="orb-caption-text">{orbCaption}</p>

          {/* Controls: Stop, Pause/Resume, Repeat, Voice Toggle */}
          <div className="voice-controls-grid">
            <button
              type="button"
              className="ctrl-btn"
              onClick={handleStopSpeech}
              title="Stop audio playback immediately"
            >
              <Square size={14} /> Stop
            </button>
            <button
              type="button"
              className="ctrl-btn"
              onClick={handlePauseResume}
              title="Pause or Resume speech"
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="ctrl-btn"
              onClick={handleRepeat}
              title="Repeat the last spoken sentence"
            >
              <Repeat size={14} /> Repeat
            </button>
            <button
              type="button"
              className={`ctrl-btn ${autoVoice ? 'active' : ''}`}
              onClick={() => {
                setAutoVoice(!autoVoice);
                showToast(autoVoice ? 'Auto-voice speech turned OFF' : 'Auto-voice speech turned ON');
              }}
              title="Toggle automatic speech playback"
            >
              <Volume2 size={14} /> {autoVoice ? 'Voice ON' : 'Voice OFF'}
            </button>
          </div>

          {/* Rate Slider & Help info */}
          <div className="voice-rate-box">
            <div className="rate-label-row">
              <span>Speaking Speed</span>
              <b>{speechRate.toFixed(1)}x</b>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="rate-slider"
            />
            <div className="rate-tags">
              <span>Slower (0.6x)</span>
              <span>Normal (1.0x)</span>
              <span>Faster (1.4x)</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Conversation Panel (Laptop / Desktop RIGHT)        */}
        {/* ============================================================== */}
        <div className="panel voice-conversation-card">
          <div className="conversation-card-header">
            <div>
              <span className="card-eyebrow">SPEAKING PRACTICE · {currentTopic.toUpperCase()}</span>
              <h3>Interactive English Chat</h3>
            </div>
            {/* Level Selector Tabs */}
            <div className="level-tabs-container">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`level-tab-btn ${level === lvl ? 'active' : ''}`}
                  onClick={() => handleSelectLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="chat-messages-scroll" role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`chat-message-bubble ${m.sender}`}>
                <div className="bubble-meta">
                  <span className="bubble-sender">
                    {m.sender === 'ai' ? '🤖 AI English Coach' : '👤 You'}
                  </span>
                  <span className="bubble-time">{m.time}</span>
                </div>
                <div className="bubble-text">
                  {m.text.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>

                {/* Polite Grammar Correction Card */}
                {m.correction && (
                  <div className="grammar-correction-card">
                    <div className="grammar-head">
                      <Sparkles size={13} />
                      <span>Polite Grammar Tip</span>
                    </div>
                    <p className="grammar-body">{m.correction}</p>
                  </div>
                )}

                {/* Message Quick Actions */}
                <div className="bubble-actions">
                  <button
                    type="button"
                    className="bubble-action-btn"
                    onClick={() => readText(m.text)}
                    title="Listen to this sentence"
                  >
                    <Volume2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="bubble-action-btn"
                    onClick={() => copyText(m.text)}
                    title="Copy text"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    className="bubble-action-btn"
                    onClick={() => toggleFavorite(m.text)}
                    title={favorites.includes(m.text) ? 'Saved' : 'Save as favorite'}
                  >
                    {favorites.includes(m.text) ? (
                      <BookmarkCheck size={13} className="fav-active" />
                    ) : (
                      <Bookmark size={13} />
                    )}
                  </button>
                  {m.sender === 'ai' && (
                    <button
                      type="button"
                      className="bubble-action-btn text-btn"
                      onClick={() => explainInLanguage(m.text)}
                    >
                      हिन्दी में समझें
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Reply Box & Composer */}
          <div className="chat-composer-box">
            {/* Suggested Reply Pill */}
            <div className="suggested-reply-wrap">
              <span className="suggest-label">💡 Suggested reply for {level}:</span>
              <p className="suggest-text">"{getSuggestion()}"</p>
              <div className="suggest-actions">
                <button
                  type="button"
                  className="suggest-btn"
                  onClick={() => readText(getSuggestion())}
                  title="Listen to pronunciation"
                >
                  <Volume2 size={13} /> Listen
                </button>
                <button
                  type="button"
                  className="suggest-btn suggest-use-btn"
                  onClick={() => setInputVal(getSuggestion())}
                >
                  Use reply
                </button>
              </div>
            </div>

            {/* Send Row */}
            <div className="composer-send-row">
              <input
                type="text"
                className="composer-input"
                placeholder="Type your sentence or tap the mic to speak…"
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
                className={`composer-mic-btn ${micMode ? 'active' : ''}`}
                onClick={toggleMic}
                title={micMode ? 'Turn off mic' : 'Turn on continuous mic'}
              >
                {micMode ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                type="button"
                className="composer-send-btn"
                onClick={() => handleSend()}
                disabled={!inputVal.trim() && orbState === 'thinking'}
              >
                Send <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
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
