export function round(num: number, decimals = 8) {
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}

export function toDate(timestamp: any) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
}