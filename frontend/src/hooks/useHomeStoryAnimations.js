import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function useHomeStoryAnimations(rootRef, refreshKey = '') {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add({
        desktop: '(min-width: 900px)',
        motion: '(prefers-reduced-motion: no-preference)',
      }, (conditions) => {
        if (!conditions.conditions.motion) return undefined;
        const desktop = conditions.conditions.desktop;

        gsap.fromTo('.story-word', { yPercent: 115, rotateX: -35, opacity: 0 }, {
          yPercent: 0, rotateX: 0, opacity: 1, duration: 1.05, stagger: 0.09, ease: 'power3.out', delay: 0.14,
        });
        gsap.fromTo('.story-hero-visual', { clipPath: 'inset(18% 14% round 30px)', opacity: 0 }, {
          clipPath: 'inset(0% 0% round 30px)', opacity: 1, duration: 1.2, ease: 'power3.out', delay: 0.2,
        });
        gsap.fromTo('.story-hero-support', { y: 22, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.75, stagger: 0.12, ease: 'power3.out', delay: 0.55,
        });
        gsap.to('.story-float', { y: -12, rotate: 2, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.25 });

        gsap.timeline({
          scrollTrigger: { trigger: '.story-hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
        }).to('.story-hero-visual', { scale: 1.28, y: 120, rotate: 7, ease: 'none' }, 0)
          .to('.story-hero-copy', { y: -90, opacity: 0.18, ease: 'none' }, 0)
          .to('.story-hero-orb', { scale: 1.7, opacity: 0.35, ease: 'none' }, 0);

        const transformation = gsap.timeline({
          scrollTrigger: {
            trigger: '.story-transform', start: 'top top', end: desktop ? '+=220%' : '+=125%', scrub: 1,
            pin: desktop, anticipatePin: 1, invalidateOnRefresh: true,
          },
        });
        transformation.to('.story-transform-object', { scale: 1.28, rotate: 18, x: desktop ? 180 : 0, y: -15, ease: 'none' }, 0)
          .to('.story-transform-backdrop', { backgroundColor: '#dfe9ff', ease: 'none' }, 0)
          .fromTo('.story-line-one', { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22 }, 0.06)
          .to('.story-line-one', { y: -26, opacity: 0, duration: 0.18 }, 0.32)
          .fromTo('.story-line-two', { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22 }, 0.38)
          .to('.story-line-two', { y: -26, opacity: 0, duration: 0.18 }, 0.65)
          .fromTo('.story-line-three', { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22 }, 0.72)
          .to('.story-transform-glow', { scale: 1.6, opacity: 0.7, ease: 'none' }, 0.1);

        gsap.fromTo('.aisle-heading > *', { y: 28, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: '.aisle-store', start: 'top 72%', once: true },
        });
        gsap.fromTo('.aisle-category-navigation, .aisle-status-line', { y: 18, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.65, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: '.aisle-store', start: 'top 64%', once: true },
        });

        if (desktop) {
          const track = root.querySelector('.story-horizontal-track');
          if (track) {
            const horizontalTween = gsap.to(track, {
              x: () => -(track.scrollWidth - window.innerWidth), ease: 'none',
              scrollTrigger: {
                trigger: '.story-horizontal', start: 'top top', end: () => `+=${track.scrollWidth - window.innerWidth}`,
                pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
              },
            });
            gsap.utils.toArray('.story-panel-copy').forEach((copy) => {
              gsap.fromTo(copy, { y: 35, opacity: 0.35 }, {
                y: 0, opacity: 1, duration: 0.35,
                scrollTrigger: { trigger: copy.closest('.story-panel'), containerAnimation: horizontalTween, start: 'left 65%', end: 'left 25%', scrub: true },
              });
            });
          }
        } else {
          gsap.fromTo('.story-panel', { y: 38, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: '.story-horizontal', start: 'top 75%', once: true },
          });
        }

        gsap.fromTo('.story-feature', { y: 42, opacity: 0, clipPath: 'inset(8% 0 0 0 round 20px)' }, {
          y: 0, opacity: 1, clipPath: 'inset(0% 0 0 0 round 20px)', duration: 0.85, stagger: 0.16, ease: 'power3.out',
          scrollTrigger: { trigger: '.story-features', start: 'top 72%', once: true },
        });
        gsap.to('.story-feature-parallax', {
          yPercent: -15, ease: 'none',
          scrollTrigger: { trigger: '.story-features', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        });

        gsap.timeline({
          scrollTrigger: { trigger: '.story-cinema', start: 'top bottom', end: 'bottom bottom', scrub: 0.9 },
        }).fromTo('.story-cinema-disc', { scale: 0.16, borderRadius: '50%' }, { scale: 1.7, borderRadius: '38%', ease: 'none' }, 0)
          .fromTo('.story-cinema-title', { y: 70, opacity: 0.25 }, { y: 0, opacity: 1, ease: 'none' }, 0.25)
          .to('.story-cinema-disc', { rotate: -14, ease: 'none' }, 0);

        gsap.fromTo('.story-cta-content > *', { y: 34, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: '.story-cta', start: 'top 68%', once: true },
        });
        gsap.fromTo('.story-footer-reveal', { y: 24, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: '.hp-footer', start: 'top 88%', once: true },
        });

        return () => {};
      });

      return () => media.revert();
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh, { once: true });
    document.fonts?.ready?.then(refresh);
    return () => {
      window.removeEventListener('load', refresh);
      context.revert();
    };
  }, [rootRef]);

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [refreshKey]);
}
