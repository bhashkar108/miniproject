import { Router, type IRouter } from "express";
import { generateText } from "../lib/gemini";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface CopilotRequestBody {
  message: string;
  currentModule?: string;
  userName?: string;
  history?: Array<{ sender: "user" | "assistant"; text: string }>;
  language?: string;
}

const MODULE_DESCRIPTIONS: Record<string, { title: string; route: string; description: string }> = {
  home: {
    title: "Student Workspace Dashboard",
    route: "home",
    description: "Overview of all study tools, personal study minutes, quiz scores, and recent activities.",
  },
  teacher: {
    title: "AI Teacher",
    route: "teacher",
    description: "Upload study materials (PDF, DOCX, TXT, images) to get interactive spoken or text explanations in 25+ languages, with continuous hands-free voice mode.",
  },
  voice: {
    title: "English Practice & AI Voice Studio",
    route: "voice",
    description: "Real-time AI voice conversation partner with animated orb, multi-language support (English, Hindi, Spanish, French, etc.), difficulty levels (Beginner, Intermediate, Advanced), and dynamic topic switching.",
  },
  voiceroom: {
    title: "Student Voice Rooms",
    route: "voiceroom",
    description: "Real-time group voice calling platform with WebRTC audio, unique WhatsApp invitation links, stage host controls, and live in-room text chat.",
  },
  docs: {
    title: "Smart Doc",
    route: "docs",
    description: "Document scanner and camera capture tool with 90° rotation, crop, target size compression, and format conversion (PDF, PNG, JPG).",
  },
  equations: {
    title: "Equation Graph",
    route: "equations",
    description: "Visual 2D mathematical function plotter with live intersection calculation and OCR to read equations from images/PDFs.",
  },
  quiz: {
    title: "Auto Quiz",
    route: "quiz",
    description: "Upload worksheets or import quiz links to practice interactive questions, chat with an AI step-by-step solver, or auto-solve to a target score.",
  },
  progress: {
    title: "Activity Progress",
    route: "progress",
    description: "Private timeline of study sessions, practice scores, and minutes spent learning.",
  },
  profile: {
    title: "Student Profile",
    route: "profile",
    description: "Manage student account details, profile photo, and local privacy preferences.",
  },
};

function detectNavigationIntent(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (/(voice\s*room|audio\s*room|stage|mic\s*room|call\s*room|calling)/i.test(lower)) {
    return "voiceroom";
  }
  if (/(english\s*practice|voice\s*studio|voice\s*practice|speaking\s*practice|speak\s*with\s*ai|orb)/i.test(lower)) {
    return "voice";
  }
  if (/(ai\s*teacher|teacher|notes|study\s*material|explain\s*document|lesson)/i.test(lower)) {
    return "teacher";
  }
  if (/(smart\s*doc|document|camera|scan|compress\s*pdf|rotate|crop)/i.test(lower)) {
    return "docs";
  }
  if (/(equation|graph|plot|math\s*curve|function\s*graph|algebra)/i.test(lower)) {
    return "equations";
  }
  if (/(quiz|test|exam|worksheet|auto\s*solve|solve\s*questions)/i.test(lower)) {
    return "quiz";
  }
  if (/(progress|activity|stats|history|minutes\s*studied)/i.test(lower)) {
    return "progress";
  }
  if (/(profile|account|setting|settings|my\s*details|photo)/i.test(lower)) {
    return "profile";
  }
  if (/(dashboard|home|workspace|main\s*page|desk)/i.test(lower)) {
    return "home";
  }

  return undefined;
}

function getLocalFallbackResponse(
  message: string,
  currentModule: string = "home",
  userName: string = "Student",
  language: string = "en",
): { reply: string; navigateTo?: string } {
  const lower = message.toLowerCase();
  const navTarget = detectNavigationIntent(lower);
  const isHindi = language.startsWith("hi") || /[क-ह]/.test(message) || /(kaha|kaise|karo|batao|kholo|jaana|madad|kya|tarika|step)/i.test(lower);

  // Voice Rooms in-depth answer
  if (navTarget === "voiceroom" || /voice\s*room|audio\s*room|stage|whatsapp|call|dost|friend|mic/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 🎙️ **Student Voice Rooms (स्टूडेंट वॉइस रूम्स)**\n\nयह फीचर दोस्तों के साथ लाइव ऑडियो कॉल और ग्रुप स्टडी के लिए है। इसमें रियल-टाइम WebRTC माइक्रोफ़ोन ऑडियो और लाइव टेक्स्ट चैट है।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. **"＋ Create Room"** पर क्लिक करें, रूम का नाम, विषय और क्षमता चुनें।\n2. आप तुरंत **स्टेज पर लाइव** आ जाएंगे और आपका माइक ऑन हो जाएगा।\n3. **"Share on WhatsApp"** या **"Copy link"** पर क्लिक करें। आप खुद रूम में बने रहेंगे।\n4. जब आपका दोस्त लिंक पर क्लिक करेगा, वह **सीधे आपके रूम में स्टेज पर** आ जाएगा।\n5. आप दोनों लाइव माइक से बात कर सकते हैं और चैट पैनल से मैसेज भी भेज सकते हैं!\n\n💡 **टिप:** लिंक शेयर करने के बाद आप स्टेज पर रहकर आराम से दोस्तों के जुड़ने का इंतजार करें।`,
        navigateTo: "voiceroom",
      };
    }
    return {
      reply: `### 🎙️ **Student Voice Rooms**\n\nReal-time multi-user audio calling rooms for collaborative learning. Features WebRTC live voice, WhatsApp invite links, and in-room chat.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Click **"＋ Create Room"**, enter room title, category, and capacity.\n2. You immediately land **on stage with mic active**.\n3. Click **"Share on WhatsApp"** or **"Copy link"** — you remain on stage waiting for friends.\n4. When your friend clicks the link, they **land directly on stage with you**.\n5. Speak freely via microphone and chat in real-time!\n\n💡 **Pro Tip:** You do not leave the room when sharing the invite link.`,
      navigateTo: "voiceroom",
    };
  }

  // Smart Doc in-depth answer
  if (navTarget === "docs" || /doc|scan|compress|camera|rotate|crop|घूमा|साइज|100kb|200kb/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 📄 **Smart Doc (स्मार्ट डॉक)**\n\nफॉर्म भरने और कॉलेज एडमिशन के लिए डॉक्यूमेंट स्कैनर, 90° रोटेटर और टारगेट KB साइज कंप्रेसर।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. **"Camera preview"** से लाइव फोटो लें या फाइल अपलोड करें।\n2. **"Rotate 90°"** बटन दबाकर जितनी बार चाहें फोटो को सही दिशा में घुमाएं।\n3. **"Crop"** स्लाइडर से अनचाहे किनारे काटें।\n4. **"Compress to target size"** स्लाइडर से आवश्यक साइज (उदा. 100 KB या 200 KB) सेट करें।\n5. **"Create processed copy"** बटन पर क्लिक करें — रोटेशन, क्रॉप और कंप्रेशन सब एक साथ लागू हो जाएंगे।\n6. ओरिजिनल और प्रोसेस साइज देखकर **"Download"** से सेव करें!`,
        navigateTo: "docs",
      };
    }
    return {
      reply: `### 📄 **Smart Doc**\n\nDocument capture, 90° rotation, crop, and file compressor (50KB to 500KB) tailored for admissions and exam portals.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Capture a photo via live camera or upload an existing file.\n2. Click **"Rotate 90°"** repeatedly until properly oriented.\n3. Adjust the **"Crop"** slider to remove unwanted borders.\n4. Set the **"Compress to target size"** slider to your target KB.\n5. Click **"Create processed copy"** to apply all adjustments simultaneously.\n6. Compare file sizes and click **"Download"**!`,
      navigateTo: "docs",
    };
  }

  // English Practice in-depth answer
  if (navTarget === "voice" || /english|speaking|orb|practice|voice\s*studio|bolna|अंग्रेजी/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 🗣️ **English Practice & Voice Studio (इंग्लिश प्रैक्टिस)**\n\n3D स्काई ऑर्ब के साथ लाइव बोलचाल का अभ्यास। हर सवाल पर डायनामिक 3-लेवल रिप्लाई लाइन्स अपने आप तैयार होती हैं।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. अपनी भाषा और स्तर (**Beginner, Intermediate, Advanced**) चुनें।\n2. बातचीत का विषय चुनें या **"Custom Topic"** में अपनी पसंद का विषय लिखें।\n3. AI आपसे बोलकर सवाल पूछेगा।\n4. सवाल के नीचे तुरंत उस सवाल के अनुसार **3 रेडीमेड उत्तर** दिखेंगे — "Use reply" से उपयोग करें या उच्चारण सुनें।\n5. माइक बटन दबाकर मुंह से बोलें — हर सवाल के बाद नए रिप्लाई अपने आप जनरेट होंगे ताकि बातचीत का फ्लो न टूटे!`,
        navigateTo: "voice",
      };
    }
    return {
      reply: `### 🗣️ **English Practice Studio**\n\nReal-time spoken language partner with animated sky orb and dynamic reply suggestions tailored for every question.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Choose your language and level (**Beginner, Intermediate, Advanced**).\n2. Select a topic or type a custom subject.\n3. Listen to the AI speak its question.\n4. Dynamic reply lines appear immediately under the orb for your chosen level.\n5. Speak via microphone — for every answer, AI generates continuous follow-ups and fresh suggestions!`,
      navigateTo: "voice",
    };
  }

  // AI Teacher in-depth answer
  if (navTarget === "teacher" || /teacher|notes|study|pdf|explain|टीचर|नोट्स/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 📚 **AI Teacher (AI टीचर)**\n\nकिसी भी नोट्स या PDF को बोलकर 25+ भाषाओं में आसान शब्दों में समझाने वाला स्मार्ट ट्यूटर।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. अपने नोट्स पेस्ट करें या PDF फाइल अपलोड करें।\n2. समझाने की भाषा (हिंदी, इंग्लिश आदि) और ऑडियो स्पीड चुनें।\n3. **"Teach Lesson"** पर क्लिक करें — AI मुख्य बिंदु और सरल उदाहरण तैयार करेगा।\n4. AI बोलकर समझाएगा और बोले जाने वाले शब्द स्क्रीन पर हाईलाइट होंगे।\n5. माइक बटन दबाकर मुंह से कोई भी सवाल पूछें — AI तुरंत उत्तर देगा!`,
        navigateTo: "teacher",
      };
    }
    return {
      reply: `### 📚 **AI Teacher**\n\nPersonal AI educator that explains your PDFs and study notes in 25+ languages with synchronized spoken voice.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Paste notes or upload a textbook PDF.\n2. Choose your explanation language and speech rate.\n3. Click **"Teach Lesson"** for chapter takeaways and analogies.\n4. Listen as AI explains with synchronized highlighting.\n5. Tap the mic to ask voice follow-up questions hands-free!`,
      navigateTo: "teacher",
    };
  }

  // Auto Quiz in-depth answer
  if (navTarget === "quiz" || /quiz|test|solve|question|mcq|क्विज|सवाल/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 🧠 **Auto Quiz (ऑटो क्विज)**\n\nवर्कशीट सॉल्व करने और गलत उत्तरों पर AI से चर्चा करने का टूल।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. अपनी क्विज वर्कशीट अपलोड करें — दाईं तरफ तुरंत सभी सवाल दिखेंगे।\n2. **"Start Practice"** दबाएं और एक-एक करके सवाल हल करें।\n3. गलत उत्तर होने पर **"💬 Discuss this question with AI"** बटन दबाएं — AI पूरा कारण समझाएगा।\n4. सभी सवालों के एक साथ उत्तर पाने के लिए **"Auto Solve All"** पर क्लिक करें।`,
        navigateTo: "quiz",
      };
    }
    return {
      reply: `### 🧠 **Auto Quiz**\n\nInteractive worksheet practice and solver with instant question preview and step-by-step reasoning.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Upload your quiz worksheet — questions appear instantly in the right panel.\n2. Click **"Start Practice"** to answer questions one by one.\n3. If you get a question wrong, tap **"💬 Discuss this question with AI"** for an explanation.\n4. Use **"Auto Solve All"** to quickly solve all questions with full explanations.`,
      navigateTo: "quiz",
    };
  }

  // Equation Graph in-depth answer
  if (navTarget === "equations" || /equation|graph|math|curve|plot|x=0|समीकरण|ग्राफ/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `### 📈 **Equation Graph (इक्वेशन ग्राफ)**\n\n2D गणितीय ग्राफ प्लॉटर और इंटरसेक्शन निकालने का टूल।\n\n#### ⚙️ **स्टेप-बाय-स्टेप कैसे इस्तेमाल करें:**\n1. इनपुट बॉक्स में कोई भी समीकरण लिखें, जैसे \`y = x^2 - 4\`, \`y = 2*x + 1\`, या \`x = 0\`।\n2. ग्राफ तुरंत 2D प्लेन पर ड्रा हो जाएगा।\n3. इंटरसेक्शन पॉइंट्स (X, Y) अपने आप कैलकुलेट होकर दिखेंगे।\n4. **"Upload equation photo"** से फोटो अपलोड करके OCR से समीकरण निकाल सकते हैं।`,
        navigateTo: "equations",
      };
    }
    return {
      reply: `### 📈 **Equation Graph**\n\n2D Cartesian curve plotter with automatic intersection calculation and OCR math scanning.\n\n#### ⚙️ **Step-by-Step Guide:**\n1. Type equations such as \`y = x^2 - 4\` or vertical lines like \`x = 0\`.\n2. Curves plot live on the 2D Cartesian plane.\n3. Intersection coordinates are calculated and listed automatically.\n4. Upload photos of handwritten math formulas to auto-extract equations via OCR.`,
      navigateTo: "equations",
    };
  }

  if (navTarget) {
    const mod = MODULE_DESCRIPTIONS[navTarget];
    if (isHindi) {
      return {
        reply: `बिल्कुल! मैं आपको **${mod.title}** पर ले जा रहा हूँ।\n\n📌 **विवरण:** ${mod.description}\n\nआप नीचे दिए गए बटन पर क्लिक करके सीधे जा सकते हैं।`,
        navigateTo: navTarget,
      };
    }
    return {
      reply: `Sure! I'm guiding you to **${mod.title}**.\n\n📌 **Feature:** ${mod.description}\n\nClick the link or button below to jump straight there!`,
      navigateTo: navTarget,
    };
  }

  // General questions
  if (/(who\s*are\s*you|what\s*is\s*nexora|koun\s*ho)/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `नमस्ते ${userName}! 👋 मैं **Nexora AI Copilot** हूँ—आपकी पूरी वेबसाइट का प्रीमियम AI असिस्टेंट। मैं आपको सभी टूल्स (AI Teacher, Voice Rooms, English Practice, Smart Doc, Equation Graph, Auto Quiz) का उपयोग करने और नेविगेट करने में मदद कर सकता हूँ। आप मुझसे कोई भी सवाल पूछ सकते हैं!`,
      };
    }
    return {
      reply: `Hi ${userName}! 👋 I am **Nexora AI Copilot**, your website-wide intelligent assistant. I can guide you through every study tool—from **Voice Rooms** and **English Practice** to **AI Teacher**, **Smart Doc**, **Equation Graph**, and **Auto Quiz**. Just tell me what you need!`,
    };
  }

  // Help with current module
  const currentModInfo = MODULE_DESCRIPTIONS[currentModule] || MODULE_DESCRIPTIONS.home;
  if (isHindi) {
    return {
      reply: `आप अभी **${currentModInfo.title}** पर हैं।\n\n💡 **यहाँ क्या कर सकते हैं:** ${currentModInfo.description}\n\nयदि आप किसी अन्य सेक्शन में जाना चाहते हैं या कोई मदद चाहिए, तो बस मुझे बताएं!`,
    };
  }

  return {
    reply: `You are currently on **${currentModInfo.title}**.\n\n💡 **What you can do here:** ${currentModInfo.description}\n\nFeel free to ask questions about this tool, or tell me where you'd like to navigate!`,
  };
}

router.post("/copilot", async (req, res): Promise<void> => {
  try {
    const {
      message = "",
      currentModule = "home",
      userName = "Student",
      history = [],
      language = "en",
    } = (req.body || {}) as CopilotRequestBody;

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      res.status(400).json({ success: false, error: "Message cannot be empty" });
      return;
    }

    const detectedNav = detectNavigationIntent(trimmedMsg);

    // Build context-aware prompt for Gemini
    const systemPrompt = `
You are NEXORA AI COPILOT, a premium, intelligent, friendly, website-wide assistant for the Nexora / TECH AI Smart Way platform.
User's Name: ${userName}
User's Current Page/Module: "${currentModule}" (${MODULE_DESCRIPTIONS[currentModule]?.title || "Workspace"})
Target Language: ${language}

WEBSITE STRUCTURE & MODULES:
1. "home" - Student Workspace Dashboard (overview, study streak, quick launches)
2. "teacher" - AI Teacher (upload notes/PDF/images, spoken explanations in 25+ languages, continuous voice conversation)
3. "voice" - English Practice & AI Voice Studio (interactive voice orb, speech recognition, Beginner/Intermediate/Advanced levels, dynamic topic selection, suggested response lines)
4. "voiceroom" - Student Voice Rooms (create live audio rooms, share unique WhatsApp invite links, P2P/LiveKit real WebRTC voice, live text chat, host controls)
5. "docs" - Smart Doc (camera document capture, 90° rotation, crop, target KB compression, PDF/JPG/PNG exports)
6. "equations" - Equation Graph (2D live math graph, intercept detection, image equation OCR)
7. "quiz" - Auto Quiz (worksheet analysis, manual practice, AI step-by-step math/science tutor, auto-solve)
8. "progress" - Study activity progress timeline and records
9. "profile" - Student profile, avatar photo, account details

BEHAVIOR & GUIDELINES:
- Provide clear, helpful, encouraging answers.
- If the user asks how to do something, give specific step-by-step instructions based on the real website features.
- If the user wants to navigate to a page (e.g. "Take me to Voice Rooms", "Open dashboard", "Settings", "Mujhe voice room kholna hai"), clearly tell them you are navigating there and specify the target module.
- Understand English, Hindi, and Hinglish naturally. If the user writes in Hindi/Hinglish, reply politely in Hindi/Hinglish!
- Keep responses concise (2 to 4 sentences or formatted bullet points). Avoid fluff.
`.trim();

    const conversationHistoryText = history
      .slice(-6)
      .map((h) => `${h.sender === "user" ? "User" : "Nexora Copilot"}: ${h.text}`)
      .join("\n");

    const fullPrompt = `
${systemPrompt}

RECENT CONVERSATION:
${conversationHistoryText}

CURRENT USER MESSAGE:
"${trimmedMsg}"

REPLY AS NEXORA AI COPILOT:
`.trim();

    let reply = "";
    try {
      reply = await generateText(fullPrompt);
    } catch (apiErr) {
      logger.warn({ err: apiErr }, "Gemini generation failed for copilot, using fallback");
    }

    if (!reply || reply.length < 5) {
      const fallback = getLocalFallbackResponse(trimmedMsg, currentModule, userName, language);
      reply = fallback.reply;
    }

    // Suggested questions for next turns
    const suggestedQuestions = [
      "🎙️ Take me to Voice Rooms",
      "🗣️ How do I practice speaking with AI?",
      "📚 Explain my notes with AI Teacher",
      "📄 Help me compress a document",
    ];

    res.json({
      success: true,
      reply,
      navigateTo: detectedNav,
      suggestedQuestions,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Copilot endpoint error");
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
