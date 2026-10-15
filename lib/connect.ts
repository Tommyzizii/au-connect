/**
 * Normalizes a pair of user IDs by sorting them alphabetically.
 * @param a - First user ID
 * @param b - Second user ID
 * @author Minn
 */
export function normalizePair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/**
 * Checks if the provided value is a valid connection user ID by verifying that it is a string and matches the expected format (24-character hexadecimal).
 * @param value - connection user id
 * @author Minn
 */
export function isValidConnectionUserId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}
