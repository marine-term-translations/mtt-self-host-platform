import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { backendApi } from '../services/api';
import { TrendingUp, Calendar } from 'lucide-react';

interface ReputationHistoryChartProps {
  userId: number;
}

interface HistoryDataPoint {
  date: string;
  delta: number;
  cumulative_reputation: number;
  event_count: number;
}

const ReputationHistoryChart: React.FC<ReputationHistoryChartProps> = ({ userId }) => {
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await backendApi.getReputationHistoryAggregated(userId, days);
        setHistoryData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load reputation history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userId, days]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>Error loading reputation history: {error}</p>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="text-center text-slate-600 dark:text-slate-400">
          <p>No reputation history available yet. Start contributing to build your reputation!</p>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            {new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Reputation: <span className="font-bold">{data.cumulative_reputation}</span>
          </p>
          {data.delta !== 0 && (
            <p className={`text-sm ${data.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              Change: <span className="font-bold">{data.delta > 0 ? '+' : ''}{data.delta}</span>
            </p>
          )}
          {data.event_count > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data.event_count} event{data.event_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate stats
  const currentReputation = historyData.length > 0 ? historyData[historyData.length - 1].cumulative_reputation : 0;
  const startReputation = historyData.length > 0 ? historyData[0].cumulative_reputation : 0;
  const totalChange = currentReputation - startReputation;

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-marine-100 dark:bg-marine-900/30 text-marine-600 dark:text-marine-400 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Reputation History</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {totalChange >= 0 ? '+' : ''}{totalChange} points in the last {days} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-marine-500 focus:border-transparent"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={historyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorReputation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulative_reputation"
              stroke="#0891b2"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorReputation)"
              name="Reputation"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
          <span>Reputation Score</span>
        </div>
      </div>
    </div>
  );
};

export default ReputationHistoryChart;
