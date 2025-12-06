// Firebase web configuration (modular SDK)
// Replace the placeholder values with your real Firebase project config
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD43MgACRNs0Sx1ByuZdTK-Xq3zRl5-xGw",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "sabanoor-4c3c2.web.app",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://sabanoor-4c3c2-default-rtdb.asia-southeast1.firebasedatabase.app/", // เพิ่ม URL ของ Realtime Database
  projectId: "sabanoor-4c3c2",
  storageBucket: "sabanoor-4c3c2.firebasestorage.app",
  messagingSenderId: "163008883571",
  appId: "1:163008883571:web:6501ba13a19993e0a5f306",
  measurementId: "G-EXJ7WSMNMW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

// Example function to add news to Realtime Database
async function addNewsRealtime(newsId, title, url, thumbnail) {
  const newsRef = ref(database, `news/${newsId}`);
  await set(newsRef, {
    title: title,
    url: url,
    thumbnail: thumbnail,
  });
  console.log('News added to Realtime Database successfully!');
}

// Example function to get news from Realtime Database
async function getNewsRealtime(newsId) {
  const newsRef = ref(database, `news/${newsId}`);
  const snapshot = await get(newsRef);
  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    console.log('No data available in Realtime Database');
    return null;
  }
}

// Example function to get news from Firestore
async function getNewsFirestore() {
  const report = collection(db, 'news');
  const reportSnapshot = await getDocs(report);
  const reportList = reportSnapshot.docs.map(doc => doc.data());
  return reportList;
}

export { auth, db, database, ref, onValue, set, get, addNewsRealtime, getNewsRealtime, getNewsFirestore };

