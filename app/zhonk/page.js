'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal, Shield, Fingerprint, Loader2, Cpu } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(urlError ? 'error' : 'idle');
  const [errorMsg, setErrorMsg] = useState(urlError || '');
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'ACCESS_DENIED');
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch (err) {
      setErrorMsg('CONNECTION_LOST');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-[#00ffff] selection:text-black">
      {/* HUD scanline background */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
      
      {/* Target Crosshairs Background */}
      <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* HUD Frame */}
        <div className="relative border border-cyan-500/30 bg-black/60 backdrop-blur-sm p-8 shadow-[0_0_30px_rgba(0,255,255,0.05)] before:content-[''] before:absolute before:top-[-1px] before:left-[-1px] before:w-4 before:h-4 before:border-t-2 before:border-l-2 before:border-cyan-400 after:content-[''] after:absolute after:bottom-[-1px] after:right-[-1px] after:w-4 after:h-4 after:border-b-2 after:border-r-2 after:border-cyan-400">
          
          {/* Top HUD Data Stream */}
          <div className="absolute -top-6 left-0 text-[10px] text-cyan-500/50 flex gap-4 tracking-widest">
            <span>SYS.OP.01</span>
            <span>SEC_LVL_9</span>
            <span className={glitch ? "text-red-500" : ""}>ENC_ACTIVE</span>
          </div>

          <div className="flex justify-center mb-6 text-cyan-400 relative">
            <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
            <Shield size={48} className="relative z-10" />
          </div>
          
          <h1 className="text-xl font-bold text-cyan-400 text-center mb-1 tracking-[0.3em]">
            [ RESTRICTED_AREA ]
          </h1>
          <p className="text-cyan-600/70 text-[10px] text-center mb-8 uppercase tracking-widest">
            Identify to initialize secure uplink
          </p>

          {status === 'success' ? (
            <div className="border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 p-4 text-center text-xs tracking-wider relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500" />
              UPLINK_ESTABLISHED: Check your secure comms channel for the decryption key.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600">
                  <Fingerprint size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                  placeholder="IDENTITY_REQUIRED"
                  className="w-full bg-cyan-950/20 border-b-2 border-cyan-900/50 px-10 py-3 text-cyan-100 placeholder-cyan-800 text-sm outline-none focus:border-cyan-400 focus:bg-cyan-950/40 transition-all uppercase tracking-wider"
                />
              </div>
              
              {status === 'error' && (
                <div className="border border-red-500/30 bg-red-500/10 text-red-500 text-xs text-center py-2 flex items-center justify-center gap-2 tracking-widest">
                  <Cpu size={14} className="animate-pulse" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full relative group overflow-hidden bg-transparent border border-cyan-500/50 text-cyan-400 text-xs py-3 flex items-center justify-center gap-3 transition-all hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] tracking-[0.2em]"
              >
                {/* Button Scanline */}
                <div className="absolute inset-0 w-full h-[2px] bg-cyan-400/30 -translate-y-full group-hover:animate-[scan_2s_linear_infinite]" />
                
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} /> PROCESSING_HASH
                  </span>
                ) : (
                  <>
                    <Terminal size={14} />
                    INITIATE_AUTH_SEQUENCE
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom HUD Data Stream */}
          <div className="absolute -bottom-6 right-0 text-[10px] text-cyan-500/50 flex gap-4 tracking-widest">
            <span>NET: STABLE</span>
            <span>PORT: 3001</span>
            <span className="animate-pulse">_WAITING_INPUT</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(5000%); }
        }
      `}</style>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-[#00ffff] selection:text-black"><div className="text-cyan-500 animate-pulse">INITIALIZING_SECURE_UPLINK...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
