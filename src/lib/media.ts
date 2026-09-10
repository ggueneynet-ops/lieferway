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

/** Unique per-dish files — never reuse one photo across a menu. */
export const DISH_FILES: Record<string, string> = {
  "adana kebap": "/media/dishes/adana-kebap.jpg",
  "döner teller": "/media/dishes/doner-teller.jpg",
  iskender: "/media/dishes/iskender.jpg",
  lahmacun: "/media/dishes/lahmacun.jpg",
  "pide mit käse": "/media/dishes/pide-kaese.jpg",
  "baklava (4 stück)": "/media/dishes/baklava.jpg",
  ayran: "/media/dishes/ayran.jpg",
  "tagliatelle al ragù": "/media/dishes/tagliatelle.jpg",
  "spaghetti cacio e pepe": "/media/dishes/cacio-e-pepe.jpg",
  "lasagne della casa": "/media/dishes/lasagne.jpg",
  "tiramisù": "/media/dishes/tiramisu.jpg",
  "classic smash": "/media/dishes/classic-smash.jpg",
  frankfurter: "/media/dishes/frankfurter-burger.jpg",
  "crispy chicken": "/media/dishes/crispy-chicken.jpg",
  "trüffel-pommes": "/media/dishes/trueffel-pommes.jpg",
  "milkshake vanille": "/media/dishes/milkshake.jpg",
  "sakura mix (24 stück)": "/media/dishes/sakura-mix.jpg",
  "veggie set (16 stück)": "/media/dishes/veggie-set.jpg",
  "miso-suppe": "/media/dishes/miso.jpg",
  edamame: "/media/dishes/edamame.jpg",
  "frankfurter schnitzel": "/media/dishes/schnitzel.jpg",
  "rippchen mit kraut": "/media/dishes/rippchen.jpg",
  "handkäs mit musik": "/media/dishes/handkaes.jpg",
  "apfelwein 0,5l": "/media/dishes/apfelwein.jpg",
  "pho bo": "/media/dishes/pho-bo.jpg",
  "pho ga": "/media/dishes/pho-ga.jpg",
  "bun cha": "/media/dishes/bun-cha.jpg",
  "sommerrollen (2 stück)": "/media/dishes/sommerrollen.jpg",
  "ca phe sua da": "/media/dishes/ca-phe.jpg",
  "main rainbow": "/media/dishes/rainbow-bowl.jpg",
  "teriyaki tofu": "/media/dishes/teriyaki-tofu.jpg",
  "lachs-bowl": "/media/dishes/lachs-bowl.jpg",
  "ingwer-shot": "/media/dishes/ingwer-shot.jpg",
  margherita: "/media/dishes/margherita.jpg",
  diavola: "/media/dishes/diavola.jpg",
  "quattro formaggi": "/media/dishes/quattro-formaggi.jpg",
  vesuvio: "/media/dishes/vesuvio.jpg",
  "focaccia rosmarin": "/media/dishes/focaccia.jpg",
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

export function namedDishPhoto(name?: string | null) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return DISH_FILES[key] ?? null;
}

export function dishPhoto(imageUrl?: string | null, cuisine?: string, name?: string) {
  const named = namedDishPhoto(name);
  if (named) return named;
  if (isLocalMedia(imageUrl) && imageUrl && !genericCuisineDish(imageUrl)) return imageUrl;
  if (cuisine && CUISINE_DISH_PHOTO[cuisine]) return CUISINE_DISH_PHOTO[cuisine];
  return DEFAULT_DISH_PHOTO;
}

function genericCuisineDish(url: string) {
  return Object.values(CUISINE_DISH_PHOTO).includes(url) || url === DEFAULT_DISH_PHOTO;
}

export function restaurantInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = parts.map((p) => p[0] ?? "").join("");
  return letters.toUpperCase() || "LW";
}
