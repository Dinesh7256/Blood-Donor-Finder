/**
 * DEVELOPMENT ONLY — Blood Donor Finder User Seeder
 *
 * Inserts controlled sample donor users for local/testing donor search.
 * Never runs automatically. Refuses to run when NODE_ENV=production.
 *
 * Idempotent: safe to run repeatedly; only upserts seed.*@dev.local users.
 *
 * Sample data matrix:
 * | User           | Blood Group | Distance | Available | Banned | Expected (radius 10 km)      |
 * |----------------|-------------|----------|-----------|--------|------------------------------|
 * | B- Nearby 1    | B-          | ~1 km    | true      | false  | Appears in B- search         |
 * | B- Nearby 2    | B-          | ~3 km    | true      | false  | Appears in B- search         |
 * | B+ Nearby      | B+          | ~3 km    | true      | false  | Appears in B+ search         |
 * | O+ Nearby      | O+          | ~5 km    | true      | false  | Appears in O+ search         |
 * | A+ Nearby      | A+          | ~5 km    | true      | false  | Appears in A+ search         |
 * | AB+ Nearby     | AB+         | ~5 km    | true      | false  | Appears in AB+ search        |
 * | B- Unavailable | B-          | ~2 km    | false     | false  | Does NOT appear              |
 * | B- Banned      | B-          | ~2 km    | true      | true   | Does NOT appear              |
 * | B- Far         | B-          | ~12 km   | true      | false  | Does NOT appear (outside 10) |
 * | O- Nearby      | O-          | ~2 km    | true      | false  | Appears only in O- search    |
 *
 * Firebase note: Donor search reads User documents only; seeded donors do not
 * need real Firebase accounts. Placeholder firebaseUid values are used.
 */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const SEED_EMAIL_SUFFIX = "@dev.local";
const SEED_EMAIL_PREFIX = "seed.";

const isSeedUserEmail = (email) =>
  typeof email === "string" &&
  email.startsWith(SEED_EMAIL_PREFIX) &&
  email.endsWith(SEED_EMAIL_SUFFIX);

/**
 * Deterministic offset from a centre point using great-circle distance.
 * @returns {{ latitude: number, longitude: number }}
 */
const offsetCoordinates = (latitude, longitude, distanceKm, bearingDegrees) => {
  const earthRadiusKm = 6371;
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  const angularDistance = distanceKm / earthRadiusKm;

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const destLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
    );

  return {
    latitude: (destLatRad * 180) / Math.PI,
    longitude: (((destLonRad * 180) / Math.PI + 540) % 360) - 180,
  };
};

const toGeoJsonLocation = (latitude, longitude) => ({
  type: "Point",
  coordinates: [longitude, latitude],
});

const buildSeedDefinitions = (centreLatitude, centreLongitude) => [
  {
    key: "bminus-nearby-1",
    label: "B- Nearby 1",
    email: "seed.bminus.01@dev.local",
    name: "Seed Donor B- Nearby 1",
    bloodGroup: "B-",
    distanceKm: 1,
    bearingDegrees: 0,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "bminus-nearby-2",
    label: "B- Nearby 2",
    email: "seed.bminus.02@dev.local",
    name: "Seed Donor B- Nearby 2",
    bloodGroup: "B-",
    distanceKm: 3,
    bearingDegrees: 90,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "bplus-nearby",
    label: "B+ Nearby",
    email: "seed.bplus.01@dev.local",
    name: "Seed Donor B+ Nearby",
    bloodGroup: "B+",
    distanceKm: 3,
    bearingDegrees: 180,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "oplus-nearby",
    label: "O+ Nearby",
    email: "seed.oplus.01@dev.local",
    name: "Seed Donor O+ Nearby",
    bloodGroup: "O+",
    distanceKm: 5,
    bearingDegrees: 45,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "aplus-nearby",
    label: "A+ Nearby",
    email: "seed.aplus.01@dev.local",
    name: "Seed Donor A+ Nearby",
    bloodGroup: "A+",
    distanceKm: 5,
    bearingDegrees: 135,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "abplus-nearby",
    label: "AB+ Nearby",
    email: "seed.abplus.01@dev.local",
    name: "Seed Donor AB+ Nearby",
    bloodGroup: "AB+",
    distanceKm: 5,
    bearingDegrees: 225,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "bminus-unavailable",
    label: "B- Unavailable",
    email: "seed.bminus.unavailable@dev.local",
    name: "Seed Donor B- Unavailable",
    bloodGroup: "B-",
    distanceKm: 2,
    bearingDegrees: 270,
    isAvailable: false,
    isBanned: false,
  },
  {
    key: "bminus-banned",
    label: "B- Banned",
    email: "seed.bminus.banned@dev.local",
    name: "Seed Donor B- Banned",
    bloodGroup: "B-",
    distanceKm: 2,
    bearingDegrees: 315,
    isAvailable: true,
    isBanned: true,
  },
  {
    key: "bminus-far",
    label: "B- Far",
    email: "seed.bminus.far@dev.local",
    name: "Seed Donor B- Far",
    bloodGroup: "B-",
    distanceKm: 12,
    bearingDegrees: 0,
    isAvailable: true,
    isBanned: false,
  },
  {
    key: "ominus-nearby",
    label: "O- Nearby",
    email: "seed.ominus.01@dev.local",
    name: "Seed Donor O- Nearby",
    bloodGroup: "O-",
    distanceKm: 2,
    bearingDegrees: 120,
    isAvailable: true,
    isBanned: false,
  },
].map((definition, index) => {
  const coords = offsetCoordinates(
    centreLatitude,
    centreLongitude,
    definition.distanceKm,
    definition.bearingDegrees
  );

  return {
    ...definition,
    firebaseUid: `dev-seed-${definition.key}`,
    phone: `+910000${String(index + 1).padStart(5, "0")}`,
    location: toGeoJsonLocation(coords.latitude, coords.longitude),
    role: "user",
  };
});

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { reset: false };

  for (const arg of args) {
    if (arg === "--reset") {
      options.reset = true;
      continue;
    }

    if (arg.startsWith("--lat=")) {
      options.latitude = Number(arg.split("=")[1]);
      continue;
    }

    if (arg.startsWith("--lon=")) {
      options.longitude = Number(arg.split("=")[1]);
    }
  }

  return options;
};

const resolveCentre = (cliOptions) => {
  const latitude = cliOptions.latitude ?? Number(process.env.SEED_LATITUDE);
  const longitude = cliOptions.longitude ?? Number(process.env.SEED_LONGITUDE);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(
      "Seed centre coordinates are required. Set SEED_LATITUDE and SEED_LONGITUDE in .env or pass --lat=<value> --lon=<value>."
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Seed centre coordinates are out of valid range.");
  }

  return { latitude, longitude };
};

const assertDevelopmentEnvironment = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("User seeder cannot run in production.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. Set it in Backend/.env before running the seeder.");
  }
};

const deleteSeedUsers = async () => {
  const result = await User.deleteMany({
    email: { $regex: /^seed\..+@dev\.local$/ },
  });

  return result.deletedCount;
};

const upsertSeedUsers = async (seedUsers) => {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seedUser of seedUsers) {
    if (!isSeedUserEmail(seedUser.email)) {
      skipped += 1;
      continue;
    }

    const existing = await User.findOne({ email: seedUser.email }).select("_id email");

    if (existing && !isSeedUserEmail(existing.email)) {
      skipped += 1;
      continue;
    }

    await User.findOneAndUpdate(
      { email: seedUser.email },
      {
        $set: {
          firebaseUid: seedUser.firebaseUid,
          name: seedUser.name,
          email: seedUser.email,
          phone: seedUser.phone,
          bloodGroup: seedUser.bloodGroup,
          location: seedUser.location,
          isAvailable: seedUser.isAvailable,
          isBanned: seedUser.isBanned,
          role: seedUser.role,
        },
        $setOnInsert: {
          fcmTokens: [],
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated, skipped };
};

const printSummary = ({ centre, created, updated, skipped, deleted, resetMode, seedUsers }) => {
  console.log("====================================");
  console.log("Blood Donor Finder - User Seeder");
  console.log("====================================");
  console.log("");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Centre: ${centre.latitude}, ${centre.longitude}`);

  if (resetMode) {
    console.log(`Deleted seed users: ${deleted}`);
  }

  console.log("");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("");
  console.log("Seed users:");

  for (const seedUser of seedUsers) {
    console.log(
      `- ${seedUser.label} — ~${seedUser.distanceKm} km (${seedUser.bloodGroup}, available=${seedUser.isAvailable}, banned=${seedUser.isBanned})`
    );
  }

  console.log("");
  console.log("DEVELOPMENT ONLY — seed.*@dev.local users were upserted.");
  console.log("Real registered users were not modified.");
};

const run = async () => {
  assertDevelopmentEnvironment();

  const cliOptions = parseArgs();
  const centre = resolveCentre(cliOptions);
  const seedUsers = buildSeedDefinitions(centre.latitude, centre.longitude);

  await connectDB();

  let deleted = 0;

  if (cliOptions.reset) {
    deleted = await deleteSeedUsers();
  }

  const { created, updated, skipped } = await upsertSeedUsers(seedUsers);

  printSummary({
    centre,
    created,
    updated,
    skipped,
    deleted,
    resetMode: cliOptions.reset,
    seedUsers,
  });

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("User seeder failed:", error.message);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  process.exit(1);
});
