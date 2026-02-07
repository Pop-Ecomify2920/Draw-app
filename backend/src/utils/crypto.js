import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate a cryptographic seal for a ticket
 * This prevents ticket tampering after purchase
 * @param {Object} ticketData - Ticket information
 * @returns {string} - SHA-256 hash seal
 */
export function sealTicket(ticketData) {
  const { ticketId, userId, drawId, purchasedAt } = ticketData;
  const secret = process.env.TICKET_SEAL_SECRET;
  
  if (!secret) {
    throw new Error('TICKET_SEAL_SECRET not configured');
  }

  // Concatenate ticket data with secret
  const dataToSeal = `${ticketId}:${userId}:${drawId}:${purchasedAt}:${secret}`;
  
  // Generate SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(dataToSeal)
    .digest('hex');
  
  return hash;
}

/**
 * Verify a ticket seal
 * @param {Object} ticketData - Ticket information
 * @param {string} providedSeal - Seal to verify
 * @returns {boolean} - True if seal is valid
 */
export function verifyTicketSeal(ticketData, providedSeal) {
  const computedSeal = sealTicket(ticketData);
  return computedSeal === providedSeal;
}

/**
 * Generate a random draw seed (server-side only)
 * @returns {string} - Cryptographically secure random seed
 */
export function generateDrawSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create commitment hash from seed (for provably fair draw)
 * @param {string} seed - Random seed
 * @returns {string} - SHA-256 commitment hash
 */
export function createCommitmentHash(seed) {
  return crypto
    .createHash('sha256')
    .update(seed)
    .digest('hex');
}

/**
 * Determine winning position from revealed seed
 * @param {string} seed - Revealed random seed
 * @param {number} totalEntries - Total number of tickets
 * @returns {number} - Winning position (0-indexed)
 */
export function determineWinner(seed, totalEntries) {
  if (totalEntries === 0) return -1;
  
  // Convert seed to number using first 8 bytes
  const seedBuffer = Buffer.from(seed, 'hex');
  const seedValue = seedBuffer.readBigUInt64BE(0);
  
  // Modulo to get position within range
  const winningPosition = Number(seedValue % BigInt(totalEntries));
  
  return winningPosition;
}

/**
 * Generate a secure random token (for password reset, etc.)
 * @param {number} length - Token length in bytes
 * @returns {string} - Random token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
