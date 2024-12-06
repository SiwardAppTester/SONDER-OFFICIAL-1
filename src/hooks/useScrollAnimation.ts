import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const useScrollAnimation = (direction: 'left' | 'right') => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Set initial state with larger offset
    gsap.set(element, {
      opacity: 0,
      x: direction === 'left' ? -200 : 200,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(element, {
              opacity: 1,
              x: 0,
              duration: 1.2,
              ease: "power2.out",
              clearProps: "all"
            });
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "50px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [direction]);

  return elementRef;
}; 