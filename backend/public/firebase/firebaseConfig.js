// Firebase web configuration (modular SDK)
// Replace the placeholder values with your real Firebase project config
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD43MgACRNs0Sx1ByuZdTK-Xq3zRl5-xGw",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "sabanoor-4c3c2.web.app",
  projectId: "sabanoor-4c3c2",
  storageBucket: "sabanoor-4c3c2.firebasestorage.app",
  messagingSenderId: "163008883571",
  appId: "1:163008883571:web:6501ba13a19993e0a5f306",
  measurementId: "G-EXJ7WSMNMW"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app);

async function getReport(db) {
  const report = collection(db, 'report');
  const reportSnapshot = await getDocs(report);
  const reportList = reportSnapshot.docs.map(doc => doc.data());
  return reportList;
}

// Export the auth object and the getReport helper.
// Avoid top-level await so the module can be bundled by older toolchains.
export { auth, getReport }
