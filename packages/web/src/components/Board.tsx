import { useState, useCallback, useEffect } from 'react';
import { Cell as CellType, PieceColor } from '@yumyum/types';
import Cell from './Cell';
import { DragData } from './Piece';

interface BoardProps {
  board: CellType[][];
  onCellClick?: (row: number, col: number) => void;
  selectedCell?: { row: number; col: number } | null; // 選中的格子
  onDrop?: (row: number, col: number, data: DragData) => void; // 拖曳放置回調
  canDrag?: boolean; // 是否允許拖曳棋盤上的棋子
  currentPlayer?: PieceColor; // 當前玩家
  externalTouchDragData?: DragData | null; // 外部傳入的觸控拖曳資料（從儲備區來的）
  onTouchDragStart?: (data: DragData) => void; // 通知外部觸控拖曳開始
  onTouchDragEnd?: () => void; // 通知外部觸控拖曳結束
}

/**
 * Board 組件 - 3x3 棋盤
 * 功能優先：簡單的 grid 佈局，格子用邊框區分
 */
export default function Board({ board, onCellClick, selectedCell, onDrop, canDrag, currentPlayer, externalTouchDragData, onTouchDragStart, onTouchDragEnd }: BoardProps) {
  // 內部觸控拖曳狀態（從棋盤格子開始的拖曳）
  const [internalTouchDragData, setInternalTouchDragData] = useState<DragData | null>(null);

  // 合併內外部拖曳資料
  const touchDragData = externalTouchDragData || internalTouchDragData;

  const handleTouchDragStart = useCallback((data: DragData) => {
    setInternalTouchDragData(data);
    onTouchDragStart?.(data);
  }, [onTouchDragStart]);

  const handleTouchDrop = useCallback((row: number, col: number) => {
    if (touchDragData && onDrop) {
      onDrop(row, col, touchDragData);
    }
    setInternalTouchDragData(null);
    onTouchDragEnd?.();
  }, [touchDragData, onDrop, onTouchDragEnd]);

  // 監聽全域 touchend 來清除拖曳狀態
  // (當放置在非格子區域時)
  useEffect(() => {
    if (!touchDragData) return;

    const handleGlobalTouchEnd = () => {
      // 延遲清除，讓 Cell 的 touchend 先執行
      setTimeout(() => {
        setInternalTouchDragData(null);
        onTouchDragEnd?.();
      }, 100);
    };

    document.addEventListener('touchend', handleGlobalTouchEnd);
    return () => document.removeEventListener('touchend', handleGlobalTouchEnd);
  }, [touchDragData, onTouchDragEnd]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="grid grid-cols-3 gap-0 bg-gray-400">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                onClick={() => onCellClick?.(rowIndex, colIndex)}
                selected={isSelected}
                onDrop={onDrop ? (data) => onDrop(rowIndex, colIndex, data) : undefined}
                canDrag={canDrag}
                currentPlayer={currentPlayer}
                touchDragData={touchDragData}
                onTouchDragStart={handleTouchDragStart}
                onTouchDrop={handleTouchDrop}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
