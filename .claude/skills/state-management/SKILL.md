---
name: state-management
description: YumYum 狀態管理模式。當處理遊戲狀態、WebSocket 連線、或 React 狀態邏輯時使用此 skill。
---

## 遊戲狀態結構

```typescript
// @yumyum/types - GameState
interface GameState {
  board: Cell[][];           // 3x3 棋盤
  currentPlayer: PieceColor; // 'red' | 'blue'
  redReserve: Piece[];       // 紅方儲備棋子
  blueReserve: Piece[];      // 藍方儲備棋子
  winner: PieceColor | null; // 勝者
  winningLine: Position[] | null; // 獲勝連線
}

interface Piece {
  id: string;
  color: PieceColor;
  size: PieceSize;  // 'small' | 'medium' | 'large'
}

interface Cell {
  pieces: Piece[];  // 可堆疊，最上層為 pieces[pieces.length-1]
}
```

## 頁面狀態管理

```tsx
// 遊戲頁面常用狀態
const [gameState, setGameState] = useState<GameState>(createInitialGameState());
const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
const [myColor, setMyColor] = useState<PieceColor>('red');

// 衍生狀態
const isMyTurn = gameState.currentPlayer === myColor;
const myReserve = myColor === 'red' ? gameState.redReserve : gameState.blueReserve;
```

## WebSocket 狀態（線上對戰）

```tsx
// useGameWebSocket hook
const {
  connect,
  disconnect,
  sendMessage,
  isConnected,
  isReconnecting,
  roomId,
} = useGameWebSocket({
  onGameStart: (state, color) => { setGameState(state); setMyColor(color); },
  onMoveMade: (state) => setGameState(state),
  onGameOver: (winner, state) => { setGameState(state); setShowResult(true); },
  onRematchStart: (state, color) => { setGameState(state); setMyColor(color); },
  onEmoji: (emoji, from) => { /* 顯示對手 emoji */ },
});
```

## 移動處理

```tsx
// 執行移動
const handleMove = (move: GameMove) => {
  if (!isMyTurn) return;

  // 本地模式：直接更新
  const newState = applyMove(gameState, move, myColor);
  setGameState(newState);

  // 線上模式：發送到伺服器
  sendMessage({ type: 'make_move', move });
};
```

## useRef 模式

```tsx
// 避免 callback 過時
const optionsRef = useRef(options);
useEffect(() => { optionsRef.current = options; }, [options]);

// Timeout 管理
const timeoutRef = useRef<NodeJS.Timeout | null>(null);
const clearTimer = () => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};
```

## React Query（API 請求）

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';

// 查詢
const { data, isLoading } = useQuery({
  queryKey: ['room', roomId],
  queryFn: () => api.getRoom(roomId),
});

// 變更
const mutation = useMutation({
  mutationFn: api.createRoom,
  onSuccess: (data) => navigate(`/game/${data.roomId}`),
});
```

## 狀態重置

```tsx
// 重新開始遊戲
const resetGame = () => {
  setGameState(createInitialGameState());
  setSelectedPiece(null);
  setShowResult(false);
};
```
