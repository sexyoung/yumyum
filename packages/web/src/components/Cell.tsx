import { Cell as CellType, PieceColor, PieceSize } from '@yumyum/types';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import Piece, { DragData } from './Piece';

// 棋子大小的數值對照，用於比較大小
const sizeValue: Record<PieceSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

interface CellProps {
  cell: CellType;
  row: number;
  col: number;
  onClick?: () => void;
  selected?: boolean; // 格子上的棋子是否被選中
  canDrag?: boolean; // 是否允許拖曳此格上的棋子
  currentPlayer?: PieceColor; // 當前玩家，用於判斷是否可拖曳
}

/**
 * Cell 組件 - 棋盤上的一個格子
 * 可以堆疊多個棋子，顯示最上層的棋子
 * 功能優先：簡單邊框區分格子，最小 44x44px（手機友善）
 * 使用 @dnd-kit 支援拖曳放置功能
 */
export default function Cell({ cell, row, col, onClick, selected = false, canDrag = false, currentPlayer }: CellProps) {
  // 取得最上層的棋子（如果有）
  const topPiece = cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : null;

  // 判斷這個格子上的棋子是否可以拖曳（必須是當前玩家的棋子）
  const pieceCanDrag = !!(canDrag && topPiece && topPiece.color === currentPlayer);

  // 使用 dnd-kit 的 useDroppable
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
  });

  // 獲取當前拖曳的棋子資訊
  const { active } = useDndContext();
  const dragData = active?.data.current as DragData | undefined;

  // 判斷是否可以放置：空格可放，或拖曳的棋子比對手的最上層棋子大（不能蓋自己的棋子）
  const canPlace = !topPiece || (
    dragData &&
    topPiece.color !== dragData.color &&
    sizeValue[dragData.size] > sizeValue[topPiece.size]
  );

  // 決定背景顏色
  const getBgClass = () => {
    if (!isOver) {
      return selected ? 'bg-yellow-100' : 'bg-gray-100';
    }
    return canPlace ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400';
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
        border-2 border-gray-400
        ${getBgClass()}
        flex items-center justify-center
        cursor-pointer
        hover:bg-gray-200
        transition-colors
        relative
      `}
      onClick={onClick}
      data-testid={`cell-${row}-${col}`}
    >
      {topPiece && (
        <Piece
          size={topPiece.size}
          color={topPiece.color}
          selected={selected}
          draggable={pieceCanDrag}
          dragId={`board-${row}-${col}`}
          dragData={pieceCanDrag ? {
            type: 'board',
            color: topPiece.color,
            size: topPiece.size,
            fromRow: row,
            fromCol: col,
          } : undefined}
        />
      )}
    </div>
  );
}
