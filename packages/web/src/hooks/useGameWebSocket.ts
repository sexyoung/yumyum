// packages/web/src/hooks/useGameWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameClientMessage, GameServerMessage, PieceColor, GameState } from '@yumyum/types';
import { loadOnlineRoomInfo } from '../lib/storage';

export interface UseGameWebSocketOptions {
  onRoomCreated?: (roomId: string, playerId: string) => void;
  onRoomJoined?: (roomId: string, playerId: string, color: PieceColor) => void;
  onWaitingForOpponent?: () => void;
  onOpponentJoined?: (opponentName: string) => void;
  onGameStart?: (gameState: GameState, yourColor: PieceColor) => void;
  onMoveMade?: (gameState: GameState) => void;
  onGameOver?: (winner: PieceColor | 'draw', gameState: GameState) => void;
  onReconnected?: (gameState: GameState, yourColor: PieceColor) => void;
  onOpponentLeft?: () => void;
  onError?: (message: string) => void;
  onReconnecting?: (attempt: number) => void;
  enableAutoReconnect?: boolean; // 是否啟用自動重連後的 rejoin
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
  const hasReconnectedRef = useRef(false); // 追蹤是否為重連

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
  const connect = useCallback((targetRoomId: string, isReconnect = false) => {
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

    // WebSocket URL - 從環境變數讀取基礎 URL
    const baseWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5173';
    const wsUrl = `${baseWsUrl}/game/${targetRoomId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🎮 WebSocket connected to room:', targetRoomId);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      clearReconnectTimer();

      // 如果是重連且啟用自動重連
      if (isReconnect && optionsRef.current.enableAutoReconnect) {
        console.log('✅ 重連成功，嘗試自動 rejoin...');
        hasReconnectedRef.current = true;

        // 從 localStorage 讀取房間資訊
        const savedInfo = loadOnlineRoomInfo();
        if (savedInfo) {
          console.log('📝 使用已儲存的房間資訊進行 rejoin:', savedInfo);
          // 延遲發送，確保 WebSocket 完全準備好
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const rejoinMsg: GameClientMessage = {
                type: 'rejoin_room',
                roomId: savedInfo.roomId,
                playerId: savedInfo.playerId,
              };
              ws.send(JSON.stringify(rejoinMsg));
              console.log('📤 已發送 rejoin_room 訊息');
            }
          }, 100);
        } else {
          console.warn('⚠️ 無法找到已儲存的房間資訊，無法自動 rejoin');
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: GameServerMessage = JSON.parse(event.data);
        console.log('📨 Received:', message);

        switch (message.type) {
          case 'room_created':
            optionsRef.current.onRoomCreated?.(message.roomId, message.playerId);
            break;
          case 'room_joined':
            optionsRef.current.onRoomJoined?.(message.roomId, message.playerId, message.color);
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
          case 'reconnected':
            optionsRef.current.onReconnected?.(message.gameState, message.yourColor);
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
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);

      // 如果需要重連且未超過最大次數
      if (shouldReconnectRef.current && reconnectAttempt < maxReconnectAttempts.current) {
        attemptReconnect();
      } else if (reconnectAttempt >= maxReconnectAttempts.current) {
        console.error('❌ 達到最大重連次數，停止重連');
        optionsRef.current.onError?.('連線失敗，請重新整理頁面');
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
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
    console.log(`🔄 嘗試重連 (${nextAttempt}/${maxReconnectAttempts.current})，${delay}ms 後重試...`);

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`🔄 執行重連 #${nextAttempt}`);
      connect(roomId, true);
    }, delay);
  }, [roomId, reconnectAttempt, connect]);

  // 發送訊息
  const sendMessage = useCallback((message: GameClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 Sent:', message);
    } else {
      console.error('WebSocket is not connected');
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
