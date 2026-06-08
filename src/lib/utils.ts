import * as crypto from "crypto";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Shadcn UI utility class merger.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Salted scrypt password hashing using Node's native crypto.
 *
 * Returns a self-describing string of the form `scrypt$<saltHex>$<keyHex>`.
 * A fresh random salt is generated per call, so identical passwords produce
 * different hashes and stored hashes can never be matched by equality.
 */
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash produced by
 * {@link hashPassword}. Uses a constant-time comparison to avoid timing leaks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = crypto.scryptSync(password, salt, keyBuffer.length);

  return keyBuffer.length === derivedKey.length && crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Generate a ticket number e.g. PK-20260522-XYZ99
 */
export function generateTicketNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PK-${dateStr}-${randChars}`;
}

interface PricingRuleObject {
  vehicleType: string;
  baseRate: number;
  hourlyRate: number;
  peakMultiplier: number;
}

/**
 * Core dynamic parking fee calculation engine.
 */
export function calculateParkingFee(
  entryTime: Date,
  exitTime: Date,
  pricingRules: PricingRuleObject[],
  vehicleType: string
): { totalFee: number; durationHours: number } {
  // Find rule or use generic defaults
  const rule = pricingRules.find((r) => r.vehicleType === vehicleType) || {
    baseRate: 4.0,
    hourlyRate: 2.0,
    peakMultiplier: 1.0,
  };

  const durationMs = exitTime.getTime() - entryTime.getTime();
  
  // Guard against negative duration
  if (durationMs <= 0) {
    return { totalFee: 0, durationHours: 0 };
  }

  // Round up duration to the nearest hour
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
  
  // Dynamic formula: Base Rate (includes first hour) + Hourly Rate * (hours - 1)
  const baseCalculated = rule.baseRate + Math.max(0, durationHours - 1) * rule.hourlyRate;
  const totalFee = parseFloat((baseCalculated * rule.peakMultiplier).toFixed(2));

  return { totalFee, durationHours };
}

/**
 * Format currency.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format duration into readable text.
 */
export function formatDurationText(entryTime: Date, exitTime: Date): string {
  const diffMs = exitTime.getTime() - entryTime.getTime();
  if (diffMs <= 0) return "0 mins";

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""}`;

  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  if (remainingMins === 0) return `${diffHours} hr${diffHours > 1 ? "s" : ""}`;
  return `${diffHours} hr${diffHours > 1 ? "s" : ""} ${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
}

/**
 * Clean dynamic date strings.
 */
export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
