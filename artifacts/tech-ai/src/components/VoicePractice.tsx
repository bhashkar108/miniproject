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

  // Generate dynamic 3-level reply suggestions for any question in active language
  const updateDynamicSuggestions = (questionText: string, langKey = practiceLang) => {
    const config = LANGUAGE_DATA[langKey] || LANGUAGE_DATA['en-US'];
    const qLower = questionText.toLowerCase();

    for (const [kw, replies] of Object.entries(config.suggestionsByKeyword)) {
      if (qLower.includes(kw.toLowerCase())) {
        setCurrentSuggestions(replies);
        return;
      }
    }

    if (/sport|cricket|game|play|football|खेल|deporte/.test(qLower)) {
      setCurrentSuggestions(config.suggestionsByKeyword['cricket'] || config.defaultReplies);
    } else if (/college|study|university|class|कॉलेज|पढ़ाई|estudio/.test(qLower)) {
      setCurrentSuggestions(config.suggestionsByKeyword['college'] || config.defaultReplies);
    } else if (/day|today|दिन|आज|día/.test(qLower)) {
      setCurrentSuggestions(config.suggestionsByKeyword['day'] || config.defaultReplies);
    } else if (/tech|ai|code|computer|तकनीक/.test(qLower)) {
      setCurrentSuggestions(config.suggestionsByKeyword['tech'] || config.defaultReplies);
    } else {
      setCurrentSuggestions(config.defaultReplies);
    }
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

  // Generate dynamic AI responses in active language
  const generateAIResponse = (userText: string): string => {
    const config = LANGUAGE_DATA[practiceLang] || LANGUAGE_DATA['en-US'];
    const t = userText.toLowerCase();

    if (/cricket|football|game|sport|play|खेल|मैच|deporte|football|sport/.test(t)) {
      return config.aiReplies.sport ? config.aiReplies.sport[level] : config.defaultReplies[level];
    }

    if (/college|school|study|engineering|student|class|कॉलेज|पढ़ाई|विश्वविद्यालय|estudio|université/.test(t)) {
      return config.aiReplies.college ? config.aiReplies.college[level] : config.defaultReplies[level];
    }

    if (/good|fine|great|happy|awesome|well|अच्छा|बढ़िया|खुश|bien|super/.test(t)) {
      return config.aiReplies.day ? config.aiReplies.day[level] : config.defaultReplies[level];
    }

    if (/tech|coding|programming|computer|ai|तकनीक|कंप्यूटर|কোডিং/.test(t)) {
      return config.aiReplies.tech ? config.aiReplies.tech[level] : config.defaultReplies[level];
    }

    // Default progressive encouragement in active language
    if (practiceLang.startsWith('hi')) {
      if (level === 'Beginner') return 'बहुत बढ़िया उत्तर! 😊 क्या आप इस बारे में एक और सरल वाक्य बता सकते हैं?';
      if (level === 'Intermediate') return 'साझा करने के लिए धन्यवाद! क्या आप इसका एक व्यावहारिक उदाहरण दे सकते हैं?';
      return 'यह एक बहुत ही विचारणीय दृष्टिकोण है। इस विषय पर आपका व्यक्तिगत अनुभव कैसा रहा है?';
    } else if (practiceLang.startsWith('es')) {
      if (level === 'Beginner') return '¡Buena respuesta! 😊 ¿Puedes contarme un poco más en una frase sencilla?';
      if (level === 'Intermediate') return '¡Gracias por compartir! ¿Podrías darme un ejemplo práctico de tu experiencia?';
      return 'Es una perspectiva muy articulada. ¿Cómo ha influido esto en tus decisiones recientes?';
    } else if (practiceLang.startsWith('fr')) {
      if (level === 'Beginner') return 'Très bonne réponse ! 😊 Pouvez-vous m\'en dire un peu plus en une phrase simple ?';
      if (level === 'Intermediate') return 'Merci pour ce partage ! Pourriez-vous donner un exemple concret ?';
      return 'C\'est une perspective très réfléchie. Comment cette idée influence-t-elle vos projets ?';
    }

    if (level === 'Beginner') return 'Good answer! 😊 Can you tell me a little bit more about that in one simple sentence?';
    if (level === 'Intermediate') return 'Thanks for sharing that! Could you elaborate further or give me a practical example from your experience?';
    return 'That is a well-articulated perspective. Could you expand on the underlying reasoning behind that point of view?';
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
