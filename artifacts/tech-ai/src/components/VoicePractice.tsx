import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, Sparkles, Copy,
  Play, Pause, Repeat, X, ArrowRight
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

interface LevelReplies {
  Beginner: string;
  Intermediate: string;
  Advanced: string;
}

// Multi-language dataset with authentic greetings, topics, and replies
const LANGUAGE_DATA: Record<string, {
  name: string;
  flag: string;
  code: string;
  starter: string;
  initialQuestion: string;
  topics: Record<string, string>;
  suggestionsByKeyword: Record<string, LevelReplies>;
  aiReplies: Record<string, LevelReplies>;
  defaultReplies: LevelReplies;
}> = {
  'en-US': {
    name: 'English (US)',
    flag: '🇺🇸',
    code: 'en-US',
    starter: "Hello! 👋 Welcome to your speaking practice session. Let's talk about your day.\n\nQuestion: What do you usually like to do in your free time?",
    initialQuestion: 'What do you usually like to do in your free time?',
    topics: {
      'Daily life': "Let's talk about daily life! What is your favorite time of the day and why?",
      'College & studies': "Awesome, let's focus on college & studies! What is your major, and what project are you working on?",
      'Hobbies & sports': "Great choice! What hobby or sport brings you the most joy when you have free time?",
      'Travel & culture': "Travel is exciting! If you could travel to any place in the world tomorrow, where would you go?",
      'Job interviews': "Interview practice mode: Can you introduce yourself and tell me why you chose your field of study?",
      'Technology & AI': "Tech & AI: What exciting technology or tool do you use most frequently every day?",
      'Food & cooking': "Food is a wonderful topic! What is your favorite dish to eat or cook?",
      'Friendship & family': "Let's talk about people close to you: What quality do you value most in a true friend?"
    },
    suggestionsByKeyword: {
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
      'tech': {
        Beginner: 'I like using computers and AI.',
        Intermediate: 'I enjoy exploring programming languages and using AI to speed up my learning.',
        Advanced: 'I am deeply fascinated by how modern software frameworks and artificial intelligence are revolutionizing problem-solving.'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'That sounds like a lot of fun! Who do you usually play sports with?',
        Intermediate: 'Sports are wonderful for fitness and teamwork. How often do you play, and what role do you enjoy most?',
        Advanced: 'Engaging in sports cultivates discipline and strategic thinking. In your view, how does playing sports influence your daily focus?'
      },
      college: {
        Beginner: 'Nice! Which subject or class do you enjoy the most in your studies?',
        Intermediate: 'College gives you great opportunities. Which subject do you find most interesting, and why?',
        Advanced: 'Balancing academic rigor with practical skill development is key for modern students. What specific academic project has challenged you the most this year?'
      },
      day: {
        Beginner: "I'm glad to hear that! What was the best part of your day?",
        Intermediate: "That's wonderful to hear! Can you tell me about one interesting thing that happened today?",
        Advanced: 'Positive momentum makes a significant difference in productivity. What key goal or milestone did you focus on today?'
      },
      tech: {
        Beginner: 'Technology is so cool! What do you like making with computers?',
        Intermediate: "That's great! Working with technology opens up a lot of career paths. Which programming language or tool are you exploring currently?",
        Advanced: 'Artificial intelligence and software engineering are evolving rapidly. How do you envision AI shaping your target industry over the next five years?'
      }
    },
    defaultReplies: {
      Beginner: 'I like learning and speaking English every day.',
      Intermediate: 'I want to improve my spoken English so that I can communicate confidently in my career.',
      Advanced: 'Developing strong communication skills is essential for effective cross-cultural collaboration and career growth.'
    }
  },
  'hi-IN': {
    name: 'Hindi (हिन्दी)',
    flag: '🇮🇳',
    code: 'hi-IN',
    starter: "नमस्ते! 👋 आपके भाषा अभ्यास सत्र में आपका स्वागत है। चलिए आपके दिन के बारे में बात करते हैं।\n\nप्रश्न: आप अपने खाली समय में आमतौर पर क्या करना पसंद करते हैं?",
    initialQuestion: 'आप अपने खाली समय में आमतौर पर क्या करना पसंद करते हैं?',
    topics: {
      'Daily life': 'चलिए दैनिक जीवन के बारे में बात करते हैं! आपका दिन का सबसे पसंदीदा समय कौन सा है और क्यों?',
      'College & studies': 'कॉलेज और पढ़ाई: आप क्या पढ़ रहे हैं और आपका पसंदीदा विषय कौन सा है?',
      'Hobbies & sports': 'शौक और खेल: आपको खाली समय में कौन सा खेल या हॉबी सबसे ज्यादा पसंद है?',
      'Travel & culture': 'यात्रा और संस्कृति: यदि आपको कल किसी भी देश जाने का अवसर मिले, तो आप कहाँ जाना चाहेंगे?',
      'Job interviews': 'इंटरव्यू अभ्यास: कृपया अपना परिचय दें और अपनी मुख्य ताकत बताएं।',
      'Technology & AI': 'टेक्नोलॉजी और AI: आप अपने दैनिक जीवन में किस आधुनिक तकनीक या ऐप का सबसे अधिक उपयोग करते हैं?',
      'Food & cooking': 'भोजन: आपका सबसे पसंदीदा व्यंजन कौन सा है?',
      'Friendship & family': 'दोस्ती: आप अपने सबसे अच्छे दोस्त में कौन सा गुण सबसे महत्वपूर्ण मानते हैं?'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'मुझे खाली समय में क्रिकेट खेलना पसंद है।',
        Intermediate: 'खाली समय में मुझे दोस्तों के साथ क्रिकेट खेलना पसंद है क्योंकि इससे मैं एक्टिव रहता हूँ।',
        Advanced: 'खाली समय में मैं खेल और रचनात्मक गतिविधियों में संलग्न रहता हूँ, जिससे मेरा मानसिक और शारीरिक विकास होता है।'
      },
      'cricket': {
        Beginner: 'मैं हर रविवार क्रिकेट खेलता हूँ।',
        Intermediate: 'क्रिकेट मेरा पसंदीदा खेल है क्योंकि यह हमें टीमवर्क और अनुशासन सिखाता है।',
        Advanced: 'खेलकूद न केवल शारीरिक ऊर्जा को संतुलित रखता है बल्कि रणनीतिक सोच को भी विकसित करता है।'
      },
      'college': {
        Beginner: 'मैं कॉलेज में इंजीनियरिंग की पढ़ाई करता हूँ।',
        Intermediate: 'मैं कॉलेज में पढ़ रहा हूँ और नई तकनीकी स्किल्स सीख रहा हूँ।',
        Advanced: 'मैं कॉलेज में मुख्य तकनीकी सिद्धांतों को व्यावहारिक परियोजनाओं के साथ जोड़ने पर ध्यान केंद्रित कर रहा हूँ।'
      },
      'day': {
        Beginner: 'मेरा दिन बहुत अच्छा और सुखद रहा।',
        Intermediate: 'मेरा दिन काफी उपयोगी रहा क्योंकि मैंने अपनी कक्षाएं पूरी कीं और नए काम सीखे।',
        Advanced: 'आज का दिन बहुत संतोषजनक रहा; मैंने अध्ययन और व्यक्तिगत लक्ष्यों के बीच अच्छा संतुलन बनाए रखा।'
      },
      'tech': {
        Beginner: 'मुझे कंप्यूटर और कोडिंग पसंद है।',
        Intermediate: 'मुझे नई प्रोग्रामिंग भाषाएं सीखना और AI टूल्स का उपयोग करना बहुत पसंद है।',
        Advanced: 'आधुनिक सॉफ्टवेयर तकनीक और आर्टिफिशियल इंटेलिजेंस जटिल समस्याओं को हल करने का सबसे शक्तिशाली माध्यम हैं।'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'यह तो बहुत अच्छी बात है! आप किसके साथ खेलना पसंद करते हैं?',
        Intermediate: 'खेल स्वास्थ्य और टीम भावना दोनों के लिए बेहतरीन हैं। आप इसे कितनी बार खेलते हैं?',
        Advanced: 'खेलों में भाग लेना अनुशासन और नेतृत्व को निखारता है। खेल आपके दैनिक जीवन को कैसे प्रेरित करता है?'
      },
      college: {
        Beginner: 'बहुत बढ़िया! पढ़ाई में आपका सबसे पसंदीदा विषय कौन सा है?',
        Intermediate: 'कॉलेज में कई नए अवसर मिलते हैं। आपको किस विषय का अध्ययन सबसे ज्यादा रोचक लगता है?',
        Advanced: 'अकादमिक ज्ञान को व्यावहारिक अनुभव के साथ जोड़ना बहुत जरूरी है। इस वर्ष आपने किस खास प्रोजेक्ट पर काम किया है?'
      },
      day: {
        Beginner: 'यह सुनकर खुशी हुई! आज आपके दिन का सबसे अच्छा हिस्सा क्या था?',
        Intermediate: 'बहुत खूब! क्या आप आज की किसी दिलचस्प घटना के बारे में बता सकते हैं?',
        Advanced: 'सकारात्मक दृष्टिकोण सफलता की कुंजी है। आज आपने किस महत्वपूर्ण लक्ष्य पर ध्यान केंद्रित किया?'
      },
      tech: {
        Beginner: 'तकनीक वाकई बहुत शानदार है! आप कंप्यूटर पर क्या बनाना चाहते हैं?',
        Intermediate: 'तकनीक से कई रास्ते खुलते हैं। आप आजकल कौन सी प्रोग्रामिंग भाषा या टूल सीख रहे हैं?',
        Advanced: 'आर्टिफिशियल इंटेलिजेंस तेजी से दुनिया बदल रहा है। आपके अनुसार अगले पांच वर्षों में यह आपके क्षेत्र को कैसे बदलेगा?'
      }
    },
    defaultReplies: {
      Beginner: 'मुझे हर रोज नई चीजें सीखना और बोलना पसंद है।',
      Intermediate: 'मैं अपने बोलने के कौशल को बेहतर बनाना चाहता हूँ ताकि आत्मविश्वास के साथ संवाद कर सकूँ।',
      Advanced: 'स्पष्ट और प्रभावशाली संचार कौशल किसी भी करियर और व्यक्तित्व विकास के लिए अत्यंत अनिवार्य है।'
    }
  },
  'es-ES': {
    name: 'Spanish (Español)',
    flag: '🇪🇸',
    code: 'es-ES',
    starter: "¡Hola! 👋 Bienvenido a tu sesión de práctica. Hablemos de tu día.\n\nPregunta: ¿Qué te gusta hacer usualmente en tu tiempo libre?",
    initialQuestion: '¿Qué te gusta hacer usualmente en tu tiempo libre?',
    topics: {
      'Daily life': '¡Hablemos de la vida diaria! ¿Cuál es tu momento favorito del día y por qué?',
      'College & studies': 'Estudios y universidad: ¿Cuál es tu materia favorita y por qué?',
      'Hobbies & sports': 'Pasatiempos y deportes: ¿Qué actividad disfrutas más en tu tiempo libre?',
      'Travel & culture': 'Viajes y cultura: Si pudieras viajar a cualquier lugar mañana, ¿adónde irías?',
      'Job interviews': 'Práctica de entrevista: ¿Puedes presentarte y explicar tus fortalezas?',
      'Technology & AI': 'Tecnología e IA: ¿Qué herramienta digital utilizas más cada día?',
      'Food & cooking': 'Comida: ¿Cuál es tu plato favorito para comer o cocinar?',
      'Friendship & family': 'Amistad: ¿Qué cualidad valoras más en un verdadero amigo?'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'En mi tiempo libre me gusta jugar al fútbol.',
        Intermediate: 'En mi tiempo libre disfruto jugar con mis amigos porque me mantiene activo.',
        Advanced: 'Durante mi tiempo libre participo en deportes que fomentan la disciplina y el trabajo en equipo.'
      },
      'cricket': {
        Beginner: 'Juego deportes todos los fines de semana.',
        Intermediate: 'Hacer deporte es fundamental para mantenerme saludable y concentrado.',
        Advanced: 'La práctica deportiva regular equilibra el bienestar físico y el rendimiento intelectual.'
      },
      'college': {
        Beginner: 'Estudio ingeniería en la universidad.',
        Intermediate: 'Estoy estudiando en la universidad y desarrollando nuevas habilidades técnicas.',
        Advanced: 'Como estudiante universitario, me concentro en aplicar la teoría a proyectos prácticos de ingeniería.'
      },
      'day': {
        Beginner: 'Mi día fue muy bueno y productivo.',
        Intermediate: 'Tuve un día muy productivo asistiendo a clases y completando tareas.',
        Advanced: 'Ha sido un día enriquecedor en el que equilibré mis responsabilidades académicas con proyectos personales.'
      },
      'tech': {
        Beginner: 'Me gusta la tecnología y las computadoras.',
        Intermediate: 'Me apasiona aprender nuevos lenguajes de programación y herramientas de inteligencia artificial.',
        Advanced: 'La inteligencia artificial y el desarrollo de software ofrecen soluciones transformadoras para problemas globales.'
      }
    },
    aiReplies: {
      sport: {
        Beginner: '¡Qué divertido! ¿Con quién juegas habitualmente?',
        Intermediate: 'El deporte es genial para la salud. ¿Con qué frecuencia lo practicas?',
        Advanced: 'El deporte fortalece la resiliencia mental. ¿Cómo influye en tu disciplina cotidiana?'
      },
      college: {
        Beginner: '¡Muy bien! ¿Qué asignatura te gusta más?',
        Intermediate: 'La universidad ofrece muchas oportunidades. ¿Qué tema encuentras más interesante y por qué?',
        Advanced: 'El rigor académico es clave. ¿Qué desafío importante has enfrentado en tus estudios este año?'
      },
      day: {
        Beginner: '¡Me alegro mucho! ¿Cuál fue el mejor momento de tu día?',
        Intermediate: '¡Excelente! ¿Puedes contarme algo interesante que hayas aprendido hoy?',
        Advanced: 'Mantener un enfoque positivo impulsa los resultados. ¿Qué objetivo alcanzaste hoy?'
      },
      tech: {
        Beginner: '¡La tecnología es increíble! ¿Qué te gusta programar?',
        Intermediate: 'Aprender tecnología abre muchas puertas. ¿Qué herramienta estás explorando ahora?',
        Advanced: 'La IA está revolucionando las industrias. ¿Cómo crees que impactará tu carrera a futuro?'
      }
    },
    defaultReplies: {
      Beginner: 'Me gusta practicar y aprender todos los días.',
      Intermediate: 'Quiero mejorar mi fluidez para comunicarme con confianza en mi profesión.',
      Advanced: 'Desarrollar una comunicación clara y persuasiva es indispensable para el éxito profesional.'
    }
  },
  'fr-FR': {
    name: 'French (Français)',
    flag: '🇫🇷',
    code: 'fr-FR',
    starter: "Bonjour ! 👋 Bienvenue dans votre séance de pratique. Parlons de votre journée.\n\nQuestion : Qu'aimez-vous faire habituellement pendant votre temps libre ?",
    initialQuestion: "Qu'aimez-vous faire habituellement pendant votre temps libre ?",
    topics: {
      'Daily life': 'Parlons du quotidien ! Quel est votre moment préféré de la journée et pourquoi ?',
      'College & studies': 'Études et université : Quelle est votre matière préférée et pourquoi ?',
      'Hobbies & sports': 'Loisirs et sports : Quelle activité vous apporte le plus de plaisir ?',
      'Travel & culture': 'Voyages et culture : Si vous pouviez visiter n\'importe quel pays demain, où iriez-vous ?',
      'Job interviews': 'Entretien professionnel : Pouvez-vous vous présenter et expliquer vos compétences clés ?',
      'Technology & AI': 'Technologie et IA : Quel outil numérique utilisez-vous le plus chaque jour ?',
      'Food & cooking': 'Cuisine : Quel est votre plat préféré à préparer ou déguster ?',
      'Friendship & family': 'Amitié : Quelle valeur appréciez-vous le plus chez un ami fidèle ?'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'Pendant mon temps libre, j\'aime faire du sport.',
        Intermediate: 'Pendant mon temps libre, j\'aime jouer avec mes amis car cela me garde en forme.',
        Advanced: 'Durant mes moments de loisir, je m\'adonne au sport afin de développer ma discipline et mon esprit d\'équipe.'
      },
      'cricket': {
        Beginner: 'Je fais du sport tous les dimanches.',
        Intermediate: 'Le sport est essentiel pour mon bien-être physique et ma concentration.',
        Advanced: 'La pratique sportive régulière permet d\'harmoniser forme physique et rigueur intellectuelle.'
      },
      'college': {
        Beginner: 'J\'étudie l\'informatique à l\'université.',
        Intermediate: 'Je poursuis mes études à l\'université tout en développant de nouvelles compétences techniques.',
        Advanced: 'En tant qu\'étudiant, je m\'efforce d\'allier les concepts théoriques à des applications concrètes d\'ingénierie.'
      },
      'day': {
        Beginner: 'Ma journée a été très agréable et productive.',
        Intermediate: 'J\'ai passé une journée productive en assistant à mes cours et en avançant sur mes projets.',
        Advanced: 'Ce fut une journée très enrichissante, réussissant à équilibrer obligations académiques et initiatives personnelles.'
      },
      'tech': {
        Beginner: 'J\'aime la technologie et l\'informatique.',
        Intermediate: 'J\'aime explorer de nouveaux langages de programmation et exploiter l\'intelligence artificielle.',
        Advanced: 'L\'intelligence artificielle moderne et le développement logiciel représentent des leviers majeurs d\'innovation.'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'C\'est formidable ! Avec qui faites-vous du sport d\'habitude ?',
        Intermediate: 'Le sport est excellent pour la santé. À quelle fréquence vous entraînez-vous ?',
        Advanced: 'L\'activité sportive forge le caractère. Comment cela influence-t-il votre concentration au quotidien ?'
      },
      college: {
        Beginner: 'Très bien ! Quelle est la matière que vous préférez ?',
        Intermediate: 'L\'université offre beaucoup d\'opportunités. Quel sujet trouvez-vous le plus stimulant ?',
        Advanced: 'La rigueur académique est primordiale. Quel projet marquant avez-vous réalisé cette année ?'
      },
      day: {
        Beginner: 'Ravi de l\'entendre ! Quel a été le meilleur moment de votre journée ?',
        Intermediate: 'C\'est une excellente nouvelle ! Pouvez-vous me partager un apprentissage clé de votre journée ?',
        Advanced: 'Garder une dynamique positive est essentiel. Quel objectif majeur avez-vous accompli aujourd\'hui ?'
      },
      tech: {
        Beginner: 'La technologie est fascinante ! Que développez-vous avec un ordinateur ?',
        Intermediate: 'Travailler dans la tech ouvre des perspectives. Quel outil explorez-vous actuellement ?',
        Advanced: 'L\'IA transforme le paysage économique. Comment envisagez-vous son impact dans votre secteur d\'ici 5 ans ?'
      }
    },
    defaultReplies: {
      Beginner: 'J\'aime pratiquer et apprendre chaque jour.',
      Intermediate: 'Je souhaite perfectionner mon expression orale pour communiquer avec aisance professionnelle.',
      Advanced: 'Maîtriser une communication claire et percutante est indispensable pour réussir dans un environnement globalisé.'
    }
  },
  'bn-IN': {
    name: 'Bengali (বাংলা)',
    flag: '🇮🇳',
    code: 'bn-IN',
    starter: "হ্যালো! 👋 আপনার অনুশীলন সেশনে স্বাগতম। চলুন আপনার দিনটি কেমন কাটছে তা নিয়ে কথা বলি।\n\nপ্রশ্ন: আপনি সাধারণত আপনার অবসর সময়ে কী করতে পছন্দ করেন?",
    initialQuestion: 'আপনি সাধারণত আপনার অবসর সময়ে কী করতে পছন্দ করেন?',
    topics: {
      'Daily life': 'চলুন দৈনন্দিন জীবন নিয়ে কথা বলি! আপনার দিনের প্রিয় সময় কোনটি এবং কেন?',
      'College & studies': 'কলেজ ও পড়াশোনা: আপনার প্রিয় বিষয় কোনটি এবং কেন?',
      'Hobbies & sports': 'শখ ও খেলাধুলা: অবসর সময়ে কোন খেলাটি আপনি সবচেয়ে বেশি উপভোগ করেন?',
      'Travel & culture': 'ভ্রমণ ও সংস্কৃতি: আপনি যদি আগামীকাল যেকোনো স্থানে যেতে পারেন, তবে কোথায় যেতে চাইবেন?'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'আমার অবসর সময়ে আমি ক্রিকেট খেলতে পছন্দ করি।',
        Intermediate: 'অবসর সময়ে আমি বন্ধুদের সাথে ক্রিকেট খেলি কারণ এটি আমাকে সক্রিয় রাখে।',
        Advanced: 'আমার অবসর সময়ে আমি খেলাধুলায় অংশ নিই যা আমাকে শারীরিক ও মানসিকভাবে চনমনে রাখে।'
      },
      'cricket': {
        Beginner: 'আমি প্রতি রবিবার সকালে ক্রিকেট খেলি।',
        Intermediate: 'ক্রিকেট আমার প্রিয় খেলা কারণ এটি দলগত কাজের গুরুত্ব শেখায়।',
        Advanced: 'খেলাধুলা আমাদের শারীরিক ও মানসিক সহনশীলতা বৃদ্ধি করতে সাহায্য করে।'
      },
      'college': {
        Beginner: 'আমি কলেজে ইঞ্জিনিয়ারিং পড়ি।',
        Intermediate: 'আমি কলেজে নতুন প্রযুক্তি ও দক্ষতা অর্জন করছি।',
        Advanced: 'আমি তাত্ত্বিক জ্ঞানকে বাস্তবসম্মত প্রজেক্টে রূপান্তর করার উপর গুরুত্ব দিচ্ছি।'
      },
      'day': {
        Beginner: 'আমার দিনটি খুব ভালো এবং উৎপাদনশীল কেটেছে।',
        Intermediate: 'আজকের দিনটি ভালো ছিল কারণ আমি আমার ক্লাসগুলো সম্পন্ন করেছি।',
        Advanced: 'আজকের দিনটি অত্যন্ত ফলপ্রসূ ছিল এবং আমি আমার নির্ধারিত লক্ষ্য পূরণ করেছি।'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'খুব চমৎকার! আপনি কার সাথে খেলাধুলা করেন?',
        Intermediate: 'খেলাধুলা স্বাস্থ্যের জন্য খুব উপকারী। আপনি কত ঘন ঘন খেলেন?',
        Advanced: 'খেলাধুলা জীবনের শৃঙ্খলা গড়ে তোলে। এটি আপনার পড়াশোনায় কীভাবে সহায়তা করে?'
      },
      college: {
        Beginner: 'বেশ ভালো! কোন বিষয়টি আপনার সবচেয়ে প্রিয়?',
        Intermediate: 'কলেজের পড়াশোনায় কোন অংশটি আপনি সবচেয়ে উপভোগ করেন?',
        Advanced: 'ব্যবহারিক জ্ঞান অর্জন করা জরুরি। এ বছর আপনি কোন বিশেষ প্রকল্পে কাজ করেছেন?'
      },
      day: {
        Beginner: 'শুনে ভালো লাগলো! আজকের সবচেয়ে আনন্দের মুহূর্ত কোনটি ছিল?',
        Intermediate: 'খুব ভালো! আজকের দিনের কোনো শিক্ষণীয় অভিজ্ঞতা শেয়ার করবেন কি?',
        Advanced: 'নিয়মানুবর্তিতা সাফল্যের চাবিকাঠি। আজ আপনি কোন গুরুত্বপূর্ণ কাজটি সমাপ্ত করেছেন?'
      }
    },
    defaultReplies: {
      Beginner: 'আমি প্রতিদিন নতুন কিছু শিখতে পছন্দ করি।',
      Intermediate: 'আমি আমার কথা বলার দক্ষতা বৃদ্ধি করতে চাই যাতে আত্মবিশ্বাসের সাথে কথা বলতে পারি।',
      Advanced: 'সাবলীল যোগাযোগ দক্ষতা যে কোনো পেশাগত ক্ষেত্রে সাফল্যের প্রধান চাবিকাঠি।'
    }
  },
  'de-DE': {
    name: 'German (Deutsch)',
    flag: '🇩🇪',
    code: 'de-DE',
    starter: "Hallo! 👋 Willkommen zu deiner Sprechpraxis. Lass uns über deinen Tag sprechen.\n\nFrage: Was machst du normalerweise gerne in deiner Freizeit?",
    initialQuestion: 'Was machst du normalerweise gerne in deiner Freizeit?',
    topics: {
      'Daily life': 'Lass uns über den Alltag sprechen! Was ist deine liebste Tageszeit und warum?',
      'College & studies': 'Studium & Bildung: Welches Fach interessiert dich am meisten?',
      'Hobbies & sports': 'Hobbys & Sport: Welche Sportart oder welches Hobby macht dir am meisten Spaß?',
      'Technology & AI': 'Technologie & KI: Welche digitale Technologie nutzt du jeden Tag?'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'In meiner Freizeit spiele ich gerne Fußball.',
        Intermediate: 'In meiner Freizeit mache ich Sport, weil es mich fit und motiviert hält.',
        Advanced: 'In meiner Freizeit widme ich mich sportlichen und intellektuellen Aktivitäten zur persönlichen Weiterentwicklung.'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'Das klingt super! Mit wem spielst du am liebsten?',
        Intermediate: 'Sport ist fantastisch für die Gesundheit. Wie oft trainierst du in der Woche?',
        Advanced: 'Sportliche Aktivität fördert Disziplin und mentale Stärke. Welche Werte schätzt du daran am meisten?'
      }
    },
    defaultReplies: {
      Beginner: 'Ich lerne und übe jeden Tag Deutsch.',
      Intermediate: 'Ich möchte meine Sprechfertigkeit verbessern, um mich im Beruf sicher zu verständigen.',
      Advanced: 'Eine fundierte und überzeugende Kommunikation ist für meine akademische und berufliche Laufbahn unerlässlich.'
    }
  },
  'ja-JP': {
    name: 'Japanese (日本語)',
    flag: '🇯🇵',
    code: 'ja-JP',
    starter: "こんにちは！👋 スピーキング練習へようこそ。今日の一日について話しましょう。\n\n質問: 自由な時間には普段何をしますか？",
    initialQuestion: '自由な時間には普段何をしますか？',
    topics: {
      'Daily life': '日常生活について話しましょう！一日のうちで一番好きな時間はいつですか？',
      'College & studies': '学業について: 一番興味のある勉強や専攻は何ですか？',
      'Hobbies & sports': '趣味とスポーツ: 普段どんな趣味を楽しんでいますか？',
      'Technology & AI': 'テクノロジーとAI: 毎日使っている便利なアプリや技術は何ですか？'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: '自由な時間には本を読んだり散歩をします。',
        Intermediate: '自由な時間には友達とスポーツをしてリフレッシュしています。',
        Advanced: '余暇の時間には自己研鑽や運動を通じて、心身の健康と成長を意識して過ごしています。'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'とても楽しそうですね！誰と一緒に楽しんでいますか？',
        Intermediate: '運動は心身の健康に素晴らしいですね。普段どのくらいの頻度で運動しますか？',
        Advanced: 'スポーツは規律と協調性を育みます。あなたの日常生活にどのような好影響を与えていますか？'
      }
    },
    defaultReplies: {
      Beginner: '毎日楽しく会話の練習をしています。',
      Intermediate: '自分の考えを自信を持って表現できるようにスピーキング力を高めたいです。',
      Advanced: '明確で説得力のあるコミュニケーション能力は、グローバル社会において極めて重要だと考えています。'
    }
  },
  'zh-CN': {
    name: 'Chinese (中文)',
    flag: '🇨🇳',
    code: 'zh-CN',
    starter: "你好！👋 欢迎来到语言口语练习。让我们聊聊你的一天。\n\n问题：你在空闲时间通常喜欢做什么？",
    initialQuestion: '你在空闲时间通常喜欢做什么？',
    topics: {
      'Daily life': '聊聊日常生活吧！你一天中最喜欢的时间是什么时候，为什么？',
      'College & studies': '学业与成长：你最感兴趣的学科或专业是什么？',
      'Hobbies & sports': '爱好与运动：闲暇时什么运动或爱好带给你最大的快乐？',
      'Technology & AI': '科技与人工智能：你每天最常用的人工智能或科技工具是什么？'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: '我在空闲时间喜欢跑步和听音乐。',
        Intermediate: '在空闲时间，我喜欢和朋友一起运动，这让我保持充沛的活力。',
        Advanced: '在闲暇时光中，我注重通过体育运动和阅读来全面提升个人的综合素质与专注力。'
      }
    },
    aiReplies: {
      sport: {
        Beginner: '听起来真棒！你平时通常和谁一起运动？',
        Intermediate: '运动对身心健康大有裨益。你一般每周锻炼几次？',
        Advanced: '体育锻炼不仅能磨练意志，还能培养团队协作精神。这对你的学习和生活有哪些启发？'
      }
    },
    defaultReplies: {
      Beginner: '我喜欢每天练习并提高口语表达。',
      Intermediate: '我希望通过持续的口语练习，在未来的学习和职场中更加自信地交流。',
      Advanced: '流利、精准且富有洞察力的沟通能力是现代跨学科与国际化合作中至关重要的核心素养。'
    }
  },
  'ar-SA': {
    name: 'Arabic (العربية)',
    flag: '🇸🇦',
    code: 'ar-SA',
    starter: "مرحباً! 👋 أهلاً بك في جلسة الممارسة الصوتية. فلنتحدث عن يومك.\n\nسؤال: ماذا تحب أن تفعل عادة في وقت فراغك؟",
    initialQuestion: 'ماذا تحب أن تفعل عادة في وقت فراغك؟',
    topics: {
      'Daily life': 'لنتحدث عن الحياة اليومية! ما هو أفضل وقت في اليوم بالنسبة لك ولماذا؟',
      'College & studies': 'الدراسة والجامعة: ما هو تخصصك الأكاديمي وما الموضوع الذي يثير اهتمامك أكثر؟',
      'Hobbies & sports': 'الهوايات والرياضة: ما هي الهواية التي تستمتع بها أكثر؟',
      'Technology & AI': 'التكنولوجيا والذكاء الاصطناعي: ما هي الأداة الرقمية التي تستخدمها يومياً؟'
    },
    suggestionsByKeyword: {
      'free time': {
        Beginner: 'في وقت فراغي أحب قراءة الكتب وممارسة الرياضة.',
        Intermediate: 'في وقت فراغي أستمتع بممارسة الرياضة مع أصدقائي لأنها تمنحني طاقة إيجابية.',
        Advanced: 'خلال أوقات فراغي، أحرص على ممارسة الأنشطة الفكرية والبدنية التي تعزز التطوير الذاتي.'
      }
    },
    aiReplies: {
      sport: {
        Beginner: 'هذا رائع جداً! مع من تمارس الرياضة عادة؟',
        Intermediate: 'الرياضة مفيدة جداً للصحة البدنية والتركيز الذهني. كم مرة تمارسها أسبوعياً؟',
        Advanced: 'الممارسة الرياضية المنتظمة تصقل الانضباط وتعزز روح الفريق. كيف تؤثر على مسارك اليومي؟'
      }
    },
    defaultReplies: {
      Beginner: 'أحب ممارسة التحدث وتطوير لغتي يومياً.',
      Intermediate: 'أرغب في تطوير مهارات المحادثة لدي حتى أتمكن من التواصل بثقة عالية.',
      Advanced: 'التواصل الفعال والواضح يعد ركيزة أساسية لتحقيق النجاح الأكاديمي والمهني.'
    }
  }
};

export function VoicePractice({ onProgress }: VoicePracticeProps) {
  // Practice states
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [autoVoice, setAutoVoice] = useState(true);
  const [listening, setListening] = useState(false);
  const [micMode, setMicMode] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [currentTopic, setCurrentTopic] = useState('Daily life');
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'paused' | 'stopped'>('idle');
  const [orbCaption, setOrbCaption] = useState('Tap the microphone or type a reply to start practising.');
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
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Active language dataset
  const activeLangConfig = LANGUAGE_DATA[practiceLang] || LANGUAGE_DATA['en-US'];

  // Current dynamic suggestions for all 3 levels (Beginner, Intermediate, Advanced)
  const [currentSuggestions, setCurrentSuggestions] = useState<LevelReplies>(
    activeLangConfig.suggestionsByKeyword['free time'] || activeLangConfig.defaultReplies
  );

  const [currentQuestion, setCurrentQuestion] = useState(activeLangConfig.initialQuestion);
  const [lastAIReply, setLastAIReply] = useState(activeLangConfig.initialQuestion);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: activeLangConfig.starter,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechAccumulatorRef = useRef<string>('');

  // Smooth auto-scroll function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
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

  // Smooth auto-scroll on messages or orb state changes
  useEffect(() => {
    scrollToBottom();
    const t = setTimeout(scrollToBottom, 80);
    return () => clearTimeout(t);
  }, [messages, orbState]);

  // Intelligent dynamic reply generator that produces 3 level-tailored replies for EVERY question
  const generateUniversalSuggestions = (questionText: string, langKey: string = practiceLang): LevelReplies => {
    const q = (questionText || '').toLowerCase();
    const isHindi = langKey.startsWith('hi');
    const isSpanish = langKey.startsWith('es');
    const isFrench = langKey.startsWith('fr');
    const isGerman = langKey.startsWith('de');
    const isJapanese = langKey.startsWith('ja');

    // 1. Food / Cooking / Dishes / Dining
    if (/food|dish|cook|eat|recipe|meal|lunch|dinner|breakfast|खाना|व्यंजन|पकाना|भोजन|comida|receta|manger|plat|essen|料理|食べ物/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मेरा पसंदीदा खाना दाल-चावल और पनीर है, जो मुझे बहुत स्वादिष्ट लगता है।',
          Intermediate: 'मुझे घर का बना पौष्टिक खाना पसंद है, विशेषकर जब वह पारंपरिक मसालों और ताजी सब्जियों से बना हो।',
          Advanced: 'व्यंजनों के मामले में, मैं विविध क्षेत्रीय स्वादों और पारंपरिक मसालों से युक्त संतुलित पौष्टिक आहार को अत्यधिक महत्व देता हूँ।'
        };
      }
      if (isSpanish) {
        return {
          Beginner: 'Mi comida favorita es la pasta y me gusta la comida casera.',
          Intermediate: 'Disfruto mucho de los platos tradicionales preparados con ingredientes frescos y especias aromáticas.',
          Advanced: 'Desde una perspectiva culinaria, valoro profundamente la gastronomía regional auténtica y la fusión de sabores.'
        };
      }
      return {
        Beginner: 'My favorite food is chicken biryani and I really enjoy fresh homemade meals.',
        Intermediate: 'I really love traditional homemade dishes, especially when prepared with aromatic spices and fresh ingredients.',
        Advanced: 'From a culinary standpoint, I have a deep appreciation for authentic regional cuisine and wholesome, balanced flavors.'
      };
    }

    // 2. Travel / Places / Cities / Countries / Tourism
    if (/travel|trip|place|city|country|visit|destination|holiday|vacation|घूमना|यात्रा|सफर|शहर|देश|viajar|viaje|voyager|voyage|reisen|旅行/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मुझे प्राकृतिक स्थलों और सुंदर पहाड़ों में घूमना बहुत पसंद है।',
          Intermediate: 'मेरा सपना है कि मैं ऐतिहासिक धरोहरों का भ्रमण कर स्थानीय संस्कृति और जीवनशैली को करीब से जानूँ।',
          Advanced: 'यात्राएं हमारी सोच को व्यापक बनाती हैं; मैं समृद्ध सांस्कृतिक धरोहरों की खोज कर विविधता को गहराई से समझना चाहता हूँ।'
        };
      }
      return {
        Beginner: 'I would love to travel to mountain hill stations and explore scenic landscapes.',
        Intermediate: 'My dream destination is exploring historical cities and experiencing distinct local cultures and traditions.',
        Advanced: 'Traveling enriches my worldview, allowing me to immerse myself in diverse heritage landscapes and cultivate cross-cultural empathy.'
      };
    }

    // 3. Interview / Introduction / Career / Ambition / Strengths
    if (/interview|introduce|yourself|career|job|strength|ambition|goal|work|भविष्य|करियर|परिचय|ताकत|लक्ष्य|entrevista|carrera|entretien|beruf|面接|仕事/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मैं एक उत्साही छात्र हूँ और तकनीक के क्षेत्र में अपना भविष्य संवारना चाहता हूँ।',
          Intermediate: 'मुझमें समस्याओं को हल करने की मजबूत क्षमता है और मैं सॉफ्टवेयर विकास में व्यावहारिक ज्ञान प्राप्त कर रहा हूँ।',
          Advanced: 'मेरी कार्यशैली विश्लेषणात्मक चिंतन और सतत सीखने की प्रतिबद्धता पर आधारित है, जिसका उद्देश्य प्रभावकारी तकनीकी समाधान गढ़ना है।'
        };
      }
      return {
        Beginner: 'I am a passionate student eager to learn and build a meaningful career in technology.',
        Intermediate: 'I have strong problem-solving skills, and I am focused on mastering software development to build impactful solutions.',
        Advanced: 'I combine analytical rigor with a proactive learning mindset, dedicated to architecting scalable systems and driving innovation.'
      };
    }

    // 4. Friends / Family / Relationships / Best Friend
    if (/friend|friendship|family|relationship|people|दोस्त|मित्र|दोस्ती|परिवार|रिश्ते|amigo|amitié|familie|友達|家族/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'सच्चे दोस्त में ईमानदारी, समझदारी और भरोसा सबसे महत्वपूर्ण गुण हैं।',
          Intermediate: 'एक सच्चा मित्र वही है जो मुश्किल समय में साथ दे और हमें हमेशा आगे बढ़ने के लिए प्रेरित करे।',
          Advanced: 'सच्ची मित्रता का मूल आधार निस्वार्थ विश्वास, वैचारिक तालमेल और बिना किसी शर्त के एक-दूसरे के आत्मसम्मान का आदर करना है।'
        };
      }
      return {
        Beginner: 'In a true friend, I value honesty, mutual support, and kindness the most.',
        Intermediate: 'A genuine friend is someone who stands by you through challenges and constantly encourages you to grow.',
        Advanced: 'Mutual trust, intellectual transparency, and unwavering emotional dependability are the foundational tenets of enduring relationships.'
      };
    }

    // 5. Entertainment / Movies / Cinema / Music / Books
    if (/movie|cinema|film|music|song|book|read|actor|singer|फिल्म|सिनेमा|गाना|संगीत|किताब|película|música|livre|musique|buch|映画|音楽/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'खाली समय में मुझे प्रेरणादायक किताबें पढ़ना और मधुर संगीत सुनना पसंद है।',
          Intermediate: 'संगीत और विचारोत्तेजक फिल्में मुझे मानसिक शांति देती हैं और नए रचनात्मक दृष्टिकोण प्रदान करती हैं।',
          Advanced: 'उत्कृष्ट साहित्य और सिनेमा मानव स्वभाव, सामाजिक वास्तविकताओं और दार्शनिक पहलुओं को समझने का अद्भुत माध्यम हैं।'
        };
      }
      return {
        Beginner: 'I love listening to uplifting music and watching science fiction and comedy movies.',
        Intermediate: 'Music and insightful books help me unwind, especially stories with intriguing plotlines and memorable characters.',
        Advanced: 'I appreciate literature and cinematic works that convey nuanced thematic depth, sparking thoughtful reflection on human resilience.'
      };
    }

    // 6. Routine / Daily life / Morning / Time of day / Weekend
    if (/morning|evening|night|day|routine|weekend|today|time|दिन|सुबह|शाम|दिनचर्या|सप्ताहांत|mañana|día|matin|journée|morgen|tag|朝|日常/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मुझे सुबह का समय बहुत पसंद है क्योंकि वातावरण शांत और सुखद रहता है।',
          Intermediate: 'दिन का सबसे अच्छा समय सुबह का होता है, जब मैं बिना किसी व्यवधान के अपने दिन की योजना बना सकता हूँ।',
          Advanced: 'अनुशासित दिनचर्या और प्रातःकालीन आत्ममंथन मानसिक स्पष्टता और दिनभर की कार्यकुशलता बनाए रखने की मजबूत नींव हैं।'
        };
      }
      return {
        Beginner: 'My favorite time is the morning because the atmosphere is peaceful, quiet, and fresh.',
        Intermediate: 'I find peaceful mornings ideal for setting priorities, which establishes a productive tone for the entire day.',
        Advanced: 'Structured daily habits coupled with deliberate morning reflection allow me to maintain high mental agility and focus.'
      };
    }

    // 7. Sports / Cricket / Football / Workout / Fitness
    if (/sport|cricket|football|game|play|fitness|gym|workout|खेल|क्रिकेट|फुटबॉल|मैच|कसरत|deporte|sport|fussball|スポーツ/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मैं सप्ताहांत में क्रिकेट खेलता हूँ और अपने स्वास्थ्य का ध्यान रखता हूँ।',
          Intermediate: 'क्रिकेट जैसा प्रतिस्पर्धी खेल टीम भावना, त्वरित निर्णय और शारीरिक सक्रियता सिखाता है।',
          Advanced: 'नियमित खेल और शारीरिक व्यायाम न केवल शारीरिक स्फूर्ति बनाए रखते हैं बल्कि दबाव में त्वरित रणनीतिक निर्णय लेने की क्षमता भी विकसित करते हैं।'
        };
      }
      return {
        Beginner: 'I enjoy playing cricket on weekends and doing light exercises to stay active.',
        Intermediate: 'Playing competitive sports like cricket sharpens my reflexes and teaches me invaluable lessons in teamwork.',
        Advanced: 'Athletic engagement cultivates disciplined focus, cardiovascular vitality, and collective leadership under high-pressure scenarios.'
      };
    }

    // 8. Tech / AI / Coding / Software / Engineering / Computers
    if (/tech|technology|ai|artificial|code|coding|software|computer|program|तकनीक|कोडिंग|कंप्यूटर|सॉफ्टवेयर|tecnología|technologie|技術/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मुझे कंप्यूटर पर कोडिंग करना और AI टूल्स का उपयोग करना बहुत पसंद है।',
          Intermediate: 'तकनीक जटिल समस्याओं को आसान बना देती है और हमारे सीखने की गति को कई गुना बढ़ा देती है।',
          Advanced: 'आधुनिक सॉफ्टवेयर इंजीनियरिंग और आर्टिफिशियल इंटेलिजेंस मानवीय उत्पादकता को नई ऊंचाइयों पर ले जाने का सबसे क्रांतिकारी साधन हैं।'
        };
      }
      return {
        Beginner: 'I really enjoy coding and using modern AI tools to learn faster every day.',
        Intermediate: 'Technology fascinates me because it empowers us to automate complex workflows and build scalable applications.',
        Advanced: 'The ongoing renaissance in artificial intelligence and distributed computing creates an extraordinary frontier for innovative software engineering.'
      };
    }

    // 9. College / Studies / Subjects / University
    if (/college|study|university|student|major|class|subject|course|कॉलेज|पढ़ाई|विश्वविद्यालय|विषय|universidad|université|studium|大学/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मैं कॉलेज में इंजीनियरिंग की पढ़ाई कर रहा हूँ और नए तकनीकी विषय सीख रहा हूँ।',
          Intermediate: 'कॉलेज में मेरा ध्यान मुख्य रूप से कंप्यूटर विज्ञान और व्यावहारिक प्रोजेक्ट्स बनाने पर केंद्रित है।',
          Advanced: 'अकादमिक अध्ययन को व्यावहारिक उद्योग-उन्मुख कौशल के साथ एकीकृत करना मेरी वर्तमान शैक्षणिक प्राथमिकताओं के केंद्र में है।'
        };
      }
      return {
        Beginner: 'I am currently pursuing my degree in college and enjoying my computer science coursework.',
        Intermediate: 'In college, I am primarily focused on mastering algorithms, system design, and collaborative project execution.',
        Advanced: 'Balancing theoretical academic rigor with hands-on technical architecture is the cornerstone of my undergraduate training.'
      };
    }

    // 10. Why / Reason / Because
    if (/why|reason|because|cause|क्यों|कारण|por qué|pourquoi|warum|なぜ/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'इसका मुख्य कारण यह है कि यह बहुत सरल, व्यावहारिक और उपयोगी है।',
          Intermediate: 'मैं ऐसा इसलिए मानता हूँ क्योंकि यह समय की बचत करता है और जीवन में सकारात्मक परिणाम सुनिश्चित करता है।',
          Advanced: 'इसके पीछे का प्राथमिक तर्क प्रक्रियात्मक दक्षता को अनुकूलित करना और दीर्घकालिक सतत प्रभाव पैदा करना है।'
        };
      }
      return {
        Beginner: 'I believe this because it is simple, practical, and saves a lot of time.',
        Intermediate: 'The primary reason is that it eliminates bottlenecks and delivers consistent, measurable benefits.',
        Advanced: 'The underlying rationale rests on maximizing systemic efficiency while fostering resilience against unforeseen bottlenecks.'
      };
    }

    // 11. How / Method / Process
    if (/how|process|method|way|step|कैसे|प्रक्रिया|तरीका|cómo|comment|wie|どのように/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'मैं छोटे-छोटे कदमों से शुरुआत करता हूँ और प्रतिदिन निरंतर अभ्यास करता हूँ।',
          Intermediate: 'मैं अपने लक्ष्य को स्पष्ट प्राथमिकताओं में बाँटकर व्यवस्थित रूप से आगे बढ़ता हूँ।',
          Advanced: 'मैं एक पुनरावृत्त कार्यप्रणाली का पालन करता हूँ जिसमें योजना निर्माण, व्यवस्थित क्रियान्वयन और निरंतर सुधार शामिल है।'
        };
      }
      return {
        Beginner: 'I start step by step and maintain consistent daily practice to get better.',
        Intermediate: 'I break down the main objective into manageable milestones, focusing on steady, iterative execution.',
        Advanced: 'I employ a systematic methodology centered around deliberate practice, feedback-driven optimization, and milestone validation.'
      };
    }

    // 12. Yes/No / Do you / Have you / Can you
    if (/do you|have you|can you|are you|is it|did you|क्या आप|क्या तुमने|क्या कभी|¿tienes|¿puedes|est-ce que|hast du/.test(q)) {
      if (isHindi) {
        return {
          Beginner: 'हाँ, बिल्कुल! मुझे इसका अनुभव हुआ है और यह वाकई बहुत अच्छा रहा।',
          Intermediate: 'हाँ, मैं इस बात से सहमत हूँ और मैंने इसे अपने व्यावहारिक जीवन में गहराई से परखा है।',
          Advanced: 'निश्चित रूप से, मेरे व्यक्तिगत और व्यावसायिक अनुभवों ने इस दृष्टिकोण की प्रासंगिकता को भलीभाँति प्रमाणित किया है।'
        };
      }
      return {
        Beginner: 'Yes, definitely! I have experienced that and found it genuinely rewarding.',
        Intermediate: 'Yes, I fully agree with that perspective, as I have observed its positive outcomes firsthand.',
        Advanced: 'Indeed, my personal experience strongly validates that principle, highlighting the profound importance of adaptability.'
      };
    }

    // Universal Dynamic Fallback: Extracts meaningful nouns/verbs from question to build flawless replies!
    const cleanTokens = q
      .replace(/[?.,!¿¡:;'"()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !/what|which|where|when|that|this|with|from|have|your|about|their|there|would|could|should/.test(w));
    
    const focalSubject = cleanTokens.slice(0, 2).join(' ') || 'this topic';

    if (isHindi) {
      return {
        Beginner: `इस विषय में मुझे लगता है कि यह काफी उपयोगी और महत्वपूर्ण है।`,
        Intermediate: `मेरे विचार से यह एक अत्यंत विचारणीय बिंदु है जो हमारी सोच को समृद्ध करता है।`,
        Advanced: `इस विषय का समग्र विश्लेषण करने पर यह स्पष्ट होता है कि यह आधुनिक परिप्रेक्ष्य में अत्यधिक प्रासंगिक है।`
      };
    }

    return {
      Beginner: `Regarding ${focalSubject}, I think it is very interesting and beneficial.`,
      Intermediate: `In my experience with ${focalSubject}, taking a structured approach always leads to better understanding.`,
      Advanced: `Analyzing ${focalSubject} reveals subtle nuances that underscore the necessity for balanced, critical thinking.`
    };
  };

  // Generate dynamic 3-level reply suggestions for any question in active language
  const updateDynamicSuggestions = (questionText: string, langKey = practiceLang) => {
    const suggestions = generateUniversalSuggestions(questionText, langKey);
    setCurrentSuggestions(suggestions);
  };

  // Switch Language: resets conversation, starts AI in chosen language, and speaks greeting
  const handleLanguageChange = (newLangCode: string) => {
    setPracticeLang(newLangCode);
    const config = LANGUAGE_DATA[newLangCode] || LANGUAGE_DATA['en-US'];

    setCurrentQuestion(config.initialQuestion);
    setLastAIReply(config.initialQuestion);
    updateDynamicSuggestions(config.initialQuestion, newLangCode);

    setMessages([
      {
        id: `lang-init-${Date.now()}`,
        sender: 'ai',
        text: config.starter,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);

    setOrbState('idle');
    setOrbCaption(`AI is ready in ${config.name}. Tap mic or type a reply.`);
    showToast(`AI Language switched to ${config.name} ${config.flag}`);

    if (autoVoice) {
      setTimeout(() => {
        readText(config.starter, newLangCode);
      }, 300);
    }
  };

  // Text-To-Speech with matching language voice and animated sky orb
  const readText = (text: string, overrideLang?: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    const targetLangCode = overrideLang || practiceLang;
    const cleanText = text.replace(/[*#_~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.lang = targetLangCode;

    // Pick voice matching target language
    const langPrefix = targetLangCode.slice(0, 2).toLowerCase();
    if (selectedVoice !== 'default') {
      const idx = Number(selectedVoice);
      if (voices[idx]) utterance.voice = voices[idx];
    } else {
      const preferred = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')));
      if (preferred) utterance.voice = preferred;
      else {
        const anyLangVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
        if (anyLangVoice) utterance.voice = anyLangVoice;
      }
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

      if (micMode) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    utterance.onerror = () => {
      setOrbState('idle');
      setOrbCaption('Speech playback ended.');
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Generate contextual, conversational AI responses & follow-up questions in active language
  const generateAIResponse = (userText: string): string => {
    const config = LANGUAGE_DATA[practiceLang] || LANGUAGE_DATA['en-US'];
    const t = userText.toLowerCase();
    const isHindi = practiceLang.startsWith('hi');

    // Questions asked to AI
    if (/who are you|your name|what are you|तुम कौन हो|तुम्हारा नाम क्या है|आप कौन हैं/.test(t)) {
      if (isHindi) return 'मैं आपका भाषा अभ्यास मित्र और AI स्पीकिंग ट्यूटर हूँ! 😊 मैं आपके साथ बातचीत करके आपका आत्मविश्वास बढ़ाने में मदद करता हूँ। आप आज किस विषय पर बात करना चाहते हैं?';
      return "I'm your AI speaking companion and language practice coach! 😊 I'm here to chat with you and help you speak fluently with confidence. What exciting topic would you like to explore next?";
    }

    if (/how are you|how do you do|how are things|आप कैसे हैं|तुम कैसे हो|हाल चाल/.test(t)) {
      if (isHindi) return 'मैं बहुत अच्छा और ऊर्जावान हूँ, पूछने के लिए धन्यवाद! 😊 आपके साथ बातचीत करके मुझे बहुत खुशी हो रही है। आप आज कैसा महसूस कर रहे हैं?';
      return "I'm doing wonderful and feeling great, thank you for asking! 😊 I always love conversing with eager learners like you. How has your day been treating you so far?";
    }

    // 1. Food & Cooking
    if (/food|dish|cook|biryani|paneer|curry|eat|lunch|dinner|breakfast|खाना|व्यंजन|पकाना|भोजन|स्वाद/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'यह तो बहुत स्वादिष्ट लगता है! 🍲 क्या आप इसे खुद बनाना जानते हैं या बाहर खाना पसंद करते हैं?';
        if (level === 'Intermediate') return 'स्वादिष्ट भोजन दिन को खुशनुमा बना देता है! क्या आपके परिवार में कोई खास पारंपरिक रेसिपी है जो आपको सबसे ज्यादा पसंद है?';
        return 'खानपान हमारी सांस्कृतिक पहचान का एक अभिन्न अंग है। क्या आपको लगता है कि पारंपरिक क्षेत्रीय व्यंजनों को आधुनिक समय में भी संरक्षित रखना आवश्यक है?';
      }
      if (level === 'Beginner') return 'That sounds delicious! 🍲 Do you enjoy cooking this dish yourself, or do you have a favourite restaurant where you eat it?';
      if (level === 'Intermediate') return 'Good food always brings great joy! Do you have a special family recipe or traditional delicacy that holds special memories for you?';
      return 'Culinary traditions reflect cultural identity and heritage. How do you feel modern lifestyle and fast food trends are impacting authentic home cooking?';
    }

    // 2. Travel & Vacation
    if (/travel|trip|mountain|beach|city|country|visit|delhi|mumbai|paris|japan|london|holiday|vacation|घूमना|यात्रा|सफर|पहाड़|पर्यटन/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'वाह, यात्रा करना वाकई रोमांचक है! ✈️ आप किसके साथ यात्रा करना सबसे ज्यादा पसंद करते हैं?';
        if (level === 'Intermediate') return 'नई जगहों की यात्रा हमें बहुत कुछ सिखाती है। जब आप किसी नई जगह जाते हैं, तो आपको वहाँ की कौन सी चीज़ सबसे ज्यादा आकर्षित करती है?';
        return 'यात्राएं हमारे दृष्टिकोण और अनुकूलन क्षमता को निखारती हैं। आपकी अब तक की सबसे यादगार यात्रा कौन सी रही है और उसने आप पर क्या प्रभाव डाला?';
      }
      if (level === 'Beginner') return 'That sounds like an amazing place to visit! ✈️ Do you prefer traveling with friends, family, or going solo?';
      if (level === 'Intermediate') return 'Traveling to new destinations opens up fresh perspectives. What is the first thing you love to explore when arriving in a new city?';
      return 'Immersive travel challenges our preconceptions and fosters cultural empathy. What has been the most transformative trip of your life so far?';
    }

    // 3. Interview / Career / Strengths / Ambition
    if (/interview|career|job|engineer|software|developer|passion|ambition|goal|strength|कंपनी|करियर|लक्ष्य|ताकत|सफलता/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'यह बहुत प्रेरणादायक लक्ष्य है! 🎯 इस सपने को पूरा करने के लिए आप कौन सी नई स्किल सीख रहे हैं?';
        if (level === 'Intermediate') return 'करियर में स्पष्ट विजन होना सफलता की पहली सीढ़ी है। आप आने वाले दो वर्षों में खुद को किस मुकाम पर देखना चाहते हैं?';
        return 'व्यावसायिक उत्कृष्टता प्राप्त करने के लिए तकनीकी विशेषज्ञता के साथ-साथ संचार और नेतृत्व कौशल भी अनिवार्य हैं। आप इन कौशलों को कैसे निखार रहे हैं?';
      }
      if (level === 'Beginner') return 'That is a very inspiring career ambition! 🎯 What key skill are you actively practicing to achieve this goal?';
      if (level === 'Intermediate') return 'Having a clear career vision is wonderful. Where do you see yourself making the most significant impact over the next couple of years?';
      return 'Professional growth demands both core technical mastery and empathetic leadership. How do you systematically evaluate and upgrade your professional skill set?';
    }

    // 4. Friends & Family
    if (/friend|friendship|brother|sister|family|mother|father|parents|दोस्त|मित्र|परिवार|माता|पिता|भाई|बहन/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'सच्चे दोस्त और परिवार जीवन की सबसे बड़ी ताकत हैं! 🤝 आप अपने दोस्तों के साथ खाली समय में क्या करना पसंद करते हैं?';
        if (level === 'Intermediate') return 'अच्छे रिश्ते हमें हर परिस्थिति में मजबूत बनाए रखते हैं। क्या आपके पास कोई ऐसा दोस्त है जिसने आपके जीवन में बड़ा सकारात्मक बदलाव लाया हो?';
        return 'सच्ची मित्रता और पारिवारिक संबंध हमारे भावनात्मक लचीलेपन की आधारशिला हैं। आज के डिजिटल युग में आप इन रिश्तों में आत्मीयता कैसे बनाए रखते हैं?';
      }
      if (level === 'Beginner') return 'True friends and family make life so meaningful! 🤝 What is your favourite activity to do when you hang out with your close friends?';
      if (level === 'Intermediate') return 'Strong bonds support us through every milestone. Tell me about a close friend who has inspired or supported you in a meaningful way.';
      return 'Deep interpersonal relationships are vital for mental well-being and emotional equilibrium. How do you maintain authentic connection in an increasingly virtual world?';
    }

    // 5. Entertainment / Movies / Books / Music
    if (/movie|film|cinema|song|music|actor|book|read|novel|फिल्म|गाना|संगीत|किताब|उपन्यास|अभिनेता/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'बहुत बढ़िया पसंद! 🎬 आपकी सबसे पसंदीदा फिल्म या किताब कौन सी है और वह आपको क्यों पसंद आई?';
        if (level === 'Intermediate') return 'कला और संगीत हमारे मूड को पूरी तरह बदल देते हैं। क्या कोई ऐसा गाना या किताब है जो आपको हमेशा नई प्रेरणा देती है?';
        return 'साहित्य और सिनेमा मानव समाज के विचारों और भावनाओं का दर्पण हैं। क्या आप किसी ऐसे पात्र या कथानक से गहराई से जुड़े हैं जिसने आपकी सोच बदली हो?';
      }
      if (level === 'Beginner') return 'Great choice! 🎬 What is the name of your all-time favourite movie or book, and why did you like it?';
      if (level === 'Intermediate') return 'Creative works have a profound way of influencing our mood and mindset. Is there a specific genre or artist that never fails to inspire you?';
      return 'Cinematic masterpieces and literature often challenge conventional viewpoints. Has there been a story or piece of music that reshaped your worldview?';
    }

    // 6. Sports / Cricket / Workout
    if (/cricket|football|game|sport|play|match|batting|bowling|gym|workout|खेल|मैच|क्रिकेट|फुटबॉल|कसरत/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'क्रिकेट और खेलकूद स्वास्थ्य के लिए बेहतरीन हैं! 🏏 आपका पसंदीदा खिलाड़ी कौन है?';
        if (level === 'Intermediate') return 'खेल हमें टीमवर्क और अनुशासन सिखाते हैं। जब आपकी टीम दबाव में होती है, तो आप उस स्थिति का सामना कैसे करते हैं?';
        return 'प्रतिस्पर्धी खेल मानसिक दृढ़ता और रणनीतिक सूझबूझ को निखारते हैं। खेल के मैदान से सीखी कौन सी बात आपको अपने दैनिक जीवन और पढ़ाई में मदद करती है?';
      }
      if (level === 'Beginner') return 'Sports are fantastic for keeping mind and body sharp! 🏏 Who is your all-time favourite sports player or athlete?';
      if (level === 'Intermediate') return 'Playing competitive sports teaches invaluable lessons in team spirit and resilience. How do you handle high-pressure moments during a game?';
      return 'Athletic disciplines instill strategic composure and endurance under adversity. How do the tactical principles of competitive sports carry over into your academic endeavors?';
    }

    // 7. College / Studies / Subjects
    if (/college|school|study|engineering|student|class|exam|project|course|कॉलेज|पढ़ाई|विश्वविद्यालय|परीक्षा|प्रोजेक्ट/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'पढ़ाई में रुचि होना बहुत अच्छी बात है! 📚 आपका सबसे पसंदीदा विषय कौन सा है?';
        if (level === 'Intermediate') return 'कॉलेज का समय नए ज्ञान और प्रयोगों का होता है। हाल ही में आपने किस दिलचस्प प्रोजेक्ट या असाइनमेंट पर काम किया है?';
        return 'अकादमिक अध्ययन को व्यावहारिक उद्योग-उन्मुख कौशल के साथ जोड़ना बेहद जरूरी है। अपने कोर्सवर्क के दौरान आपको कौन सी सबसे बड़ी तकनीकी चुनौती का सामना करना पड़ा?';
      }
      if (level === 'Beginner') return 'It is wonderful to focus on your education! 📚 Which subject or topic do you find most interesting in your studies?';
      if (level === 'Intermediate') return 'College presents so many opportunities to build practical knowledge. Tell me about a hands-on project or assignment you recently worked on.';
      return 'Bridging theoretical coursework with tangible real-world application requires continuous curiosity. What academic challenge has stretched your problem-solving capabilities the most?';
    }

    // 8. Technology & AI
    if (/tech|coding|programming|computer|ai|software|python|javascript|react|तकनीक|कंप्यूटर|सॉफ्टवेयर|कोडिंग/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'टेक्नोलॉजी की दुनिया वाकई अद्भुत है! 💻 आप कंप्यूटर पर क्या बनाना सबसे ज्यादा पसंद करते हैं?';
        if (level === 'Intermediate') return 'कोडिंग और नए टूल्स सीखना बहुत रोमांचक होता है। आप आजकल किस प्रोग्रामिंग भाषा या फ्रेमवर्क पर काम कर रहे हैं?';
        return 'आर्टिफिशियल इंटेलिजेंस और ऑटोमेशन हर उद्योग का भविष्य तय कर रहे हैं। आपके अनुसार आने वाले वर्षों में AI छात्रों और डेवलपर्स के काम को कैसे बदलेगा?';
      }
      if (level === 'Beginner') return 'Technology is fascinating! 💻 What is your favourite thing to create or explore using computers?';
      if (level === 'Intermediate') return 'Exploring modern programming frameworks opens so many doors. Which programming language or developer tool are you currently mastering?';
      return 'Generative AI and automated toolchains are redefining software development paradigms. How are you positioning your skills to thrive alongside intelligent systems?';
    }

    // 9. Day / Morning / Routine
    if (/good|fine|great|happy|awesome|well|morning|today|routine|दिन|सुबह|शाम|बढ़िया|अच्छा|दिनचर्या/.test(t)) {
      if (isHindi) {
        if (level === 'Beginner') return 'यह जानकर बहुत अच्छा लगा! 😊 आज के दिन की सबसे अच्छी बात क्या रही?';
        if (level === 'Intermediate') return 'सकारात्मक शुरुआत से पूरा दिन productive बन जाता है! क्या आपके पास कोई ऐसी आदत है जो आपको दिनभर ऊर्जावान रखती है?';
        return 'सक्रिय और संतुलित दिनचर्या बनाए रखना मानसिक स्पष्टता के लिए अनिवार्य है। आप अपने अध्ययन, स्वास्थ्य और विश्राम के बीच संतुलन कैसे साधते हैं?';
      }
      if (level === 'Beginner') return "I'm delighted to hear that! 😊 What has been the most pleasant or productive highlight of your day so far?";
      if (level === 'Intermediate') return 'Starting with positive energy sets the rhythm for the entire day! Do you follow any morning ritual that keeps you focused and energized?';
      return 'Maintaining intentional daily rhythms sustains high cognitive performance over long stretches. How do you design your routine to prevent burnout and foster creative clarity?';
    }

    // Default Progressive Conversational Response
    if (isHindi) {
      if (level === 'Beginner') return 'बहुत ही अच्छा और स्पष्ट उत्तर! 😊 क्या आप इस बारे में मुझे एक और रोचक उदाहरण बता सकते हैं?';
      if (level === 'Intermediate') return 'साझा करने के लिए धन्यवाद! यह बहुत ही विचारणीय बिंदु है। इस अनुभव ने आपकी सोच पर क्या प्रभाव डाला?';
      return 'यह एक अत्यंत विचारोत्तेजक और संतुलित दृष्टिकोण है। इस विषय के दीर्घकालिक परिणामों के बारे में आपका क्या विचार है?';
    }

    if (level === 'Beginner') return 'Great point! 😊 Can you tell me a little bit more about that in another simple sentence?';
    if (level === 'Intermediate') return 'Thank you for sharing that thoughtful perspective! Could you give me an example from your personal experience that illustrates that?';
    return 'That is a well-articulated, insightful point of view. What do you consider the most significant factor that reinforces that perspective?';
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

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
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

      // Generate dynamic replies for all 3 levels for this brand new question
      updateDynamicSuggestions(reply, practiceLang);

      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
      onProgress?.('lesson', 'Speaking Practice', `Practiced ${level} conversation in ${activeLangConfig.name}`);

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

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Wait 1.6s of silence after speaking so AI does not interrupt mid-sentence
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
      showToast(`Microphone on (${activeLangConfig.name}). Speak naturally; AI will not interrupt until you finish.`);
      startListening();
    }
  };

  // Explain in support language
  const explainInLanguage = (sentence: string) => {
    const explanations: Record<string, string> = {
      hi: `🇮🇳 हिंदी में अर्थ / व्याख्या:\n"${sentence}"\nयह सवाल आपसे आपके विचारों या अनुभवों को शेयर करने के लिए पूछा गया है। आप सरल और पूरे वाक्यों में जवाब दे सकते हैं।`,
      bn: `🇧🇩 বাংলায় অর্থ / ব্যাখ্যা:\n"${sentence}"\nএই প্রশ্নটি আপনার অভিজ্ঞতা এবং মতামত শেয়ার করার জন্য জিজ্ঞেস করা হয়েছে।`,
      ta: `🇮🇳 தமிழில் விளக்கம்:\n"${sentence}"\nஇந்த கேள்வி உங்கள் கருத்துக்களை பகிர்ந்து கொள்ள கேட்கப்பட்டுள்ளது.`,
      te: `🇮🇳 తెలుగులో వివరణ:\n"${sentence}"\nఈ ప్రశ్న మీ అనుభవాలను పంచుకోవడానికి అడగబడింది.`,
      mr: `🇮🇳 मराठीत अर्थ / स्पष्टीकरण:\n"${sentence}"\nहा प्रश्न तुमचे अनुभव आणि विचार मांडण्यासाठी विचारला गेला आहे।`,
      es: `🇪🇸 Explicación:\n"${sentence}"\nEsta pregunta te invita a compartir tus ideas con confianza.`,
      fr: `🇫🇷 Explication :\n"${sentence}"\nCette question vous invite à partager vos idées avec clarté.`
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

    const config = LANGUAGE_DATA[practiceLang] || LANGUAGE_DATA['en-US'];
    const q = config.topics[top] || `Let's discuss ${top}! What are your thoughts?`;
    setCurrentQuestion(q);
    setLastAIReply(q);
    updateDynamicSuggestions(q, practiceLang);

    setMessages(prev => [
      ...prev,
      {
        id: `topic-${Date.now()}`,
        sender: 'ai',
        text: q,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(q);
    showToast(`Topic set to: ${top}`);
  };

  // Apply Custom Topic entered by user
  const handleApplyCustomTopic = (topicName?: string) => {
    const custom = (topicName || customTopicInput).trim();
    if (!custom) return;
    setCurrentTopic(custom);
    setTopicModalOpen(false);
    setCustomTopicInput('');

    let question = `Let's discuss "${custom}"! What are your thoughts or experience on this topic?`;
    if (practiceLang.startsWith('hi')) {
      question = `चलिए "${custom}" के बारे में बात करते हैं! इस विषय पर आपके क्या विचार या अनुभव हैं?`;
    } else if (practiceLang.startsWith('es')) {
      question = `¡Hablemos sobre "${custom}"! ¿Cuáles son tus opiniones o experiencias sobre este tema?`;
    } else if (practiceLang.startsWith('fr')) {
      question = `Parlons de "${custom}" ! Quels sont vos avis ou expériences à ce sujet ?`;
    }

    setCurrentQuestion(question);
    setLastAIReply(question);
    updateDynamicSuggestions(question, practiceLang);

    setMessages(prev => [
      ...prev,
      {
        id: `custom-topic-${Date.now()}`,
        sender: 'ai',
        text: question,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(question);
    showToast(`Topic set to: ${custom}`);
  };

  // Pick random topic
  const pickRandomTopic = () => {
    const list = topicsList.filter(t => t !== currentTopic);
    const chosen = list[Math.floor(Math.random() * list.length)] || 'Daily life';
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
    const config = LANGUAGE_DATA[practiceLang] || LANGUAGE_DATA['en-US'];
    setCurrentQuestion(config.initialQuestion);
    setLastAIReply(config.initialQuestion);
    updateDynamicSuggestions(config.initialQuestion, practiceLang);

    setMessages([
      {
        id: `m-init-${Date.now()}`,
        sender: 'ai',
        text: config.starter,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setOrbState('idle');
    setOrbCaption('Tap the microphone or choose a reply to start practising.');
    if (autoVoice) readText(config.starter);
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
    'Job interviews', 'Technology & AI', 'Food & cooking', 'Friendship & family'
  ];

  return (
    <div className="voice-studio-container">
      {/* Top Header Bar Matching Image 2 */}
      <header className="voice-header-bar">
        <div className="brand">
          <div className="brand-avatar">N</div>
          <div>
            <div className="brand-title">NEXORA-07 / Voice Studio</div>
            <div className="brand-sub">Speak. Learn. Grow. ({activeLangConfig.name})</div>
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
              <div className="sub">Speaking & listening coach ({activeLangConfig.name})</div>
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

          {/* Compact / Balanced Sky-Blue Orb */}
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
            {orbState === 'thinking' && 'Analyzing and thinking…'}
            {orbState === 'paused' && 'Speech paused'}
            {orbState === 'stopped' && 'Speech stopped'}
            {orbState === 'idle' && 'AI is ready'}
          </div>
          <div className="orb-caption">{orbCaption}</div>

          {/* Primary Controls */}
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

          {/* Language Selection: AI speaks and understands in this language! */}
          <div className="language-box">
            <div className="lang-title">
              <span>🌐 AI Speaking Language</span>
              <span className="choose-lang-sub">Change language</span>
            </div>
            <div className="lang-row">
              <select
                className="select"
                value={practiceLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                aria-label="Practice language"
              >
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="hi-IN">🇮🇳 Hindi (हिन्दी)</option>
                <option value="es-ES">🇪🇸 Spanish (Español)</option>
                <option value="fr-FR">🇫🇷 French (Français)</option>
                <option value="bn-IN">🇮🇳 Bengali (বাংলা)</option>
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
                value={"" + speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>

          <div className="footnote">
            Microphone and speech features depend on your browser. AI replies adapt automatically to your selected language.
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Conversation Panel (Laptop / Desktop RIGHT)        */}
        {/* ============================================================== */}
        <section className="panel chat-panel voice-conversation-card">
          <div className="panel-head">
            <div>
              <h2>Conversation</h2>
              <div className="sub">Practise speaking with your AI tutor in {activeLangConfig.name}</div>
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

          {/* Messages Container with Smooth Gentle Auto-scroll */}
          <div
            className="messages"
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.sender}`}>
                <span className="sender">{m.sender === 'ai' ? `Nexora AI (${activeLangConfig.flag}) · now` : 'You · now'}</span>
                <div className="bubble">{m.text}</div>

                {/* Message Quick Actions */}
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

          {/* Composer: Dynamic Level selector (Beginner, Intermediate, Advanced) */}
          <div className="composer">
            <p className="level-label">CHOOSE YOUR SPEAKING LEVEL (DYNAMIC REPLIES)</p>
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

            {/* Dynamic Suggestion Card: Updates automatically on every question! */}
            <div className="suggestion">
              <div className="suggestion-text">
                <span className="suggestion-badge">{level}:</span> "{currentSuggestions[level] || currentSuggestions.Beginner}"
              </div>
              <button
                type="button"
                onClick={() => readText(currentSuggestions[level] || currentSuggestions.Beginner)}
                title="Listen to pronunciation"
              >
                <Volume2 size={13} />
              </button>
              <button
                type="button"
                className="suggest-use-btn"
                onClick={() => setInputVal(currentSuggestions[level] || currentSuggestions.Beginner)}
                title="Insert this reply into input"
              >
                Use reply
              </button>
            </div>

            {/* Quick 1-tap level reply chips */}
            <div className="quick-replies-row">
              <span className="quick-replies-label">💡 All levels:</span>
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setLevel(lvl);
                    setInputVal(currentSuggestions[lvl] || currentSuggestions.Beginner);
                  }}
                  title={currentSuggestions[lvl]}
                  className={`quick-reply-chip ${level === lvl ? 'active' : ''}`}
                >
                  <b>{lvl === 'Beginner' ? '🌱' : lvl === 'Intermediate' ? '✨' : '🚀'} {lvl}:</b> {(currentSuggestions[lvl] || currentSuggestions.Beginner).slice(0, 32)}…
                </button>
              ))}
            </div>

            {/* Send Row */}
            <div className="sendrow">
              <input
                type="text"
                className="text-input"
                placeholder={`Type your reply in ${activeLangConfig.name} or tap the mic…`}
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
                title={micMode ? 'Turn off mic' : `Tap to speak in ${activeLangConfig.name} (will not interrupt while you speak)`}
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

            {/* Custom Topic Input */}
            <div className="custom-topic-box" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                ✍️ Enter Any Custom Topic
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence in Education…"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomTopic();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(56,189,248,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleApplyCustomTopic()}
                  disabled={!customTopicInput.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: '#020617',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: customTopicInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: customTopicInput.trim() ? 1 : 0.5,
                  }}
                >
                  Apply Topic
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 4px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>POPULAR TOPICS</span>
              <button
                type="button"
                onClick={() => { pickRandomTopic(); setTopicModalOpen(false); }}
                style={{
                  background: 'rgba(56,189,248,0.15)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🎲 Random Topic
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
