import type { ClientMessage, ServerMessage } from '@yumyum/types';

type MessageHandler = (message: ServerMessage) => void;
type ConnectionHandler = () => void;

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private roomId: string | null = null;

  connect(roomId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    this.roomId = roomId;

    // WebSocket 連接邏輯
    // 開發環境: 使用相對路徑透過 Vite proxy
    // 正式環境: 直接連接 Railway game-service (Vercel rewrites 不支援 WebSocket)
    let wsUrl: string;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // 開發環境：透過 Vite proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/game/${roomId}`;
    } else {
      // 正式環境：直接連接到 Railway
      wsUrl = `wss://yumyumgame-service-production.up.railway.app/game/${roomId}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected to room:', roomId);
      this.connectHandlers.forEach((handler) => handler());
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('Received:', message);
        this.messageHandlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.disconnectHandlers.forEach((handler) => handler());
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.roomId = null;
    }
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler) {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler) {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}
