/** Local marketplace photos — hosted in /public so they load on iPhone without Unsplash. */

export const DEFAULT_RESTAURANT_PHOTO = "/media/restaurants/default.jpg";
export const DEFAULT_DISH_PHOTO = "/media/dishes/sides.jpg";

export const CUISINE_RESTAURANT_PHOTO: Record<string, string> = {
  Türkisch: "/media/restaurants/anadolu-grill.jpg",
  Italienisch: "/media/restaurants/pasta-e-basta.jpg",
  Burger: "/media/restaurants/mainhattan-burger.jpg",
  Sushi: "/media/restaurants/sakura-sushi.jpg",
  Deutsch: "/media/restaurants/apfelwein-stubb.jpg",
  Vietnamesisch: "/media/restaurants/pho-saigon.jpg",
  Gesund: "/media/restaurants/green-bowl.jpg",
  Pizza: "/media/restaurants/pizza-vesuvio.jpg",
};

export const CUISINE_DISH_PHOTO: Record<string, string> = {
  Türkisch: "/media/dishes/kebab.jpg",
  Italienisch: "/media/dishes/pasta.jpg",
  Burger: "/media/dishes/burger.jpg",
  Sushi: "/media/dishes/sushi.jpg",
  Deutsch: "/media/dishes/schnitzel.jpg",
  Vietnamesisch: "/media/dishes/pho.jpg",
  Gesund: "/media/dishes/bowl.jpg",
  Pizza: "/media/dishes/pizza.jpg",
};

function isLocalMedia(url?: string | null) {
  return Boolean(url && url.startsWith("/media/"));
}

const SEED_SLUGS = new Set([
  "anadolu-grill",
  "pasta-e-basta",
  "mainhattan-burger",
  "sakura-sushi",
  "apfelwein-stubb",
  "pho-saigon",
  "green-bowl",
  "pizza-vesuvio",
]);

export function restaurantPhoto(imageUrl?: string | null, cuisine?: string, slug?: string) {
  if (isLocalMedia(imageUrl)) return imageUrl as string;
  if (slug && SEED_SLUGS.has(slug)) return `/media/restaurants/${slug}.jpg`;
  if (cuisine && CUISINE_RESTAURANT_PHOTO[cuisine]) return CUISINE_RESTAURANT_PHOTO[cuisine];
  return DEFAULT_RESTAURANT_PHOTO;
}

export function dishPhoto(imageUrl?: string | null, cuisine?: string, name?: string) {
  if (isLocalMedia(imageUrl)) return imageUrl as string;
  const n = (name ?? "").toLowerCase();
  if (/kebap|kebab|lahmacun|iskender|pide/.test(n)) return "/media/dishes/kebab.jpg";
  if (/döner|doner/.test(n)) return "/media/dishes/doner.jpg";
  if (/pasta|spaghetti|tagliatelle|lasagne/.test(n)) return "/media/dishes/pasta.jpg";
  if (/burger|smash|chicken/.test(n)) return "/media/dishes/burger.jpg";
  if (/sushi|nigiri|maki|edamame/.test(n)) return "/media/dishes/sushi.jpg";
  if (/schnitzel|rippchen|handkäs|handkaes/.test(n)) return "/media/dishes/schnitzel.jpg";
  if (/pho|bun cha|sommerrolle/.test(n)) return "/media/dishes/pho.jpg";
  if (/bowl|salat|quinoa|tofu|lachs/.test(n)) return "/media/dishes/bowl.jpg";
  if (/pizza|focaccia|margherita|diavola|vesuvio|formaggi/.test(n)) return "/media/dishes/pizza.jpg";
  if (/baklava|tiramis|dessert|kuchen/.test(n)) return "/media/dishes/dessert.jpg";
  if (/ayran|wein|shake|shot|cafe|kaffee|pho.*da|ca phe/.test(n)) return "/media/dishes/drink.jpg";
  if (/pommes|fries/.test(n)) return "/media/dishes/fries.jpg";
  if (cuisine && CUISINE_DISH_PHOTO[cuisine]) return CUISINE_DISH_PHOTO[cuisine];
  return DEFAULT_DISH_PHOTO;
}

export function restaurantInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = parts.map((p) => p[0] ?? "").join("");
  return letters.toUpperCase() || "LW";
}
