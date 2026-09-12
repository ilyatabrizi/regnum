// The menu.
//
// PREVIEW: every name, description and price here stands in until REGNUM sends
// their card. The photographed dishes are the ones in their own frames — the
// breakfast tray, the brunch table, the three drinks on green marble — and the
// rest are what a café and restaurant in Tabriz serves, priced against real
// 2026 menus. Photos are keys into js/photos.js; `pos` is the focus for a
// square crop, so a dish stays in frame when the row crops it to 64×64.

export const CATEGORIES = [
  { id: "breakfast", name: "Breakfast", note: "Laid out on the tray, until one in the afternoon." },
  { id: "brunch", name: "Brunch", note: "Sweet plates, all day." },
  { id: "kitchen", name: "Kitchen", note: "From the pass — pizza, pasta, the grill." },
  { id: "coffee", name: "Coffee", note: "Espresso bar, open all day." },
  { id: "tea", name: "Tea", note: "Brewed in the pot, never from a bag." },
  { id: "cold", name: "Cold", note: "Mocktails, shaken and poured tall." },
  { id: "sweets", name: "Sweets", note: "" },
];

/** Choices a plate or a drink can take. The first choice is how it comes. */
export const OPTION_GROUPS = {
  size: { name: "Size", choices: [{ id: "regular", label: "Regular" }, { id: "large", label: "Large", add: 60000 }] },
  shot: { name: "Espresso", choices: [{ id: "single", label: "Single" }, { id: "double", label: "Double", add: 50000 }] },
  milk: { name: "Milk", choices: [{ id: "whole", label: "Whole" }, { id: "oat", label: "Oat", add: 40000 }, { id: "almond", label: "Almond", add: 40000 }, { id: "lactose", label: "Lactose-free", add: 30000 }] },
  sweet: { name: "Sweetness", choices: [{ id: "usual", label: "As it comes" }, { id: "less", label: "Less sweet" }, { id: "none", label: "No sugar" }] },
  ice: { name: "Ice", choices: [{ id: "usual", label: "Regular ice" }, { id: "less", label: "Less ice" }] },
  eggs: { name: "Eggs", choices: [{ id: "omelette", label: "Omelette" }, { id: "fried", label: "Fried" }, { id: "boiled", label: "Soft-boiled" }] },
  serves: { name: "Serves", choices: [{ id: "two", label: "Two" }, { id: "four", label: "Four", add: 900000 }] },
};

export const ITEMS = [
  // breakfast — their tray, photographed
  { id: "royal-breakfast", cat: "breakfast", name: "Regnum Breakfast", desc: "The whole tray for two: the pot on its burner, sesame barbari fresh from the oven, the skillet, eggs, honey, butter, cream and the sweet box.",
    price: 1650000, photo: "tea-service", pos: "50% 46%", tag: "For two", options: ["serves", "eggs"] },
  { id: "breakfast-plate", cat: "breakfast", name: "Continental Plate", desc: "Eggs your way, toast, cream, chocolate, sour cherry, banana and a glass of orange, pressed that morning.",
    price: 820000, photo: "breakfast-plate", pos: "50% 48%", options: ["eggs"] },
  { id: "omelette", cat: "breakfast", name: "Garden Omelette", desc: "Folded over tomato and herbs, with olives, tomato and greens dressed around the plate.",
    price: 690000, photo: "omelette", pos: "62% 62%" },
  { id: "green-plate", cat: "breakfast", name: "Green Plate", desc: "Soft-boiled eggs, grilled chicken, cucumber, tomato, rocket and a warm sesame roll.",
    price: 740000, photo: "salad", pos: "50% 46%" },
  { id: "sesame-buns", cat: "breakfast", name: "Sesame Barbari", desc: "A basket of small sesame loaves, baked here, brought out hot.",
    price: 180000, photo: "buns", pos: "50% 50%" },

  // brunch — the sweet half of the table
  { id: "french-toast", cat: "brunch", name: "Berry French Toast", desc: "Brioche in cinnamon custard, raspberries, blueberries, caramelised banana and a scoop of clotted cream.",
    price: 780000, photo: "french-toast", pos: "50% 50%", tag: "Popular" },
  { id: "fig-toast", cat: "brunch", name: "Fig & Peach Toast", desc: "The same toast, dressed with roast figs, peach and icing sugar.",
    price: 790000, photo: "berry-toast", pos: "50% 48%" },
  { id: "pancakes", cat: "brunch", name: "Chocolate Pancakes", desc: "A stack of six, dark chocolate poured over, berries on the side.",
    price: 690000, photo: "pancakes", pos: "50% 50%" },
  { id: "halva-cake", cat: "brunch", name: "Cashew Halva Cake", desc: "Baked halva with cashew cream, figs, almonds and dried plum.",
    price: 720000, photo: "halva-cake", pos: "50% 50%" },

  // kitchen
  { id: "skillet-pizza", cat: "kitchen", name: "Skillet Pepperoni", desc: "A single pizza baked and served in the pan, pepperoni, olive and green shoots.",
    price: 690000, photo: "skillet-pizza", pos: "50% 50%", tag: "Kitchen" },
  { id: "pizza-regnum", cat: "kitchen", name: "Pizza Regnum", desc: "Thin base, aged mozzarella, salami, roast pepper and basil from the counter.",
    price: 980000, photo: "pizza", pos: "50% 48%", tag: "Kitchen" },
  { id: "pasta-alfredo", cat: "kitchen", name: "Chicken Alfredo", desc: "Fettuccine, cream, parmesan and grilled chicken.", price: 1090000, glyph: "bowl" },
  { id: "beef-stroganoff", cat: "kitchen", name: "Beef Stroganoff", desc: "Beef, mushroom and cream, with rice or potato.", price: 1390000, glyph: "plate" },
  { id: "chicken-schnitzel", cat: "kitchen", name: "Chicken Schnitzel", desc: "Breaded and fried, with fries and a garlic dip.", price: 1150000, glyph: "plate" },
  { id: "caesar", cat: "kitchen", name: "Caesar Salad", desc: "Cos, parmesan, croutons and grilled chicken.", price: 790000, glyph: "bowl" },
  { id: "mushroom-soup", cat: "kitchen", name: "Mushroom Soup", desc: "Cream of mushroom, with bread.", price: 420000, glyph: "bowl" },

  // coffee
  { id: "espresso", cat: "coffee", name: "Espresso", desc: "The house blend, pulled short.", price: 190000, glyph: "cup", options: ["shot"] },
  { id: "americano", cat: "coffee", name: "Americano", desc: "Espresso lengthened with hot water.", price: 220000, glyph: "cup", options: ["size", "shot"] },
  { id: "cappuccino", cat: "coffee", name: "Cappuccino", desc: "Espresso, steamed milk, a deep cap of foam.", price: 270000, glyph: "cup", options: ["size", "milk", "sweet"] },
  { id: "latte", cat: "coffee", name: "Caffè Latte", desc: "Espresso and a lot of silky milk.", price: 270000, glyph: "cup", options: ["size", "milk", "sweet"] },
  { id: "flat-white", cat: "coffee", name: "Flat White", desc: "A double ristretto under a thin layer of milk.", price: 290000, glyph: "cup", options: ["milk"] },
  { id: "spanish-latte", cat: "coffee", name: "Spanish Latte", desc: "Espresso, milk and condensed milk.", price: 310000, glyph: "cup", tag: "Popular", options: ["size", "milk"] },
  { id: "mocha", cat: "coffee", name: "Mocha", desc: "Espresso, dark chocolate, steamed milk.", price: 310000, glyph: "cup", options: ["size", "milk", "sweet"] },
  { id: "v60", cat: "coffee", name: "V60 Pour-over", desc: "Single origin, brewed by hand. Ask for today's bean.", price: 330000, glyph: "pour" },
  { id: "iced-latte", cat: "coffee", name: "Iced Latte", desc: "Espresso over cold milk and ice.", price: 290000, glyph: "iced", options: ["size", "milk", "sweet", "ice"] },
  { id: "cold-brew", cat: "coffee", name: "Cold Brew", desc: "Steeped for eighteen hours. Smooth, strong, black.", price: 300000, glyph: "iced", options: ["size", "ice"] },
  { id: "hot-chocolate", cat: "coffee", name: "Hot Chocolate", desc: "Melted dark chocolate and steamed milk.", price: 280000, glyph: "cup", options: ["size", "milk", "sweet"] },

  // tea — the pot, and the box that comes with it
  { id: "persian-tea", cat: "tea", name: "Tea for Two", desc: "Black tea in the pot, kept hot over its own burner, poured into estekan.",
    price: 340000, photo: "tea-pot", pos: "50% 44%", tag: "For two" },
  { id: "sweet-box", cat: "tea", name: "The Sweet Box", desc: "Saffron nabat, rose buds, cinnamon bark, pashmak and sugar — the box that comes to the table with the pot.",
    price: 260000, photo: "sweet-box", pos: "50% 50%" },
  { id: "herbal", cat: "tea", name: "Herbal Infusion", desc: "Borage, orange blossom or lemon verbena — ask which.", price: 230000, glyph: "tea" },
  { id: "green-tea", cat: "tea", name: "Green Tea", desc: "Loose-leaf sencha.", price: 210000, glyph: "tea" },
  { id: "chai", cat: "tea", name: "Masala Chai", desc: "Black tea simmered with milk and spice.", price: 280000, glyph: "cup", options: ["milk", "sweet"] },

  // cold — their three, on the green marble
  { id: "red-berry", cat: "cold", name: "Red Crown", desc: "Sour cherry and red berries over crushed ice, lime and an edible flower.",
    price: 380000, photo: "red-drink", pos: "50% 52%", tag: "Signature", options: ["size", "sweet", "ice"] },
  { id: "mango-royal", cat: "cold", name: "Mango Royal", desc: "Mango blended thick and served in the coupe, chilli and lime leaf across the top.",
    price: 390000, photo: "mango-drink", pos: "50% 48%", tag: "Signature", options: ["size", "sweet"] },
  { id: "blue-garden", cat: "cold", name: "Blue Garden", desc: "Blue citrus and soda over ice, pineapple, berry and rosemary.",
    price: 380000, photo: "blue-drink", pos: "52% 46%", tag: "Signature", options: ["size", "sweet", "ice"] },
  { id: "lemonade", cat: "cold", name: "Mint Lemonade", desc: "Pressed lemon, a fistful of mint, blended with ice.", price: 290000, glyph: "iced", options: ["size", "sweet", "ice"] },
  { id: "orange", cat: "cold", name: "Orange, Pressed", desc: "Nothing else in the glass.", price: 260000, glyph: "iced" },
  { id: "smoothie", cat: "cold", name: "Berry Smoothie", desc: "Red berries and cold milk, blended thick.", price: 330000, glyph: "iced", options: ["milk", "sweet"] },

  // sweets
  { id: "brownie", cat: "sweets", name: "Chocolate Brownie", desc: "Warm, with a dark chocolate sauce poured at the table.", price: 320000, glyph: "cake" },
  { id: "cheesecake", cat: "sweets", name: "Basque Cheesecake", desc: "Burnt on top, soft in the middle.", price: 340000, glyph: "cake" },
  { id: "butter-croissant", cat: "sweets", name: "Butter Croissant", desc: "Just butter, and a lot of layers.", price: 200000, glyph: "croissant" },
  { id: "pistachio-croissant", cat: "sweets", name: "Pistachio Croissant", desc: "Butter croissant, pistachio cream, crushed pistachio.", price: 300000, glyph: "croissant" },
  { id: "affogato", cat: "sweets", name: "Affogato", desc: "Vanilla ice cream drowned in a shot of espresso.", price: 290000, glyph: "cup" },
];

const INDEX = new Map(ITEMS.map((i) => [i.id, i]));
export const byId = (id) => INDEX.get(id) || null;
export const inCat = (cat) => ITEMS.filter((i) => i.cat === cat);
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || null;

/** What the home page leads with. */
export const SIGNATURES = ["royal-breakfast", "french-toast", "red-berry", "pizza-regnum", "mango-royal", "persian-tea"];
export const KITCHEN = ["skillet-pizza", "omelette"];
