import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { menus } from './menus';
export default function MenuPage() {
 return <main className="menu-page" id="top">
  <header><a className="brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud — good food made good" width="166" height="66"/></a><a className="menu-home" href="/#top"><ArrowLeft size={18}/> Back to home</a><a className="order" href="tel:1632">ORDER NOW <ArrowUpRight size={16}/></a></header>
  <section className="menu-content"><p className="eyebrow">GOOD FOOD MADE GOOD</p><h1>Our menus.</h1><p>Choose your restaurant.</p><nav className="menu-branches" aria-label="Restaurant menus">{menus.map(menu=><a key={menu.id} href={'#'+menu.id}>{menu.name}</a>)}</nav>
  {menus.map(menu=><section className="menu-document" id={menu.id} key={menu.id}><h2>{menu.name}</h2><a className="text-link" href={'/menus/'+menu.id+'.pdf'} download>Download menu <ArrowUpRight size={18}/></a><div>{menu.pages.map((page,index)=><img key={page} src={'/menus/'+page} alt={menu.name+' menu, page '+(index+1)} loading="lazy" width="1273" height="1800"/>)}</div><a className="menu-home" href="/#top"><ArrowLeft size={18}/> Back to home</a></section>)}
  </section>
 </main>;
}
