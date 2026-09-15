import {SiteHeader} from '../../components/site-header';
import { ArrowUpRight, Phone } from 'lucide-react';
import { MenuBrowser } from './menu-browser';
import './menu.css';

export default function MenuPage() {
  return <main className="menu-catalog" id="top">
    <SiteHeader/>
    <section className="catalog-intro" id="menu-top"><div><p className="catalog-eyebrow">AL MASSOUD DINER · FANAR & MTAYLEB</p><h1>A taste of<br/><em>the good life.</em></h1><p className="catalog-subtitle">Your table favourites, from the first bite to the last.</p><span className="currency-note">All prices in USD · Portions & extras listed with each dish</span></div><figure><img src="/menu-food/p16-0.webp" alt="Boneless Farrouj Al Massoud with fries, garlic and coleslaw" width="260" height="260" fetchPriority="high"/><figcaption>Our signature. Your favourite.</figcaption></figure></section>
    <MenuBrowser/>
    <section className="catalog-order"><div><p className="catalog-eyebrow">GOOD FOOD MADE GOOD</p><h2>Come hungry.</h2></div><a href="tel:1632" className="button light"><Phone size={18}/> ORDER NOW · 1632 <ArrowUpRight size={18}/></a></section>
    <footer><div className="footer-top"><a href="/#top" className="footer-brand"><img src="/logo.png" alt="Al Massoud" width="180" height="67"/></a><p>Good food made good.<br/><span>Made to bring us together.</span></p></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Al Massoud</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
