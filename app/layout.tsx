import type { Metadata } from 'next';
import './globals.css';
import { HeroCache } from '../components/hero-cache';
export const metadata: Metadata = { title: 'Al Massoud | Good food made good', description: 'Fresh from the grill. Discover Al Massoud Lebanon, explore the menu and order your favourites.', icons: {icon:'/logo.png'} };
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="en"><body><HeroCache/>{children}</body></html>}
