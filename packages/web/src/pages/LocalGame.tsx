import { useState } from 'react';
import { GameState } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';

// 初始遊戲狀態：空棋盤，每個玩家各有 2 個小/中/大棋子
const initialGameState: GameState = {
  board: [
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
  ],
  reserves: {
    red: { small: 2, medium: 2, large: 2 },
    blue: { small: 2, medium: 2, large: 2 },
  },
  currentPlayer: 'red',
  winner: null,
};

export default function LocalGame() {
  const [gameState, _setGameState] = useState<GameState>(initialGameState);

  const handleCellClick = (row: number, col: number) => {
    console.log(`點擊格子: ${row}, ${col}`);
    // Step 3 會實作點擊邏輯
  };

  const handlePieceClick = (color: 'red' | 'blue', size: 'small' | 'medium' | 'large') => {
    console.log(`選擇棋子: ${color} ${size}`);
    // Step 3 會實作選擇邏輯
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* 標題 - 不使用 fixed，改用 flex-none */}
      <div className="flex-none p-2 md:p-4 bg-white shadow">
        <h1 className="text-lg md:text-2xl font-bold text-center">本機雙人遊戲</h1>
        <p className="text-center text-sm md:text-base text-gray-600 mt-0.5 md:mt-1">
          當前回合：
          <span className={`font-bold ${gameState.currentPlayer === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
            {gameState.currentPlayer === 'red' ? '紅方' : '藍方'}
          </span>
        </p>
      </div>

      {/* 遊戲區域 - 使用 flex-1 佔滿剩餘空間 */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-between md:justify-center overflow-hidden">
        {/* 手機佈局：垂直排列，紅方頂部、藍方底部 */}
        {/* 桌機佈局：水平排列 */}

        {/* 紅方儲備區（手機：頂部，桌機：左側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color="red"
            reserves={gameState.reserves.red}
            onPieceClick={(size) => handlePieceClick('red', size)}
          />
        </div>

        {/* 棋盤（手機：中間填滿，桌機：中間） */}
        <div className="flex-1 flex items-center justify-center md:flex-none">
          <Board
            board={gameState.board}
            onCellClick={handleCellClick}
          />
        </div>

        {/* 藍方儲備區（手機：底部，桌機：右側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color="blue"
            reserves={gameState.reserves.blue}
            onPieceClick={(size) => handlePieceClick('blue', size)}
          />
        </div>
      </div>

      {/* 除錯資訊（開發時使用） - 手機版縮小並半透明 */}
      <div className="hidden md:block fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded max-w-xs">
        <p>棋盤: {gameState.board.flat().filter(cell => cell.pieces.length > 0).length} 個棋子</p>
        <p>紅方剩餘: {Object.values(gameState.reserves.red).reduce((a, b) => a + b, 0)} 個</p>
        <p>藍方剩餘: {Object.values(gameState.reserves.blue).reduce((a, b) => a + b, 0)} 個</p>
      </div>
    </div>
  );
}
