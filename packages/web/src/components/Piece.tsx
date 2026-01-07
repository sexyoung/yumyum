import { useRef } from 'react';
import { PieceSize, PieceColor } from '@yumyum/types';

// 拖曳資料類型
export interface DragData {
  type: 'reserve' | 'board';
  color: PieceColor;
  size: PieceSize;
  fromRow?: number;
  fromCol?: number;
}

interface PieceProps {
  size: PieceSize;
  color: PieceColor;
  onClick?: () => void;
  label?: string | number; // 自訂顯示內容
  selected?: boolean; // 是否被選中
  draggable?: boolean;
  dragData?: DragData;
  onTouchDragStart?: (data: DragData) => void; // 觸控拖曳開始
}

const sizeClasses = {
  small: 'w-12 h-12 md:w-12 md:h-12',
  medium: 'w-16 h-16 md:w-16 md:h-16',
  large: 'w-20 h-20 md:w-24 md:h-24',
};

const colorClasses = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

/**
 * Piece 組件 - 顯示一個棋子
 * 功能優先：簡單圓形，純色背景，不做陰影和漸層
 * 支援拖曳功能（桌面版用 drag API，手機版用 touch 事件）
 */
export default function Piece({ size, color, onClick, label, selected = false, draggable = false, dragData, onTouchDragStart }: PieceProps) {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  // 如果有自訂 label 就顯示 label，否則顯示尺寸標記
  const displayText = label !== undefined
    ? String(label)
    : (size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L');

  const handleDragStart = (e: React.DragEvent) => {
    if (dragData) {
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // 觸控開始 - 記錄起始位置
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!draggable || !dragData) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;
  };

  // 觸控移動 - 判斷是否開始拖曳
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggable || !dragData || !touchStartPos.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    // 移動超過 10px 視為拖曳
    if (deltaX > 10 || deltaY > 10) {
      if (!hasMoved.current) {
        hasMoved.current = true;
        // 通知開始拖曳
        onTouchDragStart?.(dragData);
      }
      // 阻止頁面滾動
      e.preventDefault();
    }
  };

  // 觸控結束
  const handleTouchEnd = () => {
    touchStartPos.current = null;
    hasMoved.current = false;
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${selected ? 'border-4 border-yellow-400 ring-2 ring-yellow-300' : 'border-2 border-gray-700'}
        cursor-pointer
        flex items-center justify-center
        transition-all
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
        touch-none
      `}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顯示自訂內容或尺寸標記 */}
      <span className="text-white text-3xl font-bold select-none">
        {displayText}
      </span>
    </div>
  );
}
