
import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

import {
  Bot,
  Send,
  Sparkles,
  BarChart3,
  Package,
  Users,
  CreditCard,
  TrendingUp,
  Loader2,
  ShieldCheck,
  Database,
  CircleDollarSign,
  ChevronRight,
  Menu,
  X,
  Activity,
  ArrowUpRight,
  Zap,
  BrainCircuit,
  MessageSquare,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  {
    title: 'Today Sales',
    question: 'Aaj ki total sales kitni hain?',
    icon: BarChart3,
    accent: 'blue',
  },
  {
    title: 'Monthly Profit',
    question: 'Is month ka profit kitna hua?',
    icon: TrendingUp,
    accent: 'emerald',
  },
  {
    title: 'Low Stock',
    question: 'Low stock products batao',
    icon: Package,
    accent: 'orange',
  },
  {
    title: 'Overdue Customers',
    question: 'Kaun se customers overdue hain?',
    icon: Users,
    accent: 'rose',
  },
  {
    title: 'Installments',
    question: 'Is month kitni installments collect huin?',
    icon: CreditCard,
    accent: 'violet',
  },
  {
    title: 'Payments',
    question: 'Aaj kitni payments receive hui hain?',
    icon: CircleDollarSign,
    accent: 'cyan',
  },
];

const ASK_ABOUT = [
  {
    icon: Users,
    title: 'Customers',
    text: 'Details, balance & history',
  },
  {
    icon: BarChart3,
    title: 'Sales',
    text: 'Sales & business reports',
  },
  {
    icon: CreditCard,
    title: 'Installments',
    text: 'Plans, dues & payments',
  },
  {
    icon: Package,
    title: 'Inventory',
    text: 'Products & stock',
  },
];

const accentClasses = {
  blue: {
    icon: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'hover:border-blue-200',
  },
  emerald: {
    icon: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'hover:border-emerald-200',
  },
  orange: {
    icon: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'hover:border-orange-200',
  },
  rose: {
    icon: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'hover:border-rose-200',
  },
  violet: {
    icon: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'hover:border-violet-200',
  },
  cyan: {
    icon: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'hover:border-cyan-200',
  },
};

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text:
        'Salam! 👋 Main aapka AI Business Assistant hoon.\n\nAap apne customers, sales, payments, profits, installments aur inventory ke baray mein mujhse pooch sakte hain.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const hasConversation = messages.length > 1;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

 const handleSend = async (textToSend) => {
  const query = (textToSend || input).trim();

  if (!query || loading) return;

  const userMessage = {
    id: Date.now(),
    sender: 'user',
    text: query,
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput('');
  setLoading(true);
  setMobileMenu(false);

  try {
    const token = localStorage.getItem('token');

    const response = await api.post(
      '/api/ai/chat',
      {
        message: query,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = response.data;

    if (data.success) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: data.answer,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text:
            data.message ||
            'Data fetch nahi ho saka. Please dobara try karein.',
        },
      ]);
    }
  } catch (error) {
    console.error('AI Assistant Error:', error);

    const serverMessage =
      error?.response?.data?.message;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: 'assistant',
        text:
          serverMessage ||
          'Assistant server se connection nahi ho saka. Please network check karein.',
      },
    ]);
  } finally {
    setLoading(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }
};

  return (
    <>
      <style>{`
        @keyframes aiFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes aiPulse {
          0%, 100% {
            transform: scale(.85);
            opacity: .35;
          }
          50% {
            transform: scale(1.15);
            opacity: .08;
          }
        }

        @keyframes aiSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes aiSpinReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes softFloat {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-10px) translateX(5px);
          }
        }

        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes lineMove {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(430%);
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: .25;
            transform: scale(.75);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(220%);
          }
        }

        @keyframes borderPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(99,102,241,.05);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(99,102,241,0);
          }
        }

        .ai-float {
          animation: aiFloat 4s ease-in-out infinite;
        }

        .ai-pulse {
          animation: aiPulse 3s ease-in-out infinite;
        }

        .ai-spin {
          animation: aiSpin 18s linear infinite;
        }

        .ai-spin-reverse {
          animation: aiSpinReverse 13s linear infinite;
        }

        .soft-float {
          animation: softFloat 6s ease-in-out infinite;
        }

        .ai-message {
          animation: messageIn .38s cubic-bezier(.22,.61,.36,1) both;
        }

        .ai-card {
          animation: cardIn .5s cubic-bezier(.22,.61,.36,1) both;
        }

        .ai-line {
          animation: lineMove 4s ease-in-out infinite;
        }

        .ai-dot {
          animation: dotPulse 1.5s ease-in-out infinite;
        }

        .ai-border-pulse {
          animation: borderPulse 2.5s ease-in-out infinite;
        }

        .ai-shimmer {
          animation: shimmer 2.8s ease-in-out infinite;
        }

        .ai-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .ai-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .ai-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,.25);
          border-radius: 999px;
        }

        .ai-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,.35);
        }
      `}</style>

      {/* =========================================================
          AI ASSISTANT PAGE
          NO INTERNAL LEFT SIDEBAR
          MAIN WEBSITE SIDEBAR WILL STAY IN CONTROL
      ========================================================== */}

      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f7f9fc] text-slate-900">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">

          <div className="absolute bottom-0 left-0 h-px w-full overflow-hidden bg-slate-100">
            <div className="ai-line h-px w-1/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          </div>

          <div className="flex min-w-0 items-center gap-3">

            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Activity size={17} />

              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">

                <h1 className="truncate text-[14px] font-bold tracking-tight text-slate-900 sm:text-[15px]">
                  Business Assistant
                </h1>

                <span className="hidden rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[.12em] text-indigo-600 sm:inline-block">
                  AI Powered
                </span>

              </div>

              <p className="mt-0.5 hidden text-[8px] text-slate-400 sm:block">
                Intelligent insights from your business data
              </p>
            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2">

            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:flex">
              <Database
                size={10}
                className="text-indigo-500"
              />

              <span className="text-[8px] font-semibold text-slate-500">
                LIVE DATABASE
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5">
              <ShieldCheck
                size={10}
                className="text-emerald-600"
              />

              <span className="text-[8px] font-bold text-emerald-600">
                READ ONLY
              </span>
            </div>

          </div>
        </header>

        {/* =====================================================
            MOBILE QUICK QUESTIONS
        ====================================================== */}

        <div className="ai-scroll flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">

          <div className="flex shrink-0 items-center gap-1.5 pr-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">
            <Zap
              size={10}
              className="text-indigo-500"
            />
            Quick
          </div>

          {SUGGESTED_QUESTIONS.map((item, index) => {
            const Icon = item.icon;

            return (
              <button
                key={index}
                type="button"
                disabled={loading}
                onClick={() => handleSend(item.question)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[8px] font-semibold text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
              >
                <Icon size={10} />
                {item.title}
              </button>
            );
          })}

        </div>

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}

        <main className="relative min-h-0 flex-1 overflow-hidden">

          {/* Background */}

          <div className="pointer-events-none absolute inset-0 overflow-hidden">

            <div className="absolute left-[10%] top-[5%] h-[280px] w-[280px] rounded-full bg-indigo-100/50 blur-[100px]" />

            <div className="absolute bottom-[5%] right-[10%] h-[260px] w-[260px] rounded-full bg-blue-100/50 blur-[100px]" />

            <div className="soft-float absolute left-[15%] top-[25%] h-2 w-2 rounded-full bg-indigo-300/60" />

            <div
              className="soft-float absolute right-[20%] top-[20%] h-1.5 w-1.5 rounded-full bg-blue-300/70"
              style={{ animationDelay: '1s' }}
            />

            <div
              className="soft-float absolute bottom-[25%] left-[25%] h-1.5 w-1.5 rounded-full bg-violet-300/60"
              style={{ animationDelay: '2s' }}
            />

            <div
              className="soft-float absolute bottom-[18%] right-[30%] h-2 w-2 rounded-full bg-cyan-300/60"
              style={{ animationDelay: '3s' }}
            />

          </div>

          {/* ===================================================
              CENTERED CONTENT
          ==================================================== */}

          <div className="ai-scroll relative h-full overflow-y-auto">

            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">

              {!hasConversation ? (
                /* =================================================
                   WELCOME + CENTER QUESTIONS
                ================================================== */

                <div className="flex flex-1 flex-col items-center justify-center py-5 text-center">

                  {/* AI CORE */}

                  <div className="ai-float relative h-[105px] w-[105px] sm:h-[115px] sm:w-[115px]">

                    <div className="ai-spin absolute inset-0 rounded-full border border-indigo-200" />

                    <div className="ai-spin-reverse absolute inset-[9px] rounded-full border border-dashed border-violet-200" />

                    <div className="ai-pulse absolute inset-[22px] rounded-full bg-indigo-300 blur-2xl" />

                    <div className="absolute inset-[26px] flex items-center justify-center rounded-[25px] border border-indigo-100 bg-white text-indigo-600 shadow-[0_15px_40px_rgba(79,70,229,.12)]">

                      <BrainCircuit
                        size={31}
                        strokeWidth={1.35}
                      />

                    </div>

                    <span className="absolute right-[6px] top-[6px] flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#f8fafc] bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.3)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>

                  </div>

                  {/* TITLE */}

                  <div className="mt-5">

                    <div className="mb-2.5 flex items-center justify-center gap-2">

                      <span className="h-px w-7 bg-indigo-200" />

                      <p className="text-[8px] font-bold uppercase tracking-[.25em] text-indigo-600">
                        AI COMMAND CENTER
                      </p>

                      <span className="h-px w-7 bg-indigo-200" />

                    </div>

                    <h2 className="text-[24px] font-black tracking-[-.04em] text-slate-900 sm:text-[34px]">
                      Ask your business
                      <span className="text-indigo-600">
                        {' '}anything.
                      </span>
                    </h2>

                    <p className="mx-auto mt-2.5 max-w-[560px] text-[10px] leading-5 text-slate-500 sm:text-[12px] sm:leading-6">
                      Sales, customers, payments, profits,
                      installments aur inventory ka real-time
                      insight simple language mein hasil karein.
                    </p>

                  </div>

                  {/* STATUS */}

                  <div className="ai-border-pulse mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">

                    <Activity
                      size={10}
                      className="text-emerald-500"
                    />

                    <span className="text-[7px] font-bold uppercase tracking-[.12em] text-slate-500">
                      System Online
                    </span>

                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <span className="text-[7px] font-medium text-slate-400">
                      Live business data connected
                    </span>

                  </div>

                  {/* =================================================
                      CENTERED QUESTIONS
                  ================================================== */}

                  <div className="mt-7 w-full max-w-[820px]">

                    <div className="mb-4 flex items-center gap-3">

                      <div className="h-px flex-1 bg-slate-200" />

                      <div className="flex shrink-0 items-center gap-1.5 text-[7px] font-bold uppercase tracking-[.2em] text-slate-400">
                        <Sparkles size={9} />
                        Quick Questions
                      </div>

                      <div className="h-px flex-1 bg-slate-200" />

                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                      {SUGGESTED_QUESTIONS.map((item, index) => {
                        const Icon = item.icon;
                        const accent = accentClasses[item.accent];

                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={loading}
                            onClick={() => handleSend(item.question)}
                            style={{
                              animationDelay: `${index * 70}ms`,
                            }}
                            className={`ai-card group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_4px_18px_rgba(15,23,42,.035)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_14px_35px_rgba(79,70,229,.09)] ${accent.border} disabled:opacity-40`}
                          >

                            <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-indigo-500 transition-all duration-300 group-hover:w-full" />

                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg} ${accent.icon} transition-all duration-300 group-hover:scale-110`}
                            >
                              <Icon size={16} />
                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="text-[9px] font-bold text-slate-700 transition group-hover:text-indigo-600 sm:text-[10px]">
                                {item.title}
                              </p>

                              <p className="mt-1 truncate text-[7px] text-slate-400">
                                {item.question}
                              </p>

                            </div>

                            <ArrowUpRight
                              size={13}
                              className="text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500"
                            />

                          </button>
                        );
                      })}

                    </div>

                  </div>

                  {/* ASK ABOUT */}

                  <div className="mt-6 w-full max-w-[820px]">

                    <div className="mb-3 flex items-center gap-3">

                      <div className="h-px flex-1 bg-slate-200" />

                      <p className="shrink-0 text-[7px] font-bold uppercase tracking-[.2em] text-slate-400">
                        Ask About
                      </p>

                      <div className="h-px flex-1 bg-slate-200" />

                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                      {ASK_ABOUT.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.title}
                            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                          >

                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-500">
                              <Icon size={12} />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-[8px] font-bold text-slate-600">
                                {item.title}
                              </p>

                              <p className="mt-0.5 truncate text-[6px] text-slate-400">
                                {item.text}
                              </p>

                            </div>

                          </div>
                        );
                      })}

                    </div>

                  </div>

                </div>
              ) : (
                /* =================================================
                   CHAT
                ================================================== */

                <div className="mx-auto w-full max-w-4xl py-4 sm:py-7">

                  <div className="mb-6 flex items-center gap-3">

                    <div className="h-px flex-1 bg-slate-200" />

                    <div className="flex items-center gap-2 text-[7px] font-bold uppercase tracking-[.18em] text-slate-400">

                      <Activity
                        size={9}
                        className="text-emerald-500"
                      />

                      Live Conversation

                    </div>

                    <div className="h-px flex-1 bg-slate-200" />

                  </div>

                  <div className="space-y-7">

                    {messages.map((message) => {
                      const isUser =
                        message.sender === 'user';

                      return (
                        <div
                          key={message.id}
                          className={`ai-message flex gap-3 ${
                            isUser
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >

                          {!isUser && (
                            <div className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">

                              <Bot
                                size={16}
                                strokeWidth={1.5}
                              />

                              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />

                            </div>
                          )}

                          <div
                            className={`max-w-[92%] sm:max-w-[78%] ${
                              isUser
                                ? 'flex flex-col items-end'
                                : ''
                            }`}
                          >

                            <div
                             className={`whitespace-pre-wrap break-words text-[13px] font-medium leading-7 sm:text-[13px] sm:leading-7 ${
  isUser
    ? 'rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-white shadow-[0_10px_25px_rgba(79,70,229,.14)]'
    : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-[0_8px_25px_rgba(15,23,42,.05)]'
}`}
                            >
                              {message.text}
                            </div>

                            <div
                              className={`mt-1.5 flex items-center gap-1 px-1 text-[7px] uppercase tracking-[.08em] text-slate-400 ${
                                isUser
                                  ? 'justify-end'
                                  : ''
                              }`}
                            >

                              {!isUser && (
                                <Sparkles
                                  size={8}
                                  className="text-indigo-500"
                                />
                              )}

                              {isUser
                                ? 'YOU'
                                : 'AI ASSISTANT'}

                            </div>

                          </div>

                        </div>
                      );
                    })}

                    {loading && (
                      <div className="ai-message flex gap-3">

                        <div className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">

                          <Bot
                            size={16}
                            strokeWidth={1.5}
                          />

                          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                        </div>

                        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">

                          <div className="flex items-center gap-3">

                            <div className="flex items-center gap-1">

                              <span className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500" />

                              <span
                                className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500"
                                style={{
                                  animationDelay: '.2s',
                                }}
                              />

                              <span
                                className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500"
                                style={{
                                  animationDelay: '.4s',
                                }}
                              />

                            </div>

                            <span className="text-[9px] font-medium text-slate-500">
                              Analyzing business data...
                            </span>

                            <Loader2
                              size={11}
                              className="animate-spin text-slate-300"
                            />

                          </div>

                        </div>

                      </div>
                    )}

                    <div ref={chatEndRef} />

                  </div>

                </div>
              )}

            </div>

          </div>
        </main>

        {/* =====================================================
            INPUT
        ====================================================== */}

        <footer className="relative z-20 shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4 lg:px-8">

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto w-full max-w-4xl"
          >

            <div className="group relative flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_5px_25px_rgba(15,23,42,.05)] transition-all duration-300 focus-within:border-indigo-300 focus-within:shadow-[0_8px_35px_rgba(79,70,229,.10)]">

              <div className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center text-slate-400 transition group-focus-within:text-indigo-500">
                <MessageSquare size={15} />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your business anything..."
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[11px] font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-[12px]"
              />

              <div className="mr-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[7px] font-bold text-slate-400 sm:flex">
                ENTER
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="group/send relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 text-white shadow-[0_5px_15px_rgba(79,70,229,.18)] transition-all duration-300 hover:bg-indigo-500 hover:shadow-[0_8px_22px_rgba(79,70,229,.25)] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
              >

                <span className="ai-shimmer absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-white/20" />

                {loading ? (
                  <Loader2
                    size={16}
                    className="relative animate-spin"
                  />
                ) : (
                  <Send
                    size={15}
                    className="relative transition-transform duration-300 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5"
                  />
                )}

              </button>

            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2">

              <span className="flex items-center gap-1.5">

                <ShieldCheck
                  size={9}
                  className="text-emerald-500"
                />

                <span className="text-[7px] font-medium uppercase tracking-[.08em] text-slate-400 sm:text-[8px]">
                  Read-only AI
                </span>

              </span>

              <span className="h-1 w-1 rounded-full bg-slate-300" />

              <span className="text-[7px] font-medium uppercase tracking-[.08em] text-slate-400 sm:text-[8px]">
                Live shop data
              </span>

            </div>

          </form>

        </footer>

      </div>
    </>
  );
}
