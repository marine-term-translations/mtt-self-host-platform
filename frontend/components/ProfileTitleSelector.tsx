import React, { useEffect, useState } from "react";
import { UserTitle } from "../types";

export const ProfileTitleSelector: React.FC<{ userId: number }> = ({ userId }) => {
  const [titles, setTitles] = useState<UserTitle[]>([]);

  useEffect(() => {
    fetch(`/api/user/profile/titles?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTitles(data);
      })
      .catch(console.error);
  }, [userId]);

  const handleEquip = (rewardId: string) => {
    fetch("/api/user/profile/equipped-title", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId, userId })
    }).then(() => {
      setTitles((prev) =>
        prev.map((t) => ({ ...t, is_equipped: t.reward_id === rewardId ? 1 : 0 }))
      );
    });
  };

  if (titles.length === 0) return null;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h4 className="text-white font-bold mb-3">Equipped Profile Title</h4>
      <div className="space-y-2">
        {titles.map((t) => (
          <div key={t.user_reward_id} className="flex items-center justify-between p-2 bg-slate-900 rounded">
            <span className="text-emerald-400 font-medium text-sm">🏆 {t.name}</span>
            <button
              onClick={() => handleEquip(t.reward_id)}
              className={`px-3 py-1 text-xs rounded ${
                t.is_equipped ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {t.is_equipped ? "Equipped" : "Equip"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
