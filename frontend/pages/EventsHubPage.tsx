import React, { useEffect, useState } from "react";
import { fetchEvents } from "../services/eventApi";
import { Event } from "../types";

export const EventsHubPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Loading events...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Competitions & Events</h1>
      {events.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center text-slate-300">
          No competitions scheduled yet. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-white">{event.title}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  event.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                }`}>
                  {event.status}
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-4">{event.description}</p>
              <a
                href={`#/events/${event.id}`}
                className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition"
              >
                View Leaderboard & Teams
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
