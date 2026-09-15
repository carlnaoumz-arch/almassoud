import { ArrowUpRight } from 'lucide-react';

export function SiteHeader() {
  return <header className="site-header">
    <a className="brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud — good food made good" width="166" height="66"/></a>
    <nav aria-label="Main navigation"><a href="/menu">Our menu</a><a href="/story">Our story</a><a href="/locations">Find us</a></nav>
    <a className="order" href="tel:1632">ORDER NOW <ArrowUpRight size={16}/></a>
  </header>;
}
