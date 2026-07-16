document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.site-header');
  if (!header) return;

  // Criar placeholder logo após o header para preservar layout
  let placeholder = document.querySelector('.header-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'header-placeholder';
    header.parentNode.insertBefore(placeholder, header.nextSibling);
  }

  function updatePlaceholderHeight() {
    placeholder.style.height = header.offsetHeight + 'px';
  }

  // Inicializa
  updatePlaceholderHeight();
  window.addEventListener('resize', updatePlaceholderHeight);

  let lastY = window.scrollY || 0;
  let ticking = false;
  const HIDE_THRESHOLD = 10; // px

  function onScroll() {
    const currentY = window.scrollY || 0;

    if (!ticking) {
      window.requestAnimationFrame(function () {
        if (currentY - lastY > HIDE_THRESHOLD && currentY > header.offsetHeight) {
          // scrolldown -> esconder
          header.classList.add('site-header--hidden');
        } else if (lastY - currentY > 0) {
          // scrollup -> mostrar
          header.classList.remove('site-header--hidden');
        }
        lastY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
});
