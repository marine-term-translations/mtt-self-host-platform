import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import { TourBackdrop } from './TourBackdrop';
import { TourTooltip } from './TourTooltip';

export const OnboardingTour: React.FC = () => {
  const {
    activeTour,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Lock user scroll during active tour
  useEffect(() => {
    if (activeTour && currentStep) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const preventDefaultScroll = (e: Event) => {
        e.preventDefault();
      };

      window.addEventListener('wheel', preventDefaultScroll, { passive: false });
      window.addEventListener('touchmove', preventDefaultScroll, { passive: false });

      return () => {
        document.body.style.overflow = originalOverflow || '';
        window.removeEventListener('wheel', preventDefaultScroll);
        window.removeEventListener('touchmove', preventDefaultScroll);
      };
    }
  }, [activeTour, currentStep]);

  // Track target rect, elevate zIndex for interaction, and auto-scroll to element
  useEffect(() => {
    if (!activeTour || !currentStep) {
      setTargetRect(null);
      return;
    }

    if (currentStep.isCenterModal) {
      setTargetRect(null);
      return;
    }

    let hasScrolled = false;
    let elevatedElement: HTMLElement | null = null;
    let originalPosition = '';
    let originalZIndex = '';
    let originalPointerEvents = '';

    const updateTargetRect = () => {
      if (!currentStep.target) return;
      const element = document.querySelector(currentStep.target) as HTMLElement | null;
      if (element) {
        setTargetRect(element.getBoundingClientRect());

        // Elevate z-index and pointer-events so user can interact with the element
        if (elevatedElement !== element) {
          if (elevatedElement) {
            elevatedElement.style.position = originalPosition;
            elevatedElement.style.zIndex = originalZIndex;
            elevatedElement.style.pointerEvents = originalPointerEvents;
          }
          elevatedElement = element;
          originalPosition = element.style.position;
          originalZIndex = element.style.zIndex;
          originalPointerEvents = element.style.pointerEvents;

          const computedPosition = window.getComputedStyle(element).position;
          if (computedPosition === 'static') {
            element.style.position = 'relative';
          }
          element.style.zIndex = '9992';
          element.style.pointerEvents = 'auto';
        }

        // Auto-scroll element into view once on step transition
        if (!hasScrolled) {
          hasScrolled = true;
          try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          } catch (e) {
            element.scrollIntoView();
          }
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    // Poll to handle dynamic component loading (e.g. flow workspace or API loading)
    const interval = setInterval(updateTargetRect, 250);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    window.addEventListener('resize', updateTargetRect);

    return () => {
      if (elevatedElement) {
        elevatedElement.style.position = originalPosition;
        elevatedElement.style.zIndex = originalZIndex;
        elevatedElement.style.pointerEvents = originalPointerEvents;
      }
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [activeTour, currentStepIndex, currentStep]);

  if (!activeTour || !currentStep) {
    return null;
  }

  // If step requires non-center element and element hasn't loaded yet, wait until element appears
  if (!currentStep.isCenterModal && !targetRect) {
    return null;
  }

  return (
    <>
      <TourBackdrop
        targetRect={targetRect}
        isCenterModal={currentStep.isCenterModal}
        onDismiss={skipTour}
      />
      <TourTooltip
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </>
  );
};
