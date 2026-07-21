const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const images = document.querySelectorAll(".zoom-image");
const closeBtn = document.querySelector(".close-modal");

images.forEach((img) => {
  img.addEventListener("click", () => {
    modal.classList.add("active");
    modalImage.src = img.src;
  });
});

closeBtn.addEventListener("click", () => {
  modal.classList.remove("active");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("active");
  }
});

const slides = document.querySelector(".slides");
const total = document.querySelectorAll(".slide").length;

let atual = 0;

setInterval(() => {
  atual++;

  if (atual >= total) {
    atual = 0;
  }

  slides.style.transform = `translateX(-${atual * 100}%)`;
}, 3000);
