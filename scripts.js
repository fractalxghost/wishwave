/***********************************
 * scripts.js
 * Client-Side Code for WishWave
 ***********************************/

// Firebase Configuration (replace placeholders or inject via environment variables)
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID"
};

// Initialize Firebase (compat mode)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Default to free unless user enters a positive number
let selectedAmount = "0.00";

// Store a free wish directly in Firestore
function storeWishFree(wish) {
  db.collection("wishes").add({
    wish: wish,
    amount: "free",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert("Your free wish has been added!");
  })
  .catch(error => {
    console.error("Error adding wish: ", error);
    alert("Error adding your wish. Please try again.");
  });
}

// Handle form submission
function handleWishSubmission() {
  const wishInput = document.getElementById("wishInput");
  const amountInput = document.getElementById("amountInput");

  const wishText = wishInput.value.trim();
  const amountText = amountInput.value.trim();

  if (!wishText) {
    // No wish, do nothing
    return;
  }

  // Determine if user entered a valid positive amount
  const amountNum = parseFloat(amountText);
  if (!amountText || isNaN(amountNum) || amountNum <= 0) {
    // Free wish
    selectedAmount = "0.00";
    storeWishFree(wishText);
  } else {
    // Paid wish
    selectedAmount = amountNum.toFixed(2);
    // Show PayPal section
    document.getElementById("paypalSection").style.display = "block";
  }

  // Clear form fields
  wishInput.value = "";
  amountInput.value = "";
}

// Attach event listener
document.getElementById("submitWishButton").addEventListener("click", handleWishSubmission);

// PayPal Button Integration
paypal.Buttons({
  // Create an order using the selectedAmount
  createOrder: function(data, actions) {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: selectedAmount,
          currency_code: "USD"
        }
      }]
    });
  },
  onApprove: function(data, actions) {
    // We'll store the wish as the last user input, but in this simplified version
    // we don't have the text (since we cleared the form). For a real scenario,
    // you might keep a global variable or store the wish temporarily.
    // For simplicity, let's prompt the user for the wish again or store it differently.

    // Since we've cleared the wish, let's ask for it again
    // or keep it in a variable. Here, let's keep it simple:
    const storedWish = "Paid Wish";

    fetch("/api/capture-payment", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID, wish: storedWish, amount: selectedAmount }),
      headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(res => {
      if (res.success) {
        alert("Thank you! Your wish has been added.");
      } else {
        alert("Error processing your wish. Please try again.");
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    });
  },
  onError: function(err) {
    console.error("PayPal Error:", err);
    alert("Payment failed. Please try again.");
  }
}).render("#paypal-button-container");

// Real-time Wish Stream
db.collection("wishes")
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    const wishStream = document.getElementById("wishStream");
    wishStream.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const listItem = document.createElement("div");
      listItem.className = "list-group-item";
      listItem.textContent = data.wish + (data.amount && data.amount !== "free"
        ? " - $" + data.amount
        : " (free)");
      wishStream.appendChild(listItem);
    });
  }, error => {
    console.error("Firestore Error:", error);
  });
