
import type { Trade } from './types';

export const statusColors: Record<Trade['status'], string> = {
  active: "border-blue-500/50 text-blue-600 bg-blue-50",
  paid: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  released: "border-green-500/50 text-green-600 bg-green-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
  disputed: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
};
