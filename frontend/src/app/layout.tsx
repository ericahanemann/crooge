import type { Metadata } from "next"
import { Geist_Mono, Karantina, Nunito_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/sidebar"

const karantina = Karantina({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-karantina",
})

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Crooge",
  description: "Get croogy. Control your finances.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        karantina.variable,
        nunitoSans.variable,
        geistMono.variable,
      )}
    >
      <head>
        {/* Runs before paint to apply saved theme. Defaults to dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex h-full bg-background">
        <AppSidebar />
        <main className="flex flex-col flex-1 overflow-hidden min-w-0">
          {children}
        </main>
      </body>
    </html>
  )
}
