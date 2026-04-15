const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const demoEmail = "demo@smartprint.com";
  
  const existing = await prisma.admin.findUnique({
    where: { email: demoEmail }
  });

  if (existing) {
    console.log("Demo admin already exists.");
    return;
  }

  const admin = await prisma.admin.create({
    data: {
      email: demoEmail,
      name: "Demo Admin",
      shopName: "Sharma Digital Prints",
      qrCode: "demo-shop-123",
      latitude: 28.6139,
      longitude: 77.2090,
      address: "Connaught Place, New Delhi, India",
    },
  });

  console.log("Demo admin created successfully:");
  console.log(admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
