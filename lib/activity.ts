"use client";

import { useSyncExternalStore } from "react";
import type { ModuleId } from "@/lib/modules";
import { formatShortDate } from "@/lib/date";

// Foydalanuvchi faoliyati brauzer localStorage'ida saqlanadi (har bir hisob uchun alohida).
export type ActivityItem = {
  id: string;
  module: ModuleId;
  title: string;
  at: number;
};

const LIMIT = 200;
const EVENT = "campusai:activity";
const EMPTY: ActivityItem[] = [];

let currentUserId: string | null = null;
let cacheKey = "";
let cache: ActivityItem[] = EMPTY;

const keyFor = (uid: string) => `campusai:activity:${uid}`;

export function setActivityUser(uid: string | null) {
  currentUserId = uid;
  cacheKey = "";
  window.dispatchEvent(new Event(EVENT));
}

function read(): ActivityItem[] {
  if (!currentUserId) return EMPTY;
  const key = keyFor(currentUserId);
  if (cacheKey === key) return cache;
  try {
    const raw = localStorage.getItem(key);
    cache = raw ? (JSON.parse(raw) as ActivityItem[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  cacheKey = key;
  return cache;
}

export function logActivity(module: ModuleId, title: string) {
  if (!currentUserId) return;
  const item: ActivityItem = {
    id: crypto.randomUUID(),
    module,
    title,
    at: Date.now(),
  };
  const next = [item, ...read()].slice(0, LIMIT);
  try {
    localStorage.setItem(keyFor(currentUserId), JSON.stringify(next));
  } catch {
    // Saqlash imkoni bo'lmasa ham, joriy seans davomida ko'rsatamiz.
  }
  cache = next;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (currentUserId && e.key === keyFor(currentUserId)) {
      cacheKey = "";
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useActivity(): ActivityItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "hozirgina";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} kun oldin`;
  return formatShortDate(at);
}
