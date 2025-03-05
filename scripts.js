// Animate the button on page load
gsap.from("#wishButton", { duration: 1, y: -50, opacity: 0, ease: "bounce" });

// Show content when the button is clicked
document.getElementById("wishButton").addEventListener("click", function() {
  const content = document.getElementById("wishContent");
  content.style.display = "block";
  gsap.fromTo("#wishContent", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });
});
