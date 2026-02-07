/**
 * WebSocket client - Web stub (socket.io has bundling issues on web)
 * Uses no-op implementations; live updates fall back to React Query polling
 */

export interface DrawUpdatePayload {
  drawId: string;
  prizePool: number;
  totalEntries: number;
  timestamp: string;
}

export function connectSocket(_accessToken: string): null {
  return null;
}

export function disconnectSocket(): void {}

export function joinDrawRoom(_drawId: string): void {}

export function leaveDrawRoom(_drawId: string): void {}

export function onDrawUpdate(_callback: (data: DrawUpdatePayload) => void): () => void {
  return () => {};
}
