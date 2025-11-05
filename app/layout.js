export const metadata = {
  title: 'Mayday Mayday',
  description: 'Next.js application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  )
}
