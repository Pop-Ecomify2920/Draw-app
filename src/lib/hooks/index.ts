/**
 * React Query Hooks
 * Export all hooks for easy importing
 */

// Auth hooks
export {
  useSignIn,
  useSignUp,
  useSignOut,
  useResetPassword,
  useConfirmPasswordReset,
  authKeys,
} from './useAuth';

// User hooks
export {
  useUserProfile,
  useUpdateProfile,
  useUpdateResponsiblePlay,
  useAddFunds,
  useWithdraw,
  useTransactions,
  useWalletBalance,
  userKeys,
} from './useUser';

// Lottery hooks
export {
  useCurrentDraw,
  usePurchaseTicket,
  useTickets,
  useTicketDetails,
  useVerifyTicket,
  useDrawHistory,
  useDrawDetails,
  useDrawStats,
  useLastWinner,
  lotteryKeys,
} from './useLottery';

// Rooms hooks
export {
  useRoomsList,
  useRoomDetails,
  useCreateRoom,
  useJoinRoom,
  useLeaveRoom,
  useSeedPot,
  useRoomPurchaseTicket,
  useStartDraw,
  useExecuteDraw,
  roomsKeys,
} from './useRooms';
