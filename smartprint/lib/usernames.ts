import prisma from "@/lib/prisma";

/**
 * Generate a sequential 4-digit user ID (0001–9999, cycles).
 * Uses a DB counter with an atomic transaction to ensure uniqueness.
 */
export async function getNextUserId(): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where: { id: "job_counter" },
      create: { id: "job_counter", value: 1 },
      update: { value: { increment: 1 } },
    });

    let val = counter.value;

    // Reset to 1 if exceeded 9999
    if (val > 9999) {
      await tx.counter.update({
        where: { id: "job_counter" },
        data: { value: 1 },
      });
      val = 1;
    }

    return val.toString().padStart(4, "0");
  });

  return result;
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

export const generateUserId = generateFriendlyId;
export default generateFriendlyId;
