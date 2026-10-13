"use client";

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useLayoutEffect, useRef } from "react";

import type { OnboardingLocale } from "./onboarding-questionnaire-copy";

gsap.registerPlugin(SplitText);

export function useOnboardingLanguageTransition(locale: OnboardingLocale) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  useLayoutEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const root = rootRef.current;
    if (
      !root ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-language-line]")
    ).filter((element) => element.textContent?.trim());

    if (targets.length === 0) return;

    const split = SplitText.create(targets, {
      aria: "auto",
      mask: "lines",
      type: "lines",
    });
    let reverted = false;

    const revert = () => {
      if (reverted) return;
      reverted = true;
      split.revert();
    };

    const animation = gsap.from(split.lines, {
      rotationX: -85,
      transformOrigin: "50% 50% -120px",
      opacity: 0,
      y: -18,
      duration: 0.58,
      ease: "power3.out",
      stagger: 0.035,
      onComplete: revert,
    });

    return () => {
      animation.kill();
      revert();
    };
  }, [locale]);

  return rootRef;
}
