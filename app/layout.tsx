export const metadata = {
  title: "MCP Registry",
  description: "Browse and attach MCP servers to Voice AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
