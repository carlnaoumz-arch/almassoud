import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Al Massoud | Good food made good', description: 'Fresh from the grill. Discover Al Massoud Lebanon, explore the menu and order your favourites.', icons: {icon:'/logo.png'} };
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="en"><head><link rel="preload" href="/farrouj-assembly.mp4" as="video" type="video/mp4" fetchPriority="high" /></head><body>{children}</body></html>}
