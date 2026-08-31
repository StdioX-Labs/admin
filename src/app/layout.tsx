import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Spectral } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

// Organic design system: Instrument Sans carries the UI, Spectral the display voice.
const instrumentSans = Instrument_Sans({
    variable: "--font-instrument-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const spectral = Spectral({
    variable: "--font-spectral",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

// The console locks <body> out of flow (see the viewport lock in globals.css),
// so a keyboard that merely overlays the page would bury the focused field with
// no way to scroll to it. `resizes-content` shrinks the layout viewport — and
// with it `100dvh` — so the shell reflows above the keyboard instead.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    interactiveWidget: "resizes-content",
};

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
        <html lang="en">
        <body
            className={`${instrumentSans.variable} ${spectral.variable} antialiased`}
        >
        <Providers>
            {children}
        </Providers>
        </body>
        </html>
    );
}