import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Check,
  Clock3,
  FileText,
  Italic,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Underline,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const MAX_TEXT_LENGTH = 20000;
const MAX_CONTENT_LENGTH = 100000;
const FONT_SIZE_LEVELS = [10, 12, 14, 16, 18, 24, 32];
const TEXT_COLORS = [
  { label: 'Ink', value: '#273449' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#15803d' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Violet', value: '#7c3aed' },
];
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'FONT', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI']);
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH']);

const normalizeColor = (color) => {
  const value = String(color || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (!rgb) return '';
  return `#${rgb.slice(1).map((channel) => Math.min(255, Number(channel)).toString(16).padStart(2, '0')).join('')}`;
};

const sanitizeNoteHtml = (html) => {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    const tag = node.tagName.toUpperCase();
    if (SKIPPED_TAGS.has(tag)) return document.createDocumentFragment();

    const children = Array.from(node.childNodes).map(cleanNode);
    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child));
      return fragment;
    }

    const element = document.createElement(tag.toLowerCase());
    if (tag === 'SPAN' || tag === 'FONT') {
      const color = normalizeColor(node.style?.color || node.getAttribute('color'));
      const fontIndex = Number(node.getAttribute('size'));
      const fontSize = /^\d+(?:px|pt)$/.test(node.style?.fontSize || '')
        ? node.style.fontSize
        : (fontIndex >= 1 && fontIndex <= 7 ? `${FONT_SIZE_LEVELS[fontIndex - 1]}px` : '');
      const hasColor = TEXT_COLORS.some((item) => item.value.toLowerCase() === color);
      if (hasColor || fontSize) {
        const span = document.createElement('span');
        if (hasColor) span.style.color = color;
        if (fontSize) span.style.fontSize = fontSize;
        children.forEach((child) => span.appendChild(child));
        return span;
      }
    }
    children.forEach((child) => element.appendChild(child));
    return element;
  };

  const fragment = document.createDocumentFragment();
  Array.from(parsed.body.childNodes).map(cleanNode).forEach((node) => fragment.appendChild(node));
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
};

const loadNoteContent = (content) => {
  const value = String(content || '');
  if (/<(?:b|strong|i|em|u|span|font|br|p|div|ul|ol|li)(?:\s|>|\/)/i.test(value)) {
    return sanitizeNoteHtml(value);
  }

  const fragment = document.createDocumentFragment();
  value.split('\n').forEach((line, index) => {
    if (index) fragment.appendChild(document.createElement('br'));
    fragment.appendChild(document.createTextNode(line));
  });
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
};

const getPlainText = (html) => {
  const documentValue = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return documentValue.body.textContent || '';
};

const ToolButton = ({ label, active = false, children, onMouseDown, disabled = false }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onMouseDown={onMouseDown}
    className={`inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
  >
    {children}
  </button>
);

const getFontSizeLevel = (editor) => {
  const selection = window.getSelection();
  let node = selection?.anchorNode;
  if (!node || !editor.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== editor) {
    const styledSize = Number.parseFloat(node.style?.fontSize || '');
    const legacySize = Number(node.getAttribute?.('size'));
    const fontSize = styledSize || (legacySize >= 1 && legacySize <= 7 ? FONT_SIZE_LEVELS[legacySize - 1] : null);
    if (fontSize) {
      return FONT_SIZE_LEVELS.reduce((closest, value, index) => (
        Math.abs(value - fontSize) < Math.abs(FONT_SIZE_LEVELS[closest] - fontSize) ? index : closest
      ), 0);
    }
    node = node.parentElement;
  }

  return 3;
};

const Notepad = () => {
  const [loading, setLoading] = useState(true);
  const [initialContent, setInitialContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [savedAt, setSavedAt] = useState(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const [fontSizeLevel, setFontSizeLevel] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef(null);
  const editorRef = useRef(null);
  const contentRef = useRef('');

  useEffect(() => {
    let active = true;
    api.get('/api/notes')
      .then(({ data }) => {
        if (!active) return;
        const html = loadNoteContent(data?.data?.content || '');
        contentRef.current = html;
        setInitialContent(html);
        const plain = getPlainText(html);
        setCharacterCount(plain.length);
        setWordCount(plain.trim() ? plain.trim().split(/\s+/).length : 0);
        setSavedAt(data?.data?.updatedAt || null);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Notepad load nahi ho saka.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loading && editorRef.current) editorRef.current.innerHTML = initialContent;
  }, [initialContent, loading]);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
    };
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  useEffect(() => {
    if (loading || !dirty) return undefined;
    const contentToSave = contentRef.current;
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
  }, [dirty, loading, revision]);

  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return;
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
    const selectedSize = getFontSizeLevel(editorRef.current);
    if (selectedSize !== null) setFontSizeLevel(selectedSize);
  }, []);

  const commitEditor = useCallback(() => {
    if (!editorRef.current) return;
    const plain = editorRef.current.innerText || '';
    if (plain.length > MAX_TEXT_LENGTH) {
      editorRef.current.innerHTML = contentRef.current;
      toast.error(`Notepad ${MAX_TEXT_LENGTH.toLocaleString()} characters se zyada nahi ho sakta.`);
      return;
    }

    const html = sanitizeNoteHtml(editorRef.current.innerHTML);
    if (html.length > MAX_CONTENT_LENGTH) {
      editorRef.current.innerHTML = contentRef.current;
      toast.error('Formatting ki wajah se note ki saved length limit poori ho gayi hai. Thora text remove karke dobara try karein.');
      return;
    }
    contentRef.current = html;
    setCharacterCount(plain.length);
    setWordCount(plain.trim() ? plain.trim().split(/\s+/).length : 0);
    setRevision((current) => current + 1);
    setDirty(true);
    setSaveStatus('unsaved');
    updateFormatState();
  }, [updateFormatState]);

  const runCommand = (command, value) => (event) => {
    event.preventDefault();
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    commitEditor();
  };

  const clearFormatting = (event) => {
    event.preventDefault();
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    commitEditor();
  };

  const changeTextSize = (delta) => (event) => {
    event.preventDefault();
    if (!editorRef.current) return;
    const nextLevel = Math.max(0, Math.min(FONT_SIZE_LEVELS.length - 1, fontSizeLevel + delta));
    if (nextLevel === fontSizeLevel) return;
    editorRef.current.focus();
    document.execCommand('fontSize', false, String(nextLevel + 1));
    setFontSizeLevel(nextLevel);
    commitEditor();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === pageRef.current) {
        await document.exitFullscreen();
      } else if (pageRef.current?.requestFullscreen) {
        await pageRef.current.requestFullscreen();
      }
    } catch {
      toast.error('Fullscreen mode start nahi ho saka.');
    }
  };

  const formattedSavedAt = savedAt
    ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt))
    : 'Abhi save nahi hua';

  return (
    <main
      ref={pageRef}
      className={isFullscreen
        ? 'fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-slate-50 p-3 sm:p-5'
        : 'flex min-h-0 w-full flex-1 flex-col p-0'}
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_45px_-32px_rgba(15,23,42,0.3)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Note formatting">
            <ToolButton label="Bold" active={activeFormats.bold} disabled={loading} onMouseDown={runCommand('bold')}><Bold className="h-4 w-4" /></ToolButton>
            <ToolButton label="Italic" active={activeFormats.italic} disabled={loading} onMouseDown={runCommand('italic')}><Italic className="h-4 w-4" /></ToolButton>
            <ToolButton label="Underline" active={activeFormats.underline} disabled={loading} onMouseDown={runCommand('underline')}><Underline className="h-4 w-4" /></ToolButton>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <ToolButton label="Decrease text size" disabled={loading || fontSizeLevel === 0} onMouseDown={changeTextSize(-1)}><Minus className="h-3.5 w-3.5" /><span className="text-[11px] font-bold">A</span></ToolButton>
            <ToolButton label="Increase text size" disabled={loading || fontSizeLevel === FONT_SIZE_LEVELS.length - 1} onMouseDown={changeTextSize(1)}><Plus className="h-3.5 w-3.5" /><span className="text-[11px] font-bold">A</span></ToolButton>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <div className="flex items-center gap-1 rounded-lg px-1" aria-label="Text color">
              <Palette className="mr-1 h-4 w-4 text-slate-500" aria-hidden="true" />
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={`Text color ${color.label}`}
                  title={color.label}
                  disabled={loading}
                  onMouseDown={runCommand('foreColor', color.value)}
                  className="h-5 w-5 rounded-full border border-black/10 shadow-sm ring-offset-2 transition hover:scale-110 hover:ring-2 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <ToolButton label="Clear formatting" disabled={loading} onMouseDown={clearFormatting}><RotateCcw className="h-4 w-4" /><span className="hidden text-xs sm:inline">Clear</span></ToolButton>
            <ToolButton label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onMouseDown={(event) => { event.preventDefault(); toggleFullscreen(); }}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </ToolButton>
          </div>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-semibold text-slate-500" role="status" aria-live="polite" title={formattedSavedAt}>
            {loading || saveStatus === 'saving' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-indigo-600" /> : saveStatus === 'saved' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clock3 className="h-3.5 w-3.5 text-amber-600" />}
            <span>{loading ? 'Loading' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : 'Unsaved'}</span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f5ef] px-3 py-3 sm:px-8 sm:py-4">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-indigo-600"><LoaderCircle className="h-7 w-7 animate-spin" /></div>
          ) : (
            <div className="flex min-h-0 w-full flex-1 flex-col border border-[#e8e3d8] bg-[#fffefa] shadow-[0_5px_20px_-15px_rgba(60,50,30,0.4)]">
              <div className="flex shrink-0 items-center gap-2 border-b border-[#eee9de] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b927f]">
                <FileText className="h-3.5 w-3.5" />Personal notes
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Notepad text"
                aria-multiline="true"
                data-placeholder="Yahan apna note likhein…"
                onInput={commitEditor}
                onKeyUp={updateFormatState}
                onMouseUp={updateFormatState}
                onPaste={(event) => {
                  event.preventDefault();
                  const text = event.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                  commitEditor();
                }}
                className="notepad-editor min-h-0 flex-1 overflow-y-auto px-6 py-6 text-[15px] leading-8 text-[#273449] outline-none sm:px-10 sm:py-9 sm:text-base"
              />
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 sm:px-6">
          <span>{wordCount.toLocaleString()} words</span>
          <span>{characterCount.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters</span>
          <span className="hidden sm:inline">Auto-saves while you write</span>
        </footer>
      </section>
      <style>{`
        .notepad-editor:empty::before { content: attr(data-placeholder); color: #b7b09f; pointer-events: none; }
        .notepad-editor p { margin: 0 0 .75rem; }
        .notepad-editor ul, .notepad-editor ol { padding-left: 1.5rem; margin: .5rem 0; }
        .notepad-editor ul { list-style: disc; }
        .notepad-editor ol { list-style: decimal; }
      `}</style>
    </main>
  );
};

export default Notepad;
