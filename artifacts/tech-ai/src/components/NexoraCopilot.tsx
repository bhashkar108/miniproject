import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, MessageSquare, Send, X, Minus, RotateCcw,
  Mic, MicOff, Volume2, VolumeX, Copy, Check, ExternalLink,
  ChevronRight, Compass, ShieldCheck, Zap, Radio, BookOpen,
  Camera, Sigma, Brain, Activity, User, ArrowRight
} from 'lucide-react';

export interface NexoraCopilotProps {
  currentModule: string;
  onNavigate: (module: any) => void;
  userName?: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  navigateTo?: string;
  suggestedQuestions?: string[];
}

const MODULE_NAV_MAP: Record<string, { label: string; icon: any; desc: string }> = {
  home: { label: 'Dashboard', icon: Compass, desc: 'Your personal study desk & overview' },
  teacher: { label: 'AI Teacher', icon: BookOpen, desc: 'Upload study notes for voice & text explanations' },
  voice: { label: 'English Practice', icon: Mic, desc: 'Speaking practice with animated AI voice orb' },
  voiceroom: { label: 'Voice Rooms', icon: Radio, desc: 'Real-time multi-user voice rooms with WhatsApp sharing' },
  docs: { label: 'Smart Doc', icon: Camera, desc: 'Document capture, crop, rotate & compress' },
  equations: { label: 'Equation Graph', icon: Sigma, desc: 'Live 2D mathematical curve grapher' },
  quiz: { label: 'Auto Quiz', icon: Brain, desc: 'Worksheet practice & AI step-by-step solver' },
  progress: { label: 'Progress', icon: Activity, desc: 'Private record of study minutes & sessions' },
  profile: { label: 'Student Profile', icon: User, desc: 'Account details and preferences' },
};

// Comprehensive Deep Knowledge Base for the Entire Website
interface FeatureDetail {
  title: string;
  route: string;
  summaryHi: string;
  summaryEn: string;
  stepsHi: string[];
  stepsEn: string[];
  tipsHi: string;
  tipsEn: string;
}

const DEEP_WEBSITE_KNOWLEDGE: Record<string, FeatureDetail> = {
  voiceroom: {
    title: 'Student Voice Rooms (स्टूडेंट वॉइस रूम्स)',
    route: 'voiceroom',
    summaryHi: 'यह फीचर दोस्तों और सहपाठियों के साथ लाइव ऑडियो कॉल पर ग्रुप स्टडी और भाषा अभ्यास करने के लिए है। इसमें वेबआरटीसी P2P ऑडियो, लाइव चैट और व्हाट्सएप इनवाइट लिंक की सुविधा है।',
    summaryEn: 'Real-time multi-user audio calling room platform for language exchange and group study. Features browser-to-browser P2P WebRTC audio, live text chat, and 1-click WhatsApp invite links.',
    stepsHi: [
      '1. **रूम बनाएं**: "＋ Create Room" बटन पर क्लिक करें। रूम का नाम, विषय (Language, Education, etc.) और अधिकतम क्षमता (Capacity) चुनें।',
      '2. **स्टेज पर जाएं**: रूम बनते ही आप सीधे स्टेज पर लाइव हो जाएंगे और आपका माइक्रोफोन सक्रिय हो जाएगा।',
      '3. **दोस्तों को इनवाइट करें**: "Share on WhatsApp" या "Copy link" पर क्लिक करें। आप खुद रूम में स्टेज पर बने रहेंगे और दोस्तों के जुड़ने का इंतजार कर सकेंगे।',
      '4. **दोस्त का सीधे स्टेज पर आना**: जब आपका दोस्त उस लिंक पर क्लिक करेगा, वह सीधे आपके रूम में आपके साथ स्टेज पर आ जाएगा।',
      '5. **माइक और चैट से बात करें**: दोनों लोग बिना किसी रुकावट के लाइव बोल सकते हैं और दाईं तरफ दिए गए चैट बॉक्स से टेक्स्ट मैसेज भेज सकते हैं।',
      '6. **होस्ट नियंत्रण**: होस्ट के रूप में आप रूम लॉक कर सकते हैं या प्रतिभागियों को म्यूट कर सकते हैं।'
    ],
    stepsEn: [
      '1. **Create Room**: Click "＋ Create Room", enter room title, category, and student capacity.',
      '2. **Go on Stage**: You immediately land on stage with your microphone activated.',
      '3. **Invite Friends**: Click "Share on WhatsApp" or "Copy link". You stay on stage while waiting for friends to join.',
      '4. **Direct Auto-Join**: When your friend opens the link, they automatically land directly on stage with you.',
      '5. **Talk via Mic & Chat**: Speak freely via real-time WebRTC audio and exchange text messages in the chat panel.',
      '6. **Host Controls**: As host, you can mute participants, lock the room, or close the session.'
    ],
    tipsHi: '💡 **टिप:** लिंक शेयर करने के बाद आपको रूम से बाहर निकलने की जरूरत नहीं है; आप स्टेज पर रहकर आराम से दोस्तों का इंतजार कर सकते हैं।',
    tipsEn: '💡 **Pro Tip:** You do not need to leave the room after sharing; you remain active on stage waiting for your friends.'
  },
  voice: {
    title: 'English Practice & AI Voice Studio (इंग्लिश प्रैक्टिस)',
    route: 'voice',
    summaryHi: 'यह फीचर एक लाइव 3D स्काई ऑर्ब के साथ आवाज में बातचीत का अभ्यास करवाता है। हर सवाल पर डायनामिक 3-लेवल रिप्लाई लाइन्स अपने आप तैयार होती हैं ताकि बातचीत का फ्लो कभी न टूटे।',
    summaryEn: 'Interactive spoken language partner with animated sky orb, multi-language speech, and automatically generated 3-level reply lines for every single question.',
    stepsHi: [
      '1. **भाषा और स्तर चुनें**: अपनी प्रैक्टिस भाषा (English, Hindi, Spanish आदि) और स्तर (Beginner, Intermediate, Advanced) चुनें।',
      '2. **विषय चुनें**: कोई भी बातचीत का विषय चुनें (Daily life, Food, Travel, Interview, Tech) या "Custom Topic" में अपनी पसंद का विषय लिखें।',
      '3. **AI का सवाल सुनें**: AI आपसे उस विषय पर बोलकर सवाल पूछेगा।',
      '4. **डायनामिक रिप्लाई लाइनें**: स्क्रीन पर सवाल के नीचे तुरंत उस सवाल के अनुसार 3 उत्तर दिखेंगे। "Use reply" दबाकर उत्तर भेजें या "Pronounce" से उच्चारण सुनें।',
      '5. **माइक से बोलें**: माइक बटन दबाकर मुंह से बोलें — AI आपके चुप होने का 1.6 सेकंड इंतजार करेगा और कभी बीच में नहीं टोकेगा।',
      '6. **फ्लो न टूटना**: आपके हर उत्तर के बाद AI नया सवाल पूछेगा और तुरंत नए 3 रिप्लाई तैयार करेगा!'
    ],
    stepsEn: [
      '1. **Choose Language & Level**: Select your practice language (English, Hindi, etc.) and difficulty (Beginner, Intermediate, Advanced).',
      '2. **Select Topic**: Pick a conversation topic (Daily life, Food, Travel, Interview) or type a custom topic.',
      '3. **Listen to AI**: The AI speaks an engaging question suited to the topic.',
      '4. **Dynamic Reply Lines**: Below the orb, 3 level-tailored replies generate automatically for that exact question. Click "Use reply" or listen to pronunciation.',
      '5. **Speak via Mic**: Tap the mic and speak naturally — AI waits 1.6s of silence before replying.',
      '6. **Unbroken Flow**: For every answer you give, AI responds with a follow-up question and generates brand new replies!'
    ],
    tipsHi: '💡 **टिप:** अगर आपको बोलने में झिझक हो रही है, तो दिए गए "Quick reply" चिप पर क्लिक करके तुरंत सही वाक्य बोल या भेज सकते हैं।',
    tipsEn: '💡 **Pro Tip:** Tap any quick reply chip to immediately populate a fluent, grammatically correct answer.'
  },
  teacher: {
    title: 'AI Teacher (AI टीचर)',
    route: 'teacher',
    summaryHi: 'यह आपका पर्सनल डिजिटल टीचर है जो किसी भी नोट्स, PDF या विषय को बोलकर और लिखकर 25+ भाषाओं में आसान शब्दों में समझाता है।',
    summaryEn: 'Personal AI educator that explains any study notes, PDF, or textbook chapter in 25+ languages with synchronized spoken voice and highlighting.',
    stepsHi: [
      '1. **नोट्स या PDF डालें**: अपना टेक्स्ट बॉक्स में पेस्ट करें या कोई भी PDF / डॉक्युमेंट फाइल अपलोड करें।',
      '2. **समझाने की भाषा चुनें**: जिस भाषा में समझना है (हिंदी, इंग्लिश, बंगाली आदि) वह चुनें और स्पीड (0.8x से 1.2x) सेट करें।',
      '3. **Teach Lesson पर क्लिक करें**: AI पूरे विषय को मुख्य बिंदुओं, सरल उदाहरणों और टेकअवे में विभाजित कर देगा।',
      '4. **बोलकर व्याख्या सुनना**: AI खुद बोलकर समझाएगा और जो शब्द बोलेगा वह स्क्रीन पर बड़ा होकर चमकेगा।',
      '5. **माइक से सवाल पूछें**: नीचे दिए गए माइक बटन को दबाकर बिना टाइप किए मुंह से कोई भी डाउट पूछें — AI तुरंत उत्तर देगा।'
    ],
    stepsEn: [
      '1. **Input Notes or PDF**: Paste study material or upload textbook PDFs/images.',
      '2. **Select Language**: Pick your explanation language (Hindi, English, etc.) and speech rate.',
      '3. **Click Teach Lesson**: AI structures the topic into core concepts, practical analogies, and key takeaways.',
      '4. **Spoken Audio**: AI reads the explanation aloud with synchronized animated word highlighting.',
      '5. **Voice QA**: Tap the mic button to ask follow-up questions hands-free.'
    ],
    tipsHi: '💡 **टिप:** परीक्षा से पहले कठिन चैप्टर का सारांश सुनने के लिए AI Teacher सबसे तेज और असरदार तरीका है।',
    tipsEn: '💡 **Pro Tip:** Perfect for quick exam revision — upload your chapter and listen hands-free at 1.2x speed.'
  },
  docs: {
    title: 'Smart Doc (स्मार्ट डॉक)',
    route: 'docs',
    summaryHi: 'फॉर्म भरने, कॉलेज एडमिशन और सरकारी पोर्टल्स के लिए डॉक्युमेंट स्कैनर, 90° रोटेटर और मनचाहे साइज (50KB, 100KB, 200KB) में कंप्रेस करने का टूल।',
    summaryEn: 'Document capture, crop, 90° rotation, and target-size file compressor (50KB to 500KB) designed for exam portals and admissions.',
    stepsHi: [
      '1. **फोटो लें या अपलोड करें**: "Camera preview" से लाइव फोटो खींचे (कैमरा फ्लैश इफेक्ट के साथ) या "Upload document" से फाइल चुनें।',
      '2. **90° घुमाएं (Rotate)**: "Rotate 90°" बटन पर क्लिक करके इमेज को जितनी बार चाहें सही दिशा में घुमाएं।',
      '3. **क्रॉप करें (Crop)**: "Crop margins" स्लाइडर से फालतू बैकग्राउंड हटाएं।',
      '4. **साइज सेट करें (Compress)**: "Compress to target size" स्लाइडर को अपने पोर्टल की जरूरत अनुसार सेट करें (उदा. 100 KB या 200 KB)।',
      '5. **Create processed copy दबाएं**: इस पर क्लिक करते ही रोटेशन, क्रॉप और कंप्रेशन सब एक साथ लागू हो जाएंगे।',
      '6. **साइज की तुलना व डाउनलोड**: ओरिजिनल साइज और तैयार साइज की तुलना देखें और "Download" बटन से फाइल सेव करें।'
    ],
    stepsEn: [
      '1. **Capture or Upload**: Take a live camera photo with flash feedback or upload an existing image/PDF.',
      '2. **Rotate 90°**: Click "Rotate 90°" as many times as needed to properly orient your document.',
      '3. **Crop**: Adjust the crop slider to trim unwanted borders.',
      '4. **Target Size**: Slide the target size control to match portal requirements (e.g., 100 KB or 200 KB).',
      '5. **Click Create Processed Copy**: Applies all rotation, cropping, and compression settings simultaneously.',
      '6. **Compare & Download**: View original vs processed file size and download your optimized copy.'
    ],
    tipsHi: '💡 **टिप:** Rotate बटन दबाने के बाद "Create processed copy" पर क्लिक करने से सारे बदलाव एक साथ नई फाइल में सेव हो जाते हैं।',
    tipsEn: '💡 **Pro Tip:** After rotating and cropping, click "Create processed copy" to apply all adjustments in one go.'
  },
  quiz: {
    title: 'Auto Quiz (ऑटो क्विज)',
    route: 'quiz',
    summaryHi: 'वर्कशीट सॉल्व करने, परीक्षा अभ्यास करने और गलत उत्तरों पर तुरंत AI से चर्चा करने का इंटेलीजेंट टूल।',
    summaryEn: 'Interactive worksheet practice and automated test solver featuring instant question preview, step-by-step reasoning, and wrong-answer AI discussions.',
    stepsHi: [
      '1. **वर्कशीट अपलोड करें**: अपनी क्विज फाइल अपलोड करें या टेक्स्ट पेस्ट करें।',
      '2. **सवालों का प्रीव्यू**: दाईं तरफ सभी सवाल तुरंत प्रीव्यू में दिखने लगेंगे।',
      '3. **Start Practice दबाएं**: एक-एक करके सवाल हल करें और "Check answer" करें।',
      '4. **गलत उत्तर पर AI चर्चा**: अगर आपका उत्तर गलत होता है, तो तुरंत "💬 Discuss this question with AI" बटन दिखेगा — क्लिक करने पर AI पूरा कारण समझाएगा।',
      '5. **Auto Solve All**: अगर आपको सभी सवालों के सही उत्तर और कारण एक साथ चाहिए, तो "Auto Solve All" दबाएं।'
    ],
    stepsEn: [
      '1. **Upload Worksheet**: Upload your test sheet or paste questions.',
      '2. **Instant Preview**: Questions list appears immediately in the right preview panel.',
      '3. **Start Practice**: Click "Start Practice" to answer questions one by one with instant scoring.',
      '4. **Discuss Wrong Answers**: If you pick the wrong option, tap "💬 Discuss this question with AI" for an in-depth breakdown.',
      '5. **Auto Solve All**: Click "Auto Solve All" to instantly solve the entire worksheet with full explanations.'
    ],
    tipsHi: '💡 **टिप:** गलत उत्तर होने पर "Discuss with AI" बटन दबाने से आपका कॉन्सेप्ट हमेशा के लिए क्लियर हो जाता है।',
    tipsEn: '💡 **Pro Tip:** Use "Discuss with AI" on any incorrect answer to understand the underlying theory.'
  },
  equations: {
    title: 'Equation Graph (इक्वेशन ग्राफ)',
    route: 'equations',
    summaryHi: '2D गणितीय ग्राफ प्लॉटर, इंटरसेक्शन पॉइंट्स निकालने और कैमरे से फॉर्मूले को OCR से स्कैन करने का टूल।',
    summaryEn: 'Interactive 2D Cartesian function plotter with intersection detection, vertical line support (e.g. x=0), and camera OCR equation scanning.',
    stepsHi: [
      '1. **फॉर्मूला लिखें**: इनपुट बॉक्स में कोई भी समीकरण लिखें, जैसे `y = x^2 - 4`, `y = 2*x + 1`, या `x = 0` (वर्टिकल लाइन)।',
      '2. **लाइव ग्राफ देखें**: ग्राफ तुरंत 2D कोऑर्डिनेट प्लेन पर खिंच जाएगा।',
      '3. **इंटरसेक्शन देखें**: दोनों रेखाओं के कटने के बिंदु (X, Y) अपने आप कैलकुलेट होकर नीचे दिखेंगे।',
      '4. **फोटो से समीकरण स्कैन करें**: अगर आपके पास नोटबुक में फॉर्मूला है, तो फोटो अपलोड करके OCR से सीधे समीकरण निकाल सकते हैं।'
    ],
    stepsEn: [
      '1. **Enter Equations**: Type formulas such as `y = x^2 - 4`, `y = 2*x + 1`, or `x = 0`.',
      '2. **Live Graph**: The curve renders in real-time on the 2D Cartesian plane.',
      '3. **Intersections**: Exact intersection coordinates are computed and displayed automatically.',
      '4. **OCR Scan**: Upload photos of handwritten math formulas to auto-extract equations.'
    ],
    tipsHi: '💡 **टिप:** माउस व्हील से ग्राफ को ज़ूम इन/आउट और ड्रैग करके किसी भी बिंदु का मान देख सकते हैं।',
    tipsEn: '💡 **Pro Tip:** Use mouse scroll or pinch gestures to zoom into subtle curve intersections.'
  },
  home: {
    title: 'Student Dashboard (डैशबोर्ड)',
    route: 'home',
    summaryHi: 'आपकी पढ़ाई का मुख्य केंद्र — जहाँ आपके सभी टूल्स, आज के स्टडी मिनट्स और हाल की एक्टिविटीज एक जगह दिखती हैं।',
    summaryEn: 'Your central command center displaying daily study minutes, completed exercises, quiz scores, and quick tool shortcuts.',
    stepsHi: [
      '1. **क्विक एक्सेस**: यहाँ से आप एक क्लिक में AI Teacher, Voice Rooms, Smart Doc आदि किसी भी टूल में जा सकते हैं।',
      '2. **स्टडी टाइम**: देखें कि आपने आज कितने मिनट पढ़ाई की और आपका डेली स्ट्रीक क्या है।',
      '3. **रिसेंट डॉक्युमेंट्स**: आपके हाल ही में बनाए गए डॉक्युमेंट्स और क्विज यहाँ सुरक्षित रहते हैं।'
    ],
    stepsEn: [
      '1. **Quick Launch**: 1-click access to Voice Rooms, AI Teacher, Smart Doc, and Quizzes.',
      '2. **Study Minutes**: Track daily focused learning time and continuous study streaks.',
      '3. **Recent Items**: Quickly resume recently scanned documents or quiz attempts.'
    ],
    tipsHi: '💡 **टिप:** हर दिन पढ़ाई शुरू करने के लिए डैशबोर्ड आपका शुरुआती बिंदु है।',
    tipsEn: '💡 **Pro Tip:** Start here each session to check your daily learning streak.'
  }
};

// Generates an in-depth, structured response for any feature question
function generateDetailedCopilotAnswer(query: string, currentModule: string, userName: string): { reply: string; navigateTo?: string } {
  const lower = query.toLowerCase();
  const isHindi = /[क-ह]/.test(query) || /(kaha|kaise|karo|batao|kholo|jaana|madad|kya|feature|tarika|step)/i.test(lower);

  // 1. Overview of Entire Website
  if (/all feature|kya kya hai|website|kya karta hai|sare feature|features|overview|kaise kaam|about this/i.test(lower) && !/voice\s*room|doc|teacher|quiz|equation/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `नमस्ते **${userName}**! 🙏 हमारी वेबसाइट **Nexora AI / Tech AI Student Workspace** छात्रों के लिए एक प्रीमियम ऑल-इन-वन लर्निंग प्लेटफॉर्म है।\n\nयहाँ आपके लिए ये सभी प्रमुख फीचर्स उपलब्ध हैं:\n\n1. 🎙️ **Student Voice Rooms**: दोस्तों के साथ लाइव माइक से बात करें, WhatsApp लिंक शेयर करें और साथ में प्रैक्टिस करें।\n2. 🗣️ **English Practice & Voice Studio**: 3D स्काई ऑर्ब के साथ बोलचाल का अभ्यास करें। हर सवाल पर डायनामिक रिप्लाई लाइन्स मिलती हैं।\n3. 📚 **AI Teacher**: किसी भी नोट्स या PDF को बोलकर 25+ भाषाओं में आसान शब्दों में समझाने वाला ट्यूटर।\n4. 📄 **Smart Doc**: कैमरा स्कैनर, 90° रोटेशन, क्रॉप और 50KB-500KB में साइज कंप्रेसर।\n5. 🧠 **Auto Quiz**: वर्कशीट सॉल्वर, गलत उत्तर पर AI चर्चा और स्टेप-बाय-स्टेप गाइड।\n6. 📈 **Equation Graph**: 2D गणितीय ग्राफ प्लॉटर, इंटरसेक्शन और फोटो OCR।\n7. 📊 **Dashboard & Progress**: दैनिक स्टडी मिनट्स और लर्निंग स्ट्रीक ट्रैकर।\n\nआप किसी भी फीचर के बारे में मुझसे पूछ सकते हैं (उदा: *"Smart Doc कैसे इस्तेमाल करें?"*) या जहाँ जाना चाहें सीधे बता सकते हैं!`,
        navigateTo: undefined
      };
    }
    return {
      reply: `Hello **${userName}**! 👋 Welcome to **Nexora AI / Tech AI Student Workspace** — your comprehensive, modern educational platform.\n\nHere are the core features built into this website:\n\n1. 🎙️ **Student Voice Rooms**: Real-time group voice calls with live mics, WhatsApp invite links, and instant in-room chat.\n2. 🗣️ **English Practice Studio**: Live speaking partner with animated sky orb and dynamically generated reply lines for every question.\n3. 📚 **AI Teacher**: Spoken interactive lessons from your PDFs/notes in 25+ languages with voice QA.\n4. 📄 **Smart Doc**: Camera scanner, repeatable 90° rotation, crop, and target KB compression.\n5. 🧠 **Auto Quiz**: Interactive worksheet practice, instant right/wrong feedback, and AI discussion.\n6. 📈 **Equation Graph**: 2D Cartesian function grapher with intersections and OCR math scanner.\n7. 📊 **Dashboard & Progress**: Track your daily learning streak and study minutes.\n\nAsk me about any specific feature or tell me where you'd like to go!`,
      navigateTo: undefined
    };
  }

  // 2. Identify target module
  let targetKey: string | undefined;
  if (/voice\s*room|stage|call|audio\s*room|dost|friend|whatsapp|invite|mic|माइक|दोस्त|कॉल|रूम/i.test(lower)) {
    targetKey = 'voiceroom';
  } else if (/english|speaking|orb|practice|voice\s*studio|bolna|बातचीत|ऑर्ब|अंग्रेजी/i.test(lower)) {
    targetKey = 'voice';
  } else if (/teacher|notes|study|pdf|explain|पढ़ाओ|टीचर|नोट्स|लेक्चर/i.test(lower)) {
    targetKey = 'teacher';
  } else if (/doc|scan|compress|camera|rotate|crop|घूमा|साइज|दस्तावेज|दॉक/i.test(lower)) {
    targetKey = 'docs';
  } else if (/quiz|test|solve|question|mcq|वर्कशीट|क्विज|सवाल|उत्तर/i.test(lower)) {
    targetKey = 'quiz';
  } else if (/equation|graph|math|curve|plot|x=0|इंटरसेक्शन|समीकरण|ग्राफ/i.test(lower)) {
    targetKey = 'equations';
  } else if (/dashboard|home|streak|minutes|प्रोग्रेस|डैशबोर्ड/i.test(lower)) {
    targetKey = 'home';
  }

  if (targetKey && DEEP_WEBSITE_KNOWLEDGE[targetKey]) {
    const f = DEEP_WEBSITE_KNOWLEDGE[targetKey];
    if (isHindi) {
      const stepsFormatted = f.stepsHi.join('\n');
      return {
        reply: `### 📌 **${f.title}**\n\n${f.summaryHi}\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n${stepsFormatted}\n\n${f.tipsHi}\n\n👉 **आप नीचे दिए गए बटन पर क्लिक करके सीधे इस फीचर पर जा सकते हैं!**`,
        navigateTo: f.route
      };
    }
    const stepsFormatted = f.stepsEn.join('\n');
    return {
      reply: `### 📌 **${f.title}**\n\n${f.summaryEn}\n\n#### ⚙️ **Step-by-Step Guide:**\n${stepsFormatted}\n\n${f.tipsEn}\n\n👉 **Click the navigation button below to jump straight to this feature!**`,
      navigateTo: f.route
    };
  }

  // Fallback conversational reply
  if (isHindi) {
    return {
      reply: `नमस्ते **${userName}**! मैं आपकी सहायता के लिए तैयार हूँ। आप वर्तमान में **${MODULE_NAV_MAP[currentModule]?.label || 'Workspace'}** पेज पर हैं।\n\nआप मुझसे वेबसाइट के किसी भी फीचर के बारे में पूछ सकते हैं — जैसे:\n- *"Smart Doc में डॉक्यूमेंट कैसे कंप्रेस करें?"*\n- *"Voice Room में दोस्तों को कैसे बुलाएं?"*\n- *"English Practice कैसे काम करता है?"*\n\nआप क्या जानना चाहते हैं?`,
      navigateTo: undefined
    };
  }

  return {
    reply: `Hello **${userName}**! I'm here to help you navigate and master every tool on this website. You are currently viewing **${MODULE_NAV_MAP[currentModule]?.label || 'Workspace'}**.\n\nYou can ask me detailed questions like:\n- *"How do I invite friends to my Voice Room?"*\n- *"How do I compress a document to 100 KB in Smart Doc?"*\n- *"How does English Practice generate dynamic replies?"*\n\nHow can I assist you right now?`,
    navigateTo: undefined
  };
}

export function NexoraCopilot({ currentModule, onNavigate, userName = 'Student' }: NexoraCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'en-US' | 'hi-IN'>('en-US');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_copilot_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Hi! I'm **Nexora AI Copilot**, your website-wide intelligent assistant. How can I help you today?\n\nI can help you navigate tools, practice speaking, join **Voice Rooms**, explain study notes, solve quizzes, or compress documents.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: [
          '🎙️ Take me to Voice Rooms',
          '🗣️ How do I practice speaking with AI?',
          '📚 Open AI Teacher for my notes',
          '📄 Help me compress a document',
        ],
      },
    ];
  });

  // Save conversation history
  useEffect(() => {
    try {
      localStorage.setItem('nexora_copilot_chat', JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Voice speech synthesis
  const speakText = (text: string) => {
    if (!voiceSpeechEnabled || !synthRef.current) return;
    try {
      synthRef.current.cancel();
      // Remove markdown formatting before speaking
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[#*_~]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = voiceLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      synthRef.current.speak(utterance);
    } catch {}
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  // Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Send message to backend
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    stopSpeaking();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentModule,
          userName,
          language: voiceLang,
          history: messages.slice(-5).map(m => ({ sender: m.sender === 'user' ? 'user' : 'assistant', text: m.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const aiMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            navigateTo: data.navigateTo,
            suggestedQuestions: data.suggestedQuestions,
          };

          setMessages(prev => [...prev, aiMsg]);
          speakText(data.reply);

          // If navigation command is detected, handle it
          if (data.navigateTo && data.navigateTo !== currentModule && MODULE_NAV_MAP[data.navigateTo]) {
            setTimeout(() => {
              onNavigate(data.navigateTo);
            }, 800);
          }
          setIsTyping(false);
          return;
        }
      }
      throw new Error('API failed');
    } catch {
      // Instant intelligent knowledge-base response
      const answer = generateDetailedCopilotAnswer(text, currentModule, userName);

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: answer.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        navigateTo: answer.navigateTo,
        suggestedQuestions: [
          '🎙️ Voice Room कैसे काम करता है?',
          '📄 Smart Doc में 100KB कंप्रेस कैसे करें?',
          '🗣️ English Practice में कैसे बोलें?',
          '📚 AI Teacher में PDF कैसे समझें?'
        ],
      };

      setMessages(prev => [...prev, aiMsg]);
      speakText(answer.reply);

      // Only navigate if user explicitly asked to go/navigate/open, not just asking for information
      const isExplicitNav = /take me|kholo|chalo|navigate|open|le chalo|jaana hai/i.test(text);
      if (isExplicitNav && answer.navigateTo && answer.navigateTo !== currentModule) {
        setTimeout(() => {
          onNavigate(answer.navigateTo);
        }, 1200);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleClearChat = () => {
    stopSpeaking();
    const initial: Message = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Chat cleared! How can I assist you right now?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: [
        '🎙️ Open Voice Rooms',
        '🗣️ Start Speaking Practice',
        '📖 Explain Study Material',
      ],
    };
    setMessages([initial]);
    localStorage.removeItem('nexora_copilot_chat');
  };

  const formatMessageText = (content: string) => {
    // Simple inline markdown parsing for bold, code, and bullet points
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      // Bold
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <li key={idx} className="copilot-bullet-item">
            {parts.length > 0 ? parts : line.replace(/^[-*•]\s*/, '')}
          </li>
        );
      }

      return (
        <p key={idx} className="copilot-line">
          {parts.length > 0 ? parts : formatted}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── 1. FLOATING PILL LAUNCHER BUTTON ─── */}
      {!isOpen && (
        <aside aria-label="Nexora AI Copilot" className="fixed bottom-6 right-6 z-[99999] pointer-events-auto">
          <button
            type="button"
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_8px_32px_rgba(0,180,255,0.4)] backdrop-blur-xl border border-cyan-400/40 bg-gradient-to-r from-slate-950/90 via-indigo-950/90 to-blue-950/90 hover:border-cyan-300 hover:shadow-[0_12px_40px_rgba(0,210,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Open Nexora AI Copilot"
          >
            {/* Pulsing ring aura */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />

            {/* Glowing Icon */}
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(56,189,248,0.8)] text-slate-950">
              <Sparkles size={18} className="animate-spin-slow" />
            </span>

            {/* Branding Text */}
            <div className="relative flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase leading-none">
                AI ASSISTANT
              </span>
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-tight">
                NEXORA AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">COPILOT</span>
              </span>
            </div>

            {/* Online Status Dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          </button>
        </aside>
      )}

      {/* ─── 2. COPILOT CHAT PANEL ─── */}
      {isOpen && (
        <aside
          aria-label="Nexora AI Copilot Chat Interface"
          className={`fixed bottom-6 right-6 z-[99999] pointer-events-auto transition-all duration-300 ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-[92vw] max-w-[430px] h-[85vh] max-h-[640px]'
          } rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(56,189,248,0.25)] border border-cyan-500/30 backdrop-blur-2xl bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 flex flex-col overflow-hidden text-slate-100 font-sans`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-950/40 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white">NEXORA AI</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    COPILOT
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Context: <b className="text-cyan-300">{MODULE_NAV_MAP[currentModule]?.label || 'Workspace'}</b></span>
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
                className={`p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors ${voiceSpeechEnabled ? 'text-cyan-400' : 'text-slate-500'}`}
                title={voiceSpeechEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
              >
                {voiceSpeechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear conversation"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus size={16} />
              </button>

              <button
                type="button"
                onClick={() => { setIsOpen(false); stopSpeaking(); }}
                className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Close Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Minimized View */}
          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              className="flex-1 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-900/50 transition-colors"
            >
              <span className="text-xs text-slate-300">Click to expand chat…</span>
              <span className="text-xs text-cyan-400 font-medium">Expand ↗</span>
            </div>
          ) : (
            <>
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                        <Sparkles size={14} />
                      </div>
                    )}

                    <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`group relative px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-xs'
                            : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {formatMessageText(msg.text)}

                        {/* Navigation pill if AI suggests navigating */}
                        {msg.navigateTo && MODULE_NAV_MAP[msg.navigateTo] && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => onNavigate(msg.navigateTo)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/40 hover:border-cyan-300 hover:from-cyan-600/50 hover:to-blue-600/50 transition-all text-cyan-200 font-semibold group/btn"
                            >
                              <span className="flex items-center gap-2">
                                <ArrowRight size={14} className="text-cyan-400 group-hover/btn:translate-x-0.5 transition-transform" />
                                <span>Go to {MODULE_NAV_MAP[msg.navigateTo].label}</span>
                              </span>
                              <ExternalLink size={12} className="text-cyan-300/70" />
                            </button>
                          </div>
                        )}

                        {/* Copy message button */}
                        {msg.sender === 'ai' && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white transition-opacity"
                            title="Copy reply"
                          >
                            {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                      <Sparkles size={12} className="animate-spin-slow" />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-2 rounded-full border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[11px] text-slate-400 ml-1">Nexora is thinking…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto flex gap-1.5 no-scrollbar">
                {[
                  { label: '🎙️ Voice Rooms', target: 'voiceroom' },
                  { label: '🗣️ English Practice', target: 'voice' },
                  { label: '📚 AI Teacher', target: 'teacher' },
                  { label: '📄 Smart Doc', target: 'docs' },
                  { label: '🧮 Equations', target: 'equations' },
                  { label: '❓ Auto Quiz', target: 'quiz' },
                ].map(chip => (
                  <button
                    key={chip.target}
                    type="button"
                    onClick={() => handleSendMessage(`Take me to ${chip.label}`)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 border-t border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/90 flex items-center gap-2"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border-slate-800'
                  }`}
                  title={isListening ? 'Listening… click to stop' : 'Speak your question (English / Hindi)'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Language Toggle for Voice */}
                <button
                  type="button"
                  onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'hi-IN' : 'en-US')}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 hover:border-cyan-400/40 transition-colors"
                  title="Toggle voice language"
                >
                  {voiceLang === 'en-US' ? 'EN' : 'HI'}
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isListening ? 'Listening to your voice…' : 'Ask Nexora AI anything…'}
                  className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </aside>
      )}
    </>
  );
}
