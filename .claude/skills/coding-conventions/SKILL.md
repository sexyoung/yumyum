---
name: coding-conventions
description: YumYum 程式碼規範與風格。當撰寫新程式碼或審查現有程式碼時使用此 skill。
---

## 專案結構

```
yumyum/
├── packages/web/          # React 前端 (Vite)
├── services/game-service/ # Hono.js 後端
└── shared/types/          # 共用 TypeScript 型別
```

## TypeScript 規範

```typescript
// 使用 interface 定義物件型別
interface GameState { ... }

// 使用 type 定義聯合型別
type PieceColor = 'red' | 'blue';
type PieceSize = 'small' | 'medium' | 'large';

// 從 @yumyum/types 匯入共用型別
import type { GameState, Piece, PieceColor } from '@yumyum/types';
```

## React 元件規範

```tsx
// 函數式元件 + TypeScript
interface Props {
  piece: Piece;
  onClick?: () => void;
}

export function Piece({ piece, onClick }: Props) {
  return <div onClick={onClick}>...</div>;
}

// 預設匯出頁面，命名匯出元件
export default function LocalGame() { ... }  // 頁面
export function Board({ ... }: Props) { ... } // 元件
```

## 命名規範

```typescript
// 元件：PascalCase
Board, Cell, Piece, PlayerReserve

// Hook：camelCase + use 前綴
useGameWebSocket, useGameState

// 函數：camelCase + 動詞開頭
handleMove, validateMove, applyMove

// 常數：UPPER_SNAKE_CASE
const MAX_RECONNECT_ATTEMPTS = 5;

// CSS 類別：Tailwind utilities
"flex items-center gap-4"
```

## 檔案命名

```
元件: PascalCase.tsx    → Board.tsx, PlayerReserve.tsx
Hook: camelCase.ts      → useGameWebSocket.ts
頁面: PascalCase.tsx    → LocalGame.tsx, OnlineGame.tsx
型別: camelCase.ts      → game.ts, index.ts
```

## 註解語言

```typescript
// 使用繁體中文註解
// 儲存房間內的 WebSocket 連線
const gameRooms = new Map<string, Map<PieceColor, WebSocket>>();

// 處理客戶端訊息
ws.on('message', async (data) => { ... });
```

## ESLint 規則

- 使用 `const` 優先於 `let`
- 避免 `any` 型別
- React hooks 依賴陣列完整
- 未使用的變數會報錯

## Import 順序

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. 外部套件
import { useDraggable } from '@dnd-kit/core';

// 3. 內部模組
import type { Piece } from '@yumyum/types';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { Board } from '../components/Board';
```
