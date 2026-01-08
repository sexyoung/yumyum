import { useRef, useEffect } from 'react';
import type { MoveRecord } from '@yumyum/types';

interface MoveHistoryProps {
  history: MoveRecord[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

/**
 * MoveHistory 組件 - 橫向圈圈顯示移動歷史
 */
export default function MoveHistory({
  history,
  currentStep,
  onStepChange,
}: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自動滾動到當前步驟
  useEffect(() => {
    if (scrollRef.current) {
      const item = scrollRef.current.querySelector(`[data-step="${currentStep}"]`);
      item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentStep]);

  // 如果沒有歷史記錄，不顯示
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 w-full max-w-md">
      {/* 橫向滾動的圈圈列表 - 固定高度避免跳動 */}
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto scrollbar-hide h-12"
      >
        {/* 第 0 步 - 開始 */}
        <button
          data-step="0"
          onClick={() => onStepChange(0)}
          className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
            currentStep === 0
              ? 'w-10 h-10 text-base bg-gray-200 border-gray-500'
              : currentStep > 0
                ? 'w-8 h-8 text-sm bg-gray-100 border-gray-300 hover:bg-gray-200 opacity-30'
                : 'w-8 h-8 text-sm bg-gray-100 border-gray-300 hover:bg-gray-200'
          }`}
        >
          0
        </button>

        {/* 每一步的圈圈（帶連接線） */}
        {history.map((record) => {
          const isCurrent = currentStep === record.step;
          const isFuture = record.step > currentStep;
          const isRed = record.player === 'red';

          return (
            <div key={record.step} className="flex items-center">
              {/* 連接線 - 未來步驟用點線 */}
              <div className={`w-3 ${
                isFuture
                  ? isRed ? 'h-0 border-t-2 border-dotted border-red-300' : 'h-0 border-t-2 border-dotted border-blue-300'
                  : isRed ? 'h-0.5 bg-red-300' : 'h-0.5 bg-blue-300'
              }`} />
              {/* 圈圈 */}
              <button
                data-step={record.step}
                onClick={() => onStepChange(record.step)}
                className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                  isCurrent
                    ? isRed
                      ? 'w-10 h-10 text-base bg-red-200 border-red-500'
                      : 'w-10 h-10 text-base bg-blue-200 border-blue-500'
                    : isFuture
                      ? isRed
                        ? 'w-8 h-8 text-sm bg-red-100 border-red-400 hover:bg-red-200 opacity-30'
                        : 'w-8 h-8 text-sm bg-blue-100 border-blue-400 hover:bg-blue-200 opacity-30'
                      : isRed
                        ? 'w-8 h-8 text-sm bg-red-100 border-red-400 hover:bg-red-200'
                        : 'w-8 h-8 text-sm bg-blue-100 border-blue-400 hover:bg-blue-200'
                }`}
              >
                {record.step}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
