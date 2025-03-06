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

let selectedAmount = "0.00"; // default to free

// Store wish directly (for free wishes)
function storeWishDirectly(wish, amount) {
  db.collection('wishes').add({
    wish: wish,
    amount: amount,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert('Your free wish has been added!');
  })
  .catch((error) => {
    console.error("Error adding wish: ", error);
    alert('Error adding your wish. Please try again.');
  });
}

// Animate the wish into the well and then decide if payment is needed
function animateWish() {
  const wishInput = document.getElementById("wishInput");
  const amountInput = document.getElementById("amountInput");
  const wishText = wishInput.value.trim();
  const amountText = amountInput.value.trim();

  // If no wish text, do nothing
  if (!wishText) return;

  // If amount is empty, zero, or not a valid positive number => free
  let numAmount = parseFloat(amountText);
  if (!amountText || isNaN(numAmount) || numAmount <= 0) {
    selectedAmount = "0.00";
  } else {
    // Valid positive number => set as the PayPal amount
    selectedAmount = numAmount.toFixed(2);
  }

  // Create an element for the wish animation
  const animWish = document.createElement("div");
  animWish.className = "anim-wish";
  animWish.textContent = wishText;
  document.body.appendChild(animWish);

  // Animate from input to well
  const inputRect = wishInput.getBoundingClientRect();
  const well = document.getElementById("well");
  const wellRect = well.getBoundingClientRect();

  // Position the animated wish element initially at the input
  animWish.style.position = "absolute";
  animWish.style.left = inputRect.left + "px";
  animWish.style.top = inputRect.top + "px";

  // Trigger reflow for transition
  void animWish.offsetWidth;

  // Move to center of the well and fade out
  animWish.style.transition = "all 1s ease-in-out";
  animWish.style.left = wellRect.left + (wellRect.width / 2 - animWish.offsetWidth / 2) + "px";
  animWish.style.top = wellRect.top + (wellRect.height / 2 - animWish.offsetHeight / 2) + "px";
  animWish.style.opacity = "0";

  // Water glow animation
  well.querySelector(".water").classList.add("glow");

  // Cleanup after animation
  setTimeout(() => {
    animWish.remove();
    wishInput.value = "";
    amountInput.value = "";

    // Briefly show the wish inside the well
    const tempWish = document.createElement("div");
    tempWish.className = "well-wish";
    tempWish.textContent = wishText;
    well.appendChild(tempWish);
    setTimeout(() => {
      tempWish.remove();
    }, 1500);

    // If free => store directly, else show PayPal
    if (selectedAmount === "0.00") {
      storeWishDirectly(wishText, "free");
    } else {
      document.getElementById("paypalSection").style.display = "block";
    }
  }, 1100);
}

// Button event
document.getElementById("submitWishButton").addEventListener("click", animateWish);

// PayPal Button Integration
paypal.Buttons({
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
    // Retrieve the last wish from the well
    const well = document.getElementById("well");
    const wishes = well.getElementsByClassName("well-wish");
    const wish = wishes.length ? wishes[wishes.length - 1].textContent : "No wish";

    // Send payment + wish to serverless function
    fetch("/api/capture-payment", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID, wish: wish, amount: selectedAmount }),
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
    wishStream.innerHTML = ""; // Clear existing
    snapshot.forEach(doc => {
      const data = doc.data();
      const listItem = document.createElement("div");
      listItem.className = "list-group-item";
      listItem.textContent =
        data.wish + (data.amount && data.amount !== "free" ? " - $" + data.amount : " (free)");
      wishStream.appendChild(listItem);
    });
  }, error => {
    console.error("Firestore Error:", error);
  });
