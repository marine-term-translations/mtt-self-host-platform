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

  useEffect(() => {
    if (!activeTour || !currentStep) {
      setTargetRect(null);
      return;
    }

    if (currentStep.isCenterModal) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      if (!currentStep.target) return;
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Initial query
    updateTargetRect();

    // Poll briefly to allow route animation / rendering to settle
    const interval = setInterval(updateTargetRect, 200);
    const timeout = setTimeout(() => clearInterval(interval), 2500);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [activeTour, currentStepIndex, currentStep]);

  if (!activeTour || !currentStep) {
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
