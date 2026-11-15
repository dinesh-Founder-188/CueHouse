import React from 'react';
import { createRoot } from 'react-dom/client';
import XylophoneHelix from '../components/originkit/ui/xylophone-helix';

function mountHelix() {
  const container = document.getElementById('xylophone-helix-hero-bg');
  if (!container) return;

  // If already mounted and has children, do nothing
  if (container.dataset.mounted === 'true' && container.firstElementChild) return;
  container.dataset.mounted = 'true';

  try {
    const root = createRoot(container);
    root.render(
      <XylophoneHelix
        background="#090807"
        baseColor="#f1f5f9"
        shape="sphere"
        bars={46}
        speed={85}
        drag={100}
        scale={115}
        camera={{ tilt: 32, sideTilt: -6 }}
        metal={{ polish: 100, reflect: 100 }}
        hover={{
          glow: 60,
          tint: 60,
          colors: [
            "#FF0000",
            "#FF9900",
            "#FFEE00",
            "#33FF00",
            "#0099FF",
            "#9900FF"
          ],
          strength: 160
        }}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          pointerEvents: "auto"
        }}
      />
    );

    // Trigger resize after render to make sure canvas matches parent viewport
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
  } catch (err) {
    console.error('[XylophoneHelix] Mount failed:', err);
  }
}

// Mount on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountHelix);
} else {
  mountHelix();
}
window.addEventListener('load', mountHelix);

// Support client-side page transitions / PJAX (e.g., Taxi.js)
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    const container = document.getElementById('xylophone-helix-hero-bg');
    if (container && (!container.dataset.mounted || !container.firstElementChild)) {
      mountHelix();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
