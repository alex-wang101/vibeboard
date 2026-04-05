import type { Metadata } from "next"
import { Playfair_Display } from "next/font/google"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

export const metadata: Metadata = {
  title: "Vibeboard - The platform to scale",
  description:
    "Your toolkit to stop configuring and start innovating. Securely build, deploy, and scale the best experiences.",
  icons: {
    icon: "/sun.png",
    apple: "/sun.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} font-serif antialiased`}>
        {children}
      </body>
    </html>
  )
}
