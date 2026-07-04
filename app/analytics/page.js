import { executeQuery } from '@/lib/db';
import Link from 'next/link';
import { Eye, Users, Hash, Zap, Monitor, MapPin, Activity, Terminal } from 'lucide-react';
import { TrafficAreaChart, DevicePieChart, ReferrerBarChart } from '@/components/AdvancedCharts';

export const revalidate = 60; // Revalidate cache every 60 seconds

async function getAnalyticsData() {
  const [
    overviewResult,
    trafficTrendResult,
    deviceResult,
    osResult,
    referrerResult,
    topPastesResult
  ] = await Promise.all([
    executeQuery(`
      SELECT 
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN event_type = 'create' THEN 1 END) as total_creates,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT paste_id) as active_pastes
      FROM analytics_events
    `),
    executeQuery(`
      SELECT 
        TO_CHAR(DATE_TRUNC('day', timestamp), 'MM-DD') as date,
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN event_type = 'create' THEN 1 END) as creates
      FROM analytics_events
      WHERE timestamp > CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY DATE_TRUNC('day', timestamp) ASC
    `),
    executeQuery(`
      SELECT device_type as name, COUNT(*) as value
      FROM analytics_events
      WHERE event_type = 'view'
      GROUP BY device_type
      ORDER BY value DESC
    `),
    executeQuery(`
      SELECT os as name, COUNT(*) as value
      FROM analytics_events
      WHERE event_type = 'view'
      GROUP BY os
      ORDER BY value DESC
    `),
    executeQuery(`
      SELECT referrer as name, COUNT(*) as value
      FROM analytics_events
      WHERE event_type = 'view' AND referrer != 'direct'
      GROUP BY referrer
      ORDER BY value DESC
      LIMIT 5
    `),
    executeQuery(`
      SELECT paste_id, COUNT(*) as views 
      FROM analytics_events 
      WHERE event_type = 'view'
      GROUP BY paste_id 
      ORDER BY views DESC 
      LIMIT 10
    `)
  ]);

  return {
    overview: overviewResult.rows[0] || { total_views: 0, total_creates: 0, unique_sessions: 0, active_pastes: 0 },
    trafficTrend: trafficTrendResult.rows || [],
    devices: deviceResult.rows || [],
    os: osResult.rows || [],
    referrers: referrerResult.rows || [],
    topPastes: topPastesResult.rows || []
  };
}

export default async function AnalyticsDashboard() {
  const data = await getAnalyticsData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-mono">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-500/20 pb-3 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1 glow-text-cyan flex items-center gap-2">
            <Terminal className="text-cyan-400 w-5 h-5 md:w-6 md:h-6" />
            GLOBAL_TELEMETRY
          </h1>
          <p className="text-cyan-500/50 text-xs">Real-time engagement and distribution metrics.</p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-emerald-400 text-[10px] md:text-xs animate-pulse flex items-center gap-2 md:justify-end">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 rounded-full"></span>
            SYSTEM ONLINE
          </div>
          <div className="text-white/30 text-[9px] md:text-[10px] mt-1">LAST SYNC: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Total Views" value={data.overview.total_views} icon={<Eye size={16} />} color="text-cyan-400" />
        <MetricCard title="Pastes Created" value={data.overview.total_creates} icon={<Zap size={16} />} color="text-fuchsia-400" />
        <MetricCard title="Unique Visitors" value={data.overview.unique_sessions} icon={<Users size={16} />} color="text-emerald-400" />
        <MetricCard title="Active Pastes" value={data.overview.active_pastes} icon={<Hash size={16} />} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Traffic Chart */}
        <div className="lg:col-span-2 bg-[#050505]/80 border border-cyan-500/20 p-4 md:p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-2 text-cyan-400 flex items-center gap-2">
            <Activity size={14} /> TRAFFIC_TRENDS (14 DAYS)
          </h2>
          <TrafficAreaChart data={data.trafficTrend} />
        </div>

        {/* Top Pastes */}
        <div className="bg-[#050505]/80 border border-emerald-500/20 p-4 md:p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-3 text-emerald-400 flex items-center gap-2">
            <Zap size={14} /> HOT_PASTES
          </h2>
          {data.topPastes.length === 0 ? (
            <p className="text-white/40 text-[10px] md:text-xs py-4 text-center">NO DATA AVALIABLE.</p>
          ) : (
            <ul className="space-y-3">
              {data.topPastes.map((p, i) => (
                <li key={p.paste_id} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-emerald-500/50 text-[10px] w-4">0{i + 1}</span>
                    <Link href={`/analytics/${p.paste_id}`} className="text-xs md:text-sm text-white/80 hover:text-emerald-400 transition-colors">
                      {p.paste_id}
                    </Link>
                  </div>
                  <span className="text-[10px] md:text-xs bg-emerald-950/30 border border-emerald-500/20 px-1.5 md:px-2 py-0.5 md:py-1 text-emerald-400">
                    {p.views} V
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Devices */}
        <div className="bg-[#050505]/80 border border-fuchsia-500/20 p-4 md:p-5 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-2 text-fuchsia-400 flex items-center gap-2">
            <Monitor size={14} /> CLIENT_HARDWARE
          </h2>
          <DevicePieChart data={data.devices} />
        </div>

        {/* OS */}
        <div className="bg-[#050505]/80 border border-yellow-500/20 p-4 md:p-5 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-2 text-yellow-400 flex items-center gap-2">
            <Terminal size={14} /> OS_DISTRIBUTION
          </h2>
          <DevicePieChart data={data.os} />
        </div>

        {/* Referrers */}
        <div className="bg-[#050505]/80 border border-blue-500/20 p-4 md:p-5 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          <h2 className="text-xs md:text-sm font-bold mb-2 text-blue-400 flex items-center gap-2">
            <MapPin size={14} /> INBOUND_VECTORS
          </h2>
          <ReferrerBarChart data={data.referrers} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-[#050505]/80 border border-white/10 hover:border-white/20 p-3 md:p-5 flex flex-col gap-2 md:gap-3 relative overflow-hidden group">
      <div className="flex justify-between items-start z-10 relative">
        <p className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <div className={`${color} opacity-70 group-hover:opacity-100 transition-opacity hidden sm:block`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter z-10 relative ${color} glow-text-current`}>
        {Number(value || 0).toLocaleString()}
      </div>
      <div className={`absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 w-24 h-24 md:w-32 md:h-32 ${color.replace('text-', 'bg-')}/5 rounded-full blur-2xl group-hover:${color.replace('text-', 'bg-')}/10 transition-colors pointer-events-none`} />
      
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-1.5 h-1.5 md:w-2 md:h-2 border-t md:border-t-2 border-l md:border-l-2 ${color.replace('text-', 'border-')} opacity-50`}></div>
      <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 md:w-2 md:h-2 border-b md:border-b-2 border-r md:border-r-2 ${color.replace('text-', 'border-')} opacity-50`}></div>
    </div>
  );
}
