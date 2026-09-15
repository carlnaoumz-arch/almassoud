export type Dish = { name: string; price: string; description: string; options?: string };
export type MenuSection = { id: string; title: string; note: string; sourcePage: number; items: Dish[] };
const d = (name: string, price: string, description = '', options?: string): Dish => ({ name, price, description, options });
const combo = 'Make it a combo: fries box + soft drink, add $3.50.';
// Checked against the supplied diner PDF; prices are USD.
export const menuSections: MenuSection[] = [
 {id:'starters',title:'Starters',note:'Something good to share.',sourcePage:3,items:[
 d('Fries','3.00','Golden French fries with ketchup.','Platter $5.50 · Al Massoud spices +$0.50'),
 d('Curly Fries','5.50','Imported curly fries with cocktail sauce.','Al Massoud spices +$0.50'),
 d('Chicken Tenders','6.50','4 breaded chicken tenders with honey mustard.','Dipped in BBQ or buffalo +$1.00'),
 d('Mozzarella Sticks','5.50','4 breaded mozzarella sticks with thousand island.','Dipped in BBQ or buffalo +$1.00'),
 d('Rkakat','6.00','4 homemade cheese rolls.'),d('Hummus','3.50','Homemade hummus with olive oil and bread.'),
 d('Grilled Potatoes','3.00','Local grilled potatoes with garlic paste.','Platter $5.50 · Al Massoud spices +$0.50')]},
 {id:'salads',title:'Salads',note:'Fresh greens. Generous bowls.',sourcePage:5,items:[
 d('Fattouch','7.50','Rocket, lettuce, tomato, cucumber, purslane, radish and fried bread with lemon-oil and pomegranate dressing.','Half $5.00'),
 d('Tabboule','7.00','Parsley, tomato, onion and burghul with lemon-oil dressing.','Half $3.50'),
 d('Caesar','6.50','Iceberg lettuce, croutons and parmesan with Caesar dressing.'),
 d('Chicken Caesar','9.50','Iceberg lettuce, chicken, croutons and parmesan with Caesar dressing.'),
 d('Quinoa','9.50','Quinoa, mixed greens, cherry tomato, grilled halloumi and chicken breast with balsamic sauce.'),
 d('Chicken Kale','9.50','Kale, mixed nuts, dried tomato, cranberries, shredded carrot and chicken breast with special balsamic sauce.'),
 d('Mexican','10.50','Grilled chicken, avocado, cheddar, red beans, cherry tomato, iceberg and corn with crispy tortilla and Mexican dressing.')]},
 {id:'wraps',title:'Wraps',note:'Soft tortilla bread. '+combo,sourcePage:7,items:[
 d('BBQ','8.50','Crispy chicken tenders, iceberg, chips, corn, cheddar, honey mustard and BBQ sauce.'),
 d('Crispy','8.50','Crispy chicken tenders, iceberg, corn, melted mixed cheese, pickles, tomato and special sauce.'),
 d('Smokey Loaded','9.50','160g beef patty, crispy onion, bacon, cheddar, mozzarella sticks, BBQ and smokey sauce.'),
 d('Honey Chicken Wrap','8.50','Breaded chicken tenders, cheddar, iceberg, pickles and honey mustard.')]},
 {id:'baguettes',title:'Baguettes',note:'Freshly baked baguette bread. '+combo,sourcePage:7,items:[
 d('Honey Chicken','8.50','Breaded chicken tenders, cheddar, iceberg, pickles and honey mustard.'),
 d('Rosto','6.50','Roasted beef, pickles, tomato, lettuce and mayo-mustard sauce.'),
 d('Chipotle Crunch','8.50','Breaded chicken tenders, cheddar, iceberg, pickles, honey mustard and chipotle sauce.'),
 d('Meet the Meat','11.00','150g grilled steak, grilled onion and tomato, mushrooms, cheddar and steak sauce.'),
 d('Philly Steak','11.00','Grilled steak, iceberg, tomato, bell pepper, onion, cheddar, sautéed fresh mushrooms and special chili sauce.'),
 d('Philly Chicken','9.50','Marinated chicken breast, iceberg, tomato, bell pepper, onion, mozzarella and special chili sauce.')]},
 {id:'light',title:'Light',note:'A lighter kind of good.',sourcePage:8,items:[
 d('Chicken Platter','13.50','3 pieces (390g) of chicken breast, grilled potato, pickles, garlic paste and a side salad.','Half: 2 pieces (260g), $11.00'),
 d('Chicken Light','8.50','130g chicken breast, rocket, pickles, light mayo and balsamic in a multicereal baguette.'),
 d('Halloumi','7.00','Grilled halloumi, tomato, rocket and pesto in a multicereal baguette.'),
 d('Chicken Avocado','9.00','120g chicken breast, rocket, fresh avocado and Dijonaise in a multicereal baguette.')]},
 {id:'subs',title:'Subs',note:'Served in submarine bread. '+combo,sourcePage:10,items:[
 d('Chicken Sub','8.50','160g grilled chicken breast, iceberg, tomato, pickles, melted mozzarella and garlic mayo.','Add ham +$0.60'),
 d('Chicken Escalope Al Massoud','8.50','Breaded chicken tenders, cheddar, fries, coleslaw, corn, pickles, Al Massoud sauce and garlic.'),
 d('Chicken Supreme','9.00','150g chicken breast, lettuce, pickles, tomato, fries, ham, cheese and mayo.'),
 d('Francisco','9.00','160g chicken breast, corn, pickles, lettuce, mayo, mozzarella and soy sauce.'),
 d('Submarine','9.00','Emmental, ham, salami, lettuce, pickles, tomato and Dijonaise.'),
 d('Fajita','9.00','160g marinated grilled chicken, onion, bell pepper, melted cheese and avocado-mayo.'),
 d('Philadelphia','10.00','150g tender beef slices, onion, bell pepper, melted cheese, steak sauce and special avocado sauce.'),
 d('Steak','11.00','150g grilled steak, grilled onion, sautéed mushrooms, emmental and steak sauce.'),
 d('BBQ Cheesy Blast','11.00','160g beef patty, crispy onion, bacon, cheddar, mozzarella sticks, BBQ and smokey sauce.')]},
 {id:'burgers',title:'Burgers',note:combo,sourcePage:12,items:[
 d('Chicken','6.00','130g chicken breast, lettuce, pickles and garlic mayo.','Add mozzarella patty +$2.50'),
 d('Crispy Chicken','6.50','Crispy chicken breast, iceberg, cheddar, pickles, chipotle and honey mustard.'),
 d('Swiss Mushroom','9.00','130g grilled beef patty, emmental, sautéed onion and mushrooms, rocket and special Swiss sauce.'),
 d('Burger El Beit','6.00','130g grilled beef patty, grilled onion and tomato, fries, pickles, ketchup, mustard and coleslaw.'),
 d('American Classic','6.00','130g grilled beef patty, onion, tomato, lettuce, pickles and cocktail sauce.','Add mozzarella patty +$2.50'),
 d('Mozzarella','5.50','Breaded mozzarella patty, onion, lettuce, tomato, pickles and cocktail sauce.'),
 d('Simple Smashed','7.50','Two 80g smashed beef patties, double cheddar, pickles, onion and smoky sauce.'),
 d('Al Massoud Smashed','10.00','Two 80g smashed beef patties, double cheddar, crispy onion, crispy bacon, mozzarella sticks, BBQ and smokey sauce.'),
 d('Beef Mexican','9.50','Beef patty, cheddar patty, avocado-mayo, grilled bell pepper and onion, tomato, tortilla chips and sriracha mayo.'),
 d('Double BBQ Smashed','9.00','Two 80g smashed beef patties, double cheddar, crispy onion, crispy bacon, BBQ and steak sauce.'),
 d('Fish Burger','6.00','Fried fish filet, pickles, iceberg and tartar sauce.')]},
 {id:'sandwiches',title:'Sandwiches',note:'3al Fahem · Choose Arabic or Tannour bread. '+combo,sourcePage:14,items:[
 d('Djej Al Massoud','5.50','Al Massoud chicken, pickles, garlic cream and special sauce.','XL $7.50'),
 d('Djej Al Massoud Sfeyen','6.00','Chicken breast, pickles, garlic cream and Al Massoud special sauce.'),
 d('Djej','5.25','Chicken, pickles and garlic cream.','XL $7.50'),
 d('Fries','3.25','Golden fries, coleslaw, ketchup, pickles and garlic paste.','XL $4.50'),
 d('Taouk','5.50','130g marinated chicken breast, pickles, fries, coleslaw and garlic paste.','XL $7.50'),
 d('Kabab','5.25','110g ground-meat kabab, hummus, grilled tomato, pickles and grilled onion.'),
 d('Kabab Orfali','6.00','110g kabab, hummus, pickles, grilled tomato, eggplant, chilli peppers and onion.'),
 d('Kabab Halabi','5.25','110g spiced kabab, hummus, pickles, grilled tomato and onion with hot chili paste.'),
 d('Kabab Batenjein','5.50','110g kabab, grilled eggplant, hummus and pickles.'),
 d('Kafta','5.25','110g kafta, hummus, tomato, pickles and biwaz.'), d('Meat Veal','8.50')]},
 {id:'kaake',title:'Kaake',note:'3al Fahem.',sourcePage:14,items:[
 d('Kaaket Al Massoud','5.50','Chicken, pickles, garlic cream and Al Massoud special sauce.','Add mozzarella +$0.70')]},
 {id:'platters',title:'Platters',note:'From the grill, with all the good sides.',sourcePage:16,items:[
 d('Boneless Farrouj Al Massoud','21.00','Boneless chicken, garlic bread, garlic paste, Al Massoud garlic, pickles, fries and coleslaw.','1,200g $21.00 · Half 600g $11.50'),
 d('Boneless Farrouj Al Massoud Plain','18.00','Marinated boneless chicken, garlic bread, 2 garlic pastes, Al Massoud sauce and pickles.','1,200g $18.00 · Half 600g $10.00'),
 d('Boneless Farrouj Original','21.00','Boneless chicken, garlic bread, garlic paste, garlic cream, pickles, fries and coleslaw.','1,200g $21.00 · Half 600g $11.50'),
 d('Boneless Farrouj Original Plain','18.00','Marinated chicken breast, garlic bread, 2 garlic pastes and pickles.','1,200g $18.00 · Half 600g $10.00'),
 d('Farrouj Original','19.00','Marinated whole chicken, garlic bread, garlic paste, pickles, fries and coleslaw.','1,400g $19.00 · Half 700g $10.50'),
 d('Farrouj Original Plain','16.00','Marinated whole chicken, garlic bread, 2 garlic pastes and pickles.','1,400g $16.00 · Half 700g $9.00'),
 d('Farrouj Al Massoud','19.00','Whole chicken, garlic bread, garlic paste, Al Massoud garlic, pickles, fries and coleslaw.','1,400g $19.00 · Half 700g $10.50'),
 d('Farrouj Al Massoud Plain','16.00','Whole chicken, garlic bread, 2 garlic pastes and pickles.','1,400g $16.00 · Half 700g $9.00'),
 d('Taouk','10.50','Chicken skewers, garlic bread, garlic paste, pickles, fries, Al Massoud garlic and coleslaw.','Platter $10.50 · 600g $24.00 · 1,200g $36.00'),
 d('Kafta','11.00','Kafta skewers, grilled onion, bell pepper and eggplant, hummus, hot chili bread, pickles, fries and small tabbouleh.','Platter $11.00 · 600g $22.00 · 1,200g $36.00'),
 d('Kabab','11.00','Kabab skewers, grilled onion, bell pepper and eggplant, hummus, hot chili bread, pickles, fries and small tabbouleh.','Platter $11.00 · 600g $22.00 · 1,200g $36.00'),
 d('Veal Meat','19.00','Veal skewers, grilled tomato and onion, hummus, pickles, fries and small tabbouleh.','Platter $19.00 · 600g $38.00 · 1,400g $69.00'),
 d('Mixed Grill Veal','19.00','Taouk, 2 kabab skewers and a veal skewer with grilled onion, bell pepper and eggplant, hummus, hot chili bread, garlic paste, coleslaw, pickles, fries and small tabbouleh.','Platter $19.00 · 700g $36.00 · 1,400g $59.00'),
 d('Escalope','11.00','2 pieces of escalope, fries, coleslaw, pickles and honey mustard.')]},
 {id:'trays',title:'Al Massoud Trays',note:'Your favourite sandwich, made a meal.',sourcePage:16,items:[
 d('Djej Al Massoud','10.00','Al Massoud chicken sandwich, pickles, fries, garlic cream, coleslaw and Al Massoud special garlic.'),
 d('Taouk','10.00','Taouk sandwich, pickles, fries, coleslaw and Al Massoud special garlic.')]},
 {id:'dessert',title:'Dessert',note:'A little room for something sweet.',sourcePage:18,items:[
 d('Fudge Cake','8.00','Served with a vanilla scoop.'), d('Cookie Bomb','8.00','Topped with caramel sauce, served with a vanilla scoop.')]},
 {id:'drinks',title:'Drinks',note:'The finishing touch.',sourcePage:18,items:[
 d('Pepsi','1.30'),d('Diet Pepsi','1.30'),d('7Up','1.30'),d('Diet 7Up','1.30'),d('Miranda','1.30'),d('Ice Tea','1.50'),d('Ice Tea Diet','1.50'),d('Fresh Orange','3.00'),d('Fresh Lemonade','3.00'),d('Water 0.5','0.50'),d('Sparkling Water','1.50')]},
];
export const itemCount = menuSections.reduce((n,s)=>n+s.items.length,0);
