const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account credentials
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: 'YOUR_PROJECT_ID',
        clientEmail: 'YOUR_CLIENT_EMAIL',
        privateKey: 'YOUR_PRIVATE_KEY'.replace(/\\n/g, '\n') // Ensure proper formatting
    }),
    databaseURL: 'https://YOUR_PROJECT_ID.firebaseio.com'
});

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const { orderID, wish } = JSON.parse(event.body);

        // Capture the PayPal payment
        const captureResponse = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from('YOUR_PAYPAL_CLIENT_ID:YOUR_PAYPAL_CLIENT_SECRET').toString('base64')}`
            }
        });

        const captureData = await captureResponse.json();

        if (captureData.status === 'COMPLETED') {
            // Store the wish in Firestore
            await db.collection('wishes').add({
                wish: wish,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, error: 'Payment not completed' })
            };
        }
    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: 'Server error' })
        };
    }
};
