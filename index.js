const functions = require('firebase-functions');
const app = require('./src/index');

exports.api = functions.https.onRequest(app);
