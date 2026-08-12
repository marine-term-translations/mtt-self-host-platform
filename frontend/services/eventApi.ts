import { Event, EventTeam, UserTitle } from "../types";

const API_BASE = "/api/events";

export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchEventDetails(eventId: string): Promise<Event> {
  const res = await fetch(`${API_BASE}/${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch event details");
  return res.json();
}

export async function joinEventTeam(eventId: string, joinCode: string): Promise<{ success: boolean; teamId: string }> {
  const res = await fetch(`${API_BASE}/${eventId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode })
  });
  if (!res.ok) throw new Error("Failed to join team");
  return res.json();
}
