const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node createAdmin.js <uid>');
  process.exit(1);
}

(async () => {
  try {
    const ref = db.doc(`admins/${uid}`);
    await ref.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      note: 'created-via-script',
    });
    console.log(`Admin document created at /admins/${uid}`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to create admin document', e);
    process.exit(1);
  }
})();
