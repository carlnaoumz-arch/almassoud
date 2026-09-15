import Link from 'next/link';
import { SiteHeader } from '../../components/site-header';
import { MapPin, ArrowUpRight } from 'lucide-react';

const branches = [
  ['Fanar', 'Fanar Main Road'], ['Mtayleb', 'Mtayleb'],
  ['Zouk', 'Zouk Main Road'], ['Ashrafiyeh', 'Ashrafiyeh, Sassine Square'],
  ['Zahle', 'Zahle Main Road'], ['Ghazir', 'Ghazir'],
];

export default function Locations() {
  return <main className="information-page" id="top"><SiteHeader/>
    <section className="information-intro"><p className="eyebrow">YOUR NEXT GOOD MEAL</p><h1>Find your<br/><em>Al Massoud.</em></h1><p>Six places to come hungry. Call <a href="tel:1632">1632</a> to order.</p></section>
    <section className="location-grid" aria-label="Our restaurants">{branches.map(([name,address])=><article key={name}>
      <MapPin size={24}/><h2>{name}</h2><p>{address}</p><p>12:00 PM – 11:30 PM</p>
      <a className="text-link" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('Al Massoud '+address+' Lebanon')} target="_blank" rel="noopener noreferrer">OPEN MAP <ArrowUpRight size={18}/><span className="sr-only"> (opens in a new tab)</span></a>
      <a className="location-call" href="tel:1632">CALL 1632</a>
    </article>)}</section>
    <footer><Link className="footer-brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud" width="145" height="54"/></Link><p><Link href="/#top">← Back to home</Link></p></footer>
  </main>;
}
