const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let storage = null;
let isFirebaseConnected = false;
let app = null;

let serviceAccount = null;
try {
  serviceAccount = require('../config/firebase_credentials');
} catch (_) {}

const keyPaths = [
  path.join(__dirname, '../../serviceAccountKey.json'),
  path.join(__dirname, '../config/serviceAccountKey.json'),
  path.join(__dirname, '../../firebase-key.json'),
];

let serviceAccountPath = keyPaths.find(p => fs.existsSync(p));
if (!serviceAccount && serviceAccountPath) {
  try {
    serviceAccount = require(serviceAccountPath);
  } catch (_) {}
}

if (serviceAccount) {
  try {
    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });
    db = getFirestore();
    auth = getAuth();
    storage = getStorage();
    isFirebaseConnected = true;
    console.log('🔥 Connected to Google Firebase Cloud Firestore successfully!');
    console.log(`📁 Project ID: ${serviceAccount.project_id}`);
  } catch (err) {
    console.error('⚠️ Failed to initialize Firebase:', err.message);
  }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    });
    db = getFirestore();
    auth = getAuth();
    storage = getStorage();
    isFirebaseConnected = true;
    console.log('🔥 Connected to Google Firebase via Environment Variables!');
  } catch (err) {
    console.error('⚠️ Failed to initialize Firebase via env:', err.message);
  }
} else {
  console.log('ℹ️ No serviceAccountKey.json found. Running in Hybrid Mode with SQLite fallback.');
  console.log('👉 To enable Firebase Cloud Firestore: Place serviceAccountKey.json into backend/ folder.');
}

module.exports = {
  app,
  db,
  auth,
  storage,
  isFirebaseConnected,
};
