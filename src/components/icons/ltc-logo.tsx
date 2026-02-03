import { cn } from "@/lib/utils";

export function LtcLogo({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-8 w-8", className)}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M24,47A23,23,0,1,1,47,24,23,23,0,0,1,24,47Z" fill="#bebebe"></path>
      <path d="m20.5,34,3.7-14.8,1.4-5.6h-9.4l-1.6,6.4h9.3l-2.4,9.6-1.5,5.8h11.9l1.6-6.4Z" fill="#fff"></path>
    </svg>
  );
}
