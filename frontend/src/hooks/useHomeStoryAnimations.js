import { useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Hiệu ứng cuộn của trang chủ
export default function useHomeStoryAnimations(rootRef, refreshKey = '') {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.quick-word', { yPercent: 100, opacity: 0, duration: 0.85, stagger: 0.12, ease: 'power3.out' });
      gsap.from('.quick-hero-art', { y: 35, opacity: 0, duration: 1, delay: 0.25, ease: 'power3.out' });
      gsap.utils.toArray('.quick-reveal', root).forEach((element) => {
        gsap.from(element, { y: 26, opacity: 0, duration: 0.65, ease: 'power2.out', scrollTrigger: { id: 'quick-reveal', trigger: element, start: 'top 94%', once: true } });
      });
      return () => {};
    }, root);
    media.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ scrollTrigger: { id: 'quick-hero', trigger: '.quick-hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to('.quick-hero-art', { y: 100, rotation: 3, ease: 'none' }, 0)
        .to('.quick-hero-copy', { y: -35, ease: 'none' }, 0)
        .to('.quick-hero-orbit', { y: -90, rotation: -12, ease: 'none' }, 0);
      const panels = gsap.utils.toArray('.quick-process-panel', root);
      const steps = gsap.utils.toArray('.quick-process-step', root);
      gsap.set(panels.slice(1), { autoAlpha: 0, y: 28, scale: 0.96 });
      const transformation = gsap.timeline({ scrollTrigger: { id: 'quick-process', trigger: steps[0], start: 'top 55%', endTrigger: steps[steps.length - 1], end: 'top 55%', scrub: 0.35 } });
      transformation.to({}, { duration: steps.length - 1 }, 0);
      steps.forEach((step, index) => {
        if (!index) return;
        transformation.fromTo(panels[index - 1], { autoAlpha: 1, y: 0, scale: 1 }, { autoAlpha: 0, y: -22, scale: 0.96, duration: 0.35, immediateRender: false }, index - 0.65)
          .fromTo(panels[index], { autoAlpha: 0, y: 28, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, immediateRender: false }, index - 0.5);
      });
      gsap.to('.quick-process-progress i', { scaleY: 1, ease: 'none', scrollTrigger: { id: 'quick-progress', trigger: '.quick-process-steps', start: 'top 55%', end: 'bottom 70%', scrub: true } });
    }, root);
    let alive = true;
    const refresh = () => { if (alive) ScrollTrigger.refresh(); };
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    });
    observer.observe(root);
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('load', refresh); media.revert(); };
  }, [rootRef]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [refreshKey]);
}
