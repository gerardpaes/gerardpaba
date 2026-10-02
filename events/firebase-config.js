// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// 1. Go to https://console.firebase.google.com/
// 2. Click "Add project" -> give it any name (e.g. "gerard-events") -> finish creation.
// 3. In the project, click the "</>" (Web) icon to register a web app.
// 4. Copy the config object Firebase shows you and paste the values below.
// 5. In the left menu go to "Build" -> "Firestore Database" -> "Create database".
//    - Start in "test mode" (fine for a small friends-only tool).
// That's it - no server, no billing required for this small usage.
// ============================================================

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
