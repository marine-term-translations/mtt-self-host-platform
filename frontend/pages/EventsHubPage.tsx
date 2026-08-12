import React, { useEffect, useState } from "react";
import { fetchEvents } from "../services/eventApi";
import { Event } from "../types";
import { Link } from "react-router-dom";

export const EventsHubPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Loading active events...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Vocabulary Competitions & Events</h1>
          <p className="text-slate-400 mt-1">Join a team, translate targeted marine vocabularies, and unlock exclusive profile titles!</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center text-slate-300">
          No competitions scheduled yet. Check back soon for upcoming challenges!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const current = event.current_count || 0;
            const target = event.target_count || 100;
            const pct = Math.min(100, Math.round((current / target) * 100));

            return (
              <div key={event.id} className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-bold text-white">{event.title}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      event.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      event.status === 'UPCOMING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">{event.description}</p>

                  {/* Vocabulary & Milestone Progress */}
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60 mb-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Target Vocabulary:</span>
                      <span className="font-semibold text-cyan-400">{event.source_name || "ALL Vocabularies"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Target Language:</span>
                      <span className="font-semibold text-slate-200">{event.target_language?.toUpperCase() || "ALL"}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Milestone Progress:</span>
                        <span className="font-mono text-emerald-400 font-bold">{current} / {target} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/events/${event.id}`}
                  className="w-full text-center px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition shadow-md"
                >
                  View Leaderboard & Teams &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsHubPage;
