'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AnalyticsCharts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We mock the API call for chart data. In production, you would fetch from an API route
    // that runs a Postgres query like: 
    // SELECT DATE_TRUNC('day', timestamp) as date, COUNT(*) as clicks FROM analytics_events GROUP BY date ORDER BY date
    
    // Generate dummy data for the last 7 days for visual demonstration
    const dummyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dummyData.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        clicks: Math.floor(Math.random() * 50) + 10
      });
    }
    
    setData(dummyData);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-white/30 text-sm">Loading charts...</div>;
  }

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0' }}
            itemStyle={{ color: '#FFFF00', fontSize: '12px' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          <Line 
            type="monotone" 
            dataKey="clicks" 
            stroke="#FFFF00" 
            strokeWidth={2}
            dot={{ fill: '#0a0a0a', stroke: '#FFFF00', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#FFFF00', stroke: '#000' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
