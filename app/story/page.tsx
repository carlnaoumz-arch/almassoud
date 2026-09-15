import Link from 'next/link';
import { SiteHeader } from '../../components/site-header';
export default function Story() {
  return <main className="information-page" id="top"><SiteHeader/>
    <section className="information-intro"><p className="eyebrow">OUR STORY</p><h1>A love<br/><em>for food.</em></h1></section>
    <section className="story-copy"><h2>How it started</h2><p>For Anthony Massoud, food has always brought people together. From organising meals with friends to studying hospitality management at Sagesse University, that lifelong interest grew into the dream of opening his own restaurant.</p><p>Al Massoud is the expression of that passion: good food made good.</p><Link className="button red" href="/menu">EXPLORE OUR MENU</Link></section>
    <footer><Link className="footer-brand" href="/#top" aria-label="Al Massoud home"><img src="/logo.png" alt="Al Massoud" width="145" height="54"/></Link><p><Link href="/#top">← Back to home</Link></p></footer>
  </main>;
}
