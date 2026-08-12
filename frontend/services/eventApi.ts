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

export async function createEvent(data: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetCategory?: string;
  rewardTitle?: string;
}): Promise<Event> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create event");
  return res.json();
}

export async function createEventTeam(eventId: string, name: string, imageUrl?: string): Promise<EventTeam> {
  const res = await fetch(`${API_BASE}/${eventId}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, imageUrl }),
  });
  if (!res.ok) throw new Error("Failed to create team");
  return res.json();
}

export async function updateEventStatus(eventId: string, status: string): Promise<Event> {
  const res = await fetch(`${API_BASE}/${eventId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update event status");
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
