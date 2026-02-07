import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LobbyTicket {
  id: string;
  roomId: string;
  participantId: string;
  participantUsername: string;
  purchasedAt: string;
  position: number;
  ticketHash: string;
}

export interface LobbyParticipant {
  id: string;
  username: string;
  joinedAt: string;
  hasTicket: boolean;
  ticketId?: string;
}

export interface LobbyRoom {
  id: string;
  code: string; // 6-character access code
  name: string;
  hostId: string;
  hostUsername: string;
  createdAt: string;
  status: 'waiting' | 'open' | 'locked' | 'drawn';
  participants: LobbyParticipant[];
  tickets: LobbyTicket[];
  prizePool: number;
  maxParticipants: number;
  drawScheduledAt?: string;
  winnerId?: string;
  winnerUsername?: string;
  winningTicketId?: string;
}

export interface LobbyState {
  // User's rooms (hosting and participating)
  hostedRooms: LobbyRoom[];
  joinedRooms: LobbyRoom[];
  currentRoom: LobbyRoom | null;

  // Actions
  createRoom: (name: string, userId: string, username: string, maxParticipants?: number) => LobbyRoom;
  joinRoom: (code: string, userId: string, username: string) => LobbyRoom | null;
  leaveRoom: (roomId: string, userId: string) => void;
  purchaseRoomTicket: (roomId: string, userId: string, username: string, walletBalance: number) => LobbyTicket | null;
  startDraw: (roomId: string, hostId: string) => void;
  executeDraw: (roomId: string) => { winnerId: string; winnerUsername: string; prizeAmount: number } | null;
  setCurrentRoom: (room: LobbyRoom | null) => void;
  getRoomByCode: (code: string) => LobbyRoom | null;
  getRoomById: (roomId: string) => LobbyRoom | null;
  addSimulatedParticipant: (roomId: string) => void;
  loadFromStorage: (userId: string) => Promise<void>;
  saveToStorage: (userId: string) => Promise<void>;
}

const STORAGE_KEY = '@daily_dollar_lotto_lobby';

// Generate a 6-character room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a unique room ID
const generateRoomId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ROOM-${timestamp}-${random}`.toUpperCase();
};

// Generate a ticket ID for lobby
const generateLobbyTicketId = (roomCode: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `LBY-${roomCode}-${timestamp}${random}`.toUpperCase();
};

// Generate a simple hash for the ticket
const generateTicketHash = (ticketId: string, roomId: string, timestamp: string): string => {
  const data = `${ticketId}:${roomId}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};

// Sample usernames for simulated participants
const sampleUsernames = [
  'LuckyPlayer', 'GoldenChance', 'WinnerVibes', 'JackpotJoe', 'FortuneSeeker',
  'LotteryLegend', 'CashCatcher', 'PrizeHunter', 'BigWinBob', 'MoneyMaker',
  'RichieRich', 'TicketMaster', 'DollarDreamer', 'PotOfGold', 'ChanceChaser',
  'VictoryVince', 'TreasureHunter', 'CoinCollector', 'BillionaireBob', 'StacksOnStacks',
];

export const useLobbyStore = create<LobbyState>((set, get) => ({
  hostedRooms: [],
  joinedRooms: [],
  currentRoom: null,

  createRoom: (name, userId, username, maxParticipants = 50) => {
    const code = generateRoomCode();
    const newRoom: LobbyRoom = {
      id: generateRoomId(),
      code,
      name,
      hostId: userId,
      hostUsername: username,
      createdAt: new Date().toISOString(),
      status: 'waiting',
      participants: [{
        id: userId,
        username,
        joinedAt: new Date().toISOString(),
        hasTicket: false,
      }],
      tickets: [],
      prizePool: 0,
      maxParticipants,
    };

    set(s => ({
      hostedRooms: [newRoom, ...s.hostedRooms],
      currentRoom: newRoom,
    }));

    return newRoom;
  },

  joinRoom: (code, userId, username) => {
    const state = get();
    // Search in all rooms (hosted and joined)
    let room = state.hostedRooms.find(r => r.code === code.toUpperCase());
    if (!room) {
      room = state.joinedRooms.find(r => r.code === code.toUpperCase());
    }

    if (!room) return null;
    if (room.status !== 'waiting' && room.status !== 'open') return null;
    if (room.participants.length >= room.maxParticipants) return null;
    if (room.participants.some(p => p.id === userId)) {
      // Already in the room, just return it
      set({ currentRoom: room });
      return room;
    }

    const updatedRoom: LobbyRoom = {
      ...room,
      participants: [
        ...room.participants,
        {
          id: userId,
          username,
          joinedAt: new Date().toISOString(),
          hasTicket: false,
        },
      ],
    };

    set(s => {
      const isHosted = s.hostedRooms.some(r => r.id === room!.id);
      if (isHosted) {
        return {
          hostedRooms: s.hostedRooms.map(r => r.id === room!.id ? updatedRoom : r),
          currentRoom: updatedRoom,
        };
      } else {
        // Add to joined rooms if not already there
        const alreadyJoined = s.joinedRooms.some(r => r.id === room!.id);
        return {
          joinedRooms: alreadyJoined
            ? s.joinedRooms.map(r => r.id === room!.id ? updatedRoom : r)
            : [updatedRoom, ...s.joinedRooms],
          currentRoom: updatedRoom,
        };
      }
    });

    return updatedRoom;
  },

  leaveRoom: (roomId, userId) => {
    set(s => {
      const updatedHosted = s.hostedRooms.map(room => {
        if (room.id === roomId && room.hostId !== userId) {
          return {
            ...room,
            participants: room.participants.filter(p => p.id !== userId),
            tickets: room.tickets.filter(t => t.participantId !== userId),
            prizePool: room.prizePool - (room.tickets.find(t => t.participantId === userId) ? 1 : 0),
          };
        }
        return room;
      });

      const updatedJoined = s.joinedRooms
        .map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              participants: room.participants.filter(p => p.id !== userId),
              tickets: room.tickets.filter(t => t.participantId !== userId),
              prizePool: room.prizePool - (room.tickets.find(t => t.participantId === userId) ? 1 : 0),
            };
          }
          return room;
        })
        .filter(room => room.participants.some(p => p.id === userId));

      return {
        hostedRooms: updatedHosted,
        joinedRooms: updatedJoined,
        currentRoom: s.currentRoom?.id === roomId ? null : s.currentRoom,
      };
    });
  },

  purchaseRoomTicket: (roomId, userId, username, walletBalance) => {
    if (walletBalance < 1) return null;

    const state = get();
    let room = state.hostedRooms.find(r => r.id === roomId);
    let isHosted = true;
    if (!room) {
      room = state.joinedRooms.find(r => r.id === roomId);
      isHosted = false;
    }

    if (!room) return null;
    if (room.status === 'locked' || room.status === 'drawn') return null;

    const participant = room.participants.find(p => p.id === userId);
    if (!participant || participant.hasTicket) return null;

    const ticketId = generateLobbyTicketId(room.code);
    const purchasedAt = new Date().toISOString();
    const position = room.tickets.length + 1;

    const newTicket: LobbyTicket = {
      id: ticketId,
      roomId,
      participantId: userId,
      participantUsername: username,
      purchasedAt,
      position,
      ticketHash: generateTicketHash(ticketId, roomId, purchasedAt),
    };

    const updatedRoom: LobbyRoom = {
      ...room,
      status: room.status === 'waiting' ? 'open' : room.status,
      participants: room.participants.map(p =>
        p.id === userId ? { ...p, hasTicket: true, ticketId } : p
      ),
      tickets: [...room.tickets, newTicket],
      prizePool: room.prizePool + 0.95, // 95% goes to prize pool
    };

    set(s => ({
      hostedRooms: isHosted
        ? s.hostedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.hostedRooms,
      joinedRooms: !isHosted
        ? s.joinedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.joinedRooms,
      currentRoom: s.currentRoom?.id === roomId ? updatedRoom : s.currentRoom,
    }));

    return newTicket;
  },

  startDraw: (roomId, hostId) => {
    const state = get();
    const room = state.hostedRooms.find(r => r.id === roomId);

    if (!room || room.hostId !== hostId) return;
    if (room.tickets.length < 2) return; // Need at least 2 tickets

    const updatedRoom: LobbyRoom = {
      ...room,
      status: 'locked',
      drawScheduledAt: new Date(Date.now() + 10000).toISOString(), // 10 seconds from now
    };

    set(s => ({
      hostedRooms: s.hostedRooms.map(r => r.id === roomId ? updatedRoom : r),
      currentRoom: s.currentRoom?.id === roomId ? updatedRoom : s.currentRoom,
    }));
  },

  executeDraw: (roomId) => {
    const state = get();
    let room = state.hostedRooms.find(r => r.id === roomId);
    let isHosted = true;
    if (!room) {
      room = state.joinedRooms.find(r => r.id === roomId);
      isHosted = false;
    }

    if (!room || room.status !== 'locked' || room.tickets.length === 0) return null;

    // Random selection
    const winningIndex = Math.floor(Math.random() * room.tickets.length);
    const winningTicket = room.tickets[winningIndex];

    const updatedRoom: LobbyRoom = {
      ...room,
      status: 'drawn',
      winnerId: winningTicket.participantId,
      winnerUsername: winningTicket.participantUsername,
      winningTicketId: winningTicket.id,
    };

    set(s => ({
      hostedRooms: isHosted
        ? s.hostedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.hostedRooms,
      joinedRooms: !isHosted
        ? s.joinedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.joinedRooms,
      currentRoom: s.currentRoom?.id === roomId ? updatedRoom : s.currentRoom,
    }));

    return {
      winnerId: winningTicket.participantId,
      winnerUsername: winningTicket.participantUsername,
      prizeAmount: room.prizePool,
    };
  },

  setCurrentRoom: (room) => {
    set({ currentRoom: room });
  },

  getRoomByCode: (code) => {
    const state = get();
    const upperCode = code.toUpperCase();
    return state.hostedRooms.find(r => r.code === upperCode)
      || state.joinedRooms.find(r => r.code === upperCode)
      || null;
  },

  getRoomById: (roomId) => {
    const state = get();
    return state.hostedRooms.find(r => r.id === roomId)
      || state.joinedRooms.find(r => r.id === roomId)
      || null;
  },

  addSimulatedParticipant: (roomId) => {
    const state = get();
    let room = state.hostedRooms.find(r => r.id === roomId);
    let isHosted = true;
    if (!room) {
      room = state.joinedRooms.find(r => r.id === roomId);
      isHosted = false;
    }

    if (!room || room.status === 'locked' || room.status === 'drawn') return;
    if (room.participants.length >= room.maxParticipants) return;

    const usedNames = new Set(room.participants.map(p => p.username));
    const availableNames = sampleUsernames.filter(n => !usedNames.has(n));
    if (availableNames.length === 0) return;

    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    const participantId = `SIM-${Date.now().toString(36)}`;
    const joinedAt = new Date().toISOString();

    const ticketId = generateLobbyTicketId(room.code);
    const newTicket: LobbyTicket = {
      id: ticketId,
      roomId,
      participantId,
      participantUsername: randomName,
      purchasedAt: joinedAt,
      position: room.tickets.length + 1,
      ticketHash: generateTicketHash(ticketId, roomId, joinedAt),
    };

    const updatedRoom: LobbyRoom = {
      ...room,
      status: room.status === 'waiting' ? 'open' : room.status,
      participants: [
        ...room.participants,
        {
          id: participantId,
          username: randomName,
          joinedAt,
          hasTicket: true,
          ticketId,
        },
      ],
      tickets: [...room.tickets, newTicket],
      prizePool: room.prizePool + 0.95,
    };

    set(s => ({
      hostedRooms: isHosted
        ? s.hostedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.hostedRooms,
      joinedRooms: !isHosted
        ? s.joinedRooms.map(r => r.id === roomId ? updatedRoom : r)
        : s.joinedRooms,
      currentRoom: s.currentRoom?.id === roomId ? updatedRoom : s.currentRoom,
    }));
  },

  loadFromStorage: async (userId) => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          hostedRooms: data.hostedRooms ?? [],
          joinedRooms: data.joinedRooms ?? [],
        });
      }
    } catch (error) {
      console.log('Error loading lobby data:', error);
    }
  },

  saveToStorage: async (userId) => {
    try {
      const state = get();
      await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify({
        hostedRooms: state.hostedRooms,
        joinedRooms: state.joinedRooms,
      }));
    } catch (error) {
      console.log('Error saving lobby data:', error);
    }
  },
}));
