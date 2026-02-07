/**
 * Provably Fair Lottery System
 *
 * Matches backend algorithms (backend/src/utils/crypto.js) for cryptographic verification.
 *
 * - Commitment: SHA-256(seed) - no prefix, raw seed
 * - Winner: first 8 bytes of seed (hex) as BigInt % totalEntries, 0-indexed
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate commitment hash from seed (SHA-256, matches backend)
 * Backend: crypto.createHash('sha256').update(seed).digest('hex')
 */
export async function generateCommitmentHashAsync(seed: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, seed, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/**
 * Verify that a commitment hash matches a seed (async, uses SHA-256)
 */
export async function verifyCommitmentAsync(
  seed: string,
  commitmentHash: string
): Promise<boolean> {
  const computed = await generateCommitmentHashAsync(seed);
  return computed === commitmentHash.toLowerCase();
}

/**
 * Select winner from tickets using seed (matches backend exactly)
 * Backend: first 8 bytes of seed as BigUInt64BE % totalEntries, 0-indexed
 */
export const selectWinner = (seed: string, totalTickets: number): number => {
  if (totalTickets <= 0) return -1;
  const first16 = seed.substring(0, 16).padEnd(16, '0');
  const seedValue = BigInt('0x' + first16);
  return Number(seedValue % BigInt(totalTickets));
};

/**
 * Verify that winner selection is correct
 */
export const verifyWinnerSelection = (
  seed: string,
  totalTickets: number,
  winningPosition: number
): boolean => {
  const computed = selectWinner(seed, totalTickets);
  return computed === winningPosition;
};

// --- Legacy/mock helpers (for local draw-history-store) ---

// Simple hash for mock draw IDs (not used for verification)
const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

export const generateRandomSeed = (): string => {
  const ts = Date.now();
  const r = Math.random().toString(36).substring(2, 15);
  return simpleHash(`${ts}-${r}`).padEnd(32, '0').substring(0, 32);
};

/** Sync placeholder - use generateCommitmentHashAsync for real verification */
export const generateCommitmentHash = (seed: string): string => {
  return simpleHash(`DDL-${seed}`).padEnd(64, '0'); // Mock only
};

export const generateTicketHash = (
  ticketId: string,
  drawId: string,
  purchaseTimestamp: string,
  position: number
): string => {
  return simpleHash(`${ticketId}:${drawId}:${purchaseTimestamp}:${position}`).substring(0, 16);
};

export const generateDrawId = (date: string): string => {
  return `DRAW-${date.replace(/-/g, '')}-${simpleHash(`DDL-DRAW-${date}`).substring(0, 6)}`;
};

export const formatVerificationTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
};

export const calculateOdds = (position: number, total: number): string =>
  `1 in ${total.toLocaleString()}`;

export const calculateOddsPercentage = (total: number): string => {
  const pct = (1 / total) * 100;
  return pct < 0.01 ? `${pct.toExponential(2)}%` : `${pct.toFixed(4)}%`;
};

export interface VerifiableTicket {
  id: string;
  drawId: string;
  drawDate: string;
  purchasedAt: string;
  position: number;
  totalEntries: number;
  ticketHash: string;
  status: 'active' | 'won' | 'lost';
  prizeAmount?: number;
}

export interface Draw {
  id: string;
  date: string;
  commitmentHash: string;
  commitmentPublishedAt?: string;
  seed?: string;
  seedRevealedAt?: string;
  totalEntries: number;
  prizePool: number;
  winningPosition?: number; // 0-indexed to match backend
  winningTicketId?: string;
  winnerUsername?: string;
  status: 'open' | 'locked' | 'drawn' | 'verified';
  tickets?: string[];
}

export interface VerificationResult {
  isValid: boolean;
  commitmentMatches: boolean;
  winnerCorrect: boolean;
  timestamp: string;
}

/**
 * Verify a draw asynchronously (uses SHA-256, matches backend)
 */
export async function verifyDrawAsync(draw: Draw): Promise<VerificationResult> {
  if (!draw.seed || draw.status !== 'drawn') {
    return {
      isValid: false,
      commitmentMatches: false,
      winnerCorrect: false,
      timestamp: new Date().toISOString(),
    };
  }

  const commitmentMatches = await verifyCommitmentAsync(draw.seed, draw.commitmentHash);
  const winnerCorrect =
    draw.winningPosition !== undefined &&
    verifyWinnerSelection(draw.seed, draw.totalEntries, draw.winningPosition);

  return {
    isValid: commitmentMatches && winnerCorrect,
    commitmentMatches,
    winnerCorrect,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sync verify for mock/local draws (uses legacy hash - not for backend draws)
 * @deprecated Use verifyDrawAsync for backend draws
 */
export const verifyDraw = (draw: Draw): VerificationResult => {
  if (!draw.seed || draw.status !== 'drawn') {
    return {
      isValid: false,
      commitmentMatches: false,
      winnerCorrect: false,
      timestamp: new Date().toISOString(),
    };
  }
  const commitmentMatches = generateCommitmentHash(draw.seed) === draw.commitmentHash;
  const winnerCorrect =
    draw.winningPosition !== undefined &&
    verifyWinnerSelection(draw.seed, draw.totalEntries, draw.winningPosition);
  return {
    isValid: commitmentMatches && winnerCorrect,
    commitmentMatches,
    winnerCorrect,
    timestamp: new Date().toISOString(),
  };
};
