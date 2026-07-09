document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".count-up");
  const statsSection = document.querySelector(".stats-section");

  let hasCounted = false;

  function animateCounter(counter) {
    const target = Number(counter.dataset.target);
    const duration = 2200; // slower count speed, increase if you want even slower
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing effect
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easedProgress * target);

      counter.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(updateCounter);
  }

  function startCounting() {
    if (hasCounted) return;

    hasCounted = true;

    counters.forEach((counter) => {
      animateCounter(counter);
    });
  }

  if (statsSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          startCounting();
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(statsSection);
  }
});