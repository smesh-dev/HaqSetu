"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProfile } from "@/lib/store";
import { runAssessment } from "@/lib/rules/engine";
import { assessmentToFacts } from "@/lib/profile";

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

const GREETINGS = {
  hi: "नमस्ते! मैं हक़सेतु सहायक हूँ। 🙏 मैं आपकी क्या मदद कर सकता हूँ?",
  en: "Hello! I am HaqSetu Assistant. 🙏 How can I help you today?",
};

export default function HelpBot() {
  const [profile] = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [botLang, setBotLang] = useState<"hi" | "en">("hi");
  const [hasAligned, setHasAligned] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // TTS auto playback status

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechBaseRef = useRef("");

  // Sync bot language with app language initially
  useEffect(() => {
    if (profile.language && !hasAligned) {
      setBotLang(profile.language);
      setMessages([
        {
          role: "model",
          content: GREETINGS[profile.language],
          timestamp: new Date(),
        },
      ]);
      setHasAligned(true);
    }
  }, [profile.language, hasAligned]);

  // Fallback initial greeting if not synced
  useEffect(() => {
    if (messages.length === 0 && !hasAligned) {
      setMessages([
        {
          role: "model",
          content: GREETINGS[botLang],
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages, botLang, hasAligned]);

  // Pre-load synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const load = () => {
        window.speechSynthesis.getVoices();
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  // Text-to-speech helper
  const speakText = (text: string, lang: "hi" | "en", force = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isMuted && !force) return;

    // Clean emojis/special symbols and replace punctuation with spaces to prevent the voice from pronouncing them out loud (e.g. "comma")
    const cleanText = text
      .replace(/[🙏✨🤖🛡️🔎🚪🔒🔑🌾🌾🌽🏦📜💰📄🏠♿🌾🛖🪵🎒🌾🌾]/g, "")
      .replace(/[।!.?,:;()""''*+\-\_—–\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";

    // Set voice if matches language
    const currentVoices = window.speechSynthesis.getVoices();
    const targetPrefix = lang === "hi" ? "hi" : "en";
    
    // First try exact region match, e.g. hi-in or en-in
    let matchedVoice = currentVoices.find(
      (v) => v.lang.toLowerCase().replace("_", "-") === (lang === "hi" ? "hi-in" : "en-in")
    );
    
    // If not found, try prefix, e.g. hi or en
    if (!matchedVoice) {
      matchedVoice = currentVoices.find((v) =>
        v.lang.toLowerCase().replace("_", "-").startsWith(targetPrefix)
      );
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Quick suggestions based on selected language
  const suggestions =
    botLang === "hi"
      ? [
          { text: "स्थिति बॉक्स (Situation Box) में क्या लिखें?", label: "स्थिति बॉक्स में क्या लिखें?" },
          { text: "दस्तावेज़ों की जाँच कैसे करें?", label: "दस्तावेज़ों की जाँच कैसे करें?" },
          { text: "ट्रैकर (Tracker) क्या है और कैसे उपयोग करें?", label: "ट्रैकर क्या है?" },
          { text: "लाभ (Benefits) कैसे ढूँढें?", label: "लाभ कैसे ढूँढें?" },
        ]
      : [
          { text: "What to write in the Situation Box?", label: "What to write in the situation box?" },
          { text: "How to check and audit documents?", label: "How to check documents?" },
          { text: "What is the Tracker and how to use it?", label: "What is the tracker?" },
          { text: "How to find eligible schemes?", label: "How to find benefits?" },
        ];

  // Auto-popup after 2 minutes of idle time
  useEffect(() => {
    const handleActivity = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isOpen) {
          setIsOpen(true);
          // Speak initial greeting upon auto popup
          speakText(GREETINGS[botLang], botLang);
        }
      }, 120000); // 120,000 ms = 2 minutes
    };

    // Initialize timer
    handleActivity();

    // Register event listeners for user activity
    const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Check speech recognition support
    setSpeechSupported(Boolean(speechRecognitionConstructor()));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      recognitionRef.current?.abort();
    };
  }, [isOpen, botLang, isMuted]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLanguageToggle = (lang: "hi" | "en") => {
    setBotLang(lang);
    setMessages([
      {
        role: "model",
        content: GREETINGS[lang],
        timestamp: new Date(),
      },
    ]);
    setInputVal("");
    setSpeechError("");
    speakText(GREETINGS[lang], lang);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: textToSend, timestamp: new Date() },
    ];
    setMessages(newMessages);
    setInputVal("");
    setLoading(true);
    setSpeechError("");

    // Stop speaking user typing/triggering action
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Prepare profile summary from rules engine
    let profileSummary = "";
    try {
      const assessment = runAssessment(profile);
      profileSummary = assessmentToFacts(assessment);
    } catch (e) {
      console.error("Failed to generate profile facts summary:", e);
    }

    try {
      // Map message structure for backend
      const requestMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages,
          profileSummary,
          language: botLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      const botText =
        data.text ||
        (botLang === "hi"
          ? "माफ़ी चाहता हूँ, मुझे जवाब देने में परेशानी हो रही है।"
          : "Sorry, I am having trouble answering.");

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: botText,
          timestamp: new Date(),
        },
      ]);

      // Automatically recite bot response
      speakText(botText, botLang);
    } catch (err) {
      console.error(err);
      const errText =
        botLang === "hi"
          ? "कृपया माफ़ करें, सर्वर की समस्या के कारण मैं अभी उत्तर नहीं दे पा रहा हूँ।"
          : "Sorry, due to a server issue I cannot answer at the moment.";
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: errText,
          timestamp: new Date(),
        },
      ]);
      speakText(errText, botLang);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechError(
        botLang === "hi"
          ? "आपके ब्राउज़र में आवाज़ इनपुट काम नहीं कर रहा।"
          : "Voice input is not supported in this browser."
      );
      return;
    }

    setSpeechError("");
    speechBaseRef.current = inputVal.trim();
    const recognition = new Recognition();
    recognition.lang = botLang === "hi" ? "hi-IN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? "";
      }
      const separator = speechBaseRef.current && transcript.trim() ? " " : "";
      setInputVal(`${speechBaseRef.current}${separator}${transcript.trimStart()}`);
    };

    recognition.onerror = () => {
      setSpeechError(
        botLang === "hi"
          ? "आवाज़ साफ़ नहीं सुनाई दी। फिर कोशिश करें।"
          : "Could not hear clearly. Try again."
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setSpeechError(
        botLang === "hi" ? "माइक्रोफ़ोन शुरू करने में त्रुटि।" : "Error starting microphone."
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="no-print">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            speakText(GREETINGS[botLang], botLang);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-green hover:bg-brand-green-hover shadow-xl flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 z-50 group border border-white/20"
          title={botLang === "hi" ? "मदद चाहिए?" : "Need Help?"}
          aria-label="Open helper bot"
        >
          <span className="text-2xl group-hover:animate-bounce">🤖</span>
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full animate-pulse">
            {botLang === "hi" ? "मदद" : "Help"}
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 z-50 transition-all duration-300">
          {/* Header */}
          <div className="bg-brand-green text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {botLang === "hi" ? "हक़सेतु सहायक" : "HaqSetu Assistant"}
                </h3>
                <p className="text-[10px] text-emerald-100/90 font-medium">
                  {botLang === "hi" ? "सदा सहायता के लिए उपलब्ध" : "Always here to help you"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Language Switcher Toggle */}
              <div className="flex rounded-md bg-white/15 p-0.5 text-[10px] font-bold ring-1 ring-white/20">
                <button
                  onClick={() => handleLanguageToggle("en")}
                  className={`rounded px-1.5 py-0.5 transition ${
                    botLang === "en" ? "bg-white text-brand-green" : "text-white/80 hover:text-white"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageToggle("hi")}
                  className={`rounded px-1.5 py-0.5 transition ${
                    botLang === "hi" ? "bg-white text-brand-green" : "text-white/80 hover:text-white"
                  }`}
                >
                  हिं
                </button>
              </div>

              {/* Global Mute/Unmute TTS Toggle */}
              <button
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted && typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  } else if (!nextMuted && messages.length > 0) {
                    // Play last message if unmuting
                    const lastModelMsg = [...messages].reverse().find((m) => m.role === "model");
                    if (lastModelMsg) {
                      speakText(lastModelMsg.content, botLang, true);
                    }
                  }
                }}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition"
                title={
                  isMuted
                    ? botLang === "hi"
                      ? "आवाज़ चालू करें"
                      : "Unmute voice playback"
                    : botLang === "hi"
                    ? "आवाज़ बंद करें"
                    : "Mute voice playback"
                }
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white p-1 text-lg leading-none cursor-pointer hover:bg-white/10 rounded"
                aria-label="Close chat window"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm shadow-sm border border-slate-100 ${
                    m.role === "user" ? "bg-mint-bg" : "bg-white"
                  }`}
                >
                  {m.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="relative group/msg max-w-full">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm border ${
                      m.role === "user"
                        ? "bg-brand-green text-white border-brand-green rounded-tr-none"
                        : "bg-white text-slate-850 border-slate-200/60 rounded-tl-none pr-8"
                    }`}
                  >
                    {m.content}

                    {/* Individual speak control for bot messages */}
                    {m.role === "model" && (
                      <button
                        onClick={() => speakText(m.content, botLang, true)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-brand-green bg-white/80 hover:bg-slate-100 rounded p-0.5 shadow-xs transition"
                        title={botLang === "hi" ? "सुने" : "Listen"}
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                          <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-1.5 pl-9">
                <p className="text-[11px] font-semibold text-slate-400">
                  {botLang === "hi" ? "आप पूछ सकते हैं:" : "You can ask:"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s.text)}
                      className="text-left text-xs bg-white text-slate-750 hover:bg-mint-bg/30 hover:text-brand-green px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-3xs transition hover-lift click-scale"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 text-sm shadow-sm">
                  🤖
                </div>
                <div className="bg-white text-slate-500 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce delay-200" />
                  <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce delay-300" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Error and mic status alerts */}
          {(listening || speechError) && (
            <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-100 text-[11px] flex justify-between items-center shrink-0">
              {listening && (
                <span className="text-red-600 font-medium animate-pulse flex items-center gap-1">
                  ● {botLang === "hi" ? "सुन रहे हैं" : "Listening"} ({botLang === "hi" ? "हिंदी" : "English"})
                </span>
              )}
              {speechError && <span className="text-rose-700">{speechError}</span>}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            className="border-t border-slate-200 p-2.5 bg-white flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                botLang === "hi"
                  ? "यहाँ प्रश्न लिखें या माइक दबाकर बोलें..."
                  : "Type your question or click the mic to speak..."
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-brand-green focus:ring-1 focus:ring-mint-bg transition"
              disabled={loading}
            />

            {/* Microphone Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleSpeech}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition ${
                  listening
                    ? "bg-red-500 text-white border-red-500 animate-pulse"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title={
                  listening
                    ? botLang === "hi"
                      ? "सुनना बंद करें"
                      : "Stop listening"
                    : botLang === "hi"
                    ? "आवाज़ से बोलें"
                    : "Speak with voice"
                }
              >
                {listening ? (
                  <span className="w-3 h-3 bg-white rounded-xs" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
                  </svg>
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center shrink-0 hover:bg-brand-green-hover active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition shadow-sm"
              title={botLang === "hi" ? "भेजें" : "Send"}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current rotate-45 transform -translate-x-0.5">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
