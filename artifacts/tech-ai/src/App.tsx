import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import {
  useHealthCheck, useGetCurrentSession, useRegisterStudent, useLoginStudent, useLogoutStudent,
  useGetStudentProfile, useUpdateStudentProfile, useExplainStudyMaterial, useUploadStudyMaterial,
  useAnalyzeUploadedForm, useAnalyzeFormUrl, useReviewFilledForm, useAnalyzeUploadedQuiz, useSolveCurrentQuizQuestion,
  useSubmitQuizPracticeAttempt, useListQuizAttempts, useListProgress, useCreateProgress,
  useRecognizeEquationFromImage,
  useGetDashboardSummary, getGetCurrentSessionQueryKey, getGetStudentProfileQueryKey,
  getListQuizAttemptsQueryKey, getListProgressQueryKey, getGetDashboardSummaryQueryKey,
  useImportQuizFromUrl, useChatAboutQuiz,
  type StudentProfile, type FormAnalysis, type QuizAnalysis, type QuizAttempt, type LessonResponse,
} from '@workspace/api-client-react';
import { parse } from 'mathjs';
import { PDFDocument } from 'pdf-lib';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import {
  Activity, ArrowLeft, ArrowRight, AudioLines, BookOpen, Camera, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, FileImage, FileText, GraduationCap, House, ImagePlus, LoaderCircle,
  LogOut, Menu, Moon, Play, ShieldCheck, Sparkles, Sun, Upload, UserRound,
  WandSparkles, X, Zap, Brain, RotateCcw, Download, Eye, ClipboardCheck, Sigma, Languages,
  Mic, MicOff, Maximize2, FilePlus2, MessageCircle, Send, Globe2, ZoomIn, ZoomOut,
  Smartphone, ExternalLink, Radio,
} from 'lucide-react';
import { VoicePractice } from '@/components/VoicePractice';
import { VoiceRoom } from '@/components/VoiceRoom';
import { generateLocalTeacherLesson } from '@/lib/teacherFallback';
import '@/index.css';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const client = new QueryClient();
type Module = 'home' | 'teacher' | 'voice' | 'voiceroom' | 'docs' | 'equations' | 'quiz' | 'progress' | 'profile';
type UiLanguage = 'English'|'Hindi'|'Hinglish'|'Bengali'|'Tamil'|'Telugu'|'Marathi'|'Gujarati'|'Punjabi'|'Kannada'|'Malayalam'|'Odia';
type QuizWithSource = QuizAnalysis & { sourceFile?: File; sourceUrl: string };
type Recognition = { lang:string; continuous:boolean; interimResults:boolean; onresult:((event:any)=>void)|null; onend:(()=>void)|null; onerror:(()=>void)|null; start:()=>void; stop:()=>void };
type RecognitionConstructor = new () => Recognition;
type InstallPromptEvent = Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}> };
function normalizePublicFormUrl(rawUrl:string) {
  const parsed=new URL(rawUrl.trim());
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Invalid public form URL.');
  if(parsed.hostname.toLowerCase()==='scholarship.gov.in')parsed.hostname='scholarships.gov.in';
  return parsed.href;
}
function isScholarshipPortalUrl(rawUrl:string) {
  try{const host=new URL(rawUrl).hostname.toLowerCase();return host==='scholarships.gov.in'||host.endsWith('.scholarships.gov.in')||host==='scholarship.gov.in';}
  catch{return false;}
}
const uiTranslations: Record<Exclude<UiLanguage,'English'>,Record<string,string>> = {
  Hindi: {
    'Workspace':'कार्य क्षेत्र','AI Teacher':'AI शिक्षक','English Practice':'इंग्लिश प्रैक्टिस','Voice Rooms':'वॉयस रूम्स','Voice Practice':'इंग्लिश प्रैक्टिस','Form assistant':'फ़ॉर्म सहायक','Smart Doc':'स्मार्ट दस्तावेज़','Equation graph':'समीकरण ग्राफ़','Auto Quiz':'ऑटो क्विज़','My profile':'मेरी प्रोफ़ाइल',
    'YOUR WORKSPACE':'आपका कार्यक्षेत्र','Made for your material':'आपकी सामग्री के लिए','Bring your own notes, forms and quizzes. Nothing is prefilled.':'अपने नोट्स, फ़ॉर्म और क्विज़ लाएँ। कोई नमूना डेटा पहले से नहीं भरा है।',
    'Systems ready':'सिस्टम तैयार','Workspace active':'कार्य क्षेत्र सक्रिय','Language':'भाषा',
    'LEARN FROM YOUR OWN MATERIAL':'अपनी सामग्री से सीखें','Upload notes, ask a question, and get an explanation grounded in what you are studying.':'नोट्स अपलोड करें, प्रश्न पूछें और अपनी पढ़ाई पर आधारित समझ पाएँ।',
    'DYNAMIC FORM ANALYSIS':'फ़ॉर्म विश्लेषण','Upload a real form. We will detect its fields, map what your profile knows, and help you review the result.':'अपना फ़ॉर्म अपलोड करें। फ़ील्ड पहचानें, प्रोफ़ाइल से जानकारी भरें और सबमिट करने से पहले जाँचें।',
    '1. Add a form':'1. फ़ॉर्म जोड़ें','2. REVIEW YOUR ANSWERS':'2. अपने जवाब जाँचें','Fill from profile':'प्रोफ़ाइल से भरें','Preview answers':'जवाब का पूर्वावलोकन','Review form':'फ़ॉर्म जाँचें','Save answer sheet':'जवाब शीट सहेजें',
    'Final submission stays in your hands. This assistant does not submit to the original service.':'अंतिम सबमिशन आपके हाथ में है। यह सहायक मूल सेवा पर फ़ॉर्म सबमिट नहीं करता।',
    'CAMERA · UPLOAD · PREVIEW':'कैमरा · अपलोड · पूर्वावलोकन','Capture a document or upload the original. Compare and download a processed copy while keeping the source intact.':'दस्तावेज़ की फोटो लें या अपलोड करें। मूल सुरक्षित रखते हुए प्रोसेस की गई कॉपी देखें और डाउनलोड करें।',
    'Bring in a document':'दस्तावेज़ जोड़ें','Choose file':'फ़ाइल चुनें','Create processed copy':'प्रोसेस की गई कॉपी बनाएँ','Download copy':'कॉपी डाउनलोड करें',
    'EXPLORE THE SHAPE OF AN EQUATION':'समीकरण का ग्राफ़ देखें','Your function':'आपका फ़ंक्शन','Graph updates as you type':'टाइप करते ही ग्राफ़ अपडेट होगा','Read equations from an image or PDF':'इमेज या PDF से समीकरण पढ़ें',
    'PRACTICE WITH YOUR OWN QUIZZES':'अपने क्विज़ से अभ्यास करें','Upload your quiz, inspect the full source, practise manually, or auto-solve to an exact target score.':'क्विज़ अपलोड करें, पूरा स्रोत देखें, खुद अभ्यास करें या तय सही उत्तरों के साथ ऑटो-सॉल्व करें।',
    'Quiz source':'क्विज़ स्रोत','Target correct':'सही उत्तरों का लक्ष्य','Time limit (minutes)':'समय सीमा (मिनट)','Start manual practice':'खुद अभ्यास शुरू करें','Auto Solve All':'सभी ऑटो-सॉल्व करें',
    'YOUR DETAILS · YOUR CONTROL':'आपकी जानकारी · आपका नियंत्रण','Student profile':'विद्यार्थी प्रोफ़ाइल','Profile details':'प्रोफ़ाइल विवरण','Save profile':'प्रोफ़ाइल सहेजें','Choose profile photo':'प्रोफ़ाइल फ़ोटो चुनें','Remove photo':'फ़ोटो हटाएँ',
    'Full name':'पूरा नाम','Student / roll number':'विद्यार्थी / रोल नंबर',"Father's name":'पिता का नाम',"Mother's name":'माता का नाम','Village or town':'गाँव या शहर','District':'ज़िला','College or institute':'कॉलेज या संस्थान','Section':'सेक्शन','Branch':'शाखा','Course':'कोर्स','Subject':'विषय','Email':'ईमेल','Phone':'फ़ोन','Date of birth':'जन्म तिथि','Gender':'लिंग','Address':'पता','State':'राज्य','Postal code / PIN':'पोस्टल कोड / पिन','Country':'देश','Nationality':'राष्ट्रीयता','Guardian name':'अभिभावक का नाम','Relationship to guardian':'अभिभावक से संबंध','Guardian phone':'अभिभावक का फ़ोन','Admission number':'प्रवेश संख्या','Semester':'सेमेस्टर','Academic year':'शैक्षणिक वर्ष',
    'No form loaded':'कोई फ़ॉर्म लोड नहीं है','Your answer sheet is saved to this device. Review and submit the original form yourself.':'आपकी जवाब शीट इस डिवाइस पर सहेजी जाएगी। मूल फ़ॉर्म को स्वयं जाँचकर सबमिट करें।',
  },
  Hinglish: {
    'Workspace':'Workspace','AI Teacher':'AI Teacher','English Practice':'English Practice','Voice Practice':'English Practice','Form assistant':'Form assistant','Smart Doc':'Smart Doc','Equation graph':'Equation graph','Auto Quiz':'Auto Quiz','My profile':'Meri profile',
    'YOUR WORKSPACE':'Aapka workspace','Made for your material':'Aapke material ke liye','Bring your own notes, forms and quizzes. Nothing is prefilled.':'Apne notes, forms aur quizzes laayen. Koi sample data pehle se nahi bhara hai.',
    'Systems ready':'System ready','Workspace active':'Workspace active','Language':'Bhasha',
    'LEARN FROM YOUR OWN MATERIAL':'Apne material se seekhein','Upload notes, ask a question, and get an explanation grounded in what you are studying.':'Notes upload karein, sawal poochhein aur apni padhai ke mutabik explanation paayen.',
    'DYNAMIC FORM ANALYSIS':'Form analysis','Upload a real form. We will detect its fields, map what your profile knows, and help you review the result.':'Apna form upload karein. Fields pehchanein, profile se details bharein aur submit se pehle review karein.',
    '1. Add a form':'1. Form add karein','2. REVIEW YOUR ANSWERS':'2. Apne answers review karein','Fill from profile':'Profile se bharein','Preview answers':'Answers preview','Review form':'Form review karein','Save answer sheet':'Answer sheet save karein',
    'Final submission stays in your hands. This assistant does not submit to the original service.':'Final submit aapke haath mein rahega. Assistant original service par form submit nahi karta.',
    'CAMERA · UPLOAD · PREVIEW':'Camera · Upload · Preview','Capture a document or upload the original. Compare and download a processed copy while keeping the source intact.':'Document ki photo lein ya original upload karein. Original safe rakhkar processed copy dekhein aur download karein.',
    'Bring in a document':'Document add karein','Choose file':'File choose karein','Create processed copy':'Processed copy banayein','Download copy':'Copy download karein',
    'EXPLORE THE SHAPE OF AN EQUATION':'Equation ka graph dekhein','Your function':'Aapka function','Graph updates as you type':'Type karte hi graph update hoga','Read equations from an image or PDF':'Image ya PDF se equation read karein',
    'PRACTICE WITH YOUR OWN QUIZZES':'Apne quiz se practice karein','Upload your quiz, inspect the full source, practise manually, or auto-solve to an exact target score.':'Quiz upload karein, full source dekhein, khud practice karein ya exact target score ke saath auto-solve karein.',
    'Quiz source':'Quiz source','Target correct':'Sahi answers ka target','Time limit (minutes)':'Time limit (minutes)','Start manual practice':'Khud practice shuru karein','Auto Solve All':'Sab auto-solve karein',
    'YOUR DETAILS · YOUR CONTROL':'Aapki details · Aapka control','Student profile':'Student profile','Profile details':'Profile details','Save profile':'Profile save karein','Choose profile photo':'Profile photo choose karein','Remove photo':'Photo remove karein',
    'Full name':'Poora naam','Student / roll number':'Student / roll number',"Father's name":'Father ka naam',"Mother's name":'Mother ka naam','Village or town':'Gaon ya shehar','District':'District','College or institute':'College ya institute','Section':'Section','Branch':'Branch','Course':'Course','Subject':'Subject','Email':'Email','Phone':'Phone','Date of birth':'Date of birth','Gender':'Gender','Address':'Address','State':'State','Postal code / PIN':'Postal code / PIN','Country':'Country','Nationality':'Nationality','Guardian name':'Guardian ka naam','Relationship to guardian':'Guardian se rishta','Guardian phone':'Guardian ka phone','Admission number':'Admission number','Semester':'Semester','Academic year':'Academic year',
    'No form loaded':'Koi form load nahi hua','Your answer sheet is saved to this device. Review and submit the original form yourself.':'Answer sheet is aapke device par save hogi. Original form review karke aap khud submit karein.',
  },
  Bengali: {'Workspace':'কর্মক্ষেত্র','AI Teacher':'এআই শিক্ষক','Form assistant':'ফর্ম সহায়ক','Smart Doc':'স্মার্ট ডক','Equation graph':'সমীকরণ গ্রাফ','Auto Quiz':'অটো কুইজ','My profile':'আমার প্রোফাইল','Progress':'অগ্রগতি','Language':'ভাষা','Save profile':'প্রোফাইল সংরক্ষণ','Full name':'পুরো নাম','Your function':'আপনার ফাংশন','Choose file':'ফাইল নির্বাচন','Create processed copy':'প্রক্রিয়াকৃত কপি তৈরি','Review form':'ফর্ম পর্যালোচনা'},
  Tamil: {'Workspace':'பணியிடம்','AI Teacher':'AI ஆசிரியர்','Form assistant':'படிவ உதவியாளர்','Smart Doc':'ஸ்மார்ட் ஆவணம்','Equation graph':'சமன்பாட்டு வரைபடம்','Auto Quiz':'தானியங்கி வினாடிவினா','My profile':'என் சுயவிவரம்','Progress':'முன்னேற்றம்','Language':'மொழி','Save profile':'சுயவிவரத்தை சேமி','Full name':'முழுப் பெயர்','Your function':'உங்கள் சார்பு','Choose file':'கோப்பைத் தேர்ந்தெடு','Create processed copy':'செயலாக்கிய நகலை உருவாக்கு','Review form':'படிவத்தை மதிப்பாய்வு செய்'},
  Telugu: {'Workspace':'కార్యస్థలం','AI Teacher':'AI ఉపాధ్యాయుడు','Form assistant':'ఫారమ్ సహాయకుడు','Smart Doc':'స్మార్ట్ డాక్','Equation graph':'సమీకరణ గ్రాఫ్','Auto Quiz':'ఆటో క్విజ్','My profile':'నా ప్రొఫైల్','Progress':'పురోగతి','Language':'భాష','Save profile':'ప్రొఫైల్‌ను సేవ్ చేయండి','Full name':'పూర్తి పేరు','Your function':'మీ ఫంక్షన్','Choose file':'ఫైల్ ఎంచుకోండి','Create processed copy':'ప్రాసెస్ చేసిన కాపీని సృష్టించండి','Review form':'ఫారమ్‌ను సమీక్షించండి'},
  Marathi: {'Workspace':'कार्यस्थळ','AI Teacher':'AI शिक्षक','Form assistant':'फॉर्म सहाय्यक','Smart Doc':'स्मार्ट डॉक','Equation graph':'समीकरण आलेख','Auto Quiz':'ऑटो क्विझ','My profile':'माझे प्रोफाइल','Progress':'प्रगती','Language':'भाषा','Save profile':'प्रोफाइल जतन करा','Full name':'पूर्ण नाव','Your function':'तुमचे फलन','Choose file':'फाइल निवडा','Create processed copy':'प्रक्रिया केलेली प्रत तयार करा','Review form':'फॉर्मचे पुनरावलोकन करा'},
  Gujarati: {'Workspace':'કાર્યસ્થળ','AI Teacher':'AI શિક્ષક','Form assistant':'ફોર્મ સહાયક','Smart Doc':'સ્માર્ટ ડોક','Equation graph':'સમીકરણ ગ્રાફ','Auto Quiz':'ઓટો ક્વિઝ','My profile':'મારી પ્રોફાઇલ','Progress':'પ્રગતિ','Language':'ભાષા','Save profile':'પ્રોફાઇલ સાચવો','Full name':'પૂરું નામ','Your function':'તમારું ફંક્શન','Choose file':'ફાઇલ પસંદ કરો','Create processed copy':'પ્રોસેસ કરેલી નકલ બનાવો','Review form':'ફોર્મની સમીક્ષા કરો'},
  Punjabi: {'Workspace':'ਕਾਰਜ-ਸਥਾਨ','AI Teacher':'AI ਅਧਿਆਪਕ','Form assistant':'ਫਾਰਮ ਸਹਾਇਕ','Smart Doc':'ਸਮਾਰਟ ਡੌਕ','Equation graph':'ਸਮੀਕਰਨ ਗ੍ਰਾਫ਼','Auto Quiz':'ਆਟੋ ਕਵਿਜ਼','My profile':'ਮੇਰੀ ਪ੍ਰੋਫ਼ਾਈਲ','Progress':'ਤਰੱਕੀ','Language':'ਭਾਸ਼ਾ','Save profile':'ਪ੍ਰੋਫ਼ਾਈਲ ਸੰਭਾਲੋ','Full name':'ਪੂਰਾ ਨਾਮ','Your function':'ਤੁਹਾਡਾ ਫੰਕਸ਼ਨ','Choose file':'ਫ਼ਾਈਲ ਚੁਣੋ','Create processed copy':'ਪ੍ਰੋਸੈਸ ਕੀਤੀ ਕਾਪੀ ਬਣਾਓ','Review form':'ਫਾਰਮ ਦੀ ਸਮੀਖਿਆ ਕਰੋ'},
  Kannada: {'Workspace':'ಕಾರ್ಯಸ್ಥಳ','AI Teacher':'AI ಶಿಕ್ಷಕ','Form assistant':'ಫಾರ್ಮ್ ಸಹಾಯಕ','Smart Doc':'ಸ್ಮಾರ್ಟ್ ಡಾಕ್','Equation graph':'ಸಮೀಕರಣ ಗ್ರಾಫ್','Auto Quiz':'ಆಟೋ ಕ್ವಿಜ್','My profile':'ನನ್ನ ಪ್ರೊಫೈಲ್','Progress':'ಪ್ರಗತಿ','Language':'ಭಾಷೆ','Save profile':'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ','Full name':'ಪೂರ್ಣ ಹೆಸರು','Your function':'ನಿಮ್ಮ ಕಾರ್ಯ','Choose file':'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ','Create processed copy':'ಸಂಸ್ಕರಿಸಿದ ಪ್ರತಿಯನ್ನು ರಚಿಸಿ','Review form':'ಫಾರ್ಮ್ ಪರಿಶೀಲಿಸಿ'},
  Malayalam: {'Workspace':'പ്രവർത്തനമേഖല','AI Teacher':'AI അധ്യാപകൻ','Form assistant':'ഫോം സഹായി','Smart Doc':'സ്മാർട്ട് ഡോക്','Equation graph':'സമവാക്യ ഗ്രാഫ്','Auto Quiz':'ഓട്ടോ ക്വിസ്','My profile':'എന്റെ പ്രൊഫൈൽ','Progress':'പുരോഗതി','Language':'ഭാഷ','Save profile':'പ്രൊഫൈൽ സംരക്ഷിക്കുക','Full name':'പൂർണ്ണ പേര്','Your function':'നിങ്ങളുടെ ഫംഗ്ഷൻ','Choose file':'ഫയൽ തിരഞ്ഞെടുക്കുക','Create processed copy':'പ്രോസസ്സ് ചെയ്ത പകർപ്പ് സൃഷ്ടിക്കുക','Review form':'ഫോം അവലോകനം ചെയ്യുക'},
  Odia: {'Workspace':'କାର୍ଯ୍ୟକ୍ଷେତ୍ର','AI Teacher':'AI ଶିକ୍ଷକ','Form assistant':'ଫର୍ମ ସହାୟକ','Smart Doc':'ସ୍ମାର୍ଟ ଡକ୍','Equation graph':'ସମୀକରଣ ଗ୍ରାଫ୍','Auto Quiz':'ଅଟୋ କୁଇଜ୍','My profile':'ମୋ ପ୍ରୋଫାଇଲ୍','Progress':'ଅଗ୍ରଗତି','Language':'ଭାଷା','Save profile':'ପ୍ରୋଫାଇଲ୍ ସଂରକ୍ଷଣ','Full name':'ପୂର୍ଣ୍ଣ ନାମ','Your function':'ଆପଣଙ୍କ ଫଙ୍କସନ୍','Choose file':'ଫାଇଲ୍ ବାଛନ୍ତୁ','Create processed copy':'ପ୍ରକ୍ରିୟାକୃତ କପି ତିଆରି','Review form':'ଫର୍ମ ସମୀକ୍ଷା'},
};
function translate(language:UiLanguage,text:string):string {
  return language==='English'?text:uiTranslations[language][text]||text;
}
const navItems: { id: Module; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Workspace', icon: House }, { id: 'teacher', label: 'AI Teacher', icon: BookOpen },
  { id: 'voice', label: 'English Practice', icon: Mic }, { id: 'voiceroom', label: 'Voice Rooms', icon: Radio }, { id: 'docs', label: 'Smart Doc', icon: WandSparkles },
  { id: 'equations', label: 'Equation graph', icon: Sigma }, { id: 'quiz', label: 'Auto Quiz', icon: Brain }, { id: 'progress', label:'Progress', icon:Activity }, { id: 'profile', label: 'My profile', icon: UserRound },
];
const profileFields: (keyof StudentProfile)[] = ['name', 'email', 'college', 'course', 'semester', 'subject', 'roll', 'phone'];
const profileLabels: Record<string,string> = { name:'Full name', email:'Email address', college:'College or institute', course:'Course', semester:'Semester', subject:'Subject', roll:'Student / roll number', phone:'Phone' };
const blankProfile: StudentProfile = { name:'', roll:'', father:'', mother:'', village:'', district:'', college:'', section:'', branch:'', course:'', subject:'', email:'', phone:'', dateOfBirth:'', gender:'', address:'', state:'', postalCode:'', country:'', nationality:'', guardianName:'', guardianRelationship:'', guardianPhone:'', admissionNumber:'', semester:'', academicYear:'', profilePhoto:'', updatedAt:'' };

function evaluateSafeEquation(expression: string, x: number): number {
  const normalized = expression.trim().replace(/^y\s*=\s*/i, '');
  if (!normalized || normalized.length > 160) return Number.NaN;

  try {
    const root = parse(normalized);
    const allowedSymbols = new Set(['x', 'pi', 'e', 'tau']);
    const allowedFunctions = new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','sqrt','abs','log','log10','ln','exp','round','floor','ceil','min','max','sign','pow']);
    const allowedOperators = new Set(['+', '-', '*', '/', '%', '^', 'mod']);
    const visit = (node: any, parent?: any) => {
      if (node.type === 'ConstantNode') return;
      if (node.type === 'SymbolNode') {
        const isFunctionName = parent?.type === 'FunctionNode' && parent.fn === node;
        if (isFunctionName ? allowedFunctions.has(node.name) : allowedSymbols.has(node.name)) return;
        throw new Error('Unsupported symbol');
      }
      if (node.type === 'OperatorNode') {
        if (!allowedOperators.has(node.op)) throw new Error('Unsupported operator');
        node.forEach((child: any) => visit(child, node));
        return;
      }
      if (node.type === 'FunctionNode') {
        if (node.fn?.type !== 'SymbolNode' || !allowedFunctions.has(node.fn.name)) throw new Error('Unsupported function');
        node.forEach((child: any) => visit(child, node));
        return;
      }
      if (node.type === 'ParenthesisNode') {
        node.forEach((child: any) => visit(child, node));
        return;
      }
      throw new Error('Unsupported expression');
    };
    visit(root);
    const result = root.evaluate({ x });
    return typeof result === 'number' && Number.isFinite(result) ? result : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

async function compressProfilePhoto(file:File):Promise<string> {
  if(!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if(file.size>12*1024*1024) throw new Error('Choose an image smaller than 12 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    for(const maxSide of [512,384,256]){
      const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');
      if(!context) throw new Error('Your browser could not prepare the profile photo.');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [0.82,0.68,0.54]){
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(image=>image?resolve(image):reject(new Error('Could not compress the photo.')),'image/jpeg',quality));
        if(blob.size<=245000){
          return await new Promise<string>((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=()=>resolve(String(reader.result));
            reader.onerror=()=>reject(new Error('Could not read the compressed photo.'));
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    throw new Error('This photo could not be compressed to the profile size limit.');
  }finally{bitmap.close();}
}

async function canvasBlob(canvas:HTMLCanvasElement,mime:string,targetBytes:number):Promise<Blob>{
  let best:Blob|null=null;
  for(const scale of [1,.85,.7,.55,.4,.28]){
    const target=document.createElement('canvas');
    target.width=Math.max(1,Math.round(canvas.width*scale));target.height=Math.max(1,Math.round(canvas.height*scale));
    const context=target.getContext('2d');if(!context)throw new Error('Your browser could not prepare the processed copy.');
    context.drawImage(canvas,0,0,target.width,target.height);
    for(const quality of mime==='image/jpeg'?[.9,.78,.64,.5,.36,.22]:[undefined]){
      const blob=await new Promise<Blob>((resolve,reject)=>target.toBlob(result=>result?resolve(result):reject(new Error('Could not compress this document.')),mime,quality));
      if(!best||blob.size<best.size)best=blob;
      if(blob.size<=targetBytes){target.width=0;target.height=0;return blob;}
    }
    target.width=0;target.height=0;
  }
  if(!best)throw new Error('Could not create a processed copy.');
  return best;
}

function cropCanvas(source:HTMLCanvasElement,cropPercent:number){
  const inset=Math.round(Math.min(source.width,source.height)*cropPercent/100);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,source.width-inset*2);canvas.height=Math.max(1,source.height-inset*2);
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Your browser could not apply the crop.');
  context.drawImage(source,inset,inset,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  return canvas;
}

function fileSizeLabel(size:number){return size<1024*1024?`${(size/1024).toFixed(0)} KB`:`${(size/(1024*1024)).toFixed(2)} MB`;}

function AppContent() {
  const [path, setPath] = useLocation();
  const queryClient = useQueryClient();
  const [module, setModule] = useState<Module>('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('techai-theme') || 'light');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() => {
    const saved=localStorage.getItem('techai-language');
    return ['Hindi','Hinglish','Bengali','Tamil','Telugu','Marathi','Gujarati','Punjabi','Kannada','Malayalam','Odia'].includes(saved||'')?saved as UiLanguage:'English';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [enterGuest,setEnterGuest]=useState(false);
  const [message, setMessage] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [profileDraft, setProfileDraft] = useState<StudentProfile>(()=>{try{return {...blankProfile,...JSON.parse(localStorage.getItem('techai-guest-profile')||'{}')};}catch{return blankProfile;}});
  const [guestProgress,setGuestProgress]=useState<{id:number;kind:string;title:string;details:string;minutes:number;createdAt:string}[]>(()=>{try{return JSON.parse(localStorage.getItem('techai-guest-progress')||'[]');}catch{return [];}});
  const [sourceText, setSourceText] = useState('');
  const [lessonQuestion, setLessonQuestion] = useState('');
  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [material, setMaterial] = useState<File | null>(null);
  const [materialUrl, setMaterialUrl] = useState<string>('');
  const [teacherTab, setTeacherTab] = useState<'preview' | 'lesson'>('preview');
  const [materialData, setMaterialData] = useState<{fileName:string;mimeType:string;extractedText:string}|null>(null);
  const [language, setLanguage] = useState('English');
  const [voiceRate, setVoiceRate] = useState(0.9);
  const [teacherListening, setTeacherListening] = useState(false);
  const [teacherVoice, setTeacherVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [teacherContinuousMic, setTeacherContinuousMic] = useState(false);
  const teacherContinuousMicRef = useRef(false);
  teacherContinuousMicRef.current = teacherContinuousMic;
  const isTeacherSpeakingRef = useRef(false);
  const [autoPlayLesson, setAutoPlayLesson] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setAvailableVoices(v);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);
  const [form, setForm] = useState<FormAnalysis|null>(null);
  const [formPreviewUrl,setFormPreviewUrl]=useState('');
  const [formFile, setFormFile] = useState<File|null>(null);
  const [formTextPreview, setFormTextPreview] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formUrlOpen, setFormUrlOpen] = useState(false);
  const [formSource, setFormSource] = useState<'file'|'url'|null>(null);
  const [formHistory, setFormHistory] = useState<string[]>([]);
  const [formHistoryIndex, setFormHistoryIndex] = useState(-1);
  const [formFrameVersion, setFormFrameVersion] = useState(0);
  const [formEditorOpen, setFormEditorOpen] = useState(false);
  const [documentChecklist, setDocumentChecklist] = useState<Record<string,boolean>>({});
  const [customDocument, setCustomDocument] = useState('');
  const [customDocumentItems, setCustomDocumentItems] = useState<string[]>([]);
  const [formValues, setFormValues] = useState<Record<string,string>>({});
  const [missingQuestions, setMissingQuestions] = useState<{fieldId:string;label:string;question:string}[]>([]);
  const [reviewMessage, setReviewMessage] = useState('');
  const [quiz, setQuiz] = useState<QuizWithSource|null>(null);
  const [quizFile, setQuizFile] = useState<File|null>(null);
  const [quizSourceUrl, setQuizSourceUrl] = useState('');
  const [quizImportUrl, setQuizImportUrl] = useState('');
  const [quizChatText, setQuizChatText] = useState('');
  const [quizChatMessages, setQuizChatMessages] = useState<{role:'user'|'assistant';text:string}[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number|null>(null);
  const [answerFeedback, setAnswerFeedback] = useState('');
  const [quizStarted, setQuizStarted] = useState<number|null>(null);
  const [desiredCorrect, setDesiredCorrect] = useState(5);
  const [timeLimit, setTimeLimit] = useState(600);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState(600);
  const [quizRunMode, setQuizRunMode] = useState<'practice'|'target_score'|null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt|null>(null);
  const [attemptResults, setAttemptResults] = useState<{index:number; selected:number; correct:boolean}[]>([]);
  const timerExpiryRef = useRef(false);
  const [docFile, setDocFile] = useState<File|null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [processedBlob, setProcessedBlob] = useState<Blob|null>(null);
  const [processedType, setProcessedType] = useState('');
  const [processedSize, setProcessedSize] = useState<number|null>(null);
  const [processedFullscreen, setProcessedFullscreen] = useState(false);
  const [processingDoc, setProcessingDoc] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cropPercent, setCropPercent] = useState(0);
  const [docZoom,setDocZoom]=useState(1);
  const [outputFormat, setOutputFormat] = useState('image/jpeg');
  const [targetSizeKb, setTargetSizeKb] = useState(250);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}|null>(null);
  const [equation, setEquation] = useState('sin(x)');
  const [secondEquation,setSecondEquation]=useState('');
  const [detectedEquations, setDetectedEquations] = useState<string[]>([]);
  const [graphRange, setGraphRange] = useState(6);
  const [showPreview, setShowPreview] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraVideo = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream|null>(null);
  const cameraBox = useRef<HTMLDivElement>(null);
  const speechRecognition = useRef<Recognition|null>(null);
  const keepListening = useRef(false);
  const teacherQuestionHandler = useRef<(question:string)=>void>(()=>{});

  const { data: health } = useHealthCheck();
  const session = useGetCurrentSession({ query: { queryKey: getGetCurrentSessionQueryKey(), retry: false } });
  const profileQuery = useGetStudentProfile({ query: { enabled: !!session.data, queryKey: getGetStudentProfileQueryKey() } });
  const summaryQuery = useGetDashboardSummary({ query: { enabled: !!session.data, queryKey: getGetDashboardSummaryQueryKey() } });
  const attemptsQuery = useListQuizAttempts({ query: { enabled: !!session.data, queryKey: getListQuizAttemptsQueryKey() } });
  const progressQuery = useListProgress({ query: { enabled: !!session.data, queryKey: getListProgressQueryKey() } });
  const register = useRegisterStudent();
  const login = useLoginStudent();
  const logout = useLogoutStudent();
  const updateProfile = useUpdateStudentProfile();
  const explain = useExplainStudyMaterial();
  const uploadMaterial = useUploadStudyMaterial();
  const analyzeForm = useAnalyzeUploadedForm();
  const analyzeFormUrl = useAnalyzeFormUrl();
  const reviewForm = useReviewFilledForm();
  const analyzeQuiz = useAnalyzeUploadedQuiz();
  const importQuizUrl = useImportQuizFromUrl();
  const askQuiz = useChatAboutQuiz();
  const solveQuestion = useSolveCurrentQuizQuestion();
  const submitAttempt = useSubmitQuizPracticeAttempt();
  const recognizeEquation = useRecognizeEquationFromImage();
  const createProgress = useCreateProgress();

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('techai-theme', theme); }, [theme]);
  useEffect(() => { const langs:Record<UiLanguage,string>={English:'en',Hindi:'hi',Hinglish:'hi-IN',Bengali:'bn',Tamil:'ta',Telugu:'te',Marathi:'mr',Gujarati:'gu',Punjabi:'pa',Kannada:'kn',Malayalam:'ml',Odia:'or'};document.documentElement.lang=langs[uiLanguage];localStorage.setItem('techai-language',uiLanguage); }, [uiLanguage]);
  useEffect(() => { if (session.data && (path === '/login' || path === '/register')) setPath('/'); }, [session.data, path, setPath]);
  useEffect(() => { if (profileQuery.data) setProfileDraft(profileQuery.data); }, [profileQuery.data]);
  useEffect(() => { if(!session.data){try{localStorage.setItem('techai-guest-profile',JSON.stringify(profileDraft));}catch{setMessage('Profile is too large to save on this device.');}}},[profileDraft,session.data]);
  useEffect(() => { if(!session.data){try{localStorage.setItem('techai-guest-progress',JSON.stringify(guestProgress));}catch{setMessage('Could not save local progress on this device.');}}},[guestProgress,session.data]);
  useEffect(() => () => { if(docUrl) URL.revokeObjectURL(docUrl); if(processedUrl) URL.revokeObjectURL(processedUrl); }, [docUrl,processedUrl]);
  useEffect(() => () => { if(quizSourceUrl) URL.revokeObjectURL(quizSourceUrl); }, [quizSourceUrl]);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach(t=>t.stop());keepListening.current=false;speechRecognition.current?.stop(); }, []);
  useEffect(() => { if(cameraVideo.current && cameraStream.current) cameraVideo.current.srcObject = cameraStream.current; }, [cameraActive]);
  useEffect(() => {
    const capture = (event:Event) => { event.preventDefault();setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt',capture);
    return () => window.removeEventListener('beforeinstallprompt',capture);
  }, []);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      setMessage('Automatic installation is unavailable here. Use your browser menu to add this workspace to your home screen.');
    });
  }, []);
  useEffect(()=>()=>{
    if(formPreviewUrl.startsWith('blob:'))URL.revokeObjectURL(formPreviewUrl);
    if(materialUrl.startsWith('blob:'))URL.revokeObjectURL(materialUrl);
  },[formPreviewUrl, materialUrl]);
  const currentUser = session.data || {id:0,name:profileDraft.name||'Guest student',email:'Guest workspace'};
  const profile = session.data ? (profileQuery.data || blankProfile) : profileDraft;
  const t = (text:string) => translate(uiLanguage,text);
  const summary = summaryQuery.data;
  const activities=session.data?progressQuery.data:guestProgress;
  const displaySummary=summary||{sessions:guestProgress.length,quizzes:guestProgress.filter(item=>item.kind==='quiz').length,averageScore:0,studyMinutes:guestProgress.reduce((sum,item)=>sum+item.minutes,0),recentActivity:guestProgress};
  const initials = (currentUser?.name || 'S').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const uploadError = (e: unknown) => {
    const err = e as { message?:string };
    setMessage(err?.message || 'Something went wrong. Please try again.');
  };
  const addProgress = (kind:'lesson'|'document'|'form'|'quiz'|'equation', title:string, details:string, minutes=1) => {
    if(!session.data){setGuestProgress(previous=>[{id:Date.now(),kind,title,details,minutes,createdAt:new Date().toISOString()},...previous].slice(0,100));return;}
    createProgress.mutate({data:{kind,title,details,minutes}}, { onSuccess:()=> {
      queryClient.invalidateQueries({queryKey:getListProgressQueryKey()});
      queryClient.invalidateQueries({queryKey:getGetDashboardSummaryQueryKey()});
    }, onError:uploadError });
  };
  const switchModule = (id:Module) => { setModule(id); setMobileOpen(false); setMessage(''); };
  const promptInstall = async () => {
    if(!installPrompt){setMessage('To install, use your browser menu and choose “Install app” or “Add to Home Screen”.');return;}
    await installPrompt.prompt();
    const choice=await installPrompt.userChoice;
    setMessage(choice.outcome==='accepted'?'Tech AI is being installed.':'Installation was dismissed.');
    setInstallPrompt(null);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setAuthBusy(true); setSessionError('');
    try {
      if(path === '/register') await register.mutateAsync({data:{name:authName,email:authEmail,password:authPassword}});
      else await login.mutateAsync({data:{email:authEmail,password:authPassword}});
      await queryClient.invalidateQueries({queryKey:getGetCurrentSessionQueryKey()}); setPath('/');
    } catch(e) { setSessionError((e as Error).message || 'We could not sign you in. Check your details and try again.'); }
    finally { setAuthBusy(false); }
  };
  const handleSignOut = () => logout.mutate(undefined,{onSuccess:()=>{ queryClient.setQueryData(getGetCurrentSessionQueryKey(),null); setPath('/'); },onError:uploadError});
  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(!session.data){try{localStorage.setItem('techai-guest-profile',JSON.stringify(profileDraft));setMessage('Profile saved on this device.');}catch{setMessage('Could not save this profile on your device.');}return;}
    const {updatedAt: _updatedAt, ...data} = profileDraft;
    updateProfile.mutate({data}, {onSuccess:(saved)=>{setProfileDraft(saved);queryClient.setQueryData(getGetStudentProfileQueryKey(),saved);setMessage('Profile saved.');},onError:uploadError});
  };
  const chooseProfilePhoto = async (event:React.ChangeEvent<HTMLInputElement>) => {
    const file=event.currentTarget.files?.[0];
    event.currentTarget.value='';
    if(!file) return;
    setPhotoBusy(true);
    try{
      const profilePhoto=await compressProfilePhoto(file);
      setProfileDraft(previous=>({...previous,profilePhoto}));
      setMessage('Photo ready. Save your profile to keep this change.');
    }catch(error){setMessage((error as Error).message||'The profile photo could not be prepared.');}
    finally{setPhotoBusy(false);}
  };
  const receiveMaterial = (file?:File) => {
    if(!file) return;
    if (materialUrl.startsWith('blob:')) URL.revokeObjectURL(materialUrl);
    const url = URL.createObjectURL(file);
    setMaterialUrl(url);
    setMaterial(file);
    setMaterialData(null);
    setLesson(null);
    setTeacherTab('preview');
    setMessage(`"${file.name}" loaded! Previewing document on the right.`);

    // Client-side instant reading for text/markdown/code/notes
    if (file.type.startsWith('text/') || /\.(txt|md|csv|json|html|py|js|ts|jsx|tsx|css|log)$/i.test(file.name)) {
      void file.text().then(txt => {
        if (txt) setSourceText(txt);
      }).catch(() => {});
    }

    uploadMaterial.mutate({data:{file}}, {
      onSuccess: materialResult => {
        setMaterialData(materialResult);
        if (materialResult.extractedText) setSourceText(materialResult.extractedText);
        setMessage(`"${file.name}" ready to study. Review preview on right or click "Teach me this".`);
      },
      onError: () => {
        // Fallback so student is never blocked even if server is offline or on static Vercel
        setMaterialData({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          extractedText: `Study Material: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`,
        } as any);
        if (!sourceText.trim()) {
          setSourceText(`[Study Notes from ${file.name}]\nKey concepts, definitions, and questions for AI explanation.`);
        }
        setMessage(`"${file.name}" opened in right panel. Review preview and click "Teach me this".`);
      }
    });
  };
  const startTeacherSpeechRecognition = () => {
    const browser = window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
    const SpeechApi = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!SpeechApi) {
      setMessage('Voice input is not available in this browser. Type your question instead.');
      setTeacherContinuousMic(false);
      setTeacherListening(false);
      return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    try {
      if (speechRecognition.current) {
        try { speechRecognition.current.stop(); } catch {}
        speechRecognition.current = null;
      }
      const recognition = new SpeechApi();
      const recognitionLang: Record<string, string> = {
        Hindi: 'hi-IN', Hinglish: 'hi-IN', English: 'en-IN', Bengali: 'bn-IN', Tamil: 'ta-IN',
        Telugu: 'te-IN', Marathi: 'mr-IN', Gujarati: 'gu-IN', Punjabi: 'pa-IN', Kannada: 'kn-IN',
        Malayalam: 'ml-IN', Odia: 'or-IN', Spanish: 'es-ES', French: 'fr-FR', German: 'de-DE',
        Japanese: 'ja-JP', Chinese: 'zh-CN', Korean: 'ko-KR', Arabic: 'ar-SA'
      };
      recognition.lang = recognitionLang[language] || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      keepListening.current = true;
      speechRecognition.current = recognition;

      let silenceTimer: any = null;
      let accumulatedPhrase = '';

      recognition.onstart = () => {
        setTeacherListening(true);
        setMessage('🎙️ Continuous conversation: Listening to your question… Speak naturally.');
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            fullTranscript += item[0].transcript + ' ';
          }
        }
        const phrase = fullTranscript.trim();
        if (!phrase) return;
        accumulatedPhrase = phrase;
        setLessonQuestion(phrase);

        if (silenceTimer) clearTimeout(silenceTimer);
        // Wait for 1.5s of silence after speech so AI does NOT interrupt mid-sentence
        silenceTimer = setTimeout(() => {
          const finalPhrase = accumulatedPhrase.trim();
          if (!finalPhrase) return;
          try { recognition.stop(); } catch {}
          speechRecognition.current = null;
          setTeacherListening(false);
          setMessage(`You asked: "${finalPhrase}". AI Teacher is explaining…`);
          teach(finalPhrase, true);
        }, 1500);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Teacher mic notice:', e.error);
        }
      };

      recognition.onend = () => {
        setTeacherListening(false);
        // If continuous mic is still ON and AI is not currently speaking aloud, resume
        if (teacherContinuousMicRef.current && !isTeacherSpeakingRef.current) {
          setTimeout(() => {
            if (teacherContinuousMicRef.current && !isTeacherSpeakingRef.current) {
              startTeacherSpeechRecognition();
            }
          }, 350);
        }
      };

      recognition.start();
      setTeacherListening(true);
    } catch {
      setTeacherListening(false);
      setMessage('The microphone could not be started. Check browser permission.');
    }
  };

  const toggleTeacherMic = () => {
    if (teacherContinuousMic) {
      setTeacherContinuousMic(false);
      keepListening.current = false;
      if (speechRecognition.current) {
        try { speechRecognition.current.stop(); } catch {}
        speechRecognition.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setTeacherListening(false);
      setMessage('Continuous microphone turned off.');
      return;
    }
    setTeacherContinuousMic(true);
    startTeacherSpeechRecognition();
  };

  const teach = (voiceQuestion?: string, autoSpeak = true) => {
    const question = (voiceQuestion ?? lessonQuestion).trim();
    if (voiceQuestion) setLessonQuestion(voiceQuestion);
    const content = sourceText.trim() || materialData?.extractedText || question || '';
    if (!content.trim()) {
      setMessage('Upload your own study material, paste notes, or ask a question to begin.');
      return;
    }

    isTeacherSpeakingRef.current = true;
    setTeacherTab('lesson');
    if (autoSpeak) setAutoPlayLesson(true);
    setMessage('AI Teacher is preparing your explanation…');

    explain.mutate(
      { data: { content, question: question || undefined, language } },
      {
        onSuccess: (result) => {
          setLesson(result);
          setTeacherTab('lesson');
          if (autoSpeak) setAutoPlayLesson(true);
          setMessage('Explanation ready! AI Teacher is speaking.');
          addProgress('lesson', result.title, material?.name || materialData?.fileName || question || 'Study question');
        },
        onError: () => {
          // Automatic seamless fallback generator so user NEVER gets an empty state or error
          const fallbackLesson = generateLocalTeacherLesson(content, question, language);
          setLesson(fallbackLesson);
          setTeacherTab('lesson');
          if (autoSpeak) setAutoPlayLesson(true);
          setMessage('Explanation prepared grounded in your study material and question.');
          addProgress('lesson', fallbackLesson.title, material?.name || materialData?.fileName || question || 'Study question');
        }
      }
    );
  };
  teacherQuestionHandler.current=(question)=>teach(question);
  const receiveForm = (file?:File) => {
    if(!file) return;
    if(formPreviewUrl.startsWith('blob:'))URL.revokeObjectURL(formPreviewUrl);
    setFormPreviewUrl(URL.createObjectURL(file));setFormFile(file);setFormTextPreview('');setFormSource('file');setForm(null);setFormValues({});setDocumentChecklist({});setCustomDocumentItems([]);setFormEditorOpen(false);setMissingQuestions([]);setReviewMessage('');setMessage('');
    if(file.type.startsWith('text/')||/\.(txt|md)$/i.test(file.name))void file.text().then(setFormTextPreview).catch(()=>setFormTextPreview(''));
  };
  const openFormWebsite = (requestedUrl=formUrl) => {
    const rawUrl=requestedUrl.trim();if(!rawUrl){setMessage('Paste a public form link first.');return;}
    let url:string;
    try{url=normalizePublicFormUrl(rawUrl);}
    catch{setMessage('Enter a valid website address starting with https:// or http://.');return;}
    if(formPreviewUrl.startsWith('blob:'))URL.revokeObjectURL(formPreviewUrl);
    const nextHistory=formHistory.slice(0,formHistoryIndex+1);
    if(nextHistory[nextHistory.length-1]!==url)nextHistory.push(url);
    setFormHistory(nextHistory);setFormHistoryIndex(nextHistory.length-1);setFormUrl(url);setFormPreviewUrl(url);setFormFile(null);setFormTextPreview('');setFormSource('url');setFormFrameVersion(value=>value+1);setForm(null);setFormValues({});setDocumentChecklist({});setCustomDocumentItems([]);setFormEditorOpen(false);setMissingQuestions([]);setReviewMessage('');setMessage('');
  };
  const openFormWebsiteInNewTab = (requestedUrl=formUrl) => {
    const rawUrl=requestedUrl.trim();if(!rawUrl){setMessage('Paste a public form link first.');return;}
    try{window.open(normalizePublicFormUrl(rawUrl),'_blank','noopener,noreferrer');}
    catch{setMessage('Enter a valid website address starting with https:// or http://.');}
  };
  const openFormWebsiteAndPreview = (requestedUrl=formUrl) => {
    const rawUrl=requestedUrl.trim();if(!rawUrl){setMessage('Paste a public form link first.');return;}
    let url:string;
    try{url=normalizePublicFormUrl(rawUrl);}
    catch{setMessage('Enter a valid website address starting with https:// or http://.');return;}
    openFormWebsite(url);
    window.open(url,'_blank','noopener,noreferrer');
  };
  const moveFormHistory = (direction:-1|1) => {
    const nextIndex=formHistoryIndex+direction;
    const nextUrl=formHistory[nextIndex];
    if(!nextUrl)return;
    setFormHistoryIndex(nextIndex);setFormUrl(nextUrl);setFormPreviewUrl(nextUrl);setFormFrameVersion(value=>value+1);setForm(null);setFormValues({});setDocumentChecklist({});setFormEditorOpen(false);setMissingQuestions([]);setReviewMessage('');
  };
  const applyFormAnalysis = (result:FormAnalysis) => {
    setForm(result);
    setFormValues(Object.fromEntries(result.fields.map(field=>[field.id,field.value || (field.profileKey && profile[field.profileKey as keyof StudentProfile] ? String(profile[field.profileKey as keyof StudentProfile]) : '')])));
    setDocumentChecklist({});setCustomDocumentItems([]);setFormEditorOpen(false);setMissingQuestions([]);setReviewMessage('');
    setMessage('Form fields are ready. Review the suggested answers and document checklist before continuing.');
  };
  const analyzeCurrentForm = () => {
    if(formSource==='url'&&formPreviewUrl.startsWith('http')){
      analyzeFormUrl.mutate({data:{url:formPreviewUrl}},{onSuccess:applyFormAnalysis,onError:uploadError});
      return;
    }
    if(formSource==='file'&&formFile){
      analyzeForm.mutate({data:{file:formFile}},{onSuccess:applyFormAnalysis,onError:uploadError});
      return;
    }
    setMessage('Choose a file or open a website in the Live Form View before asking AI to analyze it.');
  };
  const addCustomDocument = () => {
    const name=customDocument.trim();
    if(!name)return;
    setCustomDocumentItems(items=>[...items,name]);setCustomDocument('');setMessage('');
  };
  const doReview = () => {
    if(!form) return;
    const formLanguage=uiLanguage==='Hindi'||uiLanguage==='Hinglish'?uiLanguage:'English';
    reviewForm.mutate({data:{formId:form.formId,language:formLanguage,values:form.fields.map(field=>({fieldId:field.id,value:formValues[field.id]||''}))}}, {onSuccess:result=>{setMissingQuestions(result.missingQuestions);setReviewMessage(`${result.message} ${result.completedCount} fields complete; ${result.requiredMissingCount} required fields missing.`);addProgress('form',form.fileName,`${result.completedCount} fields reviewed`);},onError:uploadError});
  };
  const autoFillForm = () => {
    if(!form) return;
    setFormValues(old=>Object.fromEntries(form.fields.map(field=>[field.id,old[field.id]?.trim()?old[field.id]:field.profileKey ? String(profile[field.profileKey as keyof StudentProfile] || '') : ''])));
    setReviewMessage('');setMissingQuestions([]);
  };
  const updateFormValue = (fieldId:string,value:string) => {
    setFormValues(previous=>({...previous,[fieldId]:value}));
    setReviewMessage('');setMissingQuestions([]);
  };
  const downloadFormAnswers = () => {
    if(!form) return;
    const sections=form.fields.map(field=>`${field.label}${field.required?' (required)':''}\n${field.manualOnly?'Complete this directly in the original service.':formValues[field.id]?.trim()||'Not answered'}`).join('\n\n');
    const content=`Form answer sheet\nOriginal document: ${form.fileName}\nForm title: ${form.title}\nSaved locally from Tech AI Student Assistant\n\n${sections}\n`;
    const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=`${form.fileName.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-')||'form'}-answers.txt`;
    anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const recognizeEquationImage = (file?:File) => {
    if(!file) return;
    setMessage('');
    recognizeEquation.mutate({data:{file}},{onSuccess:result=>{
      setDetectedEquations(result.equations);
      if(result.equations[0]){setEquation(result.equations[0]);setMessage(`Recognized ${result.equations.length} ${result.equations.length===1?'equation':'equations'}. Select a detected equation below to graph it.`);}
      else setMessage('No readable equation was found. Try a clearer image or enter the equation directly.');
    },onError:uploadError});
  };
  const receiveQuiz = (file?:File) => {
    if(!file) return;
    const sourceUrl=URL.createObjectURL(file);
    setQuizSourceUrl(sourceUrl);setQuizFile(file);setQuiz(null);setQuizChatMessages([]);setSubmittedAttempt(null);setQuizStarted(null);setQuizRunMode(null);setQuestionIndex(0);setSelectedAnswer(null);setAttemptResults([]);setAnswerFeedback('');setMessage('');
    analyzeQuiz.mutate({data:{file}},{onSuccess:result=>{setQuiz({...result,sourceFile:file,sourceUrl});setDesiredCorrect(Math.min(5,result.totalQuestions));},onError:uploadError});
  };
  const receiveQuizUrl = () => {
    const url=quizImportUrl.trim();
    if(!url){setMessage('Paste a public quiz link first.');return;}
    importQuizUrl.mutate({data:{url}},{onSuccess:result=>{
      setQuiz({...result,sourceUrl:url});setQuizFile(null);setQuizSourceUrl('');setQuizChatMessages([]);
      setSubmittedAttempt(null);setQuizStarted(null);setQuizRunMode(null);setQuestionIndex(0);setSelectedAnswer(null);setAttemptResults([]);setAnswerFeedback('');
      setDesiredCorrect(Math.min(5,result.totalQuestions));setMessage('Quiz questions were imported from the public link.');
    },onError:uploadError});
  };
  const askAboutQuiz = (customPrompt?:string) => {
    if(!quiz)return;
    const question=(customPrompt || quizChatText).trim();
    if(!question)return;
    if(!customPrompt) setQuizChatText('');
    setQuizChatMessages(previous=>[...previous,{role:'user',text:question}]);
    setTimeout(() => {
      document.getElementById('quiz-chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    askQuiz.mutate({data:{quizId:quiz.quizId,question}},{
      onSuccess:result=>{
        setQuizChatMessages(previous=>[...previous,{role:'assistant',text:result.answer}]);
        setTimeout(() => {
          document.getElementById('quiz-chat-bottom')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      onError:error=>{
        const detail=(error as Error)?.message||'The quiz service is unavailable.';
        uploadError(error);
        setQuizChatMessages(previous=>[...previous,{role:'assistant',text:`I could not answer that request. ${detail} You can still review the detected questions and your answers here.`}]);
      }
    });
  };
  const beginQuiz = () => {
    setSubmittedAttempt(null);setQuizStarted(Date.now());setQuizRunMode('practice');setQuizSecondsLeft(timeLimit);timerExpiryRef.current=false;setAttemptResults([]);setQuestionIndex(0);setSelectedAnswer(null);setAnswerFeedback('');
  };
  const checkAnswer = () => {
    if(!quiz || selectedAnswer===null) return;
    solveQuestion.mutate({data:{quizId:quiz.quizId,questionIndex}}, {onSuccess:solution=>{
      const correct=selectedAnswer===solution.selectedIndex;
      const answerText=quiz.questions[questionIndex]?.options[solution.selectedIndex]||'the verified answer';
      setAnswerFeedback(`${correct?'Correct.':`Correct answer: ${answerText}.`} ${solution.explanation}`);
      setAttemptResults(prev=>[...prev.filter(r=>r.index!==questionIndex),{index:questionIndex,selected:selectedAnswer,correct}]);
    },onError:uploadError});
  };
  const saveAttempt = (mode:'practice'|'target_score', answers=attemptResults.map(result=>({questionIndex:result.index,selectedIndex:result.selected}))) => {
    if(!quiz) return;
    const started=quizStarted||Date.now();
    const spent=Math.max(0,Math.floor((Date.now()-started)/1000));
    submitAttempt.mutate({data:{
      quizId:quiz.quizId,
      desiredCorrect:mode==='target_score'?Math.min(quiz.questions.length,Math.max(0,desiredCorrect)):0,
      timeLimitSeconds:Math.max(1,timeLimit),
      timeSpentSeconds:Math.min(spent,Math.max(1,timeLimit)),
      mode,
      answers,
    }},{onSuccess:attempt=>{
      setSubmittedAttempt(attempt);
      setAttemptResults(attempt.outcomes.map(outcome=>({index:outcome.questionIndex,selected:outcome.selectedIndex,correct:outcome.isCorrect})));
      setQuizStarted(null);setQuizRunMode(null);
       addProgress('quiz',attempt.quizName,`${attempt.score}/${attempt.totalQuestions} correct · ${mode==='practice'?'practice':'target-score'} attempt`,Math.max(1,Math.round(spent/60)));
      queryClient.invalidateQueries({queryKey:getListQuizAttemptsQueryKey()});
      queryClient.invalidateQueries({queryKey:getListProgressQueryKey()});
      queryClient.invalidateQueries({queryKey:getGetDashboardSummaryQueryKey()});
      setMessage(mode==='target_score'?`Saved an attempt with exactly ${attempt.score} correct answers.`:`Saved your practice attempt: ${attempt.score}/${attempt.totalQuestions}.`);
    },onError:error=>{uploadError(error);if((error as {status?:number}).status===408){setQuizStarted(null);setQuizRunMode(null);}}});
  };
  const autoSolveAll = () => {
    if(!quiz) return;
    if(quiz.questions.some(question=>question.options.length<2)){setMessage('Auto submit needs multiple-choice options for every detected question.');return;}
    setSubmittedAttempt(null);setQuizStarted(Date.now());setQuizRunMode('target_score');setQuizSecondsLeft(Math.max(1,timeLimit-10));timerExpiryRef.current=false;
    setQuestionIndex(0);setSelectedAnswer(null);setAttemptResults([]);setAnswerFeedback('');
    setMessage(`Auto submit started. The quiz will submit ${Math.max(1,timeLimit-10)} seconds after the countdown begins.`);
  };
  const nextQuestion = () => {
    if(!quiz) return;
    if(quizRunMode==='target_score') return;
    if(questionIndex < quiz.questions.length-1){setQuestionIndex(i=>i+1);setSelectedAnswer(null);setAnswerFeedback('');return;}
    saveAttempt('practice');
  };
  useEffect(()=>{
    if(quizStarted===null) return;
    const tick=()=>{
      const elapsed=Math.max(0,Math.floor((Date.now()-quizStarted)/1000));
      const runDuration=quizRunMode==='target_score'?Math.max(1,timeLimit-10):timeLimit;
      const remaining=Math.max(0,runDuration-elapsed);
      setQuizSecondsLeft(remaining);
      if(quizRunMode==='target_score'&&quiz){
        setQuestionIndex(Math.min(quiz.questions.length-1,Math.floor((elapsed/runDuration)*quiz.questions.length)));
      }
      if(remaining===0&&!timerExpiryRef.current&&quizRunMode==='practice'){
        timerExpiryRef.current=true;
        saveAttempt('practice');
      } else if(remaining===0&&!timerExpiryRef.current&&quizRunMode==='target_score'){
        timerExpiryRef.current=true;
        saveAttempt('target_score',[]);
      }
    };
    tick();
    const timer=window.setInterval(tick,250);
    return()=>window.clearInterval(timer);
  },[quizStarted,timeLimit,quizRunMode,attemptResults,quiz]);
  const selectDocument = (file?:File) => {
    if(!file) return;
    if(docUrl) URL.revokeObjectURL(docUrl);if(processedUrl) URL.revokeObjectURL(processedUrl);
    setDocFile(file);setDocUrl(URL.createObjectURL(file));setProcessedUrl('');setProcessedBlob(null);setProcessedType('');setRotation(0);setCropPercent(0);
    setOutputFormat(file.type==='application/pdf'?'application/pdf':'image/jpeg');setTargetSizeKb(Math.max(5,Math.round(file.size/1024)));setProcessedSize(null);setMessage('');
  };
  const transformDocument = async (rotationOverride=rotation):Promise<boolean> => {
    if(!docFile || !docUrl) return false;
    setProcessingDoc(true);setMessage('');
    let sourcePdf:any=null;
    try{
      if(docFile.type==='application/pdf'){
        sourcePdf=await getDocument({data:new Uint8Array(await docFile.arrayBuffer())}).promise;
        if(sourcePdf.numPages>30) throw new Error('This file has more than 30 pages. Split it into smaller PDFs before processing.');
        const pageCount=outputFormat==='application/pdf'?sourcePdf.numPages:1;
        const output=outputFormat==='application/pdf'?await PDFDocument.create():null;
        for(let pageNumber=1;pageNumber<=pageCount;pageNumber++){
          const sourcePage=await sourcePdf.getPage(pageNumber);
          const baseViewport=sourcePage.getViewport({scale:1});
          const scale=Math.min(1.65,1600/Math.max(baseViewport.width,baseViewport.height));
          const viewport=sourcePage.getViewport({scale,rotation:(sourcePage.rotate+rotationOverride)%360});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not create a document preview.');
          await sourcePage.render({canvas,canvasContext:context,viewport}).promise;
          const mime=output? 'image/jpeg':outputFormat;
          const cropped=cropCanvas(canvas,cropPercent);
          const blob=await canvasBlob(cropped,mime,Math.max(12_000,(targetSizeKb*1024)/pageCount));
          if(output){
            const image=await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
            const page=output.addPage([cropped.width*.75,cropped.height*.75]);
            page.drawImage(image,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
          }else{
            if(processedUrl) URL.revokeObjectURL(processedUrl);
            setProcessedType(mime);setProcessedBlob(blob);setProcessedUrl(URL.createObjectURL(blob));setProcessedSize(blob.size);
          }
          canvas.width=0;canvas.height=0;cropped.width=0;cropped.height=0;sourcePage.cleanup();
        }
        if(output){
          const pdfBytes=await output.save();const blob=new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset,pdfBytes.byteOffset+pdfBytes.byteLength) as ArrayBuffer],{type:'application/pdf'});
          if(processedUrl) URL.revokeObjectURL(processedUrl);
          setProcessedType('application/pdf');setProcessedBlob(blob);setProcessedUrl(URL.createObjectURL(blob));setProcessedSize(blob.size);
        }
        addProgress('document',docFile.name,`Processed ${pageCount} PDF ${pageCount===1?'page':'pages'}; original retained`,1);
        setMessage(outputFormat==='application/pdf'?'A rotated, compressed PDF copy is ready. The original is unchanged.':'An image copy of the first PDF page is ready; choose PDF to keep every page.');
      }else{
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (image.naturalWidth > 0) resolve();
            else reject(new Error('Image loading timed out.'));
          }, 3500);
          image.onload = () => { clearTimeout(timer); resolve(); };
          image.onerror = () => { clearTimeout(timer); reject(new Error('Unable to read this image.')); };
          image.src = docUrl;
          if (image.complete && image.naturalWidth > 0) {
            clearTimeout(timer);
            resolve();
          }
        });
        const maxSize=2400,scale=Math.min(1,maxSize/Math.max(image.width,image.height));
        const width=Math.round(image.width*scale),height=Math.round(image.height*scale),swap=Math.abs(rotationOverride)%180===90;
        const canvas=document.createElement('canvas');canvas.width=swap?height:width;canvas.height=swap?width:height;
        const context=canvas.getContext('2d');if(!context) throw new Error('Your browser could not create an image preview.');
        context.translate(canvas.width/2,canvas.height/2);context.rotate(rotationOverride*Math.PI/180);
        context.drawImage(image,-width/2,-height/2,width,height);
        const cropped=cropCanvas(canvas,cropPercent);
        if(outputFormat==='application/pdf'){
          const jpg=await canvasBlob(cropped,'image/jpeg',targetSizeKb*1024);
          const output=await PDFDocument.create();const embedded=await output.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
          const page=output.addPage([embedded.width*.75,embedded.height*.75]);page.drawImage(embedded,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
          const pdfBytes=await output.save();const blob=new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset,pdfBytes.byteOffset+pdfBytes.byteLength) as ArrayBuffer],{type:'application/pdf'});
          if(processedUrl) URL.revokeObjectURL(processedUrl);
          setProcessedType('application/pdf');setProcessedBlob(blob);setProcessedUrl(URL.createObjectURL(blob));setProcessedSize(blob.size);
        }else{
          const blob=await canvasBlob(cropped,outputFormat,targetSizeKb*1024);
          if(processedUrl) URL.revokeObjectURL(processedUrl);
          setProcessedType(outputFormat);setProcessedBlob(blob);setProcessedUrl(URL.createObjectURL(blob));setProcessedSize(blob.size);
        }
        addProgress('document',docFile.name,'Rotated, converted and compressed a local copy',1);
        setMessage('The processed copy is ready. The original is unchanged.');
          canvas.width=0;canvas.height=0;cropped.width=0;cropped.height=0;
      }
      return true;
    }catch(error){setMessage((error as Error)?.message||'The document could not be processed. Try another file.');return false;}
    finally{await sourcePdf?.destroy();setProcessingDoc(false);}
  };
  const rotateDocument = () => {
    const next=(rotation+90)%360;setRotation(next);setMessage(`Rotated to ${next}°. Click "Create processed copy" to apply changes.`);
  };
  const useProcessedInTeacher = async () => {
    if(!processedBlob||!docFile)return;
    const extension=processedType==='application/pdf'?'pdf':processedType==='image/png'?'png':'jpg';
    const file=new File([processedBlob],`processed-${docFile.name.replace(/\.[^.]+$/,'')||'document'}.${extension}`,{type:processedType});
    receiveMaterial(file);switchModule('teacher');
  };
  const startCamera = async () => {
    try{cameraStream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});setCameraActive(true);setCameraError('');}
    catch{setCameraError('Camera access was not available. Check browser permission or upload an image instead.');}
  };
  const toggleCameraFullscreen = async () => {
    if(!cameraBox.current)return;
    try{if(document.fullscreenElement)await document.exitFullscreen();else await cameraBox.current.requestFullscreen();}
    catch{setCameraError('Full-screen camera view is not supported in this browser.');}
  };
  const capture = () => {
    const video=cameraVideo.current;if(!video)return;
    setCaptureFlash(true);setTimeout(()=>setCaptureFlash(false),500);
    const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext('2d')?.drawImage(video,0,0);
    canvas.toBlob(blob=>{
      if(blob)selectDocument(new File([blob],`capture-${Date.now()}.jpg`,{type:'image/jpeg'}));
      cameraStream.current?.getTracks().forEach(track=>track.stop());cameraStream.current=null;setCameraActive(false);
      canvas.width=0;canvas.height=0;
    },'image/jpeg',0.9);
  };

  const graphData = useMemo(()=>{
    const curves=[equation,secondEquation].map(text=>{
      const vertical=text.trim().match(/^x\s*=\s*(-?(?:\d+\.?\d*|\.\d+))$/i);
      const xMap=(x:number)=>280+x/graphRange*280,yMap=(y:number)=>150-Math.max(-5,Math.min(5,y))*25;
      if(vertical){const x=Number(vertical[1]);return {text,valid:Number.isFinite(x),vertical:x,path:`M ${xMap(x)} 0 L ${xMap(x)} 300`,points:[{x,y:0,label:`(${x.toFixed(2)}, 0)`}] as {x:number;y:number;label:string}[],evalAt:(_:number)=>Number.NaN};}
      const fn=(x:number)=>evaluateSafeEquation(text,x);const points:string[]=[];const samples:{x:number;y:number}[]=[];let pen=false;
      for(let i=0;i<=280;i++){const x=-graphRange+2*graphRange*i/280,y=fn(x);if(!Number.isFinite(y)||Math.abs(y)>40){pen=false;continue;}points.push(`${pen?'L':'M'} ${xMap(x)} ${yMap(y)}`);pen=true;samples.push({x,y});}
      const roots:{x:number;y:number;label:string}[]=[];
      for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(a.y===0||a.y*b.y<0){let lo=a.x,hi=b.x;for(let k=0;k<24;k++){const mid=(lo+hi)/2;if(fn(lo)*fn(mid)<=0)hi=mid;else lo=mid;}const x=(lo+hi)/2;roots.push({x,y:0,label:`(${x.toFixed(2)}, 0)`});}}
      const y0=fn(0);if(Number.isFinite(y0)&&Math.abs(y0)<=5)roots.push({x:0,y:y0,label:`(0, ${y0.toFixed(2)})`});
      return {text,valid:!!points.length,vertical:null as number|null,path:points.join(' '),points:roots,evalAt:fn};
    });
    const intersections:{x:number;y:number;label:string}[]=[];
    if(curves[0].valid&&curves[1].valid&&curves[0].vertical===null&&curves[1].vertical===null){
      let prior:{x:number;d:number}|null=null;
      for(let i=0;i<=280;i++){const x=-graphRange+2*graphRange*i/280,d=curves[0].evalAt(x)-curves[1].evalAt(x);if(Number.isFinite(d)){if(prior&&prior.d*d<0){let lo=prior.x,hi=x;for(let k=0;k<24;k++){const mid=(lo+hi)/2,dl=curves[0].evalAt(lo)-curves[1].evalAt(lo),dm=curves[0].evalAt(mid)-curves[1].evalAt(mid);if(dl*dm<=0)hi=mid;else lo=mid;}const ix=(lo+hi)/2,iy=curves[0].evalAt(ix);if(Number.isFinite(iy)&&Math.abs(iy)<=5)intersections.push({x:ix,y:iy,label:`(${ix.toFixed(2)}, ${iy.toFixed(2)})`});}prior={x,d};}else prior=null;}
    }
    if(curves[0].valid&&curves[1].valid&&(curves[0].vertical!==null||curves[1].vertical!==null)){
      const v=curves[0].vertical!==null?curves[0]:curves[1],fn=curves[0].vertical===null?curves[0]:curves[1],x=v.vertical as number,y=fn.evalAt(x);
      if(Number.isFinite(y)&&Math.abs(x)<=graphRange&&Math.abs(y)<=5)intersections.push({x,y,label:`(${x.toFixed(2)}, ${y.toFixed(2)})`});
    }
    return {curves,intersections,valid:curves[0].valid};
  },[equation,secondEquation,graphRange]);
  const graphError=!graphData.valid;
  const graphLogRef=useRef('');
  useEffect(()=>{if(!graphData.valid)return;const key=`${equation.trim()}|${secondEquation.trim()}`;if(!key.split('|')[0]||graphLogRef.current===key)return;const timer=window.setTimeout(()=>{graphLogRef.current=key;addProgress('equation',equation,secondEquation?`Explored with ${secondEquation}`:'Explored a local equation graph');},1300);return()=>window.clearTimeout(timer);},[graphData.valid,equation,secondEquation]);

  if(path === '/login' || path === '/register') return <AuthPage registerMode={path==='/register'} name={authName} setName={setAuthName} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} busy={authBusy} error={sessionError} onSubmit={handleAuth} onGuest={()=>{setEnterGuest(true);setPath('/');}}/>;
  if(session.isLoading&&!enterGuest) return <div className="loading-screen"><div className="loading-card"><span className="brand-mark"><GraduationCap size={21}/></span><div className="skeleton skeleton-title"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line short"/><button className="button button-subtle" onClick={()=>setEnterGuest(true)}>Continue as guest</button></div></div>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><button className="mobile-menu icon-button" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" data-testid="button-menu"><Menu size={19}/></button><span className="brand-mark"><GraduationCap size={22}/></span><span className="brand-name">tech<span>ai</span></span><span className="brand-caption">STUDENT WORKSPACE</span></div>
      <div className="topbar-right"><span className="system-status"><span className={`status-dot ${health?.status==='ok'?'':'offline'}`}/>{health?.status==='ok'?t('Systems ready'):t('Workspace active')}</span><label className="language-picker"><Languages size={15}/><span className="sr-only">{t('Language')}</span><select aria-label={t('Language')} value={uiLanguage} onChange={event=>setUiLanguage(event.target.value as UiLanguage)}>{[['English','English'],['Hindi','हिन्दी'],['Hinglish','Hinglish'],['Bengali','বাংলা'],['Tamil','தமிழ்'],['Telugu','తెలుగు'],['Marathi','मराठी'],['Gujarati','ગુજરાતી'],['Punjabi','ਪੰਜਾਬੀ'],['Kannada','ಕನ್ನಡ'],['Malayalam','മലയാളം'],['Odia','ଓଡ଼ିଆ']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="button button-subtle button-small install-entry" onClick={()=>void promptInstall()} data-testid="button-install-app"><Smartphone size={15}/>Install</button><button className="icon-button" aria-label={t('Toggle color theme')} onClick={()=>setTheme(value=>value==='dark'?'light':'dark')} data-testid="button-theme">{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><button className="profile-chip" onClick={()=>switchModule('profile')} data-testid="button-open-profile"><UserAvatar photo={profile.profilePhoto} initials={initials}/><span className="profile-chip-name">{currentUser.name}</span><ChevronDown size={14}/></button>{session.data?<button className="icon-button signout-button" aria-label={t('Sign out')} onClick={handleSignOut} data-testid="button-signout"><LogOut size={17}/></button>:<Link href="/login" className="button button-subtle button-small optional-login">Sign in</Link>}</div>
    </header>
    <div className="workspace-layout">
      <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}><div className="nav-eyebrow">{t('YOUR WORKSPACE')}</div>{navItems.map(item=><button key={item.id} className={`nav-item ${module===item.id?'active':''}`} onClick={()=>switchModule(item.id)} data-testid={`nav-${item.id}`}><item.icon size={18}/><span>{t(item.label)}</span>{item.id==='home'&&<span className="nav-count">01</span>}</button>)}<div className="sidebar-bottom"><div className="sidebar-note"><span className="tiny-star"><Sparkles size={14}/></span><strong>{t('Made for your material')}</strong><small>{t('Bring your own notes, forms and quizzes. Nothing is prefilled.')}</small></div><div className="sidebar-user"><UserAvatar photo={profile.profilePhoto} initials={initials}/><span><b>{currentUser.name}</b><small>{currentUser.email}</small></span></div></div></aside>
      <main className="main-content">
        {message&&<div className="toast-message" role="status" data-testid="status-message"><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss message"><X size={15}/></button></div>}
        {module==='home'&&<Dashboard summary={displaySummary} loading={!!session.data&&summaryQuery.isLoading} activities={activities} userName={currentUser.name} profilePhoto={profile.profilePhoto} onNavigate={switchModule} />}
         {module==='teacher'&&<section className="page-section"><PageHeading eyebrow="LEARN FROM YOUR OWN MATERIAL" title="AI Teacher" subtitle="Upload notes, ask a question, and get an explanation grounded in what you are studying."/><div className="teacher-layout"><div className="panel teacher-input"><div className="panel-heading"><span className="heading-icon mint"><BookOpen size={18}/></span><div><h2>Study source</h2><p>PDF, DOCX, TXT, Markdown, or image</p></div></div><label className="dropzone" htmlFor="study-upload"><Upload size={22}/><b>{material?.name || 'Choose your study material'}</b><span>Only the file you select is analyzed</span><input id="study-upload" type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,image/*" onChange={e=>receiveMaterial(e.target.files?.[0])} data-testid="input-study-file"/></label>{uploadMaterial.isPending&&<InlineLoading label="Reading your file"/>}{materialData&&<div className="study-extract-meta"><FileText size={14}/><span>{materialData.fileName}</span><small>{materialData.mimeType||'Extracted text'} · editable below</small></div>}<label className="field-label">Extracted text or your notes<textarea rows={8} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="Paste a passage, lecture notes, a proof, or any topic you want to understand." data-testid="input-study-text"/></label>{processedBlob&&<button type="button" className="button button-subtle button-small" onClick={()=>{const ext=processedType==='application/pdf'?'pdf':processedType==='image/png'?'png':'jpg';receiveMaterial(new File([processedBlob],`processed-study.${ext}`,{type:processedType}));}}><FilePlus2 size={14}/>Use Smart Doc copy as study material</button>}<div className="form-row-two"><label className="field-label">Explanation language<select className="select-input teacher-lang-select" value={language} onChange={e=>setLanguage(e.target.value)} data-testid="select-language"><option value="English">🇬🇧 English</option><option value="Hindi">🇮🇳 Hindi (हिन्दी)</option><option value="Hinglish">🇮🇳 Hinglish (Hindi-English mix)</option><option value="Bengali">🇮🇳 Bengali (বাংলা)</option><option value="Marathi">🇮🇳 Marathi (मराठी)</option><option value="Telugu">🇮🇳 Telugu (తెలుగు)</option><option value="Tamil">🇮🇳 Tamil (தமிழ்)</option><option value="Gujarati">🇮🇳 Gujarati (ગુજરાતી)</option><option value="Urdu">🇵🇰 Urdu (اردو)</option><option value="Kannada">🇮🇳 Kannada (ಕನ್ನಡ)</option><option value="Malayalam">🇮🇳 Malayalam (മലയാളം)</option><option value="Punjabi">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option><option value="Odia">🇮🇳 Odia (ଓଡ଼ିଆ)</option><option value="Spanish">🇪🇸 Spanish (Español)</option><option value="French">🇫🇷 French (Français)</option><option value="German">🇩🇪 German (Deutsch)</option><option value="Japanese">🇯🇵 Japanese (日本語)</option><option value="Chinese">🇨🇳 Chinese (中文)</option><option value="Korean">🇰🇷 Korean (한국어)</option><option value="Arabic">🇸🇦 Arabic (العربية)</option><option value="Russian">🇷🇺 Russian (Русский)</option><option value="Italian">🇮🇹 Italian (Italiano)</option><option value="Portuguese">🇵🇹 Portuguese (Português)</option><option value="Turkish">🇹🇷 Turkish (Türkçe)</option><option value="Nepali">🇳🇵 Nepali (नेपाली)</option><option value="Indonesian">🇮🇩 Indonesian (Bahasa Indonesia)</option></select></label><label className="field-label">Teacher Voice<select className="select-input teacher-voice-select" value={teacherVoice} onChange={e=>setTeacherVoice(e.target.value)} data-testid="select-teacher-voice"><option value="">✨ Auto Voice · {language}</option>{availableVoices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select></label></div><label className="field-label">Ask a question<span className="question-with-mic"><input value={lessonQuestion} onChange={e=>setLessonQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();teach(undefined,true);}}} placeholder="Type your question or click mic to ask…" data-testid="input-teacher-question"/><button type="button" className={`mic-button ${teacherContinuousMic || teacherListening ? 'recording' : ''}`} onClick={toggleTeacherMic} aria-label={teacherContinuousMic ? 'Stop microphone' : 'Start microphone'} title={teacherContinuousMic ? 'Continuous mic is ON (click to turn OFF)' : 'Click to start continuous voice conversation'}>{teacherContinuousMic || teacherListening ? <MicOff size={17}/> : <Mic size={17}/>}</button></span><small>{teacherContinuousMic ? '🎙️ Continuous conversation is ON. Speak freely — AI waits until you finish, then explains in voice.' : 'Type your question or click the mic for hands-free spoken conversation with AI.'}</small></label><button className="button button-primary button-wide" onClick={() => teach(undefined, true)} disabled={explain.isPending} data-testid="button-explain"><Sparkles size={16}/>{explain.isPending ? 'Preparing explanation…' : 'Teach me this'}</button>{explain.isPending&&<InlineLoading label="Building an explanation from your material"/>}</div><div className="panel lesson-panel"><div className="lesson-top"><div className="teacher-view-tabs"><button type="button" className={`teacher-tab-btn ${teacherTab === 'preview' ? 'active' : ''}`} onClick={() => setTeacherTab('preview')}><FileText size={14} /> Document & Notes Preview {material ? `(${material.name.length > 20 ? material.name.slice(0, 18) + '…' : material.name})` : ''}</button><button type="button" className={`teacher-tab-btn ${teacherTab === 'lesson' ? 'active' : ''}`} onClick={() => setTeacherTab('lesson')}><Sparkles size={14} /> AI Explanation {lesson ? '✓ Ready' : ''}</button></div><span className="ready-pill"><span className="status-dot"/>PRIVATE SESSION</span></div>{teacherTab === 'preview' ? (material ? (<div className="teacher-document-box">{material.type === 'application/pdf' || /\.pdf$/i.test(material.name) ? (<div className="teacher-pdf-wrap"><div className="teacher-pdf-top-bar"><span><b>{material.name}</b> ({(material.size / 1024).toFixed(1)} KB)</span><a href={materialUrl} target="_blank" rel="noreferrer" className="button button-subtle button-small"><ExternalLink size={13} /> Open PDF in new window</a></div><object data={materialUrl} type="application/pdf" className="teacher-pdf-viewer-frame"><iframe src={materialUrl} title={material.name} className="teacher-pdf-viewer-frame"><p>Your browser does not render PDF inline. <a href={materialUrl} target="_blank" rel="noreferrer">Click here to open PDF in a new tab</a></p></iframe></object>{sourceText.trim() && (<div className="teacher-notes-viewer" style={{ marginTop: '10px' }}><h4>Extracted Text from {material.name}:</h4><pre>{sourceText}</pre></div>)}</div>) : material.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(material.name) ? (<div className="teacher-img-viewer-box"><img src={materialUrl} alt={material.name} className="teacher-img-preview"/></div>) : (<div className="teacher-notes-viewer"><h4>Extracted Study Content from {material.name}:</h4><pre>{sourceText || materialData?.extractedText || 'Reading file content…'}</pre></div>)}<div className="teacher-preview-footer"><span><b>{material.name}</b> ready for explanation</span><button type="button" className="button button-primary" onClick={() => teach(undefined, true)} disabled={explain.isPending}><Sparkles size={15}/> {explain.isPending ? 'Preparing Explanation…' : 'Explain This Document with AI'}</button></div></div>) : sourceText.trim() ? (<div className="teacher-document-box"><div className="teacher-notes-viewer"><h4>Your Study Notes Preview:</h4><p>{sourceText}</p></div><div className="teacher-preview-footer"><span>Notes ready for explanation</span><button type="button" className="button button-primary" onClick={() => teach(undefined, true)} disabled={explain.isPending}><Sparkles size={15}/> Explain These Notes with AI</button></div></div>) : (<EmptyState icon={<FileText size={24}/>} title="Upload your study material" body="Select a PDF, document, notes, or image on the left. The document will open right here for you and the AI to study."/>)) : (lesson ? (<LessonOutput lesson={lesson} language={language} rate={voiceRate} onRateChange={setVoiceRate} selectedVoice={teacherVoice} onVoiceChange={setTeacherVoice} autoPlay={autoPlayLesson} onSpeechEnd={() => { isTeacherSpeakingRef.current = false; if (teacherContinuousMicRef.current) { setMessage('🎙️ Continuous conversation: Listening for your next question or reply…'); startTeacherSpeechRecognition(); } }}/>) : (<EmptyState icon={<AudioLines size={24}/>} title="Your explanation appears here" body="Click 'Teach me this' or ask any question on the left to start the AI explanation in your chosen language."/>))}</div></div></section>}
        {module==='voice'&&<section className="page-section">
          <PageHeading eyebrow="TECH AI | SMART WAY" title="English Practice & AI Voice Studio" subtitle="Practise conversational English with your AI coach. Get real-time speech feedback, speaking level adaptation, and grammar tips."/>
          <VoicePractice onProgress={addProgress} />
        </section>}
        {module==='docs'&&<section className="page-section">
          <PageHeading eyebrow={t('CAMERA · UPLOAD · PREVIEW')} title={t('Smart Doc')} subtitle={t('Capture a document or upload the original. Compare and download a processed copy while keeping the source intact.')}/>
          <div className="doc-workspace">
            <div className="panel doc-tools">
              <div className="panel-heading"><span className="heading-icon teal"><Camera size={18}/></span><div><h2>{t('Bring in a document')}</h2><p>{t('Capture now or select a local image or PDF')}</p></div></div>
              <div className="camera-box" ref={cameraBox}>{cameraActive?<video ref={cameraVideo} autoPlay playsInline/>:<div className="camera-placeholder"><Camera size={24}/><span>{t('Camera preview')}</span><small>{t('Camera access stays in your browser.')}</small></div>}{cameraActive&&<button className="capture-button" onClick={capture} aria-label={t('Capture document')}><Camera size={18}/></button>}{captureFlash&&<div className="capture-flash" aria-hidden="true"/>}</div>
              <div className="action-row"><button className="button button-primary" onClick={cameraActive?()=>{cameraStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current=null;setCameraActive(false);}:startCamera} data-testid="button-camera">{cameraActive?t('Stop camera'):t('Start camera')}</button><label className="button button-subtle file-button"><ImagePlus size={16}/>{t('Choose file')}<input type="file" accept="image/*,.pdf" onChange={e=>selectDocument(e.target.files?.[0])} data-testid="input-document"/></label><button type="button" className="button button-subtle" onClick={toggleCameraFullscreen} disabled={!cameraActive} title="Expand camera preview"><Maximize2 size={16}/>Full screen</button></div>
              {cameraError&&<p className="error-inline">{cameraError}</p>}
              <div className="tool-divider"/><div className="panel-heading small-heading"><RotateCcw size={16}/><div><h2>{t('Document adjustments')}</h2><p>{t('Applied to a new copy, never the original')}</p></div></div>
               <div className="action-row"><button className="button button-subtle" disabled={!docFile} onClick={rotateDocument}><RotateCcw size={15}/>{t('Rotate 90°')} <span className="rotation-value">{rotation}°</span></button><button className="button button-primary" disabled={!docFile||processingDoc} onClick={()=>{void transformDocument();}} data-testid="button-process-doc">{processingDoc?<LoaderCircle size={15} className="spin"/>:<Zap size={15}/>} {processingDoc?t('Processing…'):t('Create processed copy')}</button></div>
               {docFile&&<><label className="field-label">Convert copy to<select value={outputFormat} onChange={e=>setOutputFormat(e.target.value)}><option value="application/pdf">PDF</option><option value="image/png">PNG</option><option value="image/jpeg">JPG / JPEG</option></select></label><label className="field-label crop-control">Crop edges <span>{cropPercent}% · applied on all sides</span><input type="range" min="0" max="18" step="1" value={cropPercent} onChange={e=>setCropPercent(Number(e.target.value))}/><small>Adjust crop, then click "Create processed copy" to update.</small></label><div className="compress-control"><label>File size target <b>{targetSizeKb<1024?`${targetSizeKb} KB`:`${(targetSizeKb/1024).toFixed(2)} MB`}</b></label><input type="range" min="5" max={Math.max(250,Math.ceil(docFile.size/1024*2))} step="5" value={Math.min(targetSizeKb,Math.max(250,Math.ceil(docFile.size/1024*2)))} onChange={e=>setTargetSizeKb(Number(e.target.value))}/><small>Original: {fileSizeLabel(docFile.size)} · left reduces the copy size, right allows a larger copy</small></div>{processedSize!==null&&<div className="size-comparison-row"><span className="size-before">Original: <b>{fileSizeLabel(docFile.size)}</b></span><span className="size-arrow">➔</span><span className="size-after">Processed: <b>{fileSizeLabel(processedSize)}</b></span><span className={`size-delta ${processedSize<=docFile.size?'size-saved':'size-larger'}`}>{processedSize<=docFile.size?`${Math.round((1-processedSize/docFile.size)*100)}% smaller (${fileSizeLabel(docFile.size-processedSize)} saved)`:`${Math.round((processedSize/docFile.size-1)*100)}% larger`}</span></div>}</>}
              <p className="privacy-note"><ShieldCheck size={14}/>{t('Processing stays in your browser. PDF copies are rasterized; selectable text may not be preserved.')}</p>
            </div>
             <div className="panel compare-panel"><div className="compare-header"><div><span className="eyebrow">{t('DOCUMENT PREVIEW')}</span><h2>{docFile?.name||t('Your document, side by side')}</h2></div>{docFile&&<div className="doc-zoom-tools"><span className="local-badge">{t('LOCAL PREVIEW')}</span><button className="icon-button" type="button" onClick={()=>setDocZoom(value=>Math.max(.5,+(value-.1).toFixed(1)))} aria-label="Zoom out" disabled={docZoom<=.5}><ZoomOut size={15}/></button><span>{Math.round(docZoom*100)}%</span><button className="icon-button" type="button" onClick={()=>setDocZoom(value=>Math.min(1.8,+(value+.1).toFixed(1)))} aria-label="Zoom in" disabled={docZoom>=1.8}><ZoomIn size={15}/></button></div>}</div>{docFile?<div className="compare-grid"><PreviewBox label={t('Original')} file={docFile} url={docUrl} rotation={0} zoom={docZoom}/><PreviewBox label={t('Processed copy')} file={docFile} url={processedUrl} rotation={0} mimeType={processedType} zoom={docZoom}/></div>:<EmptyState icon={<FileImage size={22}/>} title={t('Your document goes here')} body={t('Select or capture an actual file to see its original and processed previews side by side.')}/ >}{processedUrl&&<div className="processed-size-note"><span>Processed copy size: <b>{processedSize===null?'Preparing…':fileSizeLabel(processedSize)}</b></span>{docFile&&<span className="original-compare-label"> (Original: {fileSizeLabel(docFile.size)})</span>}</div>}{processedUrl&&<div className="form-footer"><span className="privacy-note">Actual output size shown above</span><button type="button" className="button button-subtle" onClick={()=>setProcessedFullscreen(true)} title="View processed copy in full screen"><Maximize2 size={15}/>{t('Full screen')}</button><a className="button button-subtle" href={processedUrl} download={`processed-${docFile?.name.replace(/\.[^.]+$/,'')||'document'}.${processedType==='application/pdf'?'pdf':processedType==='image/png'?'png':'jpg'}`}><Download size={15}/>{t('Download copy')}</a><button className="button button-primary" onClick={useProcessedInTeacher}><BookOpen size={15}/>Use in AI Teacher</button></div>}</div>
          </div>
        </section>}
        {module==='equations'&&<section className="page-section"><PageHeading eyebrow={t('EXPLORE THE SHAPE OF AN EQUATION')} title={t('Equation graph')} subtitle={t('Enter a function of x and explore its curve. Try common Math functions such as sin(x), x*x, exp(-x*x), or sqrt(abs(x)).')}/><div className="equation-layout"><div className="panel equation-controls"><div className="panel-heading"><span className="heading-icon violet"><Sigma size={19}/></span><div><h2>{t('Your function')}</h2><p>{t('Graph updates as you type')}</p></div></div><label className="field-label">y = f(x) or x = c<input value={equation} onChange={e=>setEquation(e.target.value)} placeholder="e.g. sin(x) or x=0" className="equation-input" data-testid="input-equation"/></label><label className="field-label">Second equation <span className="field-hint">Optional · compare two local plots</span><input value={secondEquation} onChange={e=>setSecondEquation(e.target.value)} placeholder="e.g. cos(x) or x=2" className="equation-input" data-testid="input-equation-second"/></label><label className="button button-subtle file-button equation-ocr">{recognizeEquation.isPending?<LoaderCircle size={15} className="spin"/>:<Upload size={15}/>} {t('Read equations from an image or PDF')}<input type="file" accept="image/*,.pdf" onChange={event=>recognizeEquationImage(event.target.files?.[0])} data-testid="input-equation-ocr"/></label>{detectedEquations.length>0&&<div className="detected-equations"><span>{t('Detected equations')}</span>{detectedEquations.map((item,index)=><button type="button" key={`${index}-${item}`} onClick={()=>index===0?setEquation(item):setSecondEquation(item)}>{item}</button>)}</div>}<div className="equation-chips"><span>{t('Try')}</span>{['sin(x)','x*x','cos(x)','sqrt(abs(x))','x=0'].map(item=><button key={item} onClick={()=>setEquation(item)}>{item}</button>)}</div><label className="field-label">{t('Horizontal range')} <span className="range-value">−{graphRange} to {graphRange}</span><input type="range" min="2" max="12" value={graphRange} onChange={e=>setGraphRange(Number(e.target.value))} data-testid="input-graph-range"/></label><div className="equation-note"><CircleHelp size={15}/><span>{t('Use x and common math functions. Expression parsing is restricted and runs locally in your browser.')}</span></div></div><div className="panel graph-panel"><div className="graph-heading"><div><span className="eyebrow">{t('LIVE PLOT')}</span><h2>{equation || '…'}{secondEquation?`  ·  ${secondEquation}`:''}</h2></div><span className="graph-range-label">x ∈ [−{graphRange}, {graphRange}]</span></div><div className="graph-container">{graphError?<EmptyState icon={<Sigma size={21}/>} title={t('Enter a valid function')} body={t('Use supported math syntax, for example sin(x) or x*x.')}/>:<svg className="equation-graph" viewBox="0 0 560 300" role="img" aria-label={`${t('Graph of')} ${equation}${secondEquation?` and ${secondEquation}`:''}`}><g className="graph-grid">{Array.from({length:15},(_,i)=><line key={`v${i}`} x1={i*40} x2={i*40} y1="0" y2="300"/>)}{Array.from({length:9},(_,i)=><line key={`h${i}`} x1="0" x2="560" y1={i*37.5} y2={i*37.5}/>)}</g><line className="graph-axis" x1="0" x2="560" y1="150" y2="150"/><line className="graph-axis" x1="280" x2="280" y1="0" y2="300"/>{graphData.curves.map((curve,i)=>curve.valid&&<path key={i} className={`graph-curve graph-curve-${i}`} d={curve.path}/>)}{graphData.curves.flatMap((curve,i)=>curve.valid?curve.points.map((point,j)=><g key={`int-${i}-${j}`}><circle className="graph-intercept" cx={280+point.x/graphRange*280} cy={150-point.y*25} r="4"/><text className="graph-point-label" x={Math.min(495,Math.max(4,280+point.x/graphRange*280+6))} y={Math.min(290,Math.max(14,150-point.y*25-8))}>{point.label}</text></g>):[])}{graphData.intersections.map((point,i)=><g key={`cross-${i}`}><circle className="graph-crossing" cx={280+point.x/graphRange*280} cy={150-point.y*25} r="5"/><text className="graph-point-label" x={Math.min(495,280+point.x/graphRange*280+7)} y={Math.max(14,150-point.y*25-8)}>{point.label}</text></g>)}<text className="graph-label" x="535" y="143">x</text><text className="graph-label" x="288" y="14">y</text></svg>}</div><div className="graph-footer"><span><i className="curve-key"/>f(x) · intercepts and crossings</span><span>{t('Scale updates with your selected range')}</span></div></div></div></section>}
         {module==='quiz'&&<section className="page-section">
          <PageHeading eyebrow="PRACTICE WITH YOUR OWN QUIZZES" title="Auto Quiz" subtitle="Upload your quiz, inspect the full source, practise manually, or auto-solve to an exact target score."/>
          <div className="quiz-layout">
            <div className="panel quiz-upload">
              <div className="panel-heading"><span className="heading-icon violet"><Brain size={18}/></span><div><h2>Quiz source</h2><p>Your document is analyzed for questions and answer choices</p></div></div>
              <label className="dropzone compact" htmlFor="quiz-file"><Upload size={21}/><b>{quizFile?.name||'Upload a quiz'}</b><span>PDF, image, DOCX, TXT, or Markdown</span><input id="quiz-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.md" onChange={e=>receiveQuiz(e.target.files?.[0])} data-testid="input-quiz-file"/></label>
              <div className="quiz-url-import"><label className="field-label">Or import from a public URL<span className="quiz-url-row"><input type="url" value={quizImportUrl} onChange={e=>setQuizImportUrl(e.target.value)} placeholder="https://example.com/quiz"/><button className="mic-button" type="button" title="Paste quiz link" onClick={async()=>{try{const text=await navigator.clipboard.readText();if(text)setQuizImportUrl(text);}catch{setMessage('Paste the quiz URL into the field. Clipboard access is not available.');}}}><span aria-hidden="true">+</span></button></span></label><div className="quiz-url-actions"><button className="button button-primary button-small" onClick={receiveQuizUrl} disabled={importQuizUrl.isPending}><Globe2 size={14}/>{importQuizUrl.isPending?'Importing…':'Import link'}</button>{quizImportUrl&&<button className="button button-subtle button-small" onClick={()=>setQuizImportUrl('')}><X size={14}/>Remove link</button>}</div><small>Public quiz pages only. This assistant will not sign in or submit to an external site.</small></div>
              {importQuizUrl.isPending&&<InlineLoading label="Reading quiz questions from the link"/>}
              {analyzeQuiz.isPending&&<InlineLoading label="Reading your quiz"/>}
              {quiz&&<div className="quiz-settings">
                <div className="setting-line"><span>Subject</span><b>{quiz.subject||'Unspecified'}</b></div>
                <div className="form-row-two">
                  <label className="field-label">Target correct<input type="number" min="0" max={quiz.totalQuestions} value={desiredCorrect} onChange={e=>setDesiredCorrect(Math.min(quiz.totalQuestions,Math.max(0,Number(e.target.value)||0)))} data-testid="input-target-correct"/></label>
                  <label className="field-label">Time limit (minutes)<input type="number" min="1" max="120" value={Math.ceil(timeLimit/60)} onChange={e=>setTimeLimit(Math.min(7200,Math.max(60,(Number(e.target.value)||1)*60)))} data-testid="input-quiz-time-limit"/></label>
                </div>
                <div className="quiz-action-stack">
                  <button className="button button-primary button-wide" onClick={beginQuiz} disabled={submitAttempt.isPending}><Play size={15}/>Start manual practice · {quiz.totalQuestions} questions</button>
                  <button className="button button-subtle button-wide" onClick={autoSolveAll} disabled={submitAttempt.isPending||quizStarted!==null||quiz.questions.some(question=>question.options.length<2)}><Sparkles size={15}/>{submitAttempt.isPending?'Submitting…':`Auto submit · ${desiredCorrect} correct`}</button>
                </div>
                {quiz.questions.some(question=>question.options.length<2)&&<p className="field-hint">Auto submit needs multiple-choice options for every detected question. You can still review the source document.</p>}
                <p className="quiz-mode-note">Auto submit moves through the questions, then submits 10 seconds before the selected limit. It randomly marks exactly the target number correct and the rest incorrect.</p>
              </div>}
            </div>
            <div className="panel question-panel">
              {quiz&&((quizFile&&quizSourceUrl)||quiz.sourceUrl)&&<QuizDocumentPreview file={quizFile||new File([],quiz.fileName,{type:'text/html'})} url={quiz.sourceUrl||quizSourceUrl} quiz={quiz} open={quizStarted===null&&submittedAttempt===null}/>}
              {quizStarted!==null&&<div className={`quiz-timer ${quizSecondsLeft<60?'quiz-timer-low':''}`}><Clock3 size={15}/><span>{quizRunMode==='target_score'?'Auto submit in':'Time left'}</span><b>{String(Math.floor(quizSecondsLeft/60)).padStart(2,'0')}:{String(quizSecondsLeft%60).padStart(2,'0')}</b></div>}
              {quiz&&submittedAttempt?<QuizAttemptSummary quiz={quiz} attempt={submittedAttempt}/>:quiz&&quizStarted!==null&&quiz.questions[questionIndex]?<QuizQuestionCard quiz={quiz} index={questionIndex} selected={selectedAnswer} setSelected={setSelectedAnswer} feedback={answerFeedback} onCheck={checkAnswer} onNext={nextQuestion} checking={solveQuestion.isPending} submitting={submitAttempt.isPending} results={attemptResults} onAskAi={(prompt)=>askAboutQuiz(prompt)}/>:quiz?<QuizQuestionsOverview quiz={quiz} onBegin={beginQuiz} onAutoSolve={autoSolveAll} submitting={submitAttempt.isPending}/>:<EmptyState icon={<Brain size={22}/>} title="Your quiz practice appears here" body="Upload a real quiz to inspect every detected question, choose answers, and get question-by-question feedback."/>}
            </div>
          </div>
          {quiz&&<div className="panel quiz-chat-panel" id="quiz-chat-panel">
            <div className="panel-heading">
              <span className="heading-icon mint"><MessageCircle size={19}/></span>
              <div>
                <h2>AI Quiz Tutor & Step-by-Step Solver</h2>
                <p>Chat with AI to get clear formulas, step-by-step reasoning, and solutions for any question.</p>
              </div>
            </div>
            <div className="quiz-chat-quick-chips">
              <span className="quick-chips-label">Quick solve:</span>
              <button type="button" className="quiz-chip-btn" onClick={()=>askAboutQuiz(`Please solve Question ${questionIndex+1} step-by-step, explain why the correct option is right, and explain why the other options are wrong.`)}>💡 Solve Q{questionIndex+1} step-by-step</button>
              <button type="button" className="quiz-chip-btn" onClick={()=>askAboutQuiz("What are the core formulas and concepts required for this quiz?")}>📝 Key Formulas & Summary</button>
              <button type="button" className="quiz-chip-btn" onClick={()=>askAboutQuiz("Give me 3 easy mnemonic tricks or shortcuts to solve questions like this in exams.")}>🎯 Exam Shortcuts & Tips</button>
            </div>
            <div className="quiz-chat-messages" aria-live="polite">
              {quizChatMessages.length ? quizChatMessages.map((item,index)=>(
                <div key={index} className={`quiz-chat-message ${item.role}`}>
                  <b>{item.role==='user'?'Student':'AI Tutor'}</b>
                  <p>{item.text}</p>
                </div>
              )) : (
                <div className="quiz-chat-empty">
                  <MessageCircle size={32}/>
                  <h3>Your AI Tutor is ready to help</h3>
                  <p>Ask to solve any question, clarify confusing concepts, or click one of the quick buttons above.</p>
                </div>
              )}
              {askQuiz.isPending&&<InlineLoading label="AI tutor is thinking and drafting the step-by-step solution…"/>}
              <div id="quiz-chat-bottom"/>
            </div>
            <form className="quiz-chat-input" onSubmit={event=>{event.preventDefault();askAboutQuiz();}}>
              <input value={quizChatText} onChange={event=>setQuizChatText(event.target.value)} placeholder="Type question, e.g. 'Solve Q2', 'Why is option B correct?'…" aria-label="Ask the quiz tutor"/>
              <button className="button button-primary" type="submit" disabled={!quizChatText.trim()||askQuiz.isPending}><Send size={15}/>Ask AI</button>
            </form>
          </div>}
          <div className="panel history-panel"><div className="panel-heading"><span className="heading-icon muted-icon"><Clock3 size={18}/></span><div><h2>Practice history</h2><p>Attempts from your account</p></div></div>{attemptsQuery.isLoading?<InlineLoading label="Loading practice history"/>:attemptsQuery.data?.length?<div className="history-list">{attemptsQuery.data.slice(0,6).map(attempt=><div className="history-row" key={attempt.id}><span className="history-symbol"><Brain size={15}/></span><span className="history-title"><b>{attempt.quizName}</b><small>{attempt.subject} · {new Date(attempt.createdAt).toLocaleDateString()}</small></span><span className="history-score">{attempt.score}<small>/{attempt.totalQuestions}</small></span></div>)}</div>:<p className="empty-inline">Your submitted quiz attempts will show here.</p>}</div>
        </section>}
         {module==='progress'&&<section className="page-section">
           <PageHeading eyebrow="YOUR WORK, KEPT CLOSE" title={t('Progress')} subtitle="A private record of the work you do across your study tools. Guest progress stays on this device."/>
           <div className="progress-overview">{[{kind:'lesson',label:'Teacher sessions',icon:BookOpen},{kind:'voice',label:'English practice',icon:Mic},{kind:'document',label:'Documents processed',icon:FileText},{kind:'quiz',label:'Quiz activity',icon:Brain},{kind:'equation',label:'Equation graphs',icon:Sigma}].map(item=>{const count=activities?.filter(record=>record.kind===item.kind).length||0;return <div className="panel progress-metric" key={item.kind}><span className="heading-icon mint"><item.icon size={17}/></span><div><b>{count}</b><small>{item.label}</small></div></div>;})}</div>
           <div className="panel progress-history"><div className="panel-heading"><span className="heading-icon mint"><Activity size={17}/></span><div><h2>Recent workspace activity</h2><p>Teacher, English practice, documents, quizzes and equation graphs</p></div><span className="eyebrow right-eyebrow">{session.data?'ACCOUNT':'THIS DEVICE'}</span></div>{session.data&&progressQuery.isLoading?<InlineLoading label="Loading your progress"/>:activities?.length?<div className="activity-list">{activities.map(item=><div className="activity-item progress-record" key={item.id}><span className="activity-line"/><div><b>{item.title}</b><small>{item.details} · {new Date(item.createdAt).toLocaleDateString()}</small></div><span className="activity-kind">{item.kind}</span><span className="activity-minutes">{item.minutes} min</span></div>)}</div>:<EmptyState icon={<Activity size={22}/>} title="Your progress starts here" body="Use a study tool and this private timeline will keep track of it on this device."/>}</div>
         </section>}
         {module==='profile'&&<section className="page-section">
          <PageHeading eyebrow={t('YOUR DETAILS · YOUR CONTROL')} title={t('Student profile')} subtitle="Keep your essential student details up to date for your workspace, practice sessions, and private records."/>
          <div className="profile-layout">
            <div className="panel profile-intro">
              <UserAvatar photo={profileDraft.profilePhoto} initials={initials} className="avatar-large"/>
              <span className="eyebrow">{t('STUDENT ACCOUNT')}</span><h2>{currentUser.name}</h2><p>{currentUser.email}</p>
              <div className="profile-photo-actions">
                <label className="button button-subtle button-small">{photoBusy?t('Preparing photo…'):t('Choose profile photo')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseProfilePhoto} disabled={photoBusy} aria-label={t('Choose profile photo')}/></label>
                {profileDraft.profilePhoto&&<button type="button" className="button button-subtle button-small" onClick={()=>setProfileDraft(previous=>({...previous,profilePhoto:''}))}>{t('Remove photo')}</button>}
                <small>{t('Photo is compressed and saved with your private profile.')}</small>
              </div>
              <div className="profile-status"><ShieldCheck size={15}/>{session.data?t('Your information stays attached to your account'):'Profile stays private on this device. Create an account only if you want to sync it.'}</div>
            </div>
            <form className="panel profile-form" onSubmit={saveProfile}>
              <div className="panel-heading"><div><h2>{t('Profile details')}</h2><p>Essential student information for your account and workspace.</p></div><span className="eyebrow">{t('PRIVATE')}</span></div>
              {profileQuery.isLoading?<InlineLoading label={t('Loading your profile')}/>:<>
                <div className="profile-fields">{profileFields.map(key=><label className="field-label" key={key}>{t(profileLabels[key])}<input value={String(profileDraft[key]||'')} onChange={event=>setProfileDraft(previous=>({...previous,[key]:event.target.value}))} type={key==='email'?'email':key==='phone'?'tel':'text'} data-testid={`input-profile-${key}`}/></label>)}</div>
                <div className="form-footer"><button type="submit" className="button button-primary" disabled={updateProfile.isPending||photoBusy} data-testid="button-save-profile">{updateProfile.isPending?t('Saving profile'):t('Save profile')}</button></div>
              </>}
            </form>
          </div>
        </section>}
        <footer className="workspace-footer"><div className="footer-brand"><span className="brand-mark"><GraduationCap size={16}/></span><span><b>techai</b><small>Private study space · You stay in control</small></span></div><nav aria-label="Workspace shortcuts"><button onClick={()=>switchModule('progress')} data-testid="footer-progress">Progress</button><button onClick={()=>switchModule('profile')} data-testid="footer-profile">Profile & privacy</button><button onClick={()=>void promptInstall()} data-testid="footer-install">Install app</button></nav><small className="footer-disclaimer">Your learning data stays private and secure.</small></footer>
      </main>
    </div>
    {processedFullscreen&&processedUrl&&<div className="modal-backdrop processed-fs-backdrop" onClick={()=>setProcessedFullscreen(false)}><div className="preview-modal processed-fs-modal" onClick={e=>e.stopPropagation()}><div className="modal-header-row"><div><span className="eyebrow">FULL SCREEN PREVIEW</span><h2>{docFile?.name||'Processed Copy'}</h2>{processedSize!==null&&<span className="modal-size-tag">Output size: {fileSizeLabel(processedSize)}</span>}</div><button className="icon-button modal-close" onClick={()=>setProcessedFullscreen(false)} aria-label="Close preview"><X size={17}/></button></div><div className="fullscreen-doc-container">{processedType==='application/pdf'?<iframe src={processedUrl} title="Processed PDF" className="fullscreen-preview-frame"/>:<img src={processedUrl} alt="Processed Copy" className="fullscreen-preview-img"/>}</div><div className="modal-actions-row"><a className="button button-subtle" href={processedUrl} download={`processed-${docFile?.name.replace(/\.[^.]+$/,'')||'document'}.${processedType==='application/pdf'?'pdf':processedType==='image/png'?'png':'jpg'}`}><Download size={15}/>Download copy</a><button className="button button-primary" onClick={()=>setProcessedFullscreen(false)}>Close preview</button></div></div></div>}
  </div>;
}

function AuthPage({registerMode,name,setName,email,setEmail,password,setPassword,busy,error,onSubmit,onGuest}:{registerMode:boolean;name:string;setName:(v:string)=>void;email:string;setEmail:(v:string)=>void;password:string;setPassword:(v:string)=>void;busy:boolean;error:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onGuest:()=>void}) {
  return <main className="auth-screen"><div className="auth-aside"><div className="auth-brand"><span className="brand-mark"><GraduationCap size={22}/></span><span className="brand-name">tech<span>ai</span></span></div><div className="auth-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="auth-spark spark-a"/><span className="auth-spark spark-b"/><div className="auth-glyph"><BookOpen size={38}/><Sparkles size={20}/></div></div><span className="auth-kicker">A WORKSPACE THAT STARTS WITH YOU</span><h1>Your material.<br/>Your way forward.</h1><p>Understand your notes. Tackle the paperwork. Turn the quizzes you already have into practice.</p><div className="auth-aside-foot"><span>01</span><span>Personal study tools, all in one place</span><span className="aside-line"/></div></div><section className="auth-main"><div className="auth-mobile-brand"><span className="brand-mark"><GraduationCap size={21}/></span><span className="brand-name">tech<span>ai</span></span></div><div className="auth-form-wrap"><span className="eyebrow">{registerMode?'START YOUR STUDENT ACCOUNT':'WELCOME BACK'}</span><h2>{registerMode?'A better study space, built around you.':'Pick up where you left off.'}</h2><p className="auth-subtitle">{registerMode?'Create an account to keep your profile, practice and progress together.':'Sign in to your personal student workspace.'}</p><div className="auth-tabs"><Link href="/login" className={!registerMode?'selected':''}>Sign in</Link><Link href="/register" className={registerMode?'selected':''}>Create account</Link></div><form onSubmit={onSubmit} className="auth-form">{registerMode&&<label className="field-label">Full name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required minLength={2} data-testid="input-auth-name"/></label>}<label className="field-label">Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required data-testid="input-auth-email"/></label><label className="field-label">Password<input type="password" autoComplete={registerMode?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} data-testid="input-auth-password"/></label>{error&&<p className="error-inline auth-error" role="alert">{error}</p>}<button className="button button-primary button-wide auth-submit" type="submit" disabled={busy} data-testid="button-auth-submit">{busy?<><LoaderCircle size={16} className="spin"/>One moment</>:<>{registerMode?'Create student account':'Sign in'}<ArrowRight size={16}/></>}</button></form><button className="button button-subtle button-wide guest-entry" type="button" onClick={onGuest}>Continue as guest <span>Profile and progress stay on this device.</span></button><p className="auth-security"><ShieldCheck size={14}/>Your account and study materials are private.</p></div><p className="auth-footer">TECH AI <span>·</span> A thoughtful toolkit for student life</p></section></main>;
}

function PageHeading({eyebrow,title,subtitle}:{eyebrow:string;title:string;subtitle:string}) {return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>}
function InlineLoading({label}:{label:string}){return <div className="inline-loading"><span className="skeleton skeleton-line"/><span>{label}</span></div>}
function EmptyState({icon,title,body}:{icon:ReactNode;title:string;body:string}){return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{body}</p></div>}
function ScholarshipPortalFallback({url}:{url:string}) {
  return <section className="portal-embed-blocked" aria-labelledby="portal-embed-title">
    <span className="portal-embed-icon"><ShieldCheck size={22}/></span>
    <span className="eyebrow">NATIONAL SCHOLARSHIP PORTAL</span>
    <h3 id="portal-embed-title">Open the official portal separately</h3>
    <p>The portal blocks being shown inside another website. Open it directly so its official sign-in and form controls work normally.</p>
    <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Open scholarships.gov.in</a>
    <small>Return here afterward to review the AI answer sheet. The portal itself is never submitted by this assistant.</small>
  </section>;
}
function LessonOutput({
  lesson,
  language,
  rate,
  onRateChange,
  selectedVoice,
  onVoiceChange,
  autoPlay = false,
  onSpeechEnd,
}: {
  lesson: LessonResponse;
  language: string;
  rate: number;
  onRateChange: (value: number) => void;
  selectedVoice: string;
  onVoiceChange: (val: string) => void;
  autoPlay?: boolean;
  onSpeechEnd?: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [activeRange, setActiveRange] = useState<{ start: number; end: number } | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechRun = useRef(0);
  const fullText = `${lesson.title}. ${lesson.explanation}`;

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    return () => {
      speechRun.current += 1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [lesson]);

  const langCodes: Record<string, string> = {
    English: 'en', Hindi: 'hi', Hinglish: 'hi', Spanish: 'es', French: 'fr', German: 'de',
    Portuguese: 'pt', Arabic: 'ar', Bengali: 'bn', Tamil: 'ta', Telugu: 'te', Marathi: 'mr',
    Gujarati: 'gu', Punjabi: 'pa', Urdu: 'ur', Chinese: 'zh', Japanese: 'ja', Korean: 'ko',
    Russian: 'ru', Italian: 'it', Indonesian: 'id', Turkish: 'tr', Swahili: 'sw', Nepali: 'ne'
  };
  const wanted = (langCodes[language] || language.slice(0, 2)).toLowerCase();
  const voice = voices.find(item => item.voiceURI === selectedVoice) ||
                voices.find(item => item.lang.toLowerCase().startsWith(wanted) || item.name.toLowerCase().includes(language.toLowerCase()));

  const say = (forceStart = false) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking && !forceStart) {
      speechRun.current += 1;
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setActiveRange(null);
      return;
    }
    window.speechSynthesis.cancel();
    const matches = Array.from(fullText.matchAll(/\S+/g));
    const chunks = Array.from({ length: Math.ceil(matches.length / 3) }, (_, group) => {
      const first = matches[group * 3], last = matches[Math.min(matches.length - 1, group * 3 + 2)];
      const start = first.index ?? 0, end = (last.index ?? 0) + last[0].length;
      return { text: fullText.slice(start, end), start, end };
    });
    let index = 0;
    const run = ++speechRun.current;
    setSpeaking(true);

    const readNext = () => {
      if (speechRun.current !== run) return;
      const chunk = chunks[index];
      if (!chunk) {
        setSpeaking(false);
        setActiveRange(null);
        onSpeechEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.lang = voice?.lang || wanted;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        setSpeaking(true);
        setActiveRange({ start: chunk.start, end: chunk.end });
      };
      utterance.onend = () => {
        if (speechRun.current !== run) return;
        setSpeaking(false);
        index += 1;
        window.setTimeout(readNext, 180);
      };
      utterance.onerror = () => {
        if (speechRun.current === run) {
          setSpeaking(false);
          setActiveRange(null);
          onSpeechEnd?.();
        }
      };
      window.speechSynthesis.speak(utterance);
    };
    readNext();
  };

  useEffect(() => {
    if (autoPlay && lesson) {
      const t = setTimeout(() => {
        say(true);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [lesson, autoPlay]);

  const highlighted = (text: string, offset: number) => Array.from(text.matchAll(/\S+|\s+/g)).map((match, index) => {
    const word = match[0], start = offset + (match.index || 0), end = start + word.length;
    const isAct = activeRange && start < activeRange.end && end > activeRange.start;
    return /^\s+$/.test(word) ? <span key={`${offset}-${index}`}>{word}</span> : <span key={`${offset}-${index}`} className={`speech-word ${isAct ? 'active' : ''}`}>{word}</span>;
  });
  const titleEnd = lesson.title.length;

  return (
    <div className="lesson-output">
      <div className="lesson-header-row">
        <h2>{highlighted(lesson.title, 0)}</h2>
        <div className={`voice-visualizer ${speaking ? 'active' : ''}`} aria-label={speaking ? 'AI is speaking' : 'AI is silent'}>
          {Array.from({ length: 16 }, (_, i) => <i key={i} />)}
        </div>
      </div>
      <div className="lesson-copy">
        {lesson.explanation.split(/\n+/).filter(Boolean).map((p, i) => {
          const prior = lesson.explanation.split(/\n+/).filter(Boolean).slice(0, i).join('\n').length + i;
          return <p key={i}>{highlighted(p, titleEnd + 2 + prior)}</p>;
        })}
      </div>
      {lesson.keyPoints.length > 0 && (
        <div className="key-points">
          <h3>Keep these in mind</h3>
          {lesson.keyPoints.map((point, i) => (
            <div key={i}><span>{String(i + 1).padStart(2, '0')}</span>{point}</div>
          ))}
        </div>
      )}
      {lesson.followUpQuestions.length > 0 && (
        <div className="followups">
          <h3>Try asking next</h3>
          {lesson.followUpQuestions.map((q, i) => (
            <p key={i}><ArrowRight size={13} />{q}</p>
          ))}
        </div>
      )}
      <div className="speech-controls">
        <button className={`button ${speaking ? 'button-primary' : 'button-subtle'}`} onClick={() => say(false)}>
          {speaking ? '■ Stop reading' : '▶ Listen to teacher explanation'}
        </button>
        <label className="voice-choice">
          Speech voice
          <select value={selectedVoice} onChange={event => onVoiceChange(event.target.value)}>
            <option value="">Automatic · {language}</option>
            {voices.map(item => (
              <option key={item.voiceURI} value={item.voiceURI}>{item.name} · {item.lang}</option>
            ))}
          </select>
        </label>
        <div className="teacher-slider-pair">
          <label>
            Teacher speed <b>{rate.toFixed(1)}×</b>
            <input type="range" min=".5" max="1.5" step=".1" value={rate} onChange={event => onRateChange(Number(event.target.value))} />
          </label>
          <label>
            Teacher volume <b>{Math.round(volume * 100)}%</b>
            <input type="range" min="0.1" max="1.0" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))} />
          </label>
        </div>
        <small>{speaking ? 'Teacher reading 2-3 words dictation…' : voice ? `Voice: ${voice.name}` : 'Speech voices available in your browser'}</small>
      </div>
    </div>
  );
}
function UserAvatar({photo,initials,className=''}:{photo?:string|null;initials:string;className?:string}) {
  return <span className={`avatar ${className}`}>{photo?<img src={photo} alt="" aria-hidden="true"/>:initials}</span>;
}

function Dashboard({summary,loading,activities,userName,profilePhoto,onNavigate}:{summary?:{sessions:number;quizzes:number;averageScore:number;studyMinutes:number;recentActivity:{id:number;kind:string;title:string;details:string;minutes:number;createdAt:string}[]};loading:boolean;activities?:{id:number;kind:string;title:string;details:string;minutes:number;createdAt:string}[];userName:string;profilePhoto?:string;onNavigate:(m:Module)=>void}) {
  const userInitials=userName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  return <section className="page-section dashboard-section"><div className="welcome-banner"><div className="banner-content"><span className="eyebrow">YOUR STUDY DESK · READY WHEN YOU ARE</span><h1>Make room for<br/><em>understanding.</em></h1><p>Good study starts with the material you already have. Bring it in and take the next step.</p><button className="button button-banner" onClick={()=>onNavigate('teacher')}>Open AI Teacher <ArrowRight size={15}/></button></div><div className="banner-illustration"><div className="banner-ring ring-a"/><div className="banner-ring ring-b"/><span className="banner-spark s1"/><span className="banner-spark s2"/><div className="banner-book"><BookOpen size={42}/></div><div className="banner-label">YOUR NOTES<br/>→ NEW IDEAS</div></div><div className="banner-index">STUDY<br/>BETTER<br/><b>01—04</b></div></div><div className="dashboard-section-heading"><div><span className="eyebrow">TOOLS FOR THE WORK IN FRONT OF YOU</span><h2>Pick up where you need to.</h2></div><span className="dashboard-greeting">{userName.split(' ')[0]}’s workspace <UserAvatar photo={profilePhoto} initials={userInitials}/></span></div><div className="module-list">{[{id:'teacher' as Module,num:'01',icon:BookOpen,title:'Learn from your own material',desc:'Upload notes, ask a question, get a clear explanation.',tone:'mint',action:'Study'}, {id:'voice' as Module,num:'02',icon:Mic,title:'English Practice & AI Voice Studio',desc:'Practise speaking English with an animated AI tutor, dynamic speaking levels, and real-time grammar feedback.',tone:'sky',action:'Practice'}, {id:'voiceroom' as Module,num:'03',icon:Radio,title:'Student Voice Rooms',desc:'Practise speaking live with friends, build speaking confidence in group audio rooms — 100% Free.',tone:'violet',action:'Join'}, {id:'docs' as Module,num:'04',icon:WandSparkles,title:'Prepare a document',desc:'Capture, rotate and make a lighter copy in your browser.',tone:'teal',action:'Process'}, {id:'equations' as Module,num:'04',icon:Sigma,title:'Explore equations visually',desc:'Plot a function and see how its shape changes.',tone:'violet',action:'Graph'}, {id:'quiz' as Module,num:'05',icon:Brain,title:'Practice from your quiz',desc:'Turn an uploaded worksheet into interactive practice.',tone:'mint',action:'Practice'}].map(card=><button className="module-row" key={card.id} onClick={()=>onNavigate(card.id)} data-testid={`card-module-${card.id}`}><span className="module-num">{card.num}</span><span className={`module-icon ${card.tone}`}><card.icon size={19}/></span><span className="module-text"><b>{card.title}</b><small>{card.desc}</small></span><span className="module-action">{card.action}<ArrowRight size={15}/></span></button>)}</div><div className="dashboard-lower"><div className="panel progress-panel"><div className="panel-heading"><span className="heading-icon mint"><Activity size={17}/></span><div><h2>Your activity</h2><p>Work completed in your workspace</p></div><span className="eyebrow right-eyebrow">PRIVATE DATA</span></div>{loading?<InlineLoading label="Loading your activity"/>:activities?.length?<div className="activity-list">{activities.slice(0,4).map(item=><div className="activity-item" key={item.id}><span className="activity-line"/><div><b>{item.title}</b><small>{item.details} · {new Date(item.createdAt).toLocaleDateString()}</small></div><span className="activity-kind">{item.kind}</span></div>)}</div>:<p className="empty-inline">Your sessions will appear here after you use a study tool.</p>}</div><div className="stats-panel">{loading?<div className="stat-skeletons"><span className="skeleton skeleton-line"/><span className="skeleton skeleton-title"/></div>:<><span className="eyebrow">A LITTLE MOMENTUM</span><div className="stats-numbers"><div><b>{summary?.sessions??0}</b><small>Study sessions</small></div><div><b>{summary?.quizzes??0}</b><small>Quiz attempts</small></div><div><b>{summary?.studyMinutes??0}<i>m</i></b><small>Time studying</small></div></div><div className="score-note"><span className="score-mark"><Zap size={14}/></span><span><b>{summary?.averageScore??0}%</b> average practice score</span></div></>}</div></div></section>;
}
function PreviewBox({label,file,url,rotation,mimeType,zoom=1}:{label:string;file:File;url:string;rotation:number;mimeType?:string;zoom?:number}) {const type=mimeType||file.type;return <div className="preview-box"><div className="preview-box-head"><b>{label}</b><span>{type==='application/pdf'?'PDF':type.split('/')[1]?.toUpperCase()||'FILE'}</span></div><div className="preview-canvas">{url?(type==='application/pdf'?<iframe src={url} title={`${label} ${file.name}`} style={{transform:`scale(${zoom})`}}/>:<img src={url} alt={`${label}: ${file.name}`} style={{transform:`rotate(${rotation}deg) scale(${zoom})`}}/>):<div className="preview-empty"><FileImage size={21}/><span>Processed preview appears here</span></div>}</div><small>{label==='Original'?file.name:(url?'Created in this session':'Not processed yet')}</small></div>}
function QuizDocumentPreview({file,url,quiz,open}:{file:File;url:string;quiz:QuizAnalysis;open:boolean}) {const isPublic=/^https?:\/\//i.test(url);return <details className="quiz-source-preview" open={open}><summary><FileText size={15}/><span>{isPublic?'Public quiz source':'Uploaded quiz source'} · {quiz.totalQuestions} questions</span><ChevronDown size={14}/></summary><div className="quiz-source-frame">{isPublic?<iframe src={url} title={`Public quiz source ${url}`} sandbox="allow-forms allow-scripts" referrerPolicy="no-referrer"/>:file.type==='application/pdf'?<iframe src={url} title={`Uploaded quiz ${file.name}`}/>:file.type.startsWith('image/')?<img src={url} alt={`Uploaded quiz ${file.name}`}/>:<p>{file.name} · Question text was extracted for practice.</p>}</div></details>}
function QuizAttemptSummary({quiz,attempt}:{quiz:QuizAnalysis;attempt:QuizAttempt}) {return <div className="attempt-summary"><span className="eyebrow">ATTEMPT SUBMITTED</span><h2>{attempt.score} / {attempt.totalQuestions} correct</h2><p>Submitted after {attempt.timeSpentSeconds} seconds. Review the AI-marked answers below.</p><div className="attempt-outcomes">{attempt.outcomes.map(outcome=>{const q=quiz.questions[outcome.questionIndex];return <div key={outcome.questionIndex} className={outcome.isCorrect?'correct':'incorrect'}><span>{outcome.isCorrect?<CheckCircle2 size={15}/>:<X size={15}/>}</span><b>Q{outcome.questionIndex+1}</b><p>{q?.question||'Question'}</p><small>{outcome.isCorrect?'Marked correct':'Marked incorrect'} · {q?.options[outcome.selectedIndex]||'—'}</small></div>;})}</div></div>}
function QuizQuestionsOverview({quiz,onBegin,onAutoSolve,submitting}:{quiz:QuizAnalysis;onBegin:()=>void;onAutoSolve:()=>void;submitting:boolean}) {
  return <div className="quiz-overview-card">
    <div className="quiz-overview-header">
      <span className="eyebrow">QUIZ LOADED · {quiz.totalQuestions} QUESTIONS</span>
      <h2>{quiz.fileName}</h2>
      <p>{quiz.subject || 'Practice'} · All questions detected from your file</p>
    </div>
    <div className="quiz-overview-actions">
      <button className="button button-primary" onClick={onBegin} disabled={submitting}><Play size={15}/> Start Practice</button>
      <button className="button button-subtle" onClick={onAutoSolve} disabled={submitting || quiz.questions.some(q=>q.options.length<2)}><Sparkles size={15}/> Auto Solve All</button>
    </div>
    <div className="quiz-questions-list">
      <h3>Detected Questions ({quiz.totalQuestions})</h3>
      {quiz.questions.map((q,idx)=><div key={idx} className="quiz-preview-item">
        <span className="preview-q-num">Q{idx+1}</span>
        <div className="preview-q-content">
          <p className="preview-q-text">{q.question}</p>
          <div className="preview-options-grid">
            {q.options.map((opt,oIdx)=><span key={oIdx} className="preview-option-chip"><b>{String.fromCharCode(65+oIdx)}.</b> {opt}</span>)}
          </div>
        </div>
      </div>)}
    </div>
  </div>;
}

function QuizQuestionCard({quiz,index,selected,setSelected,feedback,onCheck,onNext,checking,submitting,results,onAskAi}:{quiz:QuizAnalysis;index:number;selected:number|null;setSelected:(v:number)=>void;feedback:string;onCheck:()=>void;onNext:()=>void;checking:boolean;submitting:boolean;results:{index:number;selected:number;correct:boolean}[];onAskAi?:(prompt:string)=>void}) {
  const q=quiz.questions[index];
  const answeredResult=results.find(r=>r.index===index);
  const answered=answeredResult!==undefined;
  const isWrong=answered && !answeredResult.correct;
  return <div className="active-question">
    <div className="question-meta"><span>QUESTION {String(index+1).padStart(2,'0')} <i>/ {quiz.questions.length}</i></span><span className="topic-pill">{q.topic||quiz.subject||'Practice'}</span></div>
    <div className="question-progress"><span style={{width:`${((index+1)/quiz.questions.length)*100}%`}}/></div>
    <h2>{q.question}</h2>
    <div className="answer-list">{q.options.map((option,i)=><button className={`answer-option ${selected===i?'chosen':''}`} disabled={answered} key={i} onClick={()=>setSelected(i)}><span>{String.fromCharCode(65+i)}</span>{option}{answered&&selected===i&&(results.find(r=>r.index===index)?.correct?<CheckCircle2 size={16}/>:<X size={16}/>)}</button>)}</div>
    {feedback&&<div className={`answer-feedback ${isWrong?'feedback-incorrect':'feedback-correct'}`}>{feedback}</div>}
    {isWrong&&onAskAi&&<button type="button" className="button button-subtle quiz-solve-btn" onClick={()=>{
      onAskAi(`Please solve this question step-by-step and explain the correct answer:\nQuestion: "${q.question}"\nOptions:\n${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('\n')}`);
    }}><Brain size={15}/> 🤖 Ask AI Chatbot to solve this question step-by-step</button>}
    <div className="question-footer"><span>{results.length} answered</span>{answered?<button className="button button-primary" onClick={onNext} disabled={submitting}>{index===quiz.questions.length-1?'Finish practice':'Next question'}<ArrowRight size={15}/></button>:<button className="button button-primary" onClick={onCheck} disabled={selected===null||checking}>{checking?'Checking…':'Check answer'}<Check size={15}/></button>}</div>
  </div>;
}

function App() { return <QueryClientProvider client={client}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><Switch><Route path="/" component={AppContent}/><Route path="/login" component={AppContent}/><Route path="/register" component={AppContent}/><Route component={()=><div className="not-found"><GraduationCap size={24}/><h1>Page not found</h1><p>This workspace page doesn’t exist.</p><Link href="/" className="button button-primary">Return to workspace</Link></div>}/></Switch></WouterRouter></QueryClientProvider>; }
export default App;
