/***********************************
 * scripts.js
 * Client-Side Code for WishWave
 ***********************************/

// Firebase Configuration (use environment variable injection or replace placeholders)
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

// Function to animate the wish into the well and reveal the PayPal section
function animateWish() {
  const wishInput = document.getElementById("wishInput");
  const wishText = wishInput.value.trim();
  if (!wishText) return;

  // Create an element for the wish animation
  const animWish = document.createElement("div");
  animWish.className = "anim-wish";
  animWish.textContent = wishText;
  // Append it at the position of the input field (for animation start)
  document.body.appendChild(animWish);

  // Get start and end coordinates
  const inputRect = wishInput.getBoundingClientRect();
  const well = document.getElementById("well");
  const wellRect = well.getBoundingClientRect();

  // Set initial position of the animated wish element to match the input field
  animWish.style.position = "absolute";
  animWish.style.left = inputRect.left + "px";
  animWish.style.top = inputRect.top + "px";

  // Trigger reflow for animation to work
  void animWish.offsetWidth;

  // Animate: move wish to the center of the well
  animWish.style.transition = "all 1s ease-in-out";
  animWish.style.left = wellRect.left + wellRect.width / 2 - animWish.offsetWidth / 2 + "px";
  animWish.style.top = wellRect.top + wellRect.height / 2 - animWish.offsetHeight / 2 + "px";
  animWish.style.opacity = "0";

  // Add glow effect to well
  well.classList.add("glow");

  // Once animation is complete, remove the animated element, clear input, and show PayPal section
  setTimeout(() => {
    animWish.remove();
    wishInput.value = "";
    // Optionally, add the wish to the well permanently as a record
    const wishRecord = document.createElement("div");
    wishRecord.className = "well-wish";
    wishRecord.textContent = wishText;
    well.appendChild(wishRecord);

    // Reveal the PayPal section for payment
    document.getElementById("paypalSection").style.display = "block";
  }, 1100);
}

// Attach event listener to the custom button
document.getElementById("submitWishButton").addEventListener("click", animateWish);

// PayPal Button Integration (rendered after wish animation)
paypal.Buttons({
  // Create a $1 order
  createOrder: function(data, actions) {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: '1.00',
          currency_code: 'USD'
        }
      }]
    });
  },
  // Handle payment approval
  onApprove: function(data, actions) {
    // Instead of directly reading from input (already cleared), use the well's latest wish.
    const well = document.getElementById("well");
    // For simplicity, we take the last wish added
    const wishes = well.getElementsByClassName("well-wish");
    const wish = wishes.length ? wishes[wishes.length - 1].textContent : "No wish";

    // Send payment and wish to serverless function
    fetch("/api/capture-payment", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID, wish: wish }),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(res => {
      if (res.success) {
        alert('Thank you! Your wish has been added.');
      } else {
        alert('Error processing your wish. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    });
  },
  onError: function(err) {
    console.error('PayPal Error:', err);
    alert('Payment failed. Please try again.');
  }
}).render('#paypal-button-container');

// Real-time Wish Stream: Display wishes from Firestore
db.collection('wishes')
  .orderBy('timestamp', 'desc')
  .onSnapshot(snapshot => {
    const wishStream = document.getElementById('wishStream');
    wishStream.innerHTML = ''; // Clear existing wishes
    snapshot.forEach(doc => {
      const wish = doc.data().wish;
      const listItem = document.createElement('div');
      listItem.className = 'list-group-item';
      listItem.textContent = wish;
      wishStream.appendChild(listItem);
    });
  }, error => {
    console.error('Firestore Error:', error);
  });
