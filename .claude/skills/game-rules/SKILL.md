---
name: game-rules
description: 說明 YumYum 遊戲規則和機制，包含棋盤設置、棋子移動、吃子機制和勝利條件。當實作遊戲邏輯、驗證移動或說明玩法時使用此 skill。
---

# YumYum 遊戲規則

## 使用說明

實作或討論遊戲機制時：

1. **棋盤設置**：使用 3x3 格子（類似井字遊戲）
2. **棋子**：每位玩家有 3 種尺寸（小、中、大）的棋子
3. **勝利條件**：連成三個同色棋子（橫、直、斜）
4. **特殊規則**：
   - 大棋子可以「吃掉」（覆蓋）小棋子
   - 棋盤上的棋子可以移動
   - 移開覆蓋的棋子時，被蓋住的棋子會重新顯示

## 核心遊戲機制

### 基本規則

- **棋盤**：3x3 格子（類似井字遊戲）
- **棋子**：每位玩家有 3 種尺寸的棋子（小、中、大）
- **目標**：連成三個同色棋子（橫、直、斜）

### 特殊機制

1. **吃子機制**：大棋子可以「吃掉」（覆蓋/堆疊）小棋子
2. **移動機制**：已經在棋盤上的棋子可以移動到其他位置
3. **揭露機制**：當覆蓋的棋子被移開時，被蓋住的棋子會重新顯示

### 策略深度

- 比井字遊戲複雜
- 需要記憶被蓋住的棋子
- 移動棋子可能揭露隱藏的連線

## 遊戲模式

### 單人模式（對戰 AI）

- **簡單 AI**：隨機移動 + 基本策略
- **中等 AI**：Minimax 算法（3 層深度）
- **困難 AI**：Alpha-Beta 剪枝（7 層深度）

### 雙人對戰

- **本地對戰**：同螢幕輪流
- **線上對戰**：透過 WebSocket 即時連線
- **好友房間**：可分享連結

### 多人功能

- 觀戰系統
- 錦標賽（淘汰賽）
- 排行榜

## 遊戲流程

1. **創建/加入房間**
2. **選擇遊戲模式**（本地/線上/AI）
3. **輪流下棋**
   - 從儲備區放置新棋子
   - 或移動棋盤上的棋子
4. **勝利條件**
   - 連成三個同色棋子
   - 對手無法移動

## 範例

**範例 1：驗證移動**
```typescript
// 檢查大棋子是否能覆蓋小棋子
function canCapture(topPiece: Piece, bottomPiece: Piece): boolean {
  const sizes = ['small', 'medium', 'large'];
  return sizes.indexOf(topPiece.size) > sizes.indexOf(bottomPiece.size);
}
```

**範例 2：檢查勝利條件**
```typescript
// 檢查是否連成三個（橫、直、斜）
function checkWinner(board: Board): Player | null {
  // 檢查所有行、列和對角線
  // 回傳在一線上有 3 個可見棋子的玩家
}
```

**範例 3：移動驗證**
```typescript
// 玩家可以：
// 1. 從儲備區放置新棋子
// 2. 移動棋盤上自己的棋子
function isValidMove(move: Move, player: Player): boolean {
  if (move.type === 'place') {
    return player.reserve.includes(move.piece);
  } else {
    return board[move.from].topPiece.owner === player;
  }
}
```

## 參考資料

原版遊戲：[Gobblet Gobblers by Blue Orange Games](https://www.blueorangegames.com/index.php/games/gobblet-gobblers)
