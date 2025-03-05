/***********************************
 * scripts.js
 * Client-Side Code for WishWave
 ***********************************/

// Read environment variables from a global config object or injected placeholders
// For example, we might set them up using a build tool that replaces these placeholders
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",         // <--- placeholders
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID",
};

// Initialize Firebase (compat mode)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// PayPal Button Integration
paypal
  .Buttons({
    // Create a $1 order
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [
          {
            amount: {
              value: "1.00",
              currency_code: "USD",
            },
          },
        ],
      });
    },
    // Handle payment approval
    onApprove: function (data, actions) {
      const wish = document.getElementById("wishInput").value;

      // Send payment + wish to serverless function
      fetch("/api/capture-payment", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderID, wish: wish }),
        headers: { "Content-Type": "application/json" },
      })
        .then((response) => response.json())
        .then((res) => {
          if (res.success) {
            alert("Thank you! Your wish has been added.");
            document.getElementById("wishForm").reset();
          } else {
            alert("Error processing your wish. Please try again.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred. Please try again.");
        });
    },
    onError: function (err) {
      console.error("PayPal Error:", err);
      alert("Payment failed. Please try again.");
    },
  })
  .render("#paypal-button-container");

// Real-time Wish Stream
db.collection("wishes")
  .orderBy("timestamp", "desc")
  .onSnapshot(
    (snapshot) => {
      const wishStream = document.getElementById("wishStream");
      wishStream.innerHTML = ""; // Clear existing wishes
      snapshot.forEach((doc) => {
        const wish = doc.data().wish;
        const listItem = document.createElement("div");
        listItem.className = "list-group-item";
        listItem.textContent = wish;
        wishStream.appendChild(listItem);
      });
    },
    (error) => {
      console.error("Firestore Error:", error);
    }
  );
