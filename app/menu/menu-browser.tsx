'use client';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { menuSections, itemCount } from './complete-menu';

const photos: Record<string,string> = {
 'starters/Chicken Tenders':'p3-0', 'starters/Mozzarella Sticks':'p3-1', 'starters/Curly Fries':'p3-2', 'starters/Rkakat':'p3-3',
 'salads/Quinoa':'p5-0','salads/Fattouch':'p5-1','salads/Mexican':'p5-2',
 'wraps/Smokey Loaded':'p7-0','baguettes/Chipotle Crunch':'p7-1','baguettes/Meet the Meat':'p7-2',
 'light/Chicken Avocado':'p8-0','subs/Submarine':'p10-0','subs/BBQ Cheesy Blast':'p10-1','subs/Fajita':'p10-2',
 'burgers/Swiss Mushroom':'p12-1','burgers/Double BBQ Smashed':'p12-2','burgers/Beef Mexican':'p12-3',
 'sandwiches/Djej Al Massoud':'p14-0','sandwiches/Kabab Orfali':'p14-1','sandwiches/Taouk':'p14-2',
 'platters/Boneless Farrouj Al Massoud':'p16-0','dessert/Fudge Cake':'p18-0',
};
export function MenuBrowser() {
 const [query,setQuery]=useState('');
 const term=query.trim().toLowerCase();
 const visible=menuSections.map(section=>({...section,items:section.items.filter(item=>`${section.title} ${item.name} ${item.description} ${item.options ?? ''}`.toLowerCase().includes(term))})).filter(section=>section.items.length);
 const found=visible.reduce((n,s)=>n+s.items.length,0);
 return <>
  <div className="menu-tools"><label className="dish-search"><Search size={18}/><input aria-label="Search dishes or ingredients" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find your favourite dish…"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={18}/></button>}</label><span className="menu-result" role="status">{query?`${found} ${found===1?'match':'matches'}`:`${itemCount} dishes & drinks`}</span></div>
  <div className="menu-workspace">
   <aside className="menu-index"><p>ON THE MENU</p><nav aria-label="Menu categories"><a href="#menu-top" onClick={()=>flushSync(()=>setQuery(''))}>All categories <span>{itemCount}</span></a>{menuSections.map(section=><a key={section.id} href={'#'+section.id} onClick={()=>flushSync(()=>setQuery(''))}>{section.title}<span>{section.items.length}</span></a>)}</nav><a className="original-menu" href="/menus/diner.pdf" download>Original menu <ArrowUpRight size={15}/></a></aside>
   <div className="menu-chapters">{visible.map((section)=><section className="menu-chapter" key={section.id} id={section.id}>
    <div className="chapter-title"><span>{String(menuSections.findIndex(s=>s.id===section.id)+1).padStart(2,'0')}</span><div><h2>{section.title}</h2><p>{section.note}</p></div><span className="chapter-count">{section.items.length} items</span></div>
    <div className="dish-list">{section.items.map(item=>{const photo=photos[`${section.id}/${item.name}`];return <article className={`dish-entry${photo?' with-photo':''}`} key={item.name} id={`${section.id}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}>{photo&&<img src={'/menu-food/'+photo+'.webp'} alt={item.name} width="96" height="96" loading="lazy"/>}<div className="entry-body"><div className="entry-title"><h3>{item.name}</h3><span className="entry-price">${item.price}</span></div>{item.description&&<p>{item.description}</p>}{item.options&&<p className="entry-options">{item.options}</p>}</div></article>})}</div>
   </section>)}{!visible.length&&<div className="menu-empty"><h2>No dishes found</h2><p>Try another dish or ingredient.</p><button onClick={()=>setQuery('')}>Show the full menu</button></div>}</div>
  </div>
 </>;
}
