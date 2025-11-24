const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
let key = null;
try {
  key = require(keyPath);
} catch (e) {
  console.error('Missing serviceAccountKey.json in backend folder. Place the key at backend/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

async function main() {
  try {
    console.log('Service account client_email:', key.client_email || '<missing>');
    console.log('Service account project_id:', key.project_id || '<missing>');

    // List top-level collections (separate try/catch so we know which call fails)
    try {
      const collections = await db.listCollections();
      console.log('Top-level collections found:', collections.map(c => c.id));
    } catch (errCollections) {
      console.error('listCollections() failed:', errCollections);
    }

    // Try to read from 'report'
    try {
      const snap = await db.collection('report').limit(10).get();
      if (snap.empty) {
        console.log("Collection 'report' exists but has no documents (or query returned empty).");
      } else {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Sample report docs:', docs);
      }
    } catch (errRead) {
      console.error("Reading from 'report' failed:", errRead);
    }
  } catch (err) {
    console.error('Firestore read failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
