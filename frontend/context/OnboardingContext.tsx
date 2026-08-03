import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { backendApi } from '../services/api';
import { useAuth } from './AuthContext';

export interface OnboardingStep {
  id: string;
  target: string; // CSS selector / data attribute, e.g. '[data-tour="search-input"]'
  title: string;
  content: string;
  route?: string;
  isCenterModal?: boolean;
}

export type TourType = 'full' | 'main' | 'settings' | 'search' | 'term_detail' | 'flow';

export interface OnboardingContextType {
  activeTour: TourType | null;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  totalSteps: number;
  hasSeenOnboarding: boolean;
  startTour: (tourType?: TourType) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => Promise<void>;
  completeTour: () => Promise<void>;
  goToStep: (index: number) => void;
}

const DEFAULT_TERM_URI_ENCODED = 'http%3A%2F%2Fvocab.nerc.ac.uk%2Fcollection%2FP02%2Fcurrent%2FFREP%2F';

const FULL_TOUR_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="welcome"]',
    title: 'Welcome to MTT!',
    content: "Let's take a quick guided tour of MTT: setting up your languages & API key, searching terms, contributing translations, and reviewing translations in the flow.",
    isCenterModal: true
  },
  {
    id: 'settings-languages',
    route: '/settings',
    target: '[data-tour="settings-languages"]',
    title: 'Language Preferences',
    content: 'Start by selecting your native language and target translation languages. Please select your preferred language(s) before proceeding to customize your workspace.'
  },
  {
    id: 'settings-api-key',
    route: '/settings',
    target: '[data-tour="settings-api-key"]',
    title: 'OpenRouter API Key',
    content: 'Enter your OpenRouter API key here to unlock AI-assisted translation suggestions.'
  },
  {
    id: 'search-input',
    route: '/browse',
    target: '[data-tour="search-input"]',
    title: 'Search Terminology',
    content: 'Type any marine or scientific term here to search exact matches, synonyms, and context notes across languages.'
  },
  {
    id: 'add-translation-btn',
    route: `/term/${DEFAULT_TERM_URI_ENCODED}`,
    target: '[data-tour="add-translation-btn"]',
    title: 'Contribute Translations',
    content: 'View detailed definition context here and submit your own translations with references for community review.'
  },
  {
    id: 'flow-actions',
    route: '/flow',
    target: '[data-tour="flow-actions"]',
    title: 'Translation & Approval Flow',
    content: 'Use this rapid flow workspace to quickly translate missing terms or vote to approve community contributions.'
  },
  {
    id: 'settings-help',
    route: '/settings',
    target: '[data-tour="settings-help"]',
    title: 'Tour Complete!',
    content: "That's it! You can replay this full tour or specific micro-tours anytime from the Help & Onboarding section in your Settings."
  }
];

const MICRO_TOURS: Record<Exclude<TourType, 'full' | 'main'>, OnboardingStep[]> = {
  settings: [
    FULL_TOUR_STEPS[1], // settings-languages
    FULL_TOUR_STEPS[2]  // settings-api-key
  ],
  search: [
    FULL_TOUR_STEPS[3]  // search-input
  ],
  term_detail: [
    FULL_TOUR_STEPS[4]  // add-translation-btn
  ],
  flow: [
    FULL_TOUR_STEPS[5]  // flow-actions
  ]
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTour, setActiveTour] = useState<TourType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Sync hasSeenOnboarding from user state
  useEffect(() => {
    if (user?.languagePreferences?.hasSeenOnboarding !== undefined) {
      setHasSeenOnboarding(!!user.languagePreferences.hasSeenOnboarding);
    }
  }, [user]);

  // Auto-trigger full tour on first login if user has not seen onboarding
  useEffect(() => {
    if (isAuthenticated && user && user.languagePreferences?.hasSeenOnboarding === false && !activeTour) {
      setActiveTour('full');
      setCurrentStepIndex(0);
    }
  }, [isAuthenticated, user]);

  const activeSteps: OnboardingStep[] = React.useMemo(() => {
    if (!activeTour) return [];
    if (activeTour === 'full' || activeTour === 'main') return FULL_TOUR_STEPS;
    return MICRO_TOURS[activeTour] || FULL_TOUR_STEPS;
  }, [activeTour]);

  const currentStep = activeSteps[currentStepIndex] || null;

  // Get user target language for flow route
  const getUserTargetLanguage = () => {
    const userLangs = user?.languagePreferences?.translationLanguages || user?.languagePreferences?.preferredLanguages || [];
    return userLangs[0] || 'nl';
  };

  // Route navigation helper handling dynamic real term page fetching (/term/:id) and flow language param
  const navigateToStepRoute = async (step: OnboardingStep) => {
    if (step.id === 'add-translation-btn') {
      try {
        const res = await backendApi.getTerms(1);
        if (res && res.terms && res.terms.length > 0) {
          const firstTerm = res.terms[0];
          const termUriOrId = firstTerm.uri || String(firstTerm.id);
          const encodedPath = `/term/${encodeURIComponent(termUriOrId)}`;
          navigate(encodedPath);
          return;
        }
      } catch (e) {
        console.warn('[Onboarding] Failed to fetch term for tour, falling back to default term:', e);
      }
      navigate(`/term/${DEFAULT_TERM_URI_ENCODED}`);
      return;
    }

    if (step.id === 'flow-actions') {
      const lang = getUserTargetLanguage();
      const flowPath = `/flow?language=${lang}`;
      navigate(flowPath);
      return;
    }

    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  };

  // Navigate when current step changes
  useEffect(() => {
    if (activeTour && currentStep) {
      if (currentStep.id === 'add-translation-btn' && !location.pathname.startsWith('/term/')) {
        navigateToStepRoute(currentStep);
      } else if (currentStep.id === 'flow-actions' && (!location.pathname.startsWith('/flow') || !location.search.includes('language='))) {
        navigateToStepRoute(currentStep);
      } else if (currentStep.route && location.pathname !== currentStep.route) {
        navigateToStepRoute(currentStep);
      }
    }
  }, [activeTour, currentStepIndex, currentStep, location.pathname]);

  const startTour = async (tourType: TourType = 'full') => {
    setActiveTour(tourType);
    setCurrentStepIndex(0);
    const steps = (tourType === 'full' || tourType === 'main') ? FULL_TOUR_STEPS : MICRO_TOURS[tourType as keyof typeof MICRO_TOURS];
    if (steps && steps[0]) {
      await navigateToStepRoute(steps[0]);
    }
  };

  const markTourCompletedInBackend = async () => {
    setHasSeenOnboarding(true);
    try {
      await backendApi.updateUserPreferences({ hasSeenOnboarding: true });
    } catch (e) {
      console.error('[Onboarding] Failed to persist tour completion:', e);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTour = async () => {
    setActiveTour(null);
    setCurrentStepIndex(0);
    await markTourCompletedInBackend();
  };

  const completeTour = async () => {
    setActiveTour(null);
    setCurrentStepIndex(0);
    await markTourCompletedInBackend();
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < activeSteps.length) {
      setCurrentStepIndex(index);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        activeTour,
        currentStepIndex,
        currentStep,
        totalSteps: activeSteps.length,
        hasSeenOnboarding,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        goToStep
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an AuthProvider');
  }
  return context;
};
