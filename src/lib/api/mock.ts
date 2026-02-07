// /**
//  * Mock Data and Services
//  * Used when EXPO_PUBLIC_API_URL is not set
//  * Provides realistic mock data for development and testing
//  */

// import { User } from '@/lib/state/auth-store';
// import { Ticket } from '@/lib/state/lottery-store';
// import { LobbyRoom, LobbyParticipant, LobbyTicket } from '@/lib/state/lobby-store';

// // Types matching API responses
// export interface CurrentDrawResponse {
//   drawId: string;
//   commitmentHash: string;
//   prizePool: number;
//   totalEntries: number;
//   drawTime: string;
//   status: 'open' | 'closed' | 'drawn';
// }

// export interface PurchaseTicketResponse {
//   ticket: Ticket;
//   newBalance: number;
//   position: number;
//   totalEntries: number;
//   prizePool: number;
// }

// export interface DrawStatsResponse {
//   totalEntries: number;
//   totalTickets: number;
//   prizePool: number;
//   peakHour: number;
//   entriesPerHour: number[];
//   hourlyEntries: Array<{ hour: number; entries: number }>;
//   topPositions: Array<{ position: number; ticketId: string }>;
//   averageEntryTime: number;
// }

// export interface TransactionRecord {
//   id: string;
//   type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_win';
//   amount: number;
//   description: string;
//   status: 'pending' | 'completed' | 'failed';
//   createdAt: string;
// }

// export interface UserProfileResponse {
//   id: string;
//   email: string;
//   username: string;
//   user: User;
//   walletBalance: number;
//   ticketsPurchasedThisYear: number;
//   totalWon: number;
//   totalWinnings: number;
//   createdAt: string;
//   memberSince: string;
// }

// // Helper functions
// const generateId = (prefix: string): string => {
//   const timestamp = Date.now().toString(36);
//   const random = Math.random().toString(36).substring(2, 8);
//   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// };

// const generateHash = (input: string): string => {
//   let hash = 0;
//   for (let i = 0; i < input.length; i++) {
//     const char = input.charCodeAt(i);
//     hash = ((hash << 5) - hash) + char;
//     hash = hash & hash;
//   }
//   return Math.abs(hash).toString(16).padStart(64, '0').toUpperCase();
// };

// const getTodayDrawId = (): string => {
//   const now = new Date();
//   const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
//   return `DRAW-${dateStr}`;
// };

// const getDrawTime = (): string => {
//   const now = new Date();
//   const drawTime = new Date(Date.UTC(
//     now.getUTCFullYear(),
//     now.getUTCMonth(),
//     now.getUTCDate() + 1,
//     0, 0, 0, 0
//   ));
//   return drawTime.toISOString();
// };

// // Generate realistic hourly entry data
// const generateHourlyEntries = (): Array<{ hour: number; entries: number }> => {
//   const currentHour = new Date().getUTCHours();
//   const entries: Array<{ hour: number; entries: number }> = [];

//   for (let hour = 0; hour <= currentHour; hour++) {
//     // More entries during peak hours (lunch and evening)
//     let baseEntries = 50;
//     if (hour >= 11 && hour <= 14) baseEntries = 120; // Lunch peak
//     if (hour >= 18 && hour <= 22) baseEntries = 150; // Evening peak
//     if (hour >= 0 && hour <= 6) baseEntries = 20; // Night low

//     const variance = Math.floor(Math.random() * 30) - 15;
//     entries.push({ hour, entries: Math.max(0, baseEntries + variance) });
//   }

//   return entries;
// };

// // Mock data generators
// export const mockData = {
//   // Current draw info
//   getCurrentDraw: (): CurrentDrawResponse => {
//     const drawId = getTodayDrawId();
//     const hourlyEntries = generateHourlyEntries();
//     const totalEntries = hourlyEntries.reduce((sum, h) => sum + h.entries, 0);

//     return {
//       drawId,
//       commitmentHash: generateHash(drawId + Date.now()),
//       prizePool: totalEntries * 0.95, // 95% of entries go to prize pool
//       totalEntries,
//       drawTime: getDrawTime(),
//       status: 'open',
//     };
//   },

//   // Draw statistics
//   getDrawStats: (): DrawStatsResponse => {
//     const hourlyEntries = generateHourlyEntries();
//     const totalTickets = hourlyEntries.reduce((sum, h) => sum + h.entries, 0);

//     return {
//       totalEntries: totalTickets,
//       totalTickets,
//       prizePool: totalTickets * 0.95,
//       peakHour: 20,
//       entriesPerHour: hourlyEntries.map(h => h.entries),
//       hourlyEntries,
//       topPositions: [
//         { position: 1, ticketId: 'DDL-20240101-00001' },
//         { position: 2, ticketId: 'DDL-20240101-00002' },
//         { position: 3, ticketId: 'DDL-20240101-00003' },
//       ],
//       averageEntryTime: 45,
//     };
//   },

//   // User profile
//   getUserProfile: (userId: string): UserProfileResponse => ({
//     id: userId,
//     email: 'user@example.com',
//     username: 'LuckyPlayer',
//     user: {
//       id: userId,
//       email: 'user@example.com',
//       username: 'LuckyPlayer',
//       createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
//       isVerified: true,
//     },
//     walletBalance: 25.00,
//     ticketsPurchasedThisYear: 45,
//     totalWon: 127.50,
//     totalWinnings: 127.50,
//     createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
//     memberSince: 'January 2024',
//   }),

//   // Transaction history
//   getTransactions: (): TransactionRecord[] => [
//     {
//       id: generateId('TXN'),
//       type: 'deposit',
//       amount: 10.00,
//       description: 'Added funds via Apple Pay',
//       status: 'completed',
//       createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//     },
//     {
//       id: generateId('TXN'),
//       type: 'ticket_purchase',
//       amount: -1.00,
//       description: 'Daily Dollar Lotto ticket',
//       status: 'completed',
//       createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
//     },
//     {
//       id: generateId('TXN'),
//       type: 'prize_win',
//       amount: 127.50,
//       description: 'Lottery winnings',
//       status: 'completed',
//       createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
//     },
//   ],

//   // Tickets
//   getTickets: (userId: string): Ticket[] => {
//     const now = new Date();
//     const tickets: Ticket[] = [];

//     // Active ticket for today
//     const todayStr = now.toISOString().split('T')[0];
//     const todayDrawId = getTodayDrawId();

//     tickets.push({
//       id: `DDL-${todayStr.replace(/-/g, '')}-00${Math.floor(Math.random() * 900) + 100}`,
//       drawId: todayDrawId,
//       drawDate: todayStr,
//       purchasedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
//       position: Math.floor(Math.random() * 500) + 100,
//       totalEntriesAtPurchase: Math.floor(Math.random() * 200) + 500,
//       ticketHash: generateHash(`${userId}-${todayDrawId}-active`),
//       status: 'active',
//       prizePool: 650.75,
//     });

//     // Past tickets
//     for (let i = 1; i <= 5; i++) {
//       const pastDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
//       const pastDateStr = pastDate.toISOString().split('T')[0];
//       const pastDrawId = `DRAW-${pastDateStr.replace(/-/g, '')}`;
//       const isWinner = i === 3; // Make one past ticket a winner
//       const finalEntries = Math.floor(Math.random() * 500) + 800;

//       tickets.push({
//         id: `DDL-${pastDateStr.replace(/-/g, '')}-00${Math.floor(Math.random() * 900) + 100}`,
//         drawId: pastDrawId,
//         drawDate: pastDateStr,
//         purchasedAt: pastDate.toISOString(),
//         position: Math.floor(Math.random() * 400) + 50,
//         totalEntriesAtPurchase: finalEntries - Math.floor(Math.random() * 200),
//         ticketHash: generateHash(`${userId}-${pastDrawId}-${i}`),
//         status: isWinner ? 'won' : 'lost',
//         prizePool: finalEntries * 0.95,
//         prizeAmount: isWinner ? finalEntries * 0.95 : undefined,
//         finalTotalEntries: finalEntries,
//       });
//     }

//     return tickets;
//   },

//   // Rooms list
//   getRooms: (userId: string): LobbyRoom[] => {
//     const sampleNames = ['Friday Fun Draw', 'Office Lotto', 'Family Pool', 'Weekend Warriors'];
//     const rooms: LobbyRoom[] = [];

//     sampleNames.forEach((name, index) => {
//       const participants: LobbyParticipant[] = [];
//       const tickets: LobbyTicket[] = [];
//       const participantCount = Math.floor(Math.random() * 8) + 3;

//       for (let i = 0; i < participantCount; i++) {
//         const participantId = i === 0 ? userId : generateId('USER');
//         const username = i === 0 ? 'You' : `Player${i}`;
//         const hasTicket = Math.random() > 0.3;

//         participants.push({
//           id: participantId,
//           username,
//           joinedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
//           hasTicket,
//           ticketId: hasTicket ? generateId('LBY') : undefined,
//         });

//         if (hasTicket) {
//           tickets.push({
//             id: generateId('LBY'),
//             roomId: generateId('ROOM'),
//             participantId,
//             participantUsername: username,
//             purchasedAt: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
//             position: tickets.length + 1,
//             ticketHash: generateHash(`${participantId}-${index}`),
//           });
//         }
//       }

//       rooms.push({
//         id: generateId('ROOM'),
//         code: `${String.fromCharCode(65 + index)}${Math.floor(Math.random() * 9000) + 1000}${String.fromCharCode(65 + index + 1)}`,
//         name,
//         hostId: index === 0 ? userId : generateId('USER'),
//         hostUsername: index === 0 ? 'You' : `Host${index}`,
//         createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
//         status: index === 0 ? 'open' : index === 1 ? 'waiting' : 'drawn',
//         participants,
//         tickets,
//         prizePool: tickets.length * 0.95,
//         maxParticipants: 50,
//         winnerId: index >= 2 ? participants[Math.floor(Math.random() * participants.length)]?.id : undefined,
//         winnerUsername: index >= 2 ? participants[Math.floor(Math.random() * participants.length)]?.username : undefined,
//       });
//     });

//     return rooms;
//   },

//   // Last winner
//   getLastWinner: (): { username: string; amount: number; ticketId: string; drawId: string } => {
//     const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');

//     return {
//       username: 'Lucky_Winner_' + Math.floor(Math.random() * 100),
//       amount: Math.floor(Math.random() * 500) + 500 + Math.random() * 0.99,
//       ticketId: `DDL-${dateStr}-00${Math.floor(Math.random() * 900) + 100}`,
//       drawId: `DRAW-${dateStr}`,
//     };
//   },

//   // Draw history
//   getDrawHistory: (limit: number = 10): Array<{
//     drawId: string;
//     drawDate: string;
//     totalEntries: number;
//     prizePool: number;
//     winnerId: string;
//     winnerUsername: string;
//     winningTicketId: string;
//     seed?: string;
//     commitmentHash: string;
//   }> => {
//     const history = [];
//     const now = new Date();

//     for (let i = 1; i <= limit; i++) {
//       const drawDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
//       const dateStr = drawDate.toISOString().split('T')[0];
//       const drawId = `DRAW-${dateStr.replace(/-/g, '')}`;
//       const totalEntries = Math.floor(Math.random() * 500) + 700;

//       history.push({
//         drawId,
//         drawDate: dateStr,
//         totalEntries,
//         prizePool: totalEntries * 0.95,
//         winnerId: generateId('USER'),
//         winnerUsername: `Winner${i}`,
//         winningTicketId: `DDL-${dateStr.replace(/-/g, '')}-00${Math.floor(Math.random() * 900) + 100}`,
//         seed: generateHash(`seed-${drawId}`).substring(0, 32),
//         commitmentHash: generateHash(`commitment-${drawId}`),
//       });
//     }

//     return history;
//   },
// };

// export default mockData;
