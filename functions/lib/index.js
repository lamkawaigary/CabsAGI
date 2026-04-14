"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = void 0;
const functions = require("firebase-functions/v2");
exports.helloWorld = functions.https.onRequest((req, res) => {
    res.json({ message: 'Hello from Firebase V2!' });
});
//# sourceMappingURL=index.js.map