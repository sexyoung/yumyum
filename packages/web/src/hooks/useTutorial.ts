import { useEffect, useRef, useCallback } from 'react';
import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

export interface TutorialStep {
  id: string;
  target?: string;
  title: string;
  text: string;
  onShow?: () => void;
}

interface UseTutorialOptions {
  steps: TutorialStep[];
  onComplete?: () => void;
  onCancel?: () => void;
}

export function useTutorial({ steps, onComplete, onCancel }: UseTutorialOptions) {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.start();
    }
  }, []);

  const cancelTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.cancel();
    }
  }, []);

  useEffect(() => {
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shadow-xl rounded-lg',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true,
        },
      },
    });

    steps.forEach((step, index) => {
      tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: step.target
          ? { element: step.target, on: 'bottom' }
          : undefined,
        buttons: [
          ...(index > 0
            ? [
                {
                  text: '上一步',
                  action: tour.back,
                  classes: 'shepherd-button-secondary',
                },
              ]
            : []),
          {
            text: index === steps.length - 1 ? '完成' : '下一步',
            action: tour.next,
            classes: 'shepherd-button-primary',
          },
        ],
        when: {
          show: () => {
            step.onShow?.();
          },
        },
      });
    });

    tour.on('complete', () => {
      onComplete?.();
    });

    tour.on('cancel', () => {
      onCancel?.();
    });

    tourRef.current = tour;

    return () => {
      // 清理時不觸發 complete callback，直接隱藏 tour
      if (tour.isActive()) {
        tour.hide();
      }
    };
  }, [steps, onComplete, onCancel]);

  return { startTour, cancelTour };
}
