// packages/web/src/hooks/useGameWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameClientMessage, GameServerMessage, PieceColor, GameState } from '@yumyum/types';
import { getWsUrl } from '../lib/env';

export interface UseGameWebSocketOptions {
  onRoomJoined?: (roomId: string, color: PieceColor) => void;
  onWaitingForOpponent?: () => void;
  onOpponentJoined?: (opponentName: string) => void;
  onGameStart?: (gameState: GameState, yourColor: PieceColor) => void;
  onMoveMade?: (gameState: GameState) => void;
  onGameOver?: (winner: PieceColor | 'draw', gameState: GameState) => void;
  onOpponentLeft?: () => void;
  onError?: (message: string) => void;
  onReconnecting?: (attempt: number) => void;
}

export function useGameWebSocket(options: UseGameWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // 儲存重連相關的 ref
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = useRef(5);
  const shouldReconnectRef = useRef(true);

  // 儲存 options 的 ref，避免每次 render 都重新訂閱
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // 清除重連計時器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 連線到房間
  const connect = useCallback((targetRoomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    // 清除之前的連線
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setRoomId(targetRoomId);

    const wsUrl = `${getWsUrl()}/game/${targetRoomId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to room:', targetRoomId);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      clearReconnectTimer();
    };

    ws.onmessage = (event) => {
      try {
        const message: GameServerMessage = JSON.parse(event.data);
        console.log('Received:', message);

        switch (message.type) {
          case 'room_joined':
            optionsRef.current.onRoomJoined?.(message.roomId, message.color);
            break;
          case 'waiting_for_opponent':
            optionsRef.current.onWaitingForOpponent?.();
            break;
          case 'opponent_joined':
            optionsRef.current.onOpponentJoined?.(message.opponentName);
            break;
          case 'game_start':
            optionsRef.current.onGameStart?.(message.gameState, message.yourColor);
            break;
          case 'move_made':
            optionsRef.current.onMoveMade?.(message.gameState);
            break;
          case 'game_over':
            optionsRef.current.onGameOver?.(message.winner, message.gameState);
            break;
          case 'opponent_left':
            optionsRef.current.onOpponentLeft?.();
            break;
          case 'error':
            optionsRef.current.onError?.(message.message);
            break;
          case 'invalid_move':
            optionsRef.current.onError?.(message.reason);
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // 如果需要重連且未超過最大次數
      if (shouldReconnectRef.current && reconnectAttempt < maxReconnectAttempts.current) {
        attemptReconnect();
      } else if (reconnectAttempt >= maxReconnectAttempts.current) {
        console.error('Max reconnect attempts reached');
        optionsRef.current.onError?.('連線失敗，請重新整理頁面');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [clearReconnectTimer]);

  // 嘗試重連
  const attemptReconnect = useCallback(() => {
    if (!roomId || !shouldReconnectRef.current) return;

    const nextAttempt = reconnectAttempt + 1;
    setReconnectAttempt(nextAttempt);
    setIsReconnecting(true);

    // 通知上層正在重連
    optionsRef.current.onReconnecting?.(nextAttempt);

    // 指數退避：1秒、2秒、4秒、8秒、16秒
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 16000);
    console.log(`Reconnecting (${nextAttempt}/${maxReconnectAttempts.current}), retrying in ${delay}ms...`);

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`Executing reconnect #${nextAttempt}`);
      connect(roomId);
    }, delay);
  }, [roomId, reconnectAttempt, connect]);

  // 發送訊息
  const sendMessage = useCallback((message: GameClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('Sent:', message.type, message);
      } catch (error) {
        console.error('Failed to send message:', error);
        optionsRef.current.onError?.(`發送訊息失敗: ${message.type}`);
      }
    } else {
      const readyState = wsRef.current?.readyState;
      const stateText = readyState === WebSocket.CONNECTING ? '正在連線中' :
                        readyState === WebSocket.CLOSING ? '正在關閉' :
                        readyState === WebSocket.CLOSED ? '已關閉' : '未連線';

      console.error(`Cannot send message (${message.type}): WebSocket ${stateText} (readyState: ${readyState})`);

      // 如果是關鍵訊息（移動棋子），通知使用者
      if (message.type === 'make_move') {
        optionsRef.current.onError?.('網路連線中斷，無法發送移動指令。請等待重連或返回大廳。');
      }
    }
  }, []);

  // 斷線
  const disconnect = useCallback(() => {
    // 停止自動重連
    shouldReconnectRef.current = false;
    clearReconnectTimer();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setRoomId(null);
    }
  }, [clearReconnectTimer]);

  // 清理
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimer]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    roomId,
  };
}
