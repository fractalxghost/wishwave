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

let selectedAmount = "1.00"; // default payment amount

// Function to store wish directly (for free wishes)
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

// Function to animate the wish into the well and trigger payment flow if needed
function animateWish() {
  const wishInput = document.getElementById("wishInput");
  const amountInput = document.getElementById("amountInput");
  const wishText = wishInput.value.trim();
  let amountText = amountInput.value.trim().toLowerCase();

  if (!wishText || !amountText) return;

  // Determine if the wish is free or requires payment
  const isFree = (amountText === "free" || amountText === "0");

  // If not free, ensure the amount is a valid number and format it
  if (!isFree) {
    const numAmount = parseFloat(amountText);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid payment amount or type 'free'.");
      return;
    }
    selectedAmount = numAmount.toFixed(2);
  } else {
    selectedAmount = "0.00";
  }

  // Create an element for the wish animation
  const animWish = document.createElement("div");
  animWish.className = "anim-wish";
  animWish.textContent = wishText;
  document.body.appendChild(animWish);

  // Get start and end coordinates
  const inputRect = wishInput.getBoundingClientRect();
  const well = document.getElementById("well");
  const wellRect = well.getBoundingClientRect();

  // Set initial position of the animated wish element to match the input field
  animWish.style.position = "absolute";
  animWish.style.left = inputRect.left + "px";
  animWish.style.top = inputRect.top + "px";

  // Force reflow for transition to work
  void animWish.offsetWidth;

  // Animate: move wish to the center of the well and fade out
  animWish.style.transition = "all 1s ease-in-out";
  animWish.style.left = wellRect.left + (wellRect.width / 2 - animWish.offsetWidth / 2) + "px";
  animWish.style.top = wellRect.top + (wellRect.height / 2 - animWish.offsetHeight / 2) + "px";
  animWish.style.opacity = "0";

  // Add glow effect to well's water
  well.querySelector(".water").classList.add("glow");

  // Once animation is complete, remove the animated element and clear input fields
  setTimeout(() => {
    animWish.remove();
    wishInput.value = "";
    amountInput.value = "";

    // For visual effect, briefly add the wish into the well then remove it
    const tempWish = document.createElement("div");
    tempWish.className = "well-wish";
    tempWish.textContent = wishText;
    well.appendChild(tempWish);
    setTimeout(() => {
      tempWish.remove();
    }, 1500);

    if (isFree) {
      // Directly store the wish without payment
      storeWishDirectly(wishText, "free");
    } else {
      // Reveal the PayPal section for payment
      document.getElementById("paypalSection").style.display = "block";
    }
  }, 1100);
}

// Attach event listener to the custom button
document.getElementById("submitWishButton").addEventListener("click", animateWish);

// PayPal Button Integration (for paid wishes)
paypal.Buttons({
  // Create an order using the selected amount from the form
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
  // Handle payment approval
  onApprove: function(data, actions) {
    // For paid wishes, retrieve the wish from the well
    const well = document.getElementById("well");
    const wishes = well.getElementsByClassName("well-wish");
    const wish = wishes.length ? wishes[wishes.length - 1].textContent : "No wish";

    // Send payment and wish to serverless function
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

// Real-time Wish Stream: Display wishes from Firestore
db.collection("wishes")
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    const wishStream = document.getElementById("wishStream");
    wishStream.innerHTML = ""; // Clear existing wishes
    snapshot.forEach(doc => {
      const data = doc.data();
      const listItem = document.createElement("div");
      listItem.className = "list-group-item";
      listItem.textContent = data.wish + (data.amount && data.amount !== "free" ? " - $" + data.amount : " (free)");
      wishStream.appendChild(listItem);
    });
  }, error => {
    console.error("Firestore Error:", error);
  });
