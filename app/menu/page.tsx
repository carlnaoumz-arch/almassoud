import { ArrowDown, ArrowLeft, ArrowUpRight, Phone } from 'lucide-react';
import { menuSections } from './menu-data';

export default function MenuPage() {
  return <main className="diner-menu" id="top">
    <header><a className="brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud - good food made good" width="166" height="66"/></a><a className="menu-home" href="/#top"><ArrowLeft size={18}/> Home</a><a className="order" href="tel:1632">ORDER NOW <ArrowUpRight size={16}/></a></header>
    <section className="menu-hero"><div><p className="eyebrow">AL MASSOUD DINER</p><h1>The menu<br/><em>you came for.</em></h1><p>Made fresh. Made generous. Made for sharing.</p><a href="#starters" className="menu-jump">EXPLORE THE MENU <ArrowDown size={17}/></a></div><div className="menu-hero-mark"><span>GOOD FOOD<br/>MADE GOOD</span><strong>1632</strong></div></section>
    <nav className="category-rail" aria-label="Menu categories">{menuSections.map(section=><a href={'#'+section.id} key={section.id}>{section.title}</a>)}</nav>
    <section className="menu-list">{menuSections.map((section,index)=><article className="menu-category" id={section.id} key={section.id}><div className="category-heading"><span>0{index + 1}</span><p>{section.kicker}</p><h2>{section.title}</h2></div><div className="category-photo"><img src={'/menus/'+section.image} alt={section.title+' from Al Massoud Diner'} loading={index < 2 ? 'eager' : 'lazy'} width="1273" height="1800"/></div><div className="item-list">{section.items.map(([name,price,description])=><div className="menu-item" key={name}><div><h3>{name}</h3><p>{description}</p></div><strong>{price}</strong></div>)}</div></article>)}</section>
    <section className="menu-cta"><div><p className="eyebrow">HUNGER DOESN'T WAIT</p><h2>Ready when<br/>you are.</h2></div><a href="tel:1632" className="button light"><Phone size={18}/> ORDER NOW · 1632 <ArrowUpRight size={18}/></a></section>
    <footer><div className="footer-top"><a href="/#top" className="footer-brand"><img src="/logo.png" alt="Al Massoud" width="180" height="67"/></a><p>Good food made good.<br/><span>Made to bring us together.</span></p></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Al Massoud</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
