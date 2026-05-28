import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://admin.soldoutafrica.com"),
    title: "SoldOutAfrica Admin",
    description: "Internal admin dashboard for managing events, companies, and platform operations on SoldOutAfrica.",
    robots: {
        index: false,
        follow: false,
    },
    openGraph: {
        type: "website",
        url: "https://admin.soldoutafrica.com",
        siteName: "SoldOutAfrica Admin",
        title: "SoldOutAfrica Admin",
        description: "Internal admin dashboard for managing events, companies, and platform operations on SoldOutAfrica.",
        images: [
            {
                url: "/icons/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "SoldOutAfrica Admin",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "@soldoutafrica",
        title: "SoldOutAfrica Admin",
        description: "Internal admin dashboard for managing events, companies, and platform operations on SoldOutAfrica.",
        images: ["/icons/og-image.jpg"],
    },
    icons: {
        icon: [
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" }],
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <Providers>
            {children}
        </Providers>
        </body>
        </html>
    );
}