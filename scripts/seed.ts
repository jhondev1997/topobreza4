import "dotenv/config";

async function main() {
  // Imported after dotenv so the client sees DATABASE_URL.
  const { db } = await import("../src/db/client");
  const { seed } = await import("../src/db/seed");
  await seed(db);
  console.log("Seed aplicado.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
