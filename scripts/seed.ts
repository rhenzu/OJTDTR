import mongoose from "mongoose";
import { hash } from "bcryptjs";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.promises.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

// Load env
import { config } from "dotenv";
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true, lowercase: true },
  passwordHash: String, internshipSite: String,
  requiredTotalHours: { type: Number, default: 486 },
  startDate: String,
}, { timestamps: true });

async function seed() {
  await mongoose.connect(MONGODB_URI, { family: 4 });
  console.log("✅ Connected to MongoDB");

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const users = [
    { name: "Juan dela Cruz", email: "juan@test.com", password: "password123", internshipSite: "Acme Corporation", requiredTotalHours: 486, startDate: "2025-01-06" },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) { console.log(`⚠️  ${u.email} already exists`); continue; }
    const passwordHash = await hash(u.password, 12);
    await User.create({ ...u, passwordHash });
    console.log(`✅ Created: ${u.email} / ${u.password}`);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

seed().catch((e) => { console.error(e); process.exit(1); });
