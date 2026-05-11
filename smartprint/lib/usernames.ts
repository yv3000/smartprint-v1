import prisma from "@/lib/prisma";

/**
 * Generate a sequential 4-digit user ID (0001–9999, cycles).
 * Uses a DB counter with an atomic transaction to ensure uniqueness.
 */
export async function getNextUserId(): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const todayKey = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const THIRTY_MIN_SEC = 30 * 60;

  const assignedValue = await prisma.$transaction(async (tx) => {
    const [valueCounter, lastIssuedAtCounter, dayCounter] = await Promise.all([
      tx.counter.upsert({
        where: { id: "job_counter_value" },
        create: { id: "job_counter_value", value: 0 },
        update: {},
      }),
      tx.counter.upsert({
        where: { id: "job_counter_last_issued_at" },
        create: { id: "job_counter_last_issued_at", value: 0 },
        update: {},
      }),
      tx.counter.upsert({
        where: { id: "job_counter_day_key" },
        create: { id: "job_counter_day_key", value: todayKey },
        update: {},
      }),
    ]);

    const isDayReset = dayCounter.value !== todayKey;
    // Keep this value in Unix seconds to stay safely within Prisma Int range.
    const lastIssuedAtSec =
      lastIssuedAtCounter.value > 10_000_000_000
        ? Math.floor(lastIssuedAtCounter.value / 1000) // migrate old ms values if any
        : lastIssuedAtCounter.value;

    const isInactivityReset =
      lastIssuedAtSec > 0 && nowSec - lastIssuedAtSec >= THIRTY_MIN_SEC;

    const currentValue = isDayReset || isInactivityReset ? 0 : valueCounter.value;
    const assigned = currentValue;
    const nextValue = (assigned + 1) % 10000;

    await Promise.all([
      tx.counter.update({
        where: { id: "job_counter_value" },
        data: { value: nextValue },
      }),
      tx.counter.update({
        where: { id: "job_counter_last_issued_at" },
        data: { value: nowSec },
      }),
      tx.counter.update({
        where: { id: "job_counter_day_key" },
        data: { value: todayKey },
      }),
    ]);

    return assigned;
  });

  return assignedValue.toString().padStart(4, "0");
}

// Legacy aliases for backward compatibility
const adjectives = [
  "Blue", "Swift", "Calm", "Bright", "Cool", "Sharp", "Bold", "Clear", "Quick", "Fresh",
  "Warm", "Soft", "Smart", "Pure", "Neat", "Kind", "Wise", "Safe", "True", "Fine"
];

const nouns = [
  "Fox", "Owl", "Wave", "Star", "Leaf", "Bird", "Tree", "Rain", "Wind", "Cloud",
  "Stone", "Fire", "Lake", "Hill", "Moon", "Sun", "Sea", "Bay", "Peak", "Glen"
];

export function generateFriendlyId(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${suffix}`;
}

export const generateUserId = getNextUserId;
export default getNextUserId;
