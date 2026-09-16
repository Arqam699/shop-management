import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Activity,
  ArrowUpRight,
  Zap,
  BrainCircuit,
  MessageSquare,
  Plus,
  CalendarDays,
  RefreshCw,
  Clock3,
  ChevronDown,
  Search,
  Cpu,
  Gauge,
  Command,
  Radio,
  Layers3,
  ArrowRight,
} from 'lucide-react';

/* ============================================================
   QUICK QUESTIONS
============================================================ */

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
    title: 'Overdue',
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

/* ============================================================
   ASK ABOUT
============================================================ */

const ASK_ABOUT = [
  {
    icon: Users,
    title: 'Customers',
    text: 'Customers, balances & history',
    accent: 'blue',
  },
  {
    icon: BarChart3,
    title: 'Sales',
    text: 'Sales & business reports',
    accent: 'violet',
  },
  {
    icon: CreditCard,
    title: 'Installments',
    text: 'Plans, dues & payments',
    accent: 'emerald',
  },
  {
    icon: Package,
    title: 'Inventory',
    text: 'Products & stock',
    accent: 'orange',
  },
];

/* ============================================================
   ACCENTS
============================================================ */

const accents = {
  blue: {
    icon: 'text-blue-600',
    iconBg: 'bg-blue-50',
    iconBorder: 'border-blue-100',
    hover: 'hover:border-blue-200',
    line: 'from-blue-500',
  },

  emerald: {
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    iconBorder: 'border-emerald-100',
    hover: 'hover:border-emerald-200',
    line: 'from-emerald-500',
  },

  orange: {
    icon: 'text-orange-600',
    iconBg: 'bg-orange-50',
    iconBorder: 'border-orange-100',
    hover: 'hover:border-orange-200',
    line: 'from-orange-500',
  },

  rose: {
    icon: 'text-rose-600',
    iconBg: 'bg-rose-50',
    iconBorder: 'border-rose-100',
    hover: 'hover:border-rose-200',
    line: 'from-rose-500',
  },

  violet: {
    icon: 'text-violet-600',
    iconBg: 'bg-violet-50',
    iconBorder: 'border-violet-100',
    hover: 'hover:border-violet-200',
    line: 'from-violet-500',
  },

  cyan: {
    icon: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    iconBorder: 'border-cyan-100',
    hover: 'hover:border-cyan-200',
    line: 'from-cyan-500',
  },
};

/* ============================================================
   HELPERS
============================================================ */

const createWelcomeMessage = () => ({
  id: 'welcome',
  sender: 'assistant',
  text:
    'Salam! 👋 Main aapka AI Business Assistant hoon.\n\nAap apne customers, sales, payments, profits, installments aur inventory ke baray mein mujhse pooch sakte hain.',
  createdAt: new Date().toISOString(),
  isWelcome: true,
});

const formatTime = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ============================================================
   COMPONENT
============================================================ */

export default function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRefreshing, setHistoryRefreshing] =
    useState(false);

  const [showScrollButton, setShowScrollButton] =
    useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  /* ============================================================
     TODAY
  ============================================================ */

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }, []);

  /* ============================================================
     HISTORY
  ============================================================ */

  const loadHistory = async (silent = false) => {
    try {
      if (silent) {
        setHistoryRefreshing(true);
      } else {
        setHistoryLoading(true);
      }

      const token = localStorage.getItem('token');

      const response = await api.get('/api/ai/history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;

      if (
        !data?.success ||
        !Array.isArray(data.history)
      ) {
        setMessages([createWelcomeMessage()]);
        return;
      }

      const loadedMessages = [];

      data.history.forEach((item, index) => {
        if (item.userMessage) {
          loadedMessages.push({
            id: `history-user-${item._id || index}`,
            sender: 'user',
            text: item.userMessage,
            createdAt: item.createdAt,
          });
        }

        if (item.assistantResponse) {
          loadedMessages.push({
            id: `history-ai-${item._id || index}`,
            sender: 'assistant',
            text: item.assistantResponse,
            createdAt: item.createdAt,
          });
        }
      });

      if (loadedMessages.length === 0) {
        setMessages([createWelcomeMessage()]);
      } else {
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error(
        'AI History Load Error:',
        error
      );

      setMessages((prev) =>
        prev.length
          ? prev
          : [createWelcomeMessage()]
      );
    } finally {
      setHistoryLoading(false);
      setHistoryRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  /* ============================================================
     AUTO SCROLL
  ============================================================ */

  useEffect(() => {
    if (!historyLoading) {
      chatEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [
    messages,
    loading,
    historyLoading,
  ]);

  /* ============================================================
     SCROLL TRACKING
  ============================================================ */

  useEffect(() => {
    const container =
      scrollContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      const distance =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      setShowScrollButton(distance > 350);
    };

    container.addEventListener(
      'scroll',
      handleScroll
    );

    return () => {
      container.removeEventListener(
        'scroll',
        handleScroll
      );
    };
  }, []);

  /* ============================================================
     SCROLL TO BOTTOM
  ============================================================ */

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  /* ============================================================
     NEW CHAT
  ============================================================ */

  const handleNewChat = () => {
    if (loading) return;

    setMessages([createWelcomeMessage()]);
    setInput('');

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  /* ============================================================
     SEND MESSAGE
  ============================================================ */

  const handleSend = async (textToSend) => {
    const query = (
      textToSend || input
    ).trim();

    if (!query || loading) {
      return;
    }

    const now = new Date().toISOString();

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      createdAt: now,
    };

    setMessages((prev) => {
      const withoutWelcome =
        prev.filter(
          (item) => !item.isWelcome
        );

      return [
        ...withoutWelcome,
        userMessage,
      ];
    });

    setInput('');
    setLoading(true);

    try {
      const token =
        localStorage.getItem('token');

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
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text:
            typeof data.answer === 'string'
              ? data.answer
              : JSON.stringify(
                  data.answer,
                  null,
                  2
                ),
          createdAt:
            new Date().toISOString(),
        };

        setMessages((prev) => [
          ...prev,
          assistantMessage,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: 'assistant',
            text:
              data.message ||
              'Data fetch nahi ho saka. Please dobara try karein.',
            createdAt:
              new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error(
        'AI Assistant Error:',
        error
      );

      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error;

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text:
            serverMessage ||
            'Assistant server se connection nahi ho saka. Please network check karein.',
          createdAt:
            new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  /* ============================================================
     CONVERSATION
  ============================================================ */

  const conversationMessages =
    messages.filter(
      (message) => !message.isWelcome
    );

  const hasConversation =
    conversationMessages.length > 0;

  /* ============================================================
     LOADING SCREEN
  ============================================================ */

  if (historyLoading) {
    return (
      <>
        <style>{`
          @keyframes loadingFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-7px);
            }
          }

          @keyframes loadingSpin {
            to {
              transform: rotate(360deg);
            }
          }

          .loading-float {
            animation: loadingFloat 2.4s ease-in-out infinite;
          }

          .loading-spin {
            animation: loadingSpin 8s linear infinite;
          }
        `}</style>

        <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-[#f4f6fa]">

          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/60 blur-[100px]" />

          <div className="relative flex flex-col items-center">

            <div className="loading-float relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-indigo-100 bg-white text-indigo-500 shadow-[0_20px_60px_rgba(79,70,229,.12)]">

              <div className="loading-spin absolute inset-1 rounded-[20px] border border-dashed border-indigo-200" />

              <BrainCircuit
                size={30}
                strokeWidth={1.3}
              />

              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.5)]" />

            </div>

            <div className="mt-5 flex items-center gap-2">

              <Loader2
                size={13}
                className="animate-spin text-indigo-500"
              />

              <span className="text-[10px] font-semibold text-slate-500">
                Loading today's AI history...
              </span>

            </div>

          </div>
        </div>
      </>
    );
  }

  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <>
      <style>{`
        @keyframes aiFloat {
          0%,100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes aiPulse {
          0%,100% {
            transform: scale(.85);
            opacity: .35;
          }
          50% {
            transform: scale(1.18);
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

        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-150%);
          }
          100% {
            transform: translateX(450%);
          }
        }

        @keyframes dotPulse {
          0%,100% {
            opacity: .35;
          }
          50% {
            opacity: 1;
          }
        }

        .ai-float {
          animation: aiFloat 4s ease-in-out infinite;
        }

        .ai-pulse {
          animation: aiPulse 3s ease-in-out infinite;
        }

        .ai-spin {
          animation: aiSpin 20s linear infinite;
        }

        .ai-spin-reverse {
          animation: aiSpinReverse 15s linear infinite;
        }

        .ai-message {
          animation: messageIn .3s ease-out both;
        }

        .ai-card {
          animation: cardIn .4s ease-out both;
        }

        .ai-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }

        .ai-dot {
          animation: dotPulse 1.4s ease-in-out infinite;
        }

        .ai-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(100,116,139,.22) transparent;
        }

        .ai-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .ai-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .ai-scroll::-webkit-scrollbar-thumb {
          background: rgba(100,116,139,.2);
          border-radius: 999px;
        }

        .ai-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,.35);
        }

        .ai-response {
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .soft-grid {
          background-image:
            linear-gradient(rgba(100,116,139,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,116,139,.035) 1px, transparent 1px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f4f6fa] text-slate-800">

        {/* ================================================================
            BACKGROUND
        ================================================================= */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          <div className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-indigo-100/70 blur-[120px]" />

          <div className="absolute -bottom-40 -right-20 h-[430px] w-[430px] rounded-full bg-violet-100/60 blur-[120px]" />

          <div className="absolute left-[45%] top-[35%] h-[250px] w-[250px] rounded-full bg-blue-50/70 blur-[100px]" />

          <div className="soft-grid absolute inset-0 opacity-70" />

        </div>

        {/* ================================================================
            HEADER
        ================================================================= */}

        <header className="relative z-30 flex min-h-[68px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-3 shadow-[0_1px_15px_rgba(15,23,42,.025)] backdrop-blur-xl sm:min-h-[72px] sm:px-6 lg:px-8">

          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-3">

            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_25px_rgba(99,102,241,.22)]">

              <BrainCircuit
                size={18}
                strokeWidth={1.6}
              />

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />

            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <h1 className="truncate text-[13px] font-bold tracking-tight text-slate-800 sm:text-[15px]">
                  Business Assistant
                </h1>

                <span className="hidden rounded-md bg-indigo-50 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[.14em] text-indigo-600 sm:inline-block">
                  AI Powered
                </span>

              </div>

              <div className="mt-1 flex items-center gap-1.5">

                <CalendarDays
                  size={9}
                  className="text-indigo-500"
                />

                <p className="truncate text-[8px] font-medium text-slate-400 sm:text-[9px]">
                  {todayLabel}
                </p>

                <span className="mx-1 h-1 w-1 rounded-full bg-slate-300" />

                <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>

              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 sm:flex">

              <Database
                size={10}
                className="text-indigo-500"
              />

              <span className="text-[8px] font-bold text-slate-400">
                LIVE DATABASE
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            </div>

            <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 sm:flex">

              <ShieldCheck
                size={10}
                className="text-emerald-600"
              />

              <span className="text-[8px] font-bold text-emerald-600">
                READ ONLY
              </span>

            </div>

            <button
              type="button"
              onClick={() => loadHistory(true)}
              disabled={
                historyRefreshing ||
                loading
              }
              title="Refresh today's history"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
            >
              <RefreshCw
                size={13}
                className={
                  historyRefreshing
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              disabled={loading}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 text-[8px] font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-40 sm:h-9 sm:px-3 sm:text-[9px]"
            >
              <Plus size={12} />

              <span className="hidden sm:inline">
                NEW CHAT
              </span>
            </button>

          </div>
        </header>

        {/* ================================================================
            MOBILE QUICK BAR
        ================================================================= */}

        <div className="ai-scroll relative z-20 flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200/70 bg-white/70 px-3 py-2.5 backdrop-blur-xl lg:hidden">

          <div className="flex shrink-0 items-center gap-1.5 pr-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">

            <Sparkles
              size={10}
              className="text-indigo-500"
            />

            Quick

          </div>

          {SUGGESTED_QUESTIONS.map(
            (item, index) => {
              const Icon = item.icon;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleSend(item.question)
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[8px] font-semibold text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
                >
                  <Icon size={10} />
                  {item.title}
                </button>
              );
            }
          )}

        </div>

        {/* ================================================================
            MAIN
        ================================================================= */}

        <main className="relative min-h-0 flex-1 overflow-hidden">

          <div
            ref={scrollContainerRef}
            className="ai-scroll relative h-full min-h-0 overflow-y-auto"
          >

            <div className="mx-auto flex min-h-full w-full max-w-[1550px] flex-col px-3 py-4 sm:px-5 sm:py-5 lg:px-8">

              {!hasConversation ? (

                /* ==========================================================
                   WELCOME
                ========================================================== */

                <div className="relative flex flex-1 flex-col items-center justify-center py-5">

                  {/* AI CORE */}

                  <div className="ai-float relative h-[105px] w-[105px] sm:h-[125px] sm:w-[125px]">

                    <div className="ai-spin absolute inset-0 rounded-full border border-indigo-200" />

                    <div className="ai-spin-reverse absolute inset-[9px] rounded-full border border-dashed border-violet-200" />

                    <div className="ai-pulse absolute inset-[25px] rounded-full bg-indigo-300 blur-3xl" />

                    <div className="absolute inset-[27px] flex items-center justify-center rounded-[26px] border border-indigo-100 bg-gradient-to-br from-indigo-500 via-indigo-500 to-violet-500 text-white shadow-[0_18px_50px_rgba(99,102,241,.25)]">

                      <BrainCircuit
                        size={32}
                        strokeWidth={1.3}
                      />

                    </div>

                    <span className="absolute right-[5px] top-[5px] flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#f4f6fa] bg-emerald-400">

                      <span className="h-1.5 w-1.5 rounded-full bg-white" />

                    </span>

                  </div>

                  {/* TITLE */}

                  <div className="mt-5 text-center">

                    <div className="mb-2 flex items-center justify-center gap-2">

                      <span className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-300" />

                      <p className="text-[8px] font-bold uppercase tracking-[.28em] text-indigo-500">
                        AI COMMAND CENTER
                      </p>

                      <span className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-300" />

                    </div>

                    <h2 className="text-[26px] font-black tracking-[-.05em] text-slate-800 sm:text-[38px]">

                      Ask your business

                      <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-500 bg-clip-text text-transparent">
                        {' '}anything.
                      </span>

                    </h2>

                    <p className="mx-auto mt-2 max-w-[650px] text-[10px] leading-5 text-slate-500 sm:text-[12px] sm:leading-6">

                      Sales, customers, payments, profits,
                      installments aur inventory ka real-time
                      insight simple language mein hasil karein.

                    </p>

                  </div>

                  {/* ONLINE */}

                  <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 shadow-sm backdrop-blur-xl">

                    <span className="relative flex h-1.5 w-1.5">

                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    </span>

                    <span className="text-[7px] font-bold uppercase tracking-[.13em] text-slate-500">
                      System Online
                    </span>

                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <span className="text-[7px] font-medium text-slate-400">
                      Live business data connected
                    </span>

                  </div>

                  {/* QUICK QUESTIONS */}

                  <div className="mt-7 w-full max-w-[1150px]">

                    <div className="mb-3 flex items-center gap-3">

                      <div className="h-px flex-1 bg-slate-200" />

                      <div className="flex shrink-0 items-center gap-1.5 text-[7px] font-bold uppercase tracking-[.2em] text-slate-400">

                        <Sparkles
                          size={9}
                          className="text-indigo-500"
                        />

                        Quick Questions

                      </div>

                      <div className="h-px flex-1 bg-slate-200" />

                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">

                      {SUGGESTED_QUESTIONS.map(
                        (item, index) => {

                          const Icon = item.icon;
                          const accent =
                            accents[item.accent];

                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                handleSend(
                                  item.question
                                )
                              }
                              style={{
                                animationDelay: `${
                                  index * 60
                                }ms`,
                              }}
                              className={`ai-card group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-3.5 text-left shadow-[0_5px_20px_rgba(15,23,42,.035)] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_16px_35px_rgba(15,23,42,.08)] ${accent.hover} disabled:opacity-40`}
                            >

                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent.iconBorder} ${accent.iconBg} ${accent.icon} transition duration-300 group-hover:scale-105`}
                              >
                                <Icon size={16} />
                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="text-[9px] font-bold text-slate-700 transition group-hover:text-slate-900 sm:text-[10px]">
                                  {item.title}
                                </p>

                                <p className="mt-1 truncate text-[7px] text-slate-400">
                                  {item.question}
                                </p>

                              </div>

                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300 transition group-hover:bg-indigo-50 group-hover:text-indigo-500">

                                <ArrowUpRight
                                  size={12}
                                />

                              </div>

                              <span
                                className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${accent.line} to-transparent transition-all duration-500 group-hover:w-full`}
                              />

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>

                  {/* ASK ABOUT */}

                  <div className="mt-5 w-full max-w-[1150px]">

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
                        const accent =
                          accents[item.accent];

                        return (
                          <div
                            key={item.title}
                            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-2.5 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                          >

                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.iconBg} ${accent.icon}`}
                            >
                              <Icon size={12} />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-[8px] font-bold text-slate-600 group-hover:text-slate-800">
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

                  {/* SYSTEM INFO */}

                  <div className="mt-5 hidden items-center gap-5 sm:flex">

                    <div className="flex items-center gap-1.5 text-[7px] font-semibold uppercase tracking-wider text-slate-400">
                      <Cpu size={9} />
                      AI Engine
                    </div>

                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <div className="flex items-center gap-1.5 text-[7px] font-semibold uppercase tracking-wider text-slate-400">
                      <Gauge size={9} />
                      Real-Time
                    </div>

                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <div className="flex items-center gap-1.5 text-[7px] font-semibold uppercase tracking-wider text-slate-400">
                      <Layers3 size={9} />
                      Read Only
                    </div>

                  </div>

                </div>

              ) : (

                /* ==========================================================
                   CHAT
                ========================================================== */

                <div className="mx-auto w-full max-w-[1350px] py-2 sm:py-4">

                  {/* CHAT HEADER */}

                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                    <div className="flex items-center gap-3">

                      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">

                        <MessageSquare size={14} />

                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />

                      </div>

                      <div>

                        <div className="flex items-center gap-2">

                          <h2 className="text-[11px] font-bold text-slate-700 sm:text-[12px]">
                            Today's Conversation
                          </h2>

                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[7px] font-bold text-emerald-600">
                            LIVE
                          </span>

                        </div>

                        <p className="mt-0.5 text-[7px] text-slate-400 sm:text-[8px]">

                          {conversationMessages.length}{' '}
                          message
                          {conversationMessages.length ===
                          1
                            ? ''
                            : 's'}

                          {' · '}

                          {todayLabel}

                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        onClick={scrollToBottom}
                        className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[8px] font-semibold text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 sm:flex"
                      >
                        <ChevronDown size={11} />
                        Latest
                      </button>

                      <button
                        type="button"
                        onClick={handleNewChat}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[8px] font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-40"
                      >
                        <Plus size={11} />
                        New Chat
                      </button>

                    </div>

                  </div>

                  {/* DATE */}

                  <div className="mb-5 flex items-center gap-3">

                    <div className="h-px flex-1 bg-slate-200" />

                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">

                      <CalendarDays
                        size={9}
                        className="text-indigo-500"
                      />

                      <span className="text-[7px] font-bold uppercase tracking-[.12em] text-slate-400">
                        {todayLabel}
                      </span>

                    </div>

                    <div className="h-px flex-1 bg-slate-200" />

                  </div>

                  {/* MESSAGES */}

                  <div className="space-y-5 sm:space-y-6">

                    {conversationMessages.map(
                      (message) => {

                        const isUser =
                          message.sender ===
                          'user';

                        return (
                          <div
                            key={message.id}
                            className={`ai-message flex gap-2.5 sm:gap-3 ${
                              isUser
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >

                            {!isUser && (
                              <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-500 shadow-sm sm:h-9 sm:w-9">

                                <Bot
                                  size={15}
                                  strokeWidth={1.5}
                                />

                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />

                              </div>
                            )}

                            <div
                              className={`w-full ${
                                isUser
                                  ? 'flex max-w-[92%] flex-col items-end sm:max-w-[78%]'
                                  : 'max-w-full'
                              }`}
                            >

                              {/* LABEL */}

                              <div
                                className={`mb-1.5 flex items-center gap-1.5 px-1 ${
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

                                <span className="text-[7px] font-bold uppercase tracking-[.1em] text-slate-400">
                                  {isUser
                                    ? 'YOU'
                                    : 'AI ASSISTANT'}
                                </span>

                                {message.createdAt && (
                                  <>
                                    <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />

                                    <span className="flex items-center gap-1 text-[7px] font-medium text-slate-400">
                                      <Clock3 size={8} />
                                      {formatTime(
                                        message.createdAt
                                      )}
                                    </span>
                                  </>
                                )}

                              </div>

                              {/* MESSAGE */}

                              <div
                                className={`ai-response rounded-2xl text-[12px] font-medium leading-6 sm:text-[13px] sm:leading-6 ${
                                  isUser
                                    ? 'rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-3 text-white shadow-[0_10px_30px_rgba(99,102,241,.18)]'
                                    : 'rounded-bl-md border border-slate-200 bg-white px-4 py-4 text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,.045)]'
                                }`}
                              >
                                {message.text}
                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                    {/* AI LOADING */}

                    {loading && (
                      <div className="ai-message flex gap-3">

                        <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-500 shadow-sm sm:h-9 sm:w-9">

                          <Bot
                            size={15}
                            strokeWidth={1.5}
                          />

                          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                        </div>

                        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_25px_rgba(15,23,42,.04)]">

                          <div className="flex items-center gap-3">

                            <div className="flex items-center gap-1">

                              <span className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500" />

                              <span
                                className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500"
                                style={{
                                  animationDelay:
                                    '.2s',
                                }}
                              />

                              <span
                                className="ai-dot h-1.5 w-1.5 rounded-full bg-indigo-500"
                                style={{
                                  animationDelay:
                                    '.4s',
                                }}
                              />

                            </div>

                            <span className="text-[9px] font-medium text-slate-400">
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

            {/* FLOATING SCROLL BUTTON */}

            {showScrollButton && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="sticky bottom-4 left-[calc(100%-60px)] z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-500 shadow-[0_8px_25px_rgba(15,23,42,.12)] transition hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                <ChevronDown size={15} />
              </button>
            )}

          </div>
        </main>

        {/* ================================================================
            INPUT FOOTER
        ================================================================= */}

        <footer className="relative z-30 shrink-0 border-t border-slate-200/70 bg-white/80 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3 lg:px-8">

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto w-full max-w-[1350px]"
          >

            <div className="group relative flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(15,23,42,.05)] transition-all duration-300 focus-within:border-indigo-300 focus-within:shadow-[0_10px_35px_rgba(99,102,241,.10)]">

              <div className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center text-slate-400 transition group-focus-within:text-indigo-500">

                <Search size={15} />

              </div>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Ask your business anything..."
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[11px] font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-[12px]"
              />

              <div className="mr-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[7px] font-bold text-slate-400 sm:flex">

                <Command size={8} />

                ENTER

              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim()
                }
                className="group/send relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_6px_20px_rgba(99,102,241,.2)] transition-all duration-300 hover:from-indigo-600 hover:to-violet-600 hover:shadow-[0_10px_28px_rgba(99,102,241,.28)] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:bg-none disabled:text-slate-300 disabled:shadow-none"
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

            {/* FOOTER STATUS */}

            <div className="mt-2 flex items-center justify-center gap-2">

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

              <span className="flex items-center gap-1.5 text-[7px] font-medium uppercase tracking-[.08em] text-slate-400 sm:text-[8px]">

                <Database size={8} />

                Today's history saved

              </span>

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <span className="hidden items-center gap-1.5 text-[7px] font-medium uppercase tracking-[.08em] text-slate-400 sm:flex sm:text-[8px]">

                <Zap
                  size={8}
                  className="text-indigo-500"
                />

                Live Data

              </span>

            </div>

          </form>

        </footer>

      </div>
    </>
  );
}