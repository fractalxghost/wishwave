/********************************************
 * capture-payment.js
 * Serverless Function for Payment Capture
 ********************************************/

const fetch = require("node-fetch");
const admin = require("firebase-admin");

// Initialize Firebase Admin with environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_SERVICE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_SERVICE_CLIENT_EMAIL,
      // Make sure to handle newlines in private key
      privateKey: process.env.FIREBASE_SERVICE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_SERVICE_DB_URL, // e.g. https://<projectId>.firebaseio.com
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  try {
    // Vercel serverless functions pass in req, res
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const { orderID, wish } = req.body;

    // Capture the PayPal payment
    const captureResponse = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const captureData = await captureResponse.json();

    if (captureData.status === "COMPLETED") {
      // Store the wish in Firestore
      await db.collection("wishes").add({
        wish: wish,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Payment not completed" });
    }
  } catch (error) {
    console.error("Function Error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
