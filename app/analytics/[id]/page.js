import { executeQuery } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Globe, Monitor, Smartphone, Tablet, Activity, FileDown, Copy, Terminal } from 'lucide-react';

export const revalidate = 60;

async function getPasteAnalytics(id) {
  const [
    overviewResult,
    devicesResult,
    referrersResult,
    eventTimelineResult
  ] = await Promise.all([
    executeQuery(`
      SELECT 
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN event_type = 'copy' THEN 1 END) as total_copies,
        COUNT(CASE WHEN event_type = 'download' THEN 1 END) as total_downloads,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events WHERE paste_id = $1
    `, [id]),
    executeQuery('SELECT device_type, COUNT(*) as count FROM analytics_events WHERE paste_id = $1 AND event_type = \'view\' GROUP BY device_type ORDER BY count DESC', [id]),
    executeQuery('SELECT referrer, COUNT(*) as count FROM analytics_events WHERE paste_id = $1 AND event_type = \'view\' GROUP BY referrer ORDER BY count DESC LIMIT 5', [id]),
    executeQuery(`
      SELECT event_type, timestamp, os, device_type, country
      FROM analytics_events 
      WHERE paste_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 15
    `, [id])
  ]);

  return {
    overview: overviewResult.rows[0] || { total_views: 0, total_copies: 0, total_downloads: 0, unique_sessions: 0 },
    devices: devicesResult.rows || [],
    referrers: referrersResult.rows || [],
    timeline: eventTimelineResult.rows || []
  };
}

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2 || countryCode === 'Unknown') return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const DeviceIcon = ({ type }) => {
  if (type === 'mobile') return <Smartphone size={16} />;
  if (type === 'tablet') return <Tablet size={16} />;
  return <Monitor size={16} />;
};

const EventIcon = ({ type }) => {
  if (type === 'create') return <Activity size={16} className="text-emerald-400" />;
  if (type === 'copy') return <Copy size={16} className="text-yellow-400" />;
  if (type === 'download') return <FileDown size={16} className="text-fuchsia-400" />;
  return <Activity size={16} className="text-cyan-400" />;
};

export default async function PasteAnalytics({ params }) {
  const { id } = params;
  const data = await getPasteAnalytics(id);

  const conversionRate = data.overview.total_views > 0 
    ? (((Number(data.overview.total_copies) + Number(data.overview.total_downloads)) / data.overview.total_views) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-mono">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 border-b border-cyan-500/20 pb-3">
        <Link href="/analytics" className="p-1.5 md:p-2 border border-cyan-500/20 bg-[#050505] hover:bg-cyan-950/30 hover:border-cyan-400 transition-all text-cyan-500/50 hover:text-cyan-400 glow-border self-start md:self-auto">
          <ArrowLeft size={16} className="md:w-5 md:h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 md:gap-3 text-white glow-text-cyan flex-wrap">
            <Terminal className="text-cyan-400 w-5 h-5 md:w-6 md:h-6" />
            TARGET_INSPECT: <span className="text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 md:px-3 md:py-1 text-lg md:text-xl">{id}</span>
            <a href={`/?id=${id}`} target="_blank" className="text-cyan-500/30 hover:text-cyan-400 transition-colors ml-1 md:ml-2">
              <ExternalLink size={16} className="md:w-5 md:h-5" />
            </a>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Total Views" value={data.overview.total_views} color="text-cyan-400" />
        <MetricCard title="Unique Visitors" value={data.overview.unique_sessions} color="text-emerald-400" />
        <MetricCard title="Total Copies" value={data.overview.total_copies} color="text-yellow-400" />
        <MetricCard title="Total Downloads" value={data.overview.total_downloads} color="text-fuchsia-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Timeline Log */}
        <div className="lg:col-span-2 bg-[#050505]/80 border border-cyan-500/20 p-4 md:p-6 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-3 md:mb-4 text-cyan-400 flex items-center gap-2">
            <Activity size={14} className="md:w-4 md:h-4" /> RECENT_EVENT_LOG (MAX_15)
          </h2>
          {data.timeline.length === 0 ? (
             <p className="text-white/40 text-xs py-2">NO LOGS AVAILABLE.</p>
          ) : (
            <div className="space-y-3">
              {data.timeline.map((ev, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] md:text-xs border border-white/5 bg-[#0a0a0a] p-2 md:p-3 hover:border-cyan-500/20 transition-colors group gap-2 sm:gap-0">
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="text-white/30">{new Date(ev.timestamp).toLocaleString()}</span>
                    <div className="flex items-center gap-1.5 md:gap-2 uppercase font-bold tracking-widest">
                      <EventIcon type={ev.event_type} />
                      <span className={
                        ev.event_type === 'create' ? 'text-emerald-400' :
                        ev.event_type === 'copy' ? 'text-yellow-400' :
                        ev.event_type === 'download' ? 'text-fuchsia-400' : 'text-cyan-400'
                      }>{ev.event_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 text-white/50 uppercase">
                    <span className="flex items-center gap-1" title={ev.country}>{getFlagEmoji(ev.country)}</span>
                    <span className="flex items-center gap-1"><Monitor size={10} className="md:w-3 md:h-3"/> {ev.os}</span>
                    <span className="flex items-center gap-1"><DeviceIcon type={ev.device_type} /> {ev.device_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Conversion */}
          <div className="bg-[#050505]/80 border border-yellow-500/20 p-4 md:p-6 relative flex flex-col justify-center items-center text-center">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
            <p className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1 md:mb-2">Save / Copy Conversion</p>
            <div className="text-3xl md:text-4xl font-bold tracking-tighter text-yellow-400 glow-text-yellow">{conversionRate}%</div>
          </div>

          <div className="bg-[#050505]/80 border border-blue-500/20 p-4 md:p-6 relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            <h2 className="text-xs md:text-sm font-bold mb-3 md:mb-4 text-blue-400 flex items-center gap-2">
              <Globe size={14} className="md:w-4 md:h-4" /> INBOUND_VECTORS
            </h2>
            {data.referrers.length === 0 ? (
              <p className="text-white/40 text-xs py-2">NO REFERRERS DETECTED.</p>
            ) : (
              <ul className="space-y-4">
                {data.referrers.map((r, i) => (
                  <li key={i} className="flex items-center justify-between group">
                    <div className="text-[10px] md:text-xs text-white/80 truncate max-w-[150px] md:max-w-[200px]" title={r.referrer}>
                      {r.referrer === 'direct' ? 'DIRECT_LINK' : r.referrer}
                    </div>
                    <span className="text-[10px] md:text-xs font-bold bg-blue-950/30 border border-blue-500/20 px-1.5 py-0.5 md:px-2 md:py-1 text-blue-400">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <div className="bg-[#050505]/80 border border-white/10 hover:border-white/20 p-3 md:p-4 flex flex-col gap-1 md:gap-2 relative overflow-hidden group">
      <p className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest z-10">{title}</p>
      <div className={`text-2xl md:text-3xl font-bold tracking-tighter z-10 ${color} glow-text-current`}>
        {Number(value || 0).toLocaleString()}
      </div>
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-1 md:h-1.5 border-t border-l ${color.replace('text-', 'border-')} opacity-50`}></div>
      <div className={`absolute bottom-0 right-0 w-1 md:w-1.5 h-1 md:h-1.5 border-b border-r ${color.replace('text-', 'border-')} opacity-50`}></div>
    </div>
  );
}
