import { Cell as CellType } from '@yumyum/types';
import Cell from './Cell';

interface BoardProps {
  board: CellType[][];
  onCellClick?: (row: number, col: number) => void;
  selectedCell?: { row: number; col: number } | null; // 選中的格子
}

/**
 * Board 組件 - 3x3 棋盤
 * 功能優先：簡單的 grid 佈局，格子用邊框區分
 */
export default function Board({ board, onCellClick, selectedCell }: BoardProps) {
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
              />
            );
          })
        )}
      </div>
    </div>
  );
}
