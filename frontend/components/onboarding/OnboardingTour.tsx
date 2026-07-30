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

      // Prevent scroll event default behavior as additional safeguard
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

  // Track target rect and auto-scroll to element
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

    const updateTargetRect = () => {
      if (!currentStep.target) return;
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());

        // Auto-scroll element into view once on step transition
        if (!hasScrolled) {
          hasScrolled = true;
          try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          } catch (e) {
            // Fallback if scrollIntoView options not supported in legacy environment
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
