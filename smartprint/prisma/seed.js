const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const demoEmail = "demo@smartprint.com";
  
  // Find or create User
  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "SmartPrint Demo Admin",
        email: demoEmail,
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=smartprint",
      },
    });
    console.log("Demo user created:", user.id);
  }

  // Find or create Admin profile
  let admin = await prisma.admin.findUnique({
    where: { userId: user.id },
  });

  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        userId: user.id,
        shopName: "SmartPrint Hub - Kandivali East",
        qrCode: "sp_kandivali_01",
        shopId: "SP0001",
        latitude: 19.19908,
        longitude: 72.86681,
        address: "Shop 12, Thakur Complex, Kandivali East, Mumbai, Maharashtra 400101",
        lastLoginAt: new Date(),
      },
    });
    console.log("Demo shop admin created successfully:", admin.shopName);
  } else {
    // Update coordinates and lastLoginAt so it stays online and nearby
    admin = await prisma.admin.update({
      where: { id: admin.id },
      data: {
        latitude: 19.19908,
        longitude: 72.86681,
        lastLoginAt: new Date(),
      },
    });
    console.log("Existing demo admin updated with current timestamp and location.");
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
