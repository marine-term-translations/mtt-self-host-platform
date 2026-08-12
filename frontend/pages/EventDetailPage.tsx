import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchEventDetails, joinEventTeam } from "../services/eventApi";
import { Event } from "../types";
import { QRCodeModal } from "../components/QRCodeModal";
import toast from "react-hot-toast";

export const EventDetailPage: React.FC<{ eventId?: string }> = ({ eventId: propEventId }) => {
  const { id: paramEventId } = useParams<{ id: string }>();
  const activeEventId = propEventId || paramEventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [activeJoinCode, setActiveJoinCode] = useState<string | null>(null);
  const [joinInputCode, setJoinInputCode] = useState("");
  const [joining, setJoining] = useState(false);

  const loadEvent = () => {
    if (!activeEventId) return;
    setLoading(true);
    fetchEventDetails(activeEventId)
      .then(setEvent)
      .catch((err) => toast.error(err.message || "Failed to load competition details"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvent();
  }, [activeEventId]);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !joinInputCode) return;
    setJoining(true);
    try {
      await joinEventTeam(activeEventId, joinInputCode.trim());
      toast.success("Successfully joined team!");
      setJoinInputCode("");
      loadEvent();
    } catch (err: any) {
      toast.error(err.message || "Failed to join team. Check join code.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-white font-medium">Loading competition leaderboard...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-8 text-slate-300">
          <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-slate-400 mb-6">The requested competition event does not exist or has been removed.</p>
          <Link to="/events" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold">
            &larr; Back to Competitions Hub
          </Link>
        </div>
      </div>
    );
  }

  const current = event.current_count || 0;
  const target = event.target_count || 0;
  const isHighestMode = target === 0;
  const pct = isHighestMode ? 100 : Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button & Header */}
      <div className="mb-6">
        <Link to="/events" className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition flex items-center gap-1 mb-3">
          &larr; Back to Events Hub
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{event.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                event.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                event.status === 'UPCOMING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-700 text-slate-400'
              }`}>
                {event.status}
              </span>
            </div>
            <p className="text-slate-300 mt-2 text-sm">{event.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQR(true)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition"
            >
              📱 Event QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Competition Scope Card */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 mb-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-xs text-slate-300">
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Target Vocabulary</span>
            <span className="text-base font-bold text-cyan-400">{event.source_name || "ALL Vocabularies"}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Target Language / Status</span>
            <span className="text-base font-bold text-slate-200">{event.target_language?.toUpperCase() || "ALL"} • {event.status}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Competition Period</span>
            <span className="text-xs font-mono text-slate-200 block">{new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Goal Metric Bar */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-slate-300">
              {isHighestMode ? "Goal Mode: Highest Translations Wins (Open Competitive Challenge)" : "Event Milestone Progress"}
            </span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {isHighestMode ? `${current} Total Contributions` : `${current} / ${target} translations (${pct}%)`}
            </span>
          </div>
          {!isHighestMode && (
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Join Team Box */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 mb-8 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2">Have a Team Join Code?</h3>
        <p className="text-xs text-slate-400 mb-4">Enter a team's 6-character code (e.g. TM-OD-1000) to join competing team members!</p>
        <form onSubmit={handleJoinTeam} className="flex gap-3 max-w-md">
          <input
            type="text"
            required
            value={joinInputCode}
            onChange={(e) => setJoinInputCode(e.target.value)}
            placeholder="TM-XXXX-0000"
            className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={joining}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition"
          >
            {joining ? "Joining..." : "Join Team"}
          </button>
        </form>
      </div>

      {/* Leaderboard Podium */}
      <h2 className="text-2xl font-bold text-white mb-4">Team Leaderboard</h2>
      {event.teams && event.teams.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {event.teams.slice(0, 3).map((team, idx) => (
              <div
                key={team.id}
                className={`bg-slate-800/90 border rounded-xl p-5 shadow-lg relative overflow-hidden ${
                  idx === 0 ? "border-amber-500/50 bg-amber-500/5" :
                  idx === 1 ? "border-slate-400/50 bg-slate-400/5" :
                  "border-amber-700/50 bg-amber-700/5"
                }`}
              >
                <div className="text-3xl mb-2">{idx === 0 ? "🥇 1st Place" : idx === 1 ? "🥈 2nd Place" : "🥉 3rd Place"}</div>
                <h3 className="font-bold text-xl text-white mb-1">{team.name}</h3>
                <p className="text-cyan-400 font-mono font-bold text-lg">{team.total_points || 0} pts</p>
                <p className="text-xs text-slate-400 mt-1">{team.member_count || 0} members • Code: {team.join_code}</p>
                <button
                  onClick={() => setActiveJoinCode(team.join_code)}
                  className="mt-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-cyan-300 text-xs font-semibold rounded"
                >
                  Show QR
                </button>
              </div>
            ))}
          </div>

          {/* Leaderboard Table for Remaining Teams */}
          {event.teams.length > 3 && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden shadow-xl mt-6">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Join Code</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {event.teams.slice(3).map((team, idx) => (
                    <tr key={team.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-bold font-mono text-slate-400">#{idx + 4}</td>
                      <td className="px-4 py-3 font-semibold text-white">{team.name}</td>
                      <td className="px-4 py-3 text-slate-300">{team.member_count || 0} members</td>
                      <td className="px-4 py-3 font-mono text-cyan-400">{team.join_code}</td>
                      <td className="px-4 py-3 font-bold font-mono text-emerald-400 text-right">{team.total_points || 0} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
          No competing teams created for this event yet.
        </div>
      )}

      {/* QR Code Viewer */}
      {(showQR || activeJoinCode) && (
        <QRCodeModal
          eventId={event.id}
          joinCode={activeJoinCode || undefined}
          onClose={() => {
            setShowQR(false);
            setActiveJoinCode(null);
          }}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
