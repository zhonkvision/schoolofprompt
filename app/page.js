'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// Lightweight, modular Highlight.js imports (saves ~90% JS bundle size)
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml'; // HTML, XML
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import plaintext from 'highlight.js/lib/languages/plaintext';

// Register only the specific required languages
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);

// Supported languages list
const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'bash', label: 'Bash' },
  { value: 'cpp', label: 'C++' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const activeId = searchParams.get('id');

  const [mode, setMode] = useState('edit'); // 'edit' or 'view'
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyContentSuccess, setCopyContentSuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Custom dropdown state
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef(null);

  // Interactive features: track active line
  const [activeLine, setActiveLine] = useState(1);
  const [savingProgress, setSavingProgress] = useState(0);

  const textareaRef = useRef(null);
  const codeRef = useRef(null);
  const editorLineCounterRef = useRef(null);
  const viewerLineCounterRef = useRef(null);

  // Close custom language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync shareUrl client-side
  useEffect(() => {
    if (typeof window !== 'undefined' && activeId) {
      setShareUrl(`${window.location.origin}?id=${activeId}`);
    } else {
      setShareUrl('');
    }
  }, [activeId]);

  // Fetch paste if ID is in the URL
  useEffect(() => {
    if (activeId && activeId.length === 7) {
      setIsLoading(true);
      fetch(`/api/paste?id=${activeId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Paste not found or expired');
          return res.json();
        })
        .then((data) => {
          setContent(data.content);
          setLanguage(data.language);
          setMode('view');
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          // Fallback to edit mode on 404/expired/error
          setMode('edit');
          setContent('');
          window.history.pushState(null, '', '/');
          setIsLoading(false);
        });
    } else {
      setMode('edit');
    }
  }, [activeId]);

  // Analytics Tracking (Fire-and-forget)
  const trackEvent = (eventType) => {
    if (!activeId) return;
    let sessionId = localStorage.getItem('promptshare_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('promptshare_session_id', sessionId);
    }
    
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paste_id: activeId, session_id: sessionId, event_type: eventType })
    }).catch(err => console.error('Analytics tracking failed:', err));
  };

  // Initial view tracking
  useEffect(() => {
    if (mode === 'view' && activeId) {
      trackEvent('view');
    }
  }, [mode, activeId]);

  // Trigger Highlight.js highlighting
  useEffect(() => {
    if (mode === 'view' && codeRef.current && content) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [mode, content, language]);

  // Synchronize scrolling of line numbers gutter and textarea
  const handleScroll = (e) => {
    if (editorLineCounterRef.current) {
      editorLineCounterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Synchronize scrolling of line numbers gutter and code pre
  const handleViewerScroll = (e) => {
    if (viewerLineCounterRef.current) {
      viewerLineCounterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Live active line tracking for editor
  const handleEditorCursorMove = (e) => {
    const cursorIndex = e.target.selectionStart;
    const textBeforeCursor = e.target.value.substring(0, cursorIndex);
    const line = textBeforeCursor.split('\n').length;
    setActiveLine(line);
  };

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setSavingProgress(1); // Starting save progress simulation

    // Micro-interaction: compile log stages
    const steps = [2, 3, 4];
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setSavingProgress(step);
      }, (idx + 1) * 300);
    });

    try {
      // Small pause to allow visual feedback to display nicely
      await new Promise(resolve => setTimeout(resolve, 950));

      const response = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, language }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      const data = await response.json();
      window.history.pushState(null, '', `?id=${data.id}`);
      setMode('view');
    } catch (error) {
      alert('System error saving prompt: ' + error.message);
    } finally {
      setIsSaving(false);
      setSavingProgress(0);
    }
  };

  const handleNew = () => {
    setContent('');
    setLanguage('plaintext');
    setMode('edit');
    setActiveLine(1);
    window.history.pushState(null, '', '/');
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleCopyContent = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopyContentSuccess(true);
      trackEvent('copy');
      setTimeout(() => setCopyContentSuccess(false), 2000);
    });
  };

  const handleDownloadContent = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_${activeId || 'new'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackEvent('download');
  };

  // Keybinding support: Ctrl+S/Cmd+S to Save, Ctrl+N/Cmd+N for New
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (mode === 'edit') {
          handleSave();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNew();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, language, mode, isSaving]);

  // Performance Optimization: Memoize split lines to eliminate typing latency on large inputs
  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  }, [lineCount]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] bg-grid h-screen">
        <div className="flex items-center gap-3 border border-white/5 bg-[#0a0a0a] p-6 text-sm font-mono text-white glow-border">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] pulse-dot shrink-0" />
          <span className="animate-pulse tracking-widest">&gt; FETCHING CORE BYTES...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] bg-grid overflow-hidden">
      {/* Top Banner Dashboard */}
      <header className="flex flex-col lg:flex-row items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-3 sm:px-5 py-3 sm:py-3.5 gap-3 lg:gap-3.5 z-20 shrink-0 select-none">
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 w-full lg:w-auto">
          <a
            href="https://www.threads.com/@schoolofprompt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center text-white/40 hover:text-[#FFFF00] transition-colors"
            aria-label="School of Prompt on Threads"
          >
            <svg
              className="w-4 h-4 stroke-current fill-none transition-transform hover:scale-110"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10c0-2.3-1.5-4-3.5-4s-3.5 1.7-3.5 4a3.5 3.5 0 1 1-7 0c0-3.9 3.1-7 7-7s7 3.1 7 7c0 4.8-3.4 9-8 9s-8-4.2-8-9" />
            </svg>
          </a>
          
          <span className="text-white/10 font-mono text-sm">|</span>

          <div className="text-[#FFFF00] font-bold text-[15px] tracking-wider flex items-center gap-1.5 glow-text-yellow">
            <span>⚡</span>
            <span>SchoolOfPrompt</span>
          </div>
          
          <span className="text-white/10 font-mono text-sm">|</span>

          {/* Connected status pill */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono transition-all duration-300 ${
            mode === 'edit' 
              ? 'border-yellow-500/20 text-yellow-500/80 bg-yellow-950/10' 
              : 'border-white/10 text-white/80 bg-white/5 glow-border'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${mode === 'edit' ? 'bg-yellow-500' : 'bg-white'}`} />
            <span>{mode === 'edit' ? 'WRITE_ENV' : 'READ_ONLY'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 sm:gap-3.5 w-full lg:w-auto">
          {mode === 'edit' ? (
            <>
              {/* Language Selector Dropdown */}
              <div className="relative z-50" ref={langDropdownRef}>
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className={`flex items-center justify-between min-w-[120px] bg-[#0a0a0a] border ${isLangOpen ? 'border-[#FFFF00]/50 shadow-[0_0_8px_rgba(255,255,0,0.2)]' : 'border-white/10 hover:border-white/30'} text-white/80 px-3 py-1.5 rounded-none font-mono text-xs outline-none transition-all cursor-pointer select-none`}
                >
                  <span>{LANGUAGES.find(l => l.value === language)?.label || 'Plain Text'}</span>
                  <span className={`text-[9px] text-white/30 transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isLangOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-40 max-h-[40vh] overflow-y-auto bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 flex flex-col py-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          setLanguage(lang.value);
                          setIsLangOpen(false);
                        }}
                        className={`text-left px-3 py-1.5 font-mono text-xs transition-colors ${
                          language === lang.value 
                            ? 'text-[#FFFF00] bg-white/5 border-l-2 border-[#FFFF00]' 
                            : 'text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent hover:border-white/30'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
                className="term-btn text-xs px-4 py-1.5 flex justify-center w-full sm:w-auto flex-1 sm:flex-initial !text-emerald-400 !border-emerald-400/40 hover:!text-emerald-300 hover:!border-emerald-300 hover:!shadow-[0_0_10px_rgba(52,211,153,0.4)] hover:!bg-emerald-400/5 transition-all"
              >
                {isSaving ? 'SAVING...' : 'SAVE PROMPT'}
              </button>
            </>
          ) : (
            <>
              {/* Shareable Link Display */}
              <div className="flex items-center border border-white/10 bg-[#0a0a0a] h-8 rounded-none overflow-hidden transition-all focus-within:border-white/30 flex-1 lg:flex-initial min-w-[150px] w-full lg:w-auto">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-white/60 font-mono text-[10px] px-2.5 outline-none w-full lg:w-60 select-all"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="border-l border-white/10 text-white/80 hover:bg-white/5 hover:text-white font-mono text-[10px] px-3 h-full transition-all shrink-0 active:bg-white/10"
                >
                  {copySuccess ? 'COPIED!' : 'COPY URL'}
                </button>
              </div>

              {/* Copy Raw Text Button */}
              <button
                onClick={handleCopyContent}
                className="term-btn text-xs px-3 py-1.5 flex justify-center w-full sm:w-auto flex-1 sm:flex-initial !text-yellow-400 !border-yellow-400/40 hover:!text-yellow-300 hover:!border-yellow-300 hover:!shadow-[0_0_10px_rgba(250,204,21,0.4)] hover:!bg-yellow-400/5 transition-all"
              >
                {copyContentSuccess ? 'COPIED!' : 'COPY TEXT'}
              </button>

              {/* Download Text Button */}
              <button
                onClick={handleDownloadContent}
                className="term-btn text-xs px-3 py-1.5 flex justify-center w-full sm:w-auto flex-1 sm:flex-initial !text-fuchsia-400 !border-fuchsia-400/40 hover:!text-fuchsia-300 hover:!border-fuchsia-300 hover:!shadow-[0_0_10px_rgba(232,121,249,0.4)] hover:!bg-fuchsia-400/5 transition-all"
              >
                DOWNLOAD TEXT
              </button>

              {/* Raw View Button */}
              <a
                href={`/api/paste?id=${activeId}&raw=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="term-btn text-xs px-3 py-1.5 inline-flex justify-center w-full sm:w-auto flex-1 sm:flex-initial items-center !text-cyan-400 !border-cyan-400/40 hover:!text-cyan-300 hover:!border-cyan-300 hover:!shadow-[0_0_10px_rgba(34,211,238,0.4)] hover:!bg-cyan-400/5 transition-all"
              >
                RAW VIEW
              </a>

              {/* New Prompt Button */}
              <button
                onClick={handleNew}
                className="term-btn text-xs px-3 py-1.5 font-bold flex justify-center w-full sm:w-auto flex-1 sm:flex-initial !text-emerald-400 !border-emerald-400/40 hover:!text-emerald-300 hover:!border-emerald-300 hover:!shadow-[0_0_10px_rgba(52,211,153,0.4)] hover:!bg-emerald-400/5 transition-all"
              >
                CREATE NEW
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isSaving ? (
          /* Compiling console logs micro-interaction */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] bg-grid h-full text-xs font-mono text-white/70 select-none">
            <div className="border border-white/10 bg-[#0a0a0a]/90 p-6 max-w-sm w-full rounded-none space-y-2 glow-border mx-4">
              <div className="text-yellow-400 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                <span>&gt; COMPILING PROMPT PACKET...</span>
              </div>
              <div className={savingProgress >= 1 ? 'opacity-100 transition-opacity' : 'opacity-0'}>
                &gt; ESTABLISHING SHARD HANDSHAKE...
              </div>
              <div className={savingProgress >= 2 ? 'opacity-100 transition-opacity' : 'opacity-0'}>
                &gt; WRITING ATOMIC PASTE BYTES (LIFETIME)...
              </div>
              <div className={savingProgress >= 3 ? 'opacity-100 transition-opacity font-bold text-yellow-300' : 'opacity-0'}>
                &gt; REMOTE OK. GENERATING URL SHARD...
              </div>
            </div>
          </div>
        ) : mode === 'edit' ? (
          <div className="flex w-full h-full relative">
            {/* Interactive Gutter Line Numbers for Editor */}
            <div
              ref={editorLineCounterRef}
              className="w-12 select-none text-right pr-3.5 text-white/10 font-mono text-[13px] leading-6 pt-4 pb-12 overflow-hidden border-r border-white/5 bg-[#0a0a0a]/30 shrink-0 transition-all"
            >
              {lineNumbers.map((num) => (
                <div 
                  key={num} 
                  className={num === activeLine ? 'text-[#FFFF00] font-bold glow-text-yellow transition-colors duration-150' : 'transition-colors duration-150'}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={handleScroll}
              onKeyUp={handleEditorCursorMove}
              onClick={handleEditorCursorMove}
              placeholder="Paste your prompt, code snippet, or markdown configuration here... Use Cmd+S / Ctrl+S to save."
              className="flex-1 h-full resize-none outline-none border-none bg-transparent text-white font-mono text-[13px] leading-6 p-4 focus:ring-0 overflow-y-auto scroll-smooth caret-[#FFFF00]"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex w-full h-full relative">
            {/* Gutter Line Numbers for Viewer */}
            <div
              ref={viewerLineCounterRef}
              className="w-12 select-none text-right pr-3.5 text-white/10 font-mono text-[13px] leading-6 pt-4 pb-12 overflow-hidden border-r border-white/5 bg-[#0a0a0a]/30 shrink-0"
            >
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Read-only Syntax Highlighting container */}
            <pre
              onScroll={handleViewerScroll}
              className="flex-1 h-full font-mono text-[13px] leading-6 p-4 overflow-y-auto overflow-x-auto scroll-smooth bg-transparent select-text"
            >
              <code
                ref={codeRef}
                className={`language-${language} h-full block bg-transparent`}
              >
                {content}
              </code>
            </pre>
          </div>
        )}
      </main>

      {/* Keyboard Shortcuts Footer Hint */}
      <footer className="min-h-6 border-t border-white/5 px-3 sm:px-5 py-1.5 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] sm:text-[10px] text-white/20 font-mono shrink-0 select-none bg-[#0a0a0a]/90 text-center sm:text-left">
        <div>
          {mode === 'edit' 
            ? 'KEYS: [Ctrl/Cmd + S] Save' 
            : 'KEYS: [Ctrl/Cmd + N] New'}
        </div>
        <div>
          <a
            href="https://www.threads.com/@schoolofprompt"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-[#FFFF00] transition-colors"
          >
            SCHOOL OF PROMPT
          </a>{" "}
          | v1.0.0
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] bg-grid h-screen">
        <div className="flex items-center gap-3 border border-white/5 bg-[#0a0a0a] p-6 text-sm font-mono text-white glow-border">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] pulse-dot shrink-0" />
          <span className="animate-pulse tracking-widest">&gt; DECRYPTING OS BOOT...</span>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
