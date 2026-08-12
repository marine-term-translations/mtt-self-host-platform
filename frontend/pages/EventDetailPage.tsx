import React, { useEffect, useState } from "react";
import { fetchEventDetails } from "../services/eventApi";
import { Event } from "../types";
import { QRCodeModal } from "../components/QRCodeModal";

export const EventDetailPage: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchEventDetails(eventId).then(setEvent).catch(console.error);
  }, [eventId]);

  if (!event) return <div className="p-8 text-center text-white">Loading competition...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          <p className="text-slate-400">{event.description}</p>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2"
        >
          📱 Show Event QR
        </button>
      </div>

      {/* Podium Section */}
      {event.teams && event.teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
          {event.teams.slice(0, 3).map((team, idx) => (
            <div key={team.id} className="bg-slate-800/90 border border-amber-500/30 rounded-xl p-4 shadow-md">
              <div className="text-2xl mb-1">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</div>
              <h3 className="font-bold text-white">{team.name}</h3>
              <p className="text-cyan-400 font-semibold text-sm">{team.total_points || 0} pts</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/60 p-6 rounded-xl text-center text-slate-400 mb-8">
          No teams joined yet. Be the first to create or join a team!
        </div>
      )}

      {showQR && <QRCodeModal eventId={event.id} onClose={() => setShowQR(false)} />}
    </div>
  );
};
