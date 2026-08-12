import { backendApi } from "./api";
import { Event, EventTeam } from "../types";

export interface EventSource {
  source_id: number;
  name: string;
  source_type: string;
}

export async function fetchEvents(): Promise<Event[]> {
  return backendApi.get<Event[]>("/events");
}

export async function fetchEventSources(): Promise<EventSource[]> {
  return backendApi.get<EventSource[]>("/events/sources");
}

export async function fetchEventDetails(eventId: string): Promise<Event> {
  return backendApi.get<Event>(`/events/${eventId}`);
}

export async function createEvent(data: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  sourceId?: string;
  targetLanguage?: string;
  targetCount?: number;
  rewardTitle?: string;
}): Promise<Event> {
  return backendApi.post<Event>("/events", data);
}

export async function createEventTeam(eventId: string, name: string, imageUrl?: string): Promise<EventTeam> {
  return backendApi.post<EventTeam>(`/events/${eventId}/teams`, { name, imageUrl });
}

export async function updateEventStatus(eventId: string, status: string): Promise<Event> {
  return backendApi.patch<Event>(`/events/${eventId}/status`, { status });
}

export async function joinEventTeam(eventId: string, joinCode: string): Promise<{ success: boolean; teamId: string }> {
  return backendApi.post<{ success: boolean; teamId: string }>(`/events/${eventId}/join`, { joinCode });
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
  return backendApi.delete<{ success: boolean; message: string }>(`/events/${eventId}`);
}

export async function deleteTeam(eventId: string, teamId: string): Promise<{ success: boolean; message: string }> {
  return backendApi.delete<{ success: boolean; message: string }>(`/events/${eventId}/teams/${teamId}`);
}

