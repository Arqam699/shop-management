import React, { useEffect, useRef, useState } from 'react';
import { FileText, LoaderCircle, Clock3, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Notepad = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [savedAt, setSavedAt] = useState(null);
  const contentRef = useRef('');

  useEffect(() => {
    let active = true;
    api.get('/api/notes')
      .then(({ data }) => {
        if (!active) return;
        const loadedContent = data?.data?.content || '';
        contentRef.current = loadedContent;
        setContent(loadedContent);
        setSavedAt(data?.data?.updatedAt || null);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Notepad load nahi ho saka.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading || !dirty) return undefined;
    const contentToSave = content;
    const timeoutId = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const { data } = await api.put('/api/notes', { content: contentToSave });
        setSavedAt(data?.data?.updatedAt || new Date().toISOString());
        if (contentRef.current === contentToSave) {
          setDirty(false);
          setSaveStatus('saved');
        }
      } catch (error) {
        if (contentRef.current === contentToSave) setSaveStatus('error');
        toast.error(error.response?.data?.message || 'Notepad auto-save nahi ho saka.');
      }
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [content, dirty, loading]);

  const formattedSavedAt = savedAt
    ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt))
    : 'Abhi save nahi hua';

  return (
    <main className="flex min-h-[calc(100vh-8rem)] w-full flex-col p-3 sm:p-5 lg:p-6">
      <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10"><FileText className="h-5 w-5 text-indigo-300" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Shop workspace</p><h1 className="mt-0.5 text-xl font-black">Notepad</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              {loading || saveStatus === 'saving' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : saveStatus === 'saved' ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clock3 className="h-3.5 w-3.5" />}
              {loading ? 'Loading...' : saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? `Saved · ${formattedSavedAt}` : saveStatus === 'error' ? 'Save failed — keep typing to retry' : 'Unsaved changes'}
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-5 sm:p-8">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-indigo-500"><LoaderCircle className="h-6 w-6 animate-spin" /></div>
          ) : (
            <textarea
              autoFocus
              value={content}
              onChange={(event) => {
                contentRef.current = event.target.value;
                setContent(event.target.value);
                setDirty(true);
                setSaveStatus('unsaved');
              }}
              maxLength={20000}
              placeholder="Yahan apna note likhein..."
              aria-label="Notepad text"
              className="min-h-[55vh] flex-1 resize-none border-0 bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-300 sm:text-base"
            />
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400">
            <span className="sm:hidden">{formattedSavedAt}</span>
            <span className="ml-auto">{content.length.toLocaleString()} / 20,000 characters</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Notepad;
