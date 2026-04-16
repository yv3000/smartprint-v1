import { prisma } from "./prisma";

export function generateShopId(): string {
  const chars = "abcdefghijkmnopqrstuvwxyz0123456789"; // Removed 'l' and '1' for clarity if needed, but requirements said alphanumeric mix.
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function ensureUniqueShopId(): Promise<string> {
  let shopId = generateShopId();
  let exists = await prisma.admin.findUnique({ where: { shopId: shopId } });
  
  while (exists) {
    shopId = generateShopId();
    exists = await prisma.admin.findUnique({ where: { shopId: shopId } });
  }
  
  return shopId;
}
