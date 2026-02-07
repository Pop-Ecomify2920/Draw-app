/**
 * WebSocket client for real-time prize pool and draw updates
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api/config';

// Derive socket URL from API URL (http://localhost:3000/api -> http://localhost:3000)
const getSocketUrl = (): string => {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
  } catch {
    return 'http://localhost:3000';
  }
};

let socket: Socket | null = null;

export interface DrawUpdatePayload {
  drawId: string;
  prizePool: number;
  totalEntries: number;
  timestamp: string;
}

export function connectSocket(accessToken: string): Socket | null {
  if (socket?.connected) return socket;

  try {
    socket = io(getSocketUrl(), {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return socket;
  } catch (e) {
    console.warn('[Socket] Failed to connect:', e);
    return null;
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinDrawRoom(drawId: string): void {
  if (socket?.connected) {
    socket.emit('join:draw', drawId);
  }
}

export function leaveDrawRoom(drawId: string): void {
  if (socket?.connected) {
    socket.emit('leave:draw', drawId);
  }
}

export function onDrawUpdate(callback: (data: DrawUpdatePayload) => void): () => void {
  if (!socket) return () => {};
  const handler = (data: DrawUpdatePayload) => callback(data);
  socket.on('draw:update', handler);
  return () => {
    socket?.off('draw:update', handler);
  };
}
