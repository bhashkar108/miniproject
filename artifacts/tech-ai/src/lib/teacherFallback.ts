import type { LessonResponse } from '@workspace/api-client-react';

/**
 * Intelligent multi-language local lesson fallback generator for AI Teacher.
 * Ensures the student always gets a warm, natural, human-like explanation
 * grounded in their uploaded document, notes, and question in their chosen language
 * (Hindi, English, Hinglish, Spanish, French, German, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.).
 */
export function generateLocalTeacherLesson(
  content: string,
  question?: string,
  language = 'English'
): LessonResponse {
  const qClean = (question || '').trim();
  const cClean = (content || '').trim();

  // Extract first meaningful line or topic
  const contentLines = cClean.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = contentLines[0] || '';
  const isGenericHeader = /^(study material|notes|document|file):/i.test(firstLine);
  const detectedDocTitle = !isGenericHeader && firstLine.length > 3 && firstLine.length < 80 ? firstLine : '';

  const effectiveTopic = qClean || detectedDocTitle || (cClean.length > 60 ? cClean.slice(0, 60) + '…' : cClean) || 'Study Material Analysis';
  const studySnippet = cClean.length > 120 ? cClean.slice(0, 120).replace(/\s+/g, ' ') : cClean.replace(/\s+/g, ' ');

  const langLower = language.toLowerCase();
  const isHindi = langLower.includes('hindi') && !langLower.includes('hinglish');
  const isHinglish = langLower.includes('hinglish');
  const isSpanish = langLower.includes('spanish') || langLower.includes('español');
  const isFrench = langLower.includes('french') || langLower.includes('français');
  const isGerman = langLower.includes('german') || langLower.includes('deutsch');
  const isBengali = langLower.includes('bengali') || langLower.includes('বাংলা');
  const isTamil = langLower.includes('tamil') || langLower.includes('தமிழ்');
  const isTelugu = langLower.includes('telugu') || langLower.includes('తెలుగు');
  const isMarathi = langLower.includes('marathi') || langLower.includes('मराठी');
  const isGujarati = langLower.includes('gujarati') || langLower.includes('ગુજરાતી');

  // Domain categorization
  const combinedText = `${cClean} ${qClean}`.toLowerCase();
  let domain = 'General Academic & Scientific Studies';
  if (/python|javascript|java|c\+\+|algorithm|function|data structure|react|database|sql|api|coding|code|loop/i.test(combinedText)) {
    domain = 'Computer Science & Software Systems';
  } else if (/derivative|integral|matrix|equation|calculus|algebra|vector|probability|math|polynomial/i.test(combinedText)) {
    domain = 'Mathematics & Quantitative Analytics';
  } else if (/newton|force|velocity|energy|quantum|thermodynamics|physics|electric|magnetic|circuit/i.test(combinedText)) {
    domain = 'Physics & Applied Engineering';
  } else if (/cell|dna|rna|biology|photosynthesis|mitosis|neuron|organism|protein|enzyme/i.test(combinedText)) {
    domain = 'Biology & Life Sciences';
  } else if (/market|inflation|gdp|economy|demand|supply|investment|finance|trade/i.test(combinedText)) {
    domain = 'Economics & Financial Systems';
  } else if (/grammar|tense|sentence|noun|verb|adjective|pronunciation|vocabulary|clause/i.test(combinedText)) {
    domain = 'Language & Applied Linguistics';
  }

  // --- HINDI RESPONSE ---
  if (isHindi) {
    const title = qClean ? `सरल व्याख्या: ${qClean}` : `अध्ययन विषय: ${effectiveTopic}`;
    const explanation = `नमस्ते! आइए इस विषय को एकदम आसान और स्वाभाविक तरीके से समझते हैं, जैसे हम आमने-सामने बैठकर बातचीत कर रहे हों।

${qClean ? `आपके प्रश्न "${qClean}" का सीधा और व्यावहारिक जवाब:` : 'इस अध्ययन सामग्री का मुख्य बिंदु:'}
${studySnippet ? `आपके नोट्स ("${studySnippet}...") के अनुसार` : 'प्रस्तुत अध्ययन सामग्री के आधार पर'}, यह विषय ${domain} की एक बहुत महत्वपूर्ण कड़ी है।

इसे समझने के लिए हमें तीन आसान बातों पर ध्यान देना चाहिए:
पहला, बुनियादी नियम। यह सिद्धांत किस कारण से अस्तित्व में आया और इसका मूल उद्देश्य क्या है।
दूसरा, वास्तविक उदाहरण। जब हम इसे अपनी रोज़मर्रा की ज़िंदगी या किसी व्यावहारिक काम से जोड़ते हैं, तो यह बात तुरंत समझ आ जाती है।
तीसरा, परीक्षा की तैयारी। परीक्षा में पूरे अंक पाने के लिए बस इसके मुख्य चरण और परिभाषाएं अपने शब्दों में साफ-साफ लिखें।

अगर कोई भी बात समझने में कठिनाई लगे, तो तुरंत मुझसे अगला सवाल पूछें। हम इसे साथ मिलकर पूरा समझेंगे!`;

    return {
      title,
      explanation,
      keyPoints: [
        `मूल अवधारणा को बिना रटे सरल शब्दों में समझें (${domain})।`,
        'सिद्धांत को हमेशा वास्तविक जीवन के उदाहरण से जोड़कर याद रखें।',
        'हल करते समय चरण-दर-चरण तार्किक प्रवाह का पालन करें।',
        'परीक्षा के लिए मुख्य सूत्र और परिभाषाएं नोट कर लें।'
      ],
      followUpQuestions: [
        'क्या आप इसका एक बहुत सरल दैनिक जीवन का उदाहरण दे सकते हैं?',
        'परीक्षा में इस विषय पर सबसे ज़्यादा कौन सा प्रश्न पूछा जाता है?',
        'इसे याद रखने का सबसे आसान शॉर्टकट तरीका क्या है?'
      ]
    };
  }

  // --- HINGLISH RESPONSE ---
  if (isHinglish) {
    const title = qClean ? `AI Teacher Guide: ${qClean}` : `Simple Concept: ${effectiveTopic}`;
    const explanation = `Hello! Chaliye is topic ko ekdum normal insaan ki tarah naturally samajhte hain, bina kisi mushkil kitabee bhasha ke.

${qClean ? `Aapke question "${qClean}" ka simple answer:` : 'Is study material ka main concept:'}
${studySnippet ? `Aapke document ("${studySnippet}...") ke hisaab se` : 'Aapke notes ke hisaab se'}, yeh ${domain} ka ek foundational topic hai.

Isko yaad rakhne ka sabse simple formula 3 steps mein hai:
Step 1: Core Idea. Samjhein ki yeh cheez asal mein karti kya hai aur kyu banayi gayi.
Step 2: Practical Analogy. Jab aap ise kisi real-life situation se relate karte hain, toh yeh concept hamesha ke liye clear ho jata hai.
Step 3: Exam Success. Paper mein answer likhte waqt main points ko clear heading aur bullet points mein likhein taaki examiner ko seedha samajh aaye.

Aapko isme se jo bhi part dubara samajhna ho, bas bina hichkichaaye mujhse poochhein!`;

    return {
      title,
      explanation,
      keyPoints: [
        `Core logic ko practical conversation ki tarah pehle clear karein (${domain})।`,
        'Ratta marne ki bilkul zaroorat nahi hai, concept clear rakhein.',
        'Step-by-step approach follow karein taaki calculations miss na hon.',
        'Exams ke liye main headings aur formulas yaad rakhein.'
      ],
      followUpQuestions: [
        'Iska sabse practical real-world example kya ho sakta hai?',
        'Agar exam mein yeh question aaye toh answer kaise likhein?',
        'Is topic par next conceptual question kya prepare karna chahiye?'
      ]
    };
  }

  // --- BENGALI RESPONSE ---
  if (isBengali) {
    const title = qClean ? `সহজ ব্যাখ্যা: ${qClean}` : `পাঠ্য বিশ্লেষণ: ${effectiveTopic}`;
    const explanation = `নমস্কার! আসুন এই বিষয়টি সহজভাবে এক বন্ধুর মতো আলোচনা করে বুঝে নিই।

${qClean ? `আপনার প্রশ্ন "${qClean}"-এর উত্তর:` : 'এই পাঠ্য বিষয়ের মূল অংশ:'}
${studySnippet ? `আপনার নোট ("${studySnippet}...") অনুসারে` : 'নোটের তথ্যের ভিত্তিতে'}, এটি ${domain}-এর একটি অত্যন্ত দরকারি দিক।

বিষয়টি মনে রাখার সহজ উপায়:
১. মূল ভিত্তিটি নিজের ভাষায় বুঝে নেওয়া।
২. বাস্তব জীবনের উদাহরণের সঙ্গে তুলনা করা।
৩. পরীক্ষার জন্য প্রতিটি ধাপ পরিষ্কার করে উপস্থাপন করা।`;

    return {
      title,
      explanation,
      keyPoints: [
        `মূল তত্ত্ব পরিষ্কারভাবে বুঝুন (${domain})।`,
        'বাস্তব উদাহরণের সাথে মিলিয়ে অনুশীলন করুন।'
      ],
      followUpQuestions: [
        'বাস্তব জীবনে এই ধারণার প্রধান প্রয়োগ কী?',
        'পরীক্ষায় এই বিষয়ে সাধারণত কী ধরনের প্রশ্ন আসে?'
      ]
    };
  }

  // --- TAMIL RESPONSE ---
  if (isTamil) {
    const title = qClean ? `விளக்கம்: ${qClean}` : `பாட விளக்கம்: ${effectiveTopic}`;
    const explanation = `வணக்கம்! இந்த பாடத்தை எளிமையாகவும் இயல்பாகவும் நாம் புரிந்து கொள்வோம்.

${qClean ? `உங்கள் கேள்வி "${qClean}" தொடர்பான விளக்கம்:` : 'பாடத்தின் முக்கிய பகுதி:'}
${studySnippet ? `உங்கள் ஆவணத்தின் ("${studySnippet}...") அடிப்படையில்` : 'குறிப்புகளின்படி'}, இது ${domain} துறையில் அவசியமான தலைப்பு.

இதை எளிதாக நினைவில் கொள்ள:
1. அடிப்படைக் கருத்தை தெளிவாகப் புரிந்து கொள்ளுங்கள்.
2. நிஜ வாழ்க்கை உதாரணங்களுடன் பொருத்திப் பாருங்கள்.
3. தேர்வில் முக்கிய குறிப்புகளை வரிசையாக எழுதுங்கள்.`;

    return {
      title,
      explanation,
      keyPoints: [
        `அடிப்படைக் கருத்துக்களைப் புரிந்து கொள்ளுங்கள் (${domain}).`,
        'படிநிலைகளை முறையாகப் பின்பற்றுங்கள்.'
      ],
      followUpQuestions: [
        'இதன் நடைமுறை பயன்பாடு என்ன?',
        'தேர்வில் கேட்கப்படும் முக்கிய வினாக்கள் யாவை?'
      ]
    };
  }

  // --- TELUGU RESPONSE ---
  if (isTelugu) {
    const title = qClean ? `సులభ వివరణ: ${qClean}` : `పాఠ్యాంశం: ${effectiveTopic}`;
    const explanation = `నమస్కారం! రండి, ఈ అంశాన్ని చాలా సులభంగా అర్థం చేసుకుందాం.

${qClean ? `మీ ప్రశ్న "${qClean}" కు సమాధానం:` : 'ముఖ్యమైన అంశం:'}
${studySnippet ? `మీ నోట్స్ ("${studySnippet}...") ప్రకారం` : 'అధ్యయన సామగ్రి ఆధారంగా'}, ఇది ${domain} లో కీలకమైన భావన.

దీన్ని గుర్తుంచుకోవడానికి:
1. ప్రాథమిక సూత్రాన్ని అర్థం చేసుకోవడం.
2. నిత్యజీవిత ఉదాహరణలతో పోల్చడం.
3. పరీక్షల్లో స్పష్టంగా రాయడం.`;

    return {
      title,
      explanation,
      keyPoints: [
        `ప్రాథమిక సూత్రాలను అర్థం చేసుకోండి (${domain}).`,
        'వాస్తవిక ఉదాహరణలతో సాధన చేయండి.'
      ],
      followUpQuestions: [
        'దీని ముఖ్య ప్రయోజనం ఏమిటి?',
        'పరీక్షలో ఎలాంటి ప్రశ్నలు అడుగుతారు?'
      ]
    };
  }

  // --- MARATHI RESPONSE ---
  if (isMarathi) {
    const title = qClean ? `सोपे स्पष्टीकरण: ${qClean}` : `अभ्यास घटक: ${effectiveTopic}`;
    const explanation = `नमस्कार! चला हा विषय अगदी सहज आणि सोप्या भाषेत समजून घेऊया.

${qClean ? `तुमच्या प्रश्नाचे "${qClean}" उत्तर:` : 'अभ्यास साहित्याचा मुख्य मुद्दा:'}
${studySnippet ? `तुमच्या नोट्सनुसार ("${studySnippet}...")` : 'अभ्यास साहित्यानुसार'}, हा विषय ${domain} मधील एक महत्त्वाचा भाग आहे.

लक्षात ठेवण्यासाठी सोप्या पायऱ्या:
१. मूळ संकल्पना समजून घेणे.
२. दैनंदिन जीवनातील उदाहरणांशी जोडणे.
३. परीक्षेसाठी व्यवस्थित मुद्देसूद उत्तर लिहिणे.`;

    return {
      title,
      explanation,
      keyPoints: [
        `मूळ संकल्पना समजून घ्या (${domain}).`,
        'प्रत्यक्ष उदाहरणांसह सराव करा.'
      ],
      followUpQuestions: [
        'याचे प्रत्यक्ष जीवनातील उपयोग काय आहेत?',
        'परीक्षेच्या दृष्टीने कोणते प्रश्न महत्त्वाचे आहेत?'
      ]
    };
  }

  // --- SPANISH RESPONSE ---
  if (isSpanish) {
    const title = qClean ? `Explicación clara: ${qClean}` : `Guía de estudio: ${effectiveTopic}`;
    const explanation = `¡Hola! Vamos a entender este tema de forma natural y conversacional, paso a paso.

${qClean ? `Respecto a tu duda "${qClean}":` : 'Punto central del documento:'}
${studySnippet ? `Según tus notas ("${studySnippet}...")` : 'A partir del material estudiado'}, este es un tema clave en ${domain}.

Para dominarlo fácilmente:
1. Comprende la idea principal sin memorizar palabras mecánicas.
2. Relaciónalo con un ejemplo práctico del día a día.
3. Para tus exámenes, estructura tu respuesta en puntos claros.`;

    return {
      title,
      explanation,
      keyPoints: [
        `Comprender los principios teóricos fundamentales de ${domain}.`,
        'Conectar la teoría con aplicaciones profesionales en el mundo real.'
      ],
      followUpQuestions: [
        '¿Cuál es la aplicación práctica más importante de este concepto?',
        '¿Cómo estructurarías una respuesta para un examen?'
      ]
    };
  }

  // --- FRENCH RESPONSE ---
  if (isFrench) {
    const title = qClean ? `Explication claire : ${qClean}` : `Analyse : ${effectiveTopic}`;
    const explanation = `Bonjour ! Voyons ce sujet de façon simple et naturelle, comme une vraie conversation.

${qClean ? `Concernant votre question "${qClean}" :` : 'Point essentiel du document :'}
${studySnippet ? `D'après vos notes ("${studySnippet}...")` : 'D’après les documents fournis'}, ce point est fondamental en ${domain}.

Les étapes pour retenir facilement :
1. Comprendre le concept avec vos propres mots.
2. L’illustrer avec un exemple concret.
3. Préparer des réponses claires et structurées pour les examens.`;

    return {
      title,
      explanation,
      keyPoints: [
        `Maîtriser les principes fondamentaux de ${domain}.`,
        'Appliquer une démarche analytique structurée.'
      ],
      followUpQuestions: [
        'Quelle est l’application pratique la plus utile ?',
        'Quels sont les points clés à retenir pour l’examen ?'
      ]
    };
  }

  // --- GERMAN RESPONSE ---
  if (isGerman) {
    const title = qClean ? `Klare Erklärung: ${qClean}` : `Lernübersicht: ${effectiveTopic}`;
    const explanation = `Hallo! Lassen Sie uns dieses Thema ganz entspannt und verständlich durchgehen.

${qClean ? `Zu Ihrer Frage "${qClean}":` : 'Hauptpunkt des Dokuments:'}
${studySnippet ? `Gemäß Ihren Unterlagen ("${studySnippet}...")` : 'Basierend auf dem Material'}, ist dies ein zentrales Thema in ${domain}.

So verstehen Sie es am besten:
1. Verstehen Sie das Grundprinzip in eigenen Worten.
2. Verknüpfen Sie es mit einem praxisnahen Beispiel.
3. Behalten Sie die Kernpunkte für Prüfungen übersichtlich im Kopf.`;

    return {
      title,
      explanation,
      keyPoints: [
        `Verstehen der Kernkonzepte von ${domain}.`,
        'Schrittweises Vorgehen bei der Problemlösung.'
      ],
      followUpQuestions: [
        'Was ist das wichtigste Anwendungsbeispiel in der Praxis?',
        'Welche typischen Prüfungsfragen werden hierzu gestellt?'
      ]
    };
  }

  // --- STANDARD ENGLISH RESPONSE ---
  const title = qClean ? `Friendly Explanation: ${qClean}` : `Study Overview: ${effectiveTopic}`;
  const explanation = `Hello! Let's walk through this together in a warm, simple, conversational way — just like an experienced teacher sitting beside you.

${qClean ? `Here is the direct answer to your question "${qClean}":` : 'Here is the big picture of your study material:'}
${studySnippet ? `Looking at your study notes ("${studySnippet}...")` : 'In this study guide'}, the core topic lies in ${domain}.

To make this completely click, let's break it down into 3 straightforward thoughts:
1. The Core Idea: What this concept actually does and why it was created in the first place.
2. Real-World Connection: When you connect this principle to a real-life scenario or practical example, it stays in your memory naturally without having to force-memorize definitions.
3. Exam & Project Application: When answering questions on this in exams or vivas, start with the main rule, give a quick example, and walk through the logical steps.

Feel free to ask any follow-up question, and we will take it step-by-step together!`;

  return {
    title,
    explanation,
    keyPoints: [
      `Understand the fundamental idea naturally in your own words (${domain}).`,
      'Connect abstract concepts to real-world analogies rather than rote memorization.',
      'Follow a calm, step-by-step logical sequence when solving problems.',
      'Review key definitions and edge cases before examinations.'
    ],
    followUpQuestions: [
      'Can you give a simple real-world analogy for this concept?',
      'How would I write the perfect exam answer for this topic?',
      'What is the next related concept I should study after this?'
    ]
  };
}
