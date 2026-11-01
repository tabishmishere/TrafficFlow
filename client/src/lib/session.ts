"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/api";

const storageKey = "trafficflow.session";
const sessionEvent = "trafficflow:session";

export interface Session {
  token: string;
  user: User;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (
      typeof value === "object"
      && value !== null
      && "token" in value
      && typeof value.token === "string"
      && "user" in value
      && typeof value.user === "object"
      && value.user !== null
      && "id" in value.user
      && typeof value.user.id === "string"
      && "name" in value.user
      && typeof value.user.name === "string"
      && "email" in value.user
      && typeof value.user.email === "string"
    ) {
      return {
        token: value.token,
        user: { id: value.user.id, name: value.user.name, email: value.user.email },
      };
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
  return null;
}

export function saveSession(session: Session) {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
  window.dispatchEvent(new Event(sessionEvent));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(sessionEvent));
}

export function useSession() {
  const [session, setCurrentSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      setCurrentSession(getSession());
      setReady(true);
    };
    syncSession();
    window.addEventListener(sessionEvent, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(sessionEvent, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return { session, ready };
}
