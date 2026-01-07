import { PieceColor, PieceSize } from '@yumyum/types';
import Piece, { DragData } from './Piece';

interface PlayerReserveProps {
  color: PieceColor;
  reserves: {
    small: number;
    medium: number;
    large: number;
  };
  onPieceClick?: (size: PieceSize) => void;
  selectedSize?: PieceSize | null; // 選中的棋子尺寸
  canDrag?: boolean; // 是否允許拖曳棋子
}

/**
 * PlayerReserve 組件 - 玩家的棋子儲備區
 * 顯示剩餘棋子數量（數字直接顯示在棋子內）
 * 手機版：水平排列節省空間
 * 桌機版：垂直排列更清楚
 */
export default function PlayerReserve({ color, reserves, onPieceClick, selectedSize, canDrag = false }: PlayerReserveProps) {
  const sizes: PieceSize[] = ['small', 'medium', 'large'];

  return (
    <div className="flex flex-row md:flex-col gap-3 md:gap-4">
      {sizes.map((size) => {
        const isSelected = selectedSize === size;
        const hasPieces = reserves[size] > 0;
        const isDraggable = canDrag && hasPieces;
        const dragData: DragData | undefined = isDraggable ? {
          type: 'reserve',
          color,
          size,
        } : undefined;
        return (
          <button
            key={size}
            onClick={() => onPieceClick?.(size)}
            disabled={!hasPieces}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid={`reserve-${color}-${size}`}
          >
            {/* 棋子，數量直接顯示在圓圈內 */}
            <Piece
              size={size}
              color={color}
              label={reserves[size]}
              selected={isSelected}
              draggable={isDraggable}
              dragId={`reserve-${color}-${size}`}
              dragData={dragData}
            />
          </button>
        );
      })}
    </div>
  );
}
