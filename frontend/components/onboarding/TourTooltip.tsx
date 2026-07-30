import React from 'react';
import { OnboardingStep } from '../../context/OnboardingContext';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';

interface TourTooltipProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}) => {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  if (step.isCenterModal || !targetRect) {
    return (
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-scaleIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step {stepIndex + 1} of {totalSteps}</span>
            </div>
            <button
              onClick={onSkip}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              Skip Tutorial
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {step.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
            {step.content}
          </p>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>

            <button
              onClick={onNext}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Position popover relative to targetRect (prefer bottom, fallback top/side)
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = targetRect.bottom + padding;
  let left = Math.max(16, Math.min(targetRect.left, viewportWidth - 340));

  // Flip to top if overflowing bottom viewport
  if (top + 200 > viewportHeight) {
    top = Math.max(16, targetRect.top - 200 - padding);
  }

  return (
    <div
      className="fixed z-[9995] w-[320px] sm:w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-fadeIn transition-all duration-200"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <button
          onClick={onSkip}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium transition-colors"
        >
          Skip Tutorial
        </button>
      </div>

      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
        {step.title}
      </h4>
      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-4">
        {step.content}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onSkip}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
        >
          Skip Tutorial
        </button>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onNext}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg text-xs shadow transition-all flex items-center gap-1.5"
          >
            <span>{isLast ? 'Finish' : 'Next'}</span>
            {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
