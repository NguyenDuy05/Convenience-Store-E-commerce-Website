import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

// Cuộn mượt cho trang chủ (thiết bị cảm ứng giữ cuộn gốc)
export default function useSmoothScroll(enabled = true) {
  const instance = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const sync = () => {
      dispose();
      if (!enabled || !media.matches) return;
      const lenis = new Lenis({ duration: 0.85, smoothWheel: true, syncTouch: false, anchors: false, prevent: (node) => node.closest?.('dialog, [data-lenis-prevent]') });
      instance.current = lenis;
      const update = () => ScrollTrigger.update();
      const tick = (seconds) => lenis.raf(seconds * 1000);
      lenis.on('scroll', update);
      gsap.ticker.add(tick);
      dispose = () => { gsap.ticker.remove(tick); lenis.off('scroll', update); lenis.destroy(); instance.current = null; dispose = () => {}; };
    };
    sync();
    media.addEventListener('change', sync);
    return () => { media.removeEventListener('change', sync); dispose(); };
  }, [enabled]);
  return instance;
}
