import admin from "firebase-admin";

let messaging = null;

try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    messaging = admin.messaging();
    console.log("Firebase Admin initialized");
  } else {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT not set. Push notifications disabled."
    );
  }
} catch (error) {
  console.error("Firebase Admin init error:", error.message);
}

export const getMessaging = () => messaging;

export default admin;
