const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");

const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const hasFirebaseConfig = requiredEnvVars.every((key) => Boolean(process.env[key]));
const firebaseApps =
  typeof admin.getApps === "function"
    ? admin.getApps()
    : Array.isArray(admin.apps)
      ? admin.apps
      : [];

if (hasFirebaseConfig && firebaseApps.length === 0) {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.cert(serviceAccount),
  });
}

admin.auth = () => getAuth();
admin.messaging = () => getMessaging();

module.exports = admin;
