import { PieceSize, PieceColor } from '@yumyum/types';
import { useDraggable } from '@dnd-kit/core';

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
  dragId?: string; // 唯一拖曳 ID
}

const sizeClasses = {
  small: 'w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16',
  medium: 'w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20',
  large: 'w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
};

// 漸層 + 陰影樣式（3D 立體感）
const colorClasses = {
  red: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-lg shadow-red-500/40',
  blue: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg shadow-blue-500/40',
};

/**
 * Piece 組件 - 顯示一個棋子
 * 漸層背景 + 陰影效果，帶有 3D 立體感
 * 使用 @dnd-kit 支援拖曳功能
 */
export default function Piece({ size, color, onClick, label, selected = false, draggable = false, dragData, dragId }: PieceProps) {
  // 如果有自訂 label 就顯示 label，否則顯示尺寸標記
  const displayText = label !== undefined
    ? String(label)
    : (size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L');

  // 使用 dnd-kit 的 useDraggable
  // 不需要 transform，因為視覺移動由 DragOverlay 處理
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId || `piece-${color}-${size}`,
    data: dragData,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${selected ? 'border-4 border-yellow-400 ring-4 ring-yellow-300/50 shadow-xl shadow-yellow-400/40' : 'border-2 border-gray-700'}
        cursor-pointer
        flex items-center justify-center
        ${draggable ? 'cursor-grab active:cursor-grabbing' : 'transition-colors'}
        ${isDragging ? 'opacity-0' : ''}
        touch-none
      `}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      {/* 顯示自訂內容或尺寸標記 */}
      <span className="text-white text-3xl font-bold select-none">
        {displayText}
      </span>
    </div>
  );
}
