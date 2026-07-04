'use client';

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

// Cyber-HUD colors
const COLORS = ['#00ffff', '#e879f9', '#34d399', '#facc15', '#f87171', '#60a5fa'];
const PIE_COLORS = {
  desktop: '#00ffff',
  mobile: '#e879f9',
  tablet: '#34d399',
  windows: '#3b82f6',
  macos: '#8b5cf6',
  linux: '#facc15',
  ios: '#ec4899',
  android: '#10b981',
  unknown: '#4b5563'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#050505]/95 border border-cyan-500/30 p-3 font-mono text-xs backdrop-blur-md shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <p className="text-white/60 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.fill }} className="flex justify-between gap-4">
            <span>{entry.name.toUpperCase()}:</span>
            <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TrafficAreaChart({ data }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ffff" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCreates" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e879f9" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#e879f9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#ffffff40" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis 
            stroke="#ffffff40" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="views" name="Views" stroke="#00ffff" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
          <Area type="monotone" dataKey="creates" name="Creations" stroke="#e879f9" strokeWidth={2} fillOpacity={1} fill="url(#colorCreates)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DevicePieChart({ data }) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-white/70 font-mono text-xs uppercase">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReferrerBarChart({ data }) {
  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" stroke="#ffffff70" fontSize={10} tickLine={false} axisLine={false} width={100} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
          <Bar dataKey="value" name="Visits" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
