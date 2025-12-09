document.addEventListener("DOMContentLoaded", () => {
  // Config
  const CARD_SPREAD = 105;

  // initial Setup (ตรวจสอบ element ก่อนใช้)
  const track = document.querySelector(".carousel-track");
  const slides = Array.from(document.querySelectorAll(".carousel-slide"));
  const dotsContainer = document.querySelector(".carousel-dot");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (!track || slides.length === 0 || !dotsContainer) {
    console.warn("Carousel: missing required elements (track/slides/dotsContainer). Check selectors.");
    return;
  }

  // State
  let currentIndex = 0;
  const totalSlides = slides.length;
  let autoSlideInterval = null;

  // 1. สร้าง Dots อัตโนมัติตามจำนวนรูป
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (i === 0) dot.classList.add("active");
    dot.dataset.index = i;
    dot.addEventListener("click", () => {
      updateCarousel(i);
      resetAutoSlide();
    });
    dotsContainer.appendChild(dot);
  });
  const dots = Array.from(document.querySelectorAll(".dot"));

  // 2. ฟังก์ชันหลักในการจัดตำแหน่ง
  function updateCarousel(newIndex) {
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;

    currentIndex = newIndex;

    slides.forEach((slide, i) => {
      let diff = i - currentIndex;

      if (diff > totalSlides / 2) diff -= totalSlides;
      if (diff < -totalSlides / 2) diff += totalSlides;

      const zIndex = 10 - Math.abs(diff);
      slide.style.zIndex = zIndex;

      const translateX = diff * CARD_SPREAD;
      // ใช้ translateX(...) และ scale(...) รวมกันถูกต้อง
      slide.style.transform = `translateX(${translateX}%) scale(${diff === 0 ? 1.1 : 0.9})`;

      if (diff === 0) slide.classList.add("active");
      else slide.classList.remove("active");

      // ปรับ opacity ให้แสดงเฉพาะรูปใกล้เคียง (คุณจะเปลี่ยนได้ตามต้องการ)
      slide.style.opacity = Math.abs(diff) > 1 ? "0" : "";
    });

    dots.forEach((d) => d.classList.remove("active"));
    if (dots[currentIndex]) dots[currentIndex].classList.add("active");
  }

  // 3. ปุ่มและการคลิกบนสไลด์
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      updateCarousel(currentIndex + 1);
      resetAutoSlide();
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      updateCarousel(currentIndex - 1);
      resetAutoSlide();
    });
  }

  slides.forEach((slide, i) => {
    slide.addEventListener("click", () => {
      if (currentIndex !== i) {
        updateCarousel(i);
        resetAutoSlide();
      }
    });
  });

  // Auto slide (ปลอดภัยต่อการเรียกซ้ำ)
  function startAutoSlide() {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
    autoSlideInterval = setInterval(() => {
      updateCarousel(currentIndex + 1);
    }, 5000);
  }

  function stopAutoSlide() {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
  }

  function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  // mouseenter/leave เฉพาะเมื่อ track มีจริง
  if (track) {
    track.addEventListener("mouseenter", stopAutoSlide);
    track.addEventListener("mouseleave", startAutoSlide);
  }

  // Page visibility: หยุดเมื่อแท็บไม่ active
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoSlide();
    else startAutoSlide();
  });

  // เริ่มต้นอย่างปลอดภัย (เราอยู่ใน DOMContentLoaded แล้ว)
  updateCarousel(0);
  startAutoSlide();
});
