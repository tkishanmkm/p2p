
"use client";

// This layout provides a full-screen container for the trade page,
// counteracting the parent layout's padding to make the content area full-width.
export default function TradePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col -m-2 sm:-m-4 lg:-m-6">
        {children}
    </div>
  );
}
