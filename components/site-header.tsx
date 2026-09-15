import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function SiteHeader() {
  return <header className="site-header">
    <Link className="brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud — good food made good" width="166" height="66"/></Link>
    <nav aria-label="Main navigation"><Link href="/menu">Our menu</Link><Link href="/story">Our story</Link><Link href="/locations">Find us</Link></nav>
    <a className="order" href="tel:1632">ORDER NOW <ArrowUpRight size={16}/></a>
  </header>;
}
