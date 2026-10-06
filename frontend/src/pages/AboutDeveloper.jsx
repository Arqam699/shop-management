import React from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Boxes,
  CalendarRange,
  Code2,
  CreditCard,
  DatabaseBackup,
  HeartHandshake,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react';

/* =====================================================
   DEVELOPER CONTACT (env-overridable)
===================================================== */

const developerName =
  import.meta.env.VITE_DEVELOPER_NAME || 'M ARQAM';
const developerEmail = 'arqammughal699@gmail.com';
const whatsappNumber = (
  import.meta.env.VITE_DEVELOPER_WHATSAPP ||
  '923046564699'
).replace(/\D/g, '');
const whatsappMessage = encodeURIComponent(
  'Assalam-o-Alaikum! I have a question about the Shop Management System.'
);
const whatsappUrl = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
  : `https://wa.me/?text=${whatsappMessage}`;

/* =====================================================
   SYSTEM MODULES (mirrors the sidebar)
===================================================== */

const modules = [
  {
    icon: Boxes,
    title: 'Inventory & Sales',
    description:
      'Products, stock levels, cash sales, invoices aur returns — sab ek jagah.',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Users,
    title: 'Customer Khata',
    description:
      'Customer records, installment plans aur mukammal ledger history.',
    color: 'text-violet-600 bg-violet-50',
  },
  {
    icon: CreditCard,
    title: 'Payments & Invoices',
    description:
      'Payments receive karein aur professional invoices print karein.',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Wallet,
    title: 'Daily Expenses',
    description:
      'Roz ke akhrajaat — bills, salaries aur utilities ka clear record.',
    color: 'text-rose-600 bg-rose-50',
  },
  {
    icon: BarChart3,
    title: 'Reports & Audits',
    description:
      'Sales, stock aur business performance ko asaani se review karein.',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Bot,
    title: 'AI Shop Assistant',
    description:
      'Sawal poochein — sale, khata, stock aur installments ke jawab foran.',
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    icon: CalendarRange,
    title: 'Due Dates',
    description:
      'Installment due dates aur pending payments par nazar rakhein.',
    color: 'text-cyan-600 bg-cyan-50',
  },
  {
    icon: DatabaseBackup,
    title: 'Backup & Security',
    description:
      'Manual backup aur password-protected deletion mode — jab chaho, tab lo.',
    color: 'text-slate-600 bg-slate-100',
  },
];

/* =====================================================
   SMALL BUILDING BLOCKS
===================================================== */

const SectionCard = ({ children, className = '' }) => (
  <section
    className={`rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${className}`}
  >
    {children}
  </section>
);

const SectionHeading = ({
  icon: Icon,
  iconColor,
  eyebrow,
  eyebrowColor,
  title,
}) => (
  <div className="flex items-center gap-3">
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}
    >
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p
        className={`text-[10px] font-black uppercase tracking-[0.16em] ${eyebrowColor}`}
      >
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
        {title}
      </h2>
    </div>
  </div>
);

/* =====================================================
   ABOUT DEVELOPER PAGE
===================================================== */

const AboutDeveloper = () => (
  <div className="mx-auto max-w-6xl space-y-6 animate-[pageEnter_0.45s_cubic-bezier(0.16,1,0.3,1)]">
    {/* ================= HERO ================= */}
    <section className="relative isolate overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-[#101a31] to-[#172554] px-6 py-9 text-white shadow-2xl shadow-slate-900/10 sm:px-10 sm:py-12 lg:px-14">
      <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(ellipse_at_80%_45%,rgba(59,130,246,0.2),transparent_65%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-px w-2/3 bg-gradient-to-r from-blue-400/60 via-indigo-300/20 to-transparent" />

      <div className="grid items-center gap-9 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            Made for everyday shop work
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            About the Developer
          </h1>
          <p className="mt-2 text-sm font-semibold tracking-wide text-blue-200">
            {developerName}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Built to help electronics retailers manage inventory, sales,
            customer accounts, and installments with greater accuracy and
            clarity. Use this platform responsibly to maintain reliable
            records, serve customers fairly, and support ethical business
            operations.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-extrabold text-[#063b20] shadow-lg shadow-green-950/20 transition hover:-translate-y-0.5 hover:bg-[#35df75] focus:outline-none focus:ring-4 focus:ring-green-300/30"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp par rabta karein
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${developerEmail}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-100 transition hover:border-blue-200/40 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-300/30"
            >
              <Mail className="h-4 w-4 text-blue-200" />
              Email developer
            </a>
          </div>
        </div>

        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-blue-950/30 sm:h-44 sm:w-44">
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-blue-500 to-violet-600 shadow-xl shadow-blue-950/50 sm:h-28 sm:w-28">
            <Code2
              className="h-12 w-12 text-white sm:h-14 sm:w-14"
              strokeWidth={1.7}
            />
          </div>
        </div>
      </div>
    </section>

    {/* ================= PURPOSE + SUPPORT ================= */}
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard>
        <SectionHeading
          icon={Store}
          iconColor="bg-indigo-50 text-indigo-600"
          eyebrow="Is project ka maqsad"
          eyebrowColor="text-indigo-600"
          title="Dukaan ka hisaab, ab zyada asaan"
        />
        <p className="mt-5 text-sm leading-7 text-slate-600">
          Chhoti electronics dukaan mein inventory, customer udhaar,
          installments aur roz ki sales ka record aksar alag alag jagah
          hota hai. Yeh application in sab ko ek hi workspace mein laati
          hai, taake aap records jaldi dhoondh sakein aur apne business
          par behtar nazar rakh sakein.
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-6 text-slate-600">
            <strong className="text-slate-800">Aapke kaam ke liye:</strong>{' '}
            customer ledger, payment history, stock tracking aur reports
            ko ek seedhe workflow mein rakha gaya hai.
          </p>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          icon={HeartHandshake}
          iconColor="bg-emerald-50 text-emerald-600"
          eyebrow="Support"
          eyebrowColor="text-emerald-600"
          title="Koi sawal ya suggestion?"
        />
        <p className="mt-5 text-sm leading-7 text-slate-600">
          Feature ke baare mein poochna ho, madad chahiye ho ya koi
          behtari suggest karni ho — apne pasandeeda tareeqe se rabta
          karein. Aam tor par WhatsApp par jawab sab se jaldi milta hai.
        </p>
        <div className="mt-5 flex flex-col items-start gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <MessageCircle className="h-4 w-4" />
            Developer ko message karein
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            href={`mailto:${developerEmail}`}
            className="inline-flex items-center gap-2 rounded text-sm font-bold text-indigo-700 transition hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Mail className="h-4 w-4" />
            {developerEmail}
          </a>
        </div>
      </SectionCard>
    </div>

    {/* ================= MODULES ================= */}
    <SectionCard>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
            Aapke business ke liye
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
            Ek system, roz ke zaroori kaam
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" />
          Shop management tools
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map(({ icon: Icon, title, description, color }) => (
          <article
            key={title}
            className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-extrabold text-slate-900">
              {title}
            </h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {description}
            </p>
          </article>
        ))}
      </div>
    </SectionCard>

    {/* ================= DATA & SECURITY ================= */}
    <SectionCard>
      <SectionHeading
        icon={ShieldCheck}
        iconColor="bg-slate-100 text-slate-700"
        eyebrow="Aapka data, mehfooz"
        eyebrowColor="text-slate-500"
        title="Backup aur security"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-900">
            Manual backup
          </p>
          <p className="mt-1.5 text-xs leading-6 text-slate-500">
            Jab chaho Backup page se apne tamam record ka backup le
            lo — koi automatic backup aapke PC ki space nahi khata.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-900">
            Protected deletion mode
          </p>
          <p className="mt-1.5 text-xs leading-6 text-slate-500">
            Delete buttons password se locked rehte hain aur waqt par
            khud-ba-khud band ho jate hain.
          </p>
        </div>
      </div>
    </SectionCard>

    <p className="pb-2 text-center text-xs font-medium text-slate-400">
      Aapke business ko organize rakhne ke liye banaya gaya.
    </p>
  </div>
);

export default AboutDeveloper;
