'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Loader2, Minimize2, Maximize2, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_REPLIES = [
  'What are the prizes?',
  'What is the registration fee?',
  'When is the deadline?',
  'Who can participate?',
  'Tell me about FloatChat',
  'What are the judging criteria?',
  'How do I submit my PPT?',
  'What is the venue?',
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Hey there! I'm **ORION AI** — your mission assistant for **ORION 1.0**, the premier 24-hour national hackathon at SIST Chennai organized by Microsoft Club SIST.

🏆 Prize Pool: ₹1,00,000 | 📅 Deadline: Sep 11, 2026

Ask me anything about the hackathon — eligibility, fees, problem statements, venue, rules, and more!`,
  timestamp: new Date(),
};

// Render markdown-lite: bold, bullet lists
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const rendered = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // HR
    if (line === '---') {
      return <hr key={i} className="border-white/10 my-2" />;
    }

    // Bullet
    if (line.startsWith('• ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-1.5 leading-relaxed">
          <span className="text-[#00BCF2] shrink-0 mt-0.5">•</span>
          <span>{rendered.slice(1)}</span>
        </div>
      );
    }

    // Table row (crude)
    if (line.startsWith('|')) {
      const cells = line.split('|').filter(Boolean);
      if (cells.every((c) => /^[-\s]+$/.test(c))) return null; // separator row
      return (
        <div key={i} className="flex gap-3 text-xs">
          {cells.map((c, ci) => (
            <span key={ci} className="flex-1">{c.trim()}</span>
          ))}
        </div>
      );
    }

    // Heading marker #
    if (line.startsWith('# ')) {
      return <p key={i} className="font-bold text-white">{rendered.slice(1)}</p>;
    }

    return (
      <p key={i} className={line === '' ? 'mb-1' : 'leading-relaxed'}>
        {rendered}
      </p>
    );
  });
}

export const OrionChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom('auto');
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.error || 'Sorry, I could not process that.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Connection error. Please check your internet and try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    if (!hasOpenedOnce) setHasOpenedOnce(true);
  };

  // Lets other sections (e.g. the FAQ's "Ask ORION AI") open the assistant,
  // optionally with a question pre-sent: dispatch `orion:open-chat` with { question }.
  const openRef = useRef({ handleOpen, sendMessage });
  useEffect(() => {
    openRef.current = { handleOpen, sendMessage };
  });
  useEffect(() => {
    const onOpenChat = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question?.trim();
      openRef.current.handleOpen();
      if (question) openRef.current.sendMessage(question);
    };
    window.addEventListener('orion:open-chat', onOpenChat);
    return () => window.removeEventListener('orion:open-chat', onOpenChat);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00BCF2] to-[#0078D4] text-white font-bold shadow-[0_0_30px_rgba(0,188,242,0.5)] hover:shadow-[0_0_45px_rgba(0,188,242,0.7)] hover:scale-105 transition-all duration-300"
          aria-label="Open ORION AI chatbot"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">ORION AI</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-[#00BCF2]/30 bg-[#020617]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,188,242,0.15)] transition-all duration-300 ${
            isMinimized ? 'w-72 h-14' : 'w-[360px] sm:w-[400px] h-[600px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#00BCF2]/20 rounded-t-2xl bg-gradient-to-r from-[#00BCF2]/10 to-[#0078D4]/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00BCF2] to-[#0078D4] flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#020617]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white font-mono tracking-wide">ORION AI</p>
                <p className="text-[10px] text-[#00BCF2] font-mono">Mission Assistant • Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized((m) => !m)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Close chatbot"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#00BCF2]/20"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow ${
                        msg.role === 'assistant'
                          ? 'bg-gradient-to-br from-[#00BCF2] to-[#0078D4]'
                          : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <Bot className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-0.5 ${
                        msg.role === 'assistant'
                          ? 'bg-[#0B1220]/80 border border-[#00BCF2]/15 text-slate-200 rounded-tl-sm'
                          : 'bg-gradient-to-br from-[#00BCF2]/20 to-[#0078D4]/20 border border-[#00BCF2]/30 text-white rounded-tr-sm'
                      }`}
                    >
                      {renderMarkdown(msg.content)}
                      <p className="text-[9px] text-slate-500 mt-1 text-right">
                        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00BCF2] to-[#0078D4] flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-[#0B1220]/80 border border-[#00BCF2]/15 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#00BCF2] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-[#00BCF2] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-[#00BCF2] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-[120px] right-4 w-8 h-8 rounded-full bg-[#00BCF2] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-all"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}

              {/* Quick Replies */}
              {messages.length <= 1 && (
                <div className="px-4 py-2 border-t border-white/5 shrink-0">
                  <p className="text-[10px] text-slate-500 font-mono mb-2">QUICK QUESTIONS:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.slice(0, 4).map((qr) => (
                      <button
                        key={qr}
                        onClick={() => sendMessage(qr)}
                        className="text-[10px] px-2.5 py-1 rounded-full border border-[#00BCF2]/30 text-[#00BCF2] hover:bg-[#00BCF2]/10 transition-all font-mono"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-3 py-3 border-t border-[#00BCF2]/15 shrink-0">
                <div className="flex items-center gap-2 bg-[#0B1220] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#00BCF2]/50 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about ORION 1.0..."
                    disabled={isLoading}
                    maxLength={500}
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none font-sans"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00BCF2] to-[#0078D4] flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Send className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-slate-600 text-center mt-1.5 font-mono">
                  ORION AI • Microsoft Club SIST
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
