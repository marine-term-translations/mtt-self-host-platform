import React from "react";

export const TeamDashboardPage: React.FC<{ teamName: string; joinCode: string }> = ({ teamName, joinCode }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">{teamName}</h1>
        <p className="text-slate-400 text-sm mb-4">
          Team Join Code: <code className="text-cyan-400 bg-slate-900 px-2 py-1 rounded font-mono">{joinCode}</code>
        </p>
        <div className="mt-6 border-t border-slate-700 pt-4">
          <h3 className="text-lg font-semibold text-white mb-2">Team Activity</h3>
          <p className="text-slate-400 text-sm">
            Contributions by team members will be tracked and aggregated live during active competition events.
          </p>
        </div>
      </div>
    </div>
  );
};
