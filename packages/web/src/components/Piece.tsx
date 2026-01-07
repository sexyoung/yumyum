import { PieceSize, PieceColor } from '@yumyum/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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
 * 使用 @dnd-kit 支援拖曳功能
 */
export default function Piece({ size, color, onClick, label, selected = false, draggable = false, dragData, dragId }: PieceProps) {
  // 如果有自訂 label 就顯示 label，否則顯示尺寸標記
  const displayText = label !== undefined
    ? String(label)
    : (size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L');

  // 使用 dnd-kit 的 useDraggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId || `piece-${color}-${size}`,
    data: dragData,
    disabled: !draggable,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${selected ? 'border-4 border-yellow-400 ring-2 ring-yellow-300' : 'border-2 border-gray-700'}
        cursor-pointer
        flex items-center justify-center
        transition-colors
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
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
