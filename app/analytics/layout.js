import { Activity, Home, Link2 } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsLayout({ children }) {
  return (
    <div className="h-screen bg-[#0a0a0a] text-white font-mono flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#050505]/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-cyan-500/20 p-6 flex flex-col z-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="flex flex-col items-center gap-3 mb-10 relative">
          <div className="relative w-40 h-24 glitch-container group cursor-pointer">
            <img src="/logo.png" alt="Project Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-75 mix-blend-screen pointer-events-none">
              <img src="/logo.png" alt="" className="absolute inset-0 w-full h-full object-contain animate-glitch-1 filter invert hue-rotate-[180deg]" />
              <img src="/logo.png" alt="" className="absolute inset-0 w-full h-full object-contain animate-glitch-2 filter invert sepia" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs tracking-widest glow-text-cyan mt-2">
            <Activity size={14} className="animate-pulse" />
            <span>SYS.ANALYTICS</span>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes glitch-1 {
            0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); }
            20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); }
            40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
            60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
            80% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); }
            100% { clip-path: inset(30% 0 50% 0); transform: translate(2px, -2px); }
          }
          @keyframes glitch-2 {
            0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, -2px); }
            20% { clip-path: inset(30% 0 20% 0); transform: translate(-2px, 2px); }
            40% { clip-path: inset(70% 0 10% 0); transform: translate(2px, -2px); }
            60% { clip-path: inset(20% 0 50% 0); transform: translate(-2px, 2px); }
            80% { clip-path: inset(50% 0 30% 0); transform: translate(2px, -2px); }
            100% { clip-path: inset(5% 0 80% 0); transform: translate(-2px, 2px); }
          }
          .animate-glitch-1 { animation: glitch-1 0.4s infinite linear alternate-reverse; }
          .animate-glitch-2 { animation: glitch-2 0.4s infinite linear alternate-reverse; }
        `}} />
        
        <nav className="flex flex-col gap-3">
          <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 bg-cyan-950/20 border border-cyan-500/30 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all rounded-none text-sm shadow-[0_0_10px_rgba(0,255,255,0.05)] hover:shadow-[0_0_15px_rgba(0,255,255,0.2)]">
            <Home size={16} className="text-cyan-400" />
            <span className="text-cyan-100">OVERVIEW</span>
          </Link>
          <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-transparent border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all rounded-none text-sm text-white/50 hover:text-white mt-auto md:mt-0">
            <Link2 size={16} />
            <span>RETURN_TO_EDITOR</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto custom-scrollbar relative bg-[#020202] bg-grid w-full">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80" />
        <div className="max-w-[1600px] w-full mx-auto relative z-10">
          {children}
        </div>
      </main>
      
    </div>
  );
}
