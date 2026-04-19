import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use the exact databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

// Connectivity Test (as per Firebase skill)
async function testConnection() {
  try {
    // Testing a dummy path to verify connectivity
    await getDocFromServer(doc(db, "_system_", "ping"));
    console.log("Firebase Connected Successfully");
  } catch (error: any) {
    if (error?.message?.includes("client is offline")) {
      console.error("Please check your Firebase configuration: Client is offline.");
    } else {
      console.warn("Firebase Initialized (Note: Test ping may fail if rules are strict)", error.message);
    }
  }
}

testConnection();

export default app;
