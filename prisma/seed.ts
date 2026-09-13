import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { namedDishPhoto } from "../src/lib/media";
import { isLaunchWeekRestaurant } from "../src/lib/constants";

function dishImage(name: string) {
  return namedDishPhoto(name) ?? `/media/dishes/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
}

const prisma = new PrismaClient();

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function main() {
  await prisma.wayPointsLedger.deleteMany();
  await prisma.wayPointsRedemption.deleteMany();
  await prisma.wayPointsVoucher.deleteMany();
  await prisma.wayPointsReward.deleteMany();
  await prisma.wayPointsCampaign.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customerNotice.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.restaurantServiceArea.deleteMany();
  await prisma.partnerApplication.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("lieferway", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@lieferway.de",
      passwordHash,
      name: "Lea Hoffmann",
      phone: "+49 69 12000001",
      role: "ADMIN",
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "kunde@lieferway.de",
      passwordHash,
      name: "Jonas Weber",
      phone: "+49 171 5550101",
      role: "CUSTOMER",
      addresses: {
        create: [
          { label: "Zuhause", street: "Berger Straße 142", city: "Frankfurt am Main", postalCode: "60316" },
          { label: "Arbeit", street: "Leipziger Straße 4", city: "Frankfurt am Main", postalCode: "60487" },
          { label: "Eltern", street: "Schweizer Straße 30", city: "Frankfurt am Main", postalCode: "60594" },
        ],
      },
    },
  });

  const customerTr = await prisma.user.create({
    data: {
      email: "muster@lieferway.de",
      passwordHash,
      name: "Elif Yılmaz",
      phone: "+49 176 4440202",
      role: "CUSTOMER",
      locale: "tr",
      addresses: {
        create: {
          label: "Ev",
          street: "Münchener Straße 48",
          city: "Frankfurt am Main",
          postalCode: "60329",
        },
      },
    },
  });

  const courier = await prisma.user.create({
    data: {
      email: "kurier@lieferway.de",
      passwordHash,
      name: "Emre Kaya",
      phone: "+49 162 3330303",
      role: "COURIER",
    },
  });

  const courier2 = await prisma.user.create({
    data: {
      email: "kurier2@lieferway.de",
      passwordHash,
      name: "Sophie Klein",
      phone: "+49 163 2220404",
      role: "COURIER",
    },
  });

  const restaurantsData = [
    {
      ownerEmail: "restaurant@lieferway.de",
      ownerName: "Mehmet Demir",
      name: "Anadolu Grill",
      slug: "anadolu-grill",
      description:
        "Familiär geführtes anatolisches Restaurant in Sachsenhausen. Holzkohle-Grill, frisches Fladenbrot, hausgemachte Meze.",
      cuisine: "Türkisch",
      address: "Brückenstraße 64",
      postalCode: "60594",
      imageUrl:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
      deliveryFeeCents: 199,
      minOrderCents: 1200,
      etaMin: 25,
      etaMax: 40,
      commissionPercent: 8,
      categories: [
        {
          name: "Grill",
          items: [
            {
              name: "Adana Kebap",
              description: "Scharfe Lammhackspieß, Reis, Salat, Grillgemüse",
              priceCents: 1490,
              imageUrl:
                "https://images.unsplash.com/photo-1603360946369-dc9bb6250415?w=800&q=80",
            },
            {
              name: "Döner Teller",
              description: "Kalbsdöner, Reis oder Pommes, Salat, Soßen nach Wahl",
              priceCents: 1350,
              imageUrl:
                "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&q=80",
            },
            {
              name: "Iskender",
              description: "Döner auf Pide, Joghurtsauce, Butter, Tomatensoße",
              priceCents: 1590,
            },
          ],
        },
        {
          name: "Pide & Lahmacun",
          items: [
            {
              name: "Lahmacun",
              description: "Dünner Teig mit würzigem Hack, Petersilie, Zitrone",
              priceCents: 690,
            },
            {
              name: "Pide mit Käse",
              description: "Ofenheiße Pide, Kashkaval, Ei nach Wunsch",
              priceCents: 1190,
            },
          ],
        },
        {
          name: "Beilagen & Süßes",
          items: [
            {
              name: "Baklava (4 Stück)",
              description: "Butterblätterteig, Pistazie, Honigsirup",
              priceCents: 490,
            },
            {
              name: "Ayran",
              description: "Hausgemacht, leicht gesalzen",
              priceCents: 250,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "pasta@lieferway.de",
      ownerName: "Giulia Conti",
      name: "Pasta e Basta",
      slug: "pasta-e-basta",
      description:
        "Frische Pasta aus Westend. Täglich selbst gemacht, italienische Weine, tiramisù wie in Rom.",
      cuisine: "Italienisch",
      address: "Grüneburgweg 18",
      postalCode: "60322",
      imageUrl:
        "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=80",
      deliveryFeeCents: 249,
      minOrderCents: 1500,
      etaMin: 30,
      etaMax: 50,
      commissionPercent: 8,
      categories: [
        {
          name: "Pasta",
          items: [
            {
              name: "Tagliatelle al ragù",
              description: "Lang geschmorter Rinderragù, Parmigiano",
              priceCents: 1490,
              imageUrl:
                "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80",
            },
            {
              name: "Spaghetti cacio e pepe",
              description: "Pecorino, schwarzer Pfeffer, Butter",
              priceCents: 1290,
            },
            {
              name: "Lasagne della casa",
              description: "Schichten, Béchamel, Ragù, 45 Min. im Ofen",
              priceCents: 1390,
            },
          ],
        },
        {
          name: "Dolci",
          items: [
            {
              name: "Tiramisù",
              description: "Espresso, Mascarpone, Kakao – hausgemacht",
              priceCents: 590,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "burger@lieferway.de",
      ownerName: "Tom Richter",
      name: "Mainhattan Burger",
      slug: "mainhattan-burger",
      description:
        "Smash-Burger und handgeschnittene Pommes in der Innenstadt. Dry-aged Patty, Brioche aus Offenbach.",
      cuisine: "Burger",
      address: "Große Bockenheimer Straße 31",
      postalCode: "60313",
      imageUrl:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80",
      deliveryFeeCents: 299,
      minOrderCents: 1000,
      etaMin: 20,
      etaMax: 35,
      commissionPercent: 8,
      categories: [
        {
          name: "Burger",
          items: [
            {
              name: "Classic Smash",
              description: "Doppel-Patty, Cheddar, Pickles, Mainhattan-Sauce",
              priceCents: 1190,
              imageUrl:
                "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
            },
            {
              name: "Frankfurter",
              description: "Patty, Grüne-Soße-Aioli, Radieschen, Röstzwiebeln",
              priceCents: 1390,
            },
            {
              name: "Crispy Chicken",
              description: "Buttermilch-Panade, Sriracha-Mayo, Krautsalat",
              priceCents: 1290,
            },
          ],
        },
        {
          name: "Sides",
          items: [
            {
              name: "Trüffel-Pommes",
              description: "Handgeschnitten, Parmesan, Schnittlauch",
              priceCents: 490,
            },
            {
              name: "Milkshake Vanille",
              description: "Bourbon-Vanille, Schlagsahne",
              priceCents: 450,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "sushi@lieferway.de",
      ownerName: "Yuki Tanaka",
      name: "Sakura Sushi",
      slug: "sakura-sushi",
      description:
        "Nigiri und Rollen aus dem Bahnhofsviertel. Täglich frischer Fisch, vegetarische Sets, Miso von der Küche.",
      cuisine: "Sushi",
      address: "Moselstraße 22",
      postalCode: "60326",
      imageUrl:
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&q=80",
      deliveryFeeCents: 349,
      minOrderCents: 1800,
      etaMin: 35,
      etaMax: 55,
      commissionPercent: 8,
      categories: [
        {
          name: "Sets",
          items: [
            {
              name: "Sakura Mix (24 Stück)",
              description: "Nigiri, Maki, Inside-Out, Ingwer, Wasabi",
              priceCents: 2490,
              imageUrl:
                "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80",
            },
            {
              name: "Veggie Set (16 Stück)",
              description: "Avocado, Gurke, Süßkartoffel, Tofu",
              priceCents: 1690,
            },
          ],
        },
        {
          name: "Extras",
          items: [
            {
              name: "Miso-Suppe",
              description: "Wakame, Tofu, Frühlingszwiebeln",
              priceCents: 390,
            },
            {
              name: "Edamame",
              description: "Meersalz, Dampf",
              priceCents: 450,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "apfelwein@lieferway.de",
      ownerName: "Hans Schäfer",
      name: "Apfelwein-Stubb",
      slug: "apfelwein-stubb",
      description:
        "Hessische Küche in Sachsenhausen. Grüne Soße, Schnitzel, Handkäs und Apfelwein – auch ohne den Lärm der Zeil.",
      cuisine: "Deutsch",
      address: "Klappergasse 8",
      postalCode: "60594",
      imageUrl:
        "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=1200&q=80",
      deliveryFeeCents: 249,
      minOrderCents: 1400,
      etaMin: 30,
      etaMax: 50,
      commissionPercent: 8,
      categories: [
        {
          name: "Klassiker",
          items: [
            {
              name: "Frankfurter Schnitzel",
              description: "Kalbschnitzel, grüne Soße, Pellkartoffeln",
              priceCents: 1690,
              imageUrl:
                "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=800&q=80",
            },
            {
              name: "Rippchen mit Kraut",
              description: "Gepökeltes, Sauerkraut, Brot",
              priceCents: 1450,
            },
            {
              name: "Handkäs mit Musik",
              description: "Harzer, Zwiebeln, Essig-Öl, Kümmel",
              priceCents: 790,
            },
          ],
        },
        {
          name: "Getränke",
          items: [
            {
              name: "Apfelwein 0,5l",
              description: "Sauer, herb, aus dem Bembel-Fass",
              priceCents: 390,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "pho@lieferway.de",
      ownerName: "Linh Nguyen",
      name: "Pho Saigon",
      slug: "pho-saigon",
      description:
        "Brühe, die 12 Stunden zieht. Nordend-Küche mit frischen Kräutern, Sommerrollen und vietnamesischem Kaffee.",
      cuisine: "Vietnamesisch",
      address: "Berger Straße 238",
      postalCode: "60385",
      imageUrl:
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1200&q=80",
      deliveryFeeCents: 199,
      minOrderCents: 1200,
      etaMin: 25,
      etaMax: 40,
      commissionPercent: 8,
      categories: [
        {
          name: "Pho & Schalen",
          items: [
            {
              name: "Pho Bo",
              description: "Rinderbrühe, Reisnudeln, Tafelspitz, Kräuter",
              priceCents: 1290,
              imageUrl:
                "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80",
            },
            {
              name: "Pho Ga",
              description: "Hühnerbrühe, Zitrone, Koriander",
              priceCents: 1190,
            },
            {
              name: "Bun Cha",
              description: "Gegrilltes Schwein, Reisnudeln, Nuoc Cham",
              priceCents: 1390,
            },
          ],
        },
        {
          name: "Kleinigkeiten",
          items: [
            {
              name: "Sommerrollen (2 Stück)",
              description: "Garnelen, Minze, Erdnusssauce",
              priceCents: 590,
            },
            {
              name: "Ca phe sua da",
              description: "Eis, Kondensmilch, robusta",
              priceCents: 420,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "bowl@lieferway.de",
      ownerName: "Maya Berg",
      name: "Green Bowl",
      slug: "green-bowl",
      description:
        "Bowls, Salate und Smoothies aus Bornheim. Bio-Gemüse vom Wochenmarkt, vegane Protein-Optionen.",
      cuisine: "Gesund",
      address: "Berger Straße 12",
      postalCode: "60316",
      imageUrl:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
      deliveryFeeCents: 249,
      minOrderCents: 1000,
      etaMin: 20,
      etaMax: 35,
      commissionPercent: 8,
      categories: [
        {
          name: "Bowls",
          items: [
            {
              name: "Main Rainbow",
              description: "Quinoa, Kichererbsen, Avocado, Rotkohl, Tahini",
              priceCents: 1290,
              imageUrl:
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
            },
            {
              name: "Teriyaki Tofu",
              description: "Naturreis, Brokkoli, Sesam, Edamame",
              priceCents: 1250,
            },
            {
              name: "Lachs-Bowl",
              description: "Norwegischer Lachs, Gurke, Mango, Soja-Ingwer",
              priceCents: 1490,
            },
          ],
        },
        {
          name: "Drinks",
          items: [
            {
              name: "Ingwer-Shot",
              description: "Ingwer, Zitrone, Apfel, cayenne",
              priceCents: 350,
            },
          ],
        },
      ],
    },
    {
      ownerEmail: "pizza@lieferway.de",
      ownerName: "Luca Esposito",
      name: "Pizza Vesuvio",
      slug: "pizza-vesuvio",
      description:
        "Holzofen-Pizza in Bockenheim. Langer Teigführung, San-Marzano-Tomaten, Fior di Latte.",
      cuisine: "Pizza",
      address: "Leipziger Straße 55",
      postalCode: "60487",
      imageUrl:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80",
      deliveryFeeCents: 199,
      minOrderCents: 1100,
      etaMin: 25,
      etaMax: 40,
      commissionPercent: 8,
      categories: [
        {
          name: "Pizze",
          items: [
            {
              name: "Margherita",
              description: "San Marzano, Fior di Latte, Basilikum",
              priceCents: 1090,
              imageUrl:
                "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
            },
            {
              name: "Diavola",
              description: "Salami piccante, Chili, Honig",
              priceCents: 1390,
            },
            {
              name: "Quattro Formaggi",
              description: "Mozzarella, Gorgonzola, Pecorino, Fontina",
              priceCents: 1450,
            },
            {
              name: "Vesuvio",
              description: "Nduja, Burrata, Rucola – Haus-Signatur",
              priceCents: 1590,
            },
          ],
        },
        {
          name: "Ofen",
          items: [
            {
              name: "Focaccia Rosmarin",
              description: "Olivenöl, grobes Salz",
              priceCents: 490,
            },
          ],
        },
      ],
    },
  ] as const;

  const GEO: Record<
    string,
    { district: string; lat: number; lng: number; plzs: string[]; maxDeliveryKm: number }
  > = {
    "anadolu-grill": {
      district: "Sachsenhausen",
      lat: 50.1075,
      lng: 8.69,
      maxDeliveryKm: 8,
      plzs: ["60594", "60596", "60598", "60599", "60311", "60313", "60329", "60327", "60314"],
    },
    "pasta-e-basta": {
      district: "Westend",
      lat: 50.121,
      lng: 8.67,
      maxDeliveryKm: 6,
      plzs: ["60322", "60323", "60325", "60320", "60313", "60311", "60486", "60487", "60318"],
    },
    "mainhattan-burger": {
      district: "Innenstadt",
      lat: 50.1148,
      lng: 8.6752,
      maxDeliveryKm: 8,
      plzs: ["60311", "60313", "60329", "60322", "60323", "60314", "60316", "60327", "60318", "60325"],
    },
    "sakura-sushi": {
      district: "Bahnhofsviertel",
      lat: 50.1072,
      lng: 8.662,
      maxDeliveryKm: 5,
      plzs: ["60326", "60329", "60327", "60311", "60313", "60486", "60487", "60325"],
    },
    "apfelwein-stubb": {
      district: "Sachsenhausen",
      lat: 50.1048,
      lng: 8.6865,
      maxDeliveryKm: 7,
      plzs: ["60594", "60596", "60598", "60599", "60329", "60311", "60528"],
    },
    "pho-saigon": {
      district: "Bornheim",
      lat: 50.1282,
      lng: 8.722,
      maxDeliveryKm: 6,
      plzs: ["60385", "60316", "60318", "60389", "60314", "60386"],
    },
    "green-bowl": {
      district: "Nordend",
      lat: 50.1182,
      lng: 8.693,
      maxDeliveryKm: 6,
      plzs: ["60316", "60318", "60314", "60313", "60311", "60385", "60322"],
    },
    "pizza-vesuvio": {
      district: "Bockenheim",
      lat: 50.1235,
      lng: 8.628,
      maxDeliveryKm: 8,
      plzs: ["60487", "60486", "60488", "60326", "60325", "60322", "60431"],
    },
  };

  const createdRestaurants: {
    id: string;
    slug: string;
    ownerId: string;
    deliveryFeeCents: number;
    commissionPercent: number;
    itemIds: string[];
  }[] = [];

  for (const r of restaurantsData) {
    const owner = await prisma.user.create({
      data: {
        email: r.ownerEmail,
        passwordHash,
        name: r.ownerName,
        phone: "+49 69 9000" + String(Math.floor(Math.random() * 900 + 100)),
        role: "RESTAURANT",
      },
    });

    const geo = GEO[r.slug];
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        cuisine: r.cuisine,
        address: r.address,
        postalCode: r.postalCode,
        district: geo?.district,
        lat: geo?.lat,
        lng: geo?.lng,
        maxDeliveryKm: geo?.maxDeliveryKm ?? 8,
        imageUrl: `/media/restaurants/${r.slug}.jpg`,
        logoUrl: `/media/logos/${r.slug}.png`,
        rating: 0,
        deliveryFeeCents: r.deliveryFeeCents,
        minOrderCents: r.minOrderCents,
        etaMin: r.etaMin,
        etaMax: r.etaMax,
        commissionPercent: r.commissionPercent,
        pickupAllowed: true,
        launchWeekFreeDelivery: isLaunchWeekRestaurant(r.slug),
        serviceAreas: {
          create: (geo?.plzs ?? [r.postalCode]).map((postalCode) => ({ postalCode })),
        },
      },
    });

    const itemIds: string[] = [];
    let sort = 0;
    for (const cat of r.categories) {
      const category = await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: cat.name,
          sortOrder: sort++,
        },
      });
      for (const item of cat.items) {
        const created = await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            priceCents: item.priceCents,
            imageUrl: dishImage(item.name),
          },
        });
        itemIds.push(created.id);
      }
    }

    createdRestaurants.push({
      id: restaurant.id,
      slug: r.slug,
      ownerId: owner.id,
      deliveryFeeCents: r.deliveryFeeCents,
      commissionPercent: r.commissionPercent,
      itemIds,
    });
  }

  // Platform coupons removed — restaurant Gutschein / WayPoints only (v1).

  const anadolu = createdRestaurants.find((x) => x.slug === "anadolu-grill")!;
  const pizza = createdRestaurants.find((x) => x.slug === "pizza-vesuvio")!;
  const burger = createdRestaurants.find((x) => x.slug === "mainhattan-burger")!;
  const pho = createdRestaurants.find((x) => x.slug === "pho-saigon")!;

  const lastWeek = addDays(mondayOf(new Date()), -7);
  const thisWeek = mondayOf(new Date());

  async function placeOrder(opts: {
    customerId: string;
    restaurant: (typeof createdRestaurants)[number];
    itemIndex: number;
    qty: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: Date;
    courierId?: string;
    couponId?: string;
    couponCode?: string;
    discountCents?: number;
    notes?: string;
    n: number;
  }) {
    const item = await prisma.menuItem.findUniqueOrThrow({
      where: { id: opts.restaurant.itemIds[opts.itemIndex] },
    });
    const food = item.priceCents * opts.qty;
    const discount = opts.discountCents ?? 0;
    const delivery = opts.restaurant.deliveryFeeCents;
    const commissionPercent = opts.restaurant.commissionPercent;
    // Restaurant-funded Gutschein: commission on food after coupon.
    const commissionBase = Math.max(0, food - discount);
    const commissionCents = Math.round((commissionBase * commissionPercent) / 100);
    const restaurantPayoutCents = commissionBase - commissionCents;
    const delivered = opts.status === "DELIVERED";

    return prisma.order.create({
      data: {
        shortCode: `LW-${10000 + opts.n}`,
        customerId: opts.customerId,
        restaurantId: opts.restaurant.id,
        courierId: opts.courierId,
        status: opts.status,
        paymentMethod: opts.paymentMethod,
        paymentStatus: opts.paymentStatus,
        stripePaymentIntentId:
          opts.paymentMethod === "CASH"
            ? null
            : `pi_mock_${opts.n}_${Date.now()}`,
        couponId: opts.couponId,
        couponCode: opts.couponCode,
        foodSubtotalCents: food,
        deliveryFeeCents: delivery,
        discountCents: discount,
        totalCents: food - discount + delivery,
        commissionPercent,
        commissionCents,
        restaurantPayoutCents,
        applicationFeeCents: commissionCents + delivery, // restaurant-funded coupon not platform-absorbed
        platformNetCommissionCents: commissionCents,
        restaurantTransferCents: restaurantPayoutCents,
        restaurantNetCents: restaurantPayoutCents,
        platformNetCents: commissionCents,
        payoutStatus: opts.paymentMethod === "CASH" ? "NONE" : delivered ? "PENDING" : "UNPAID",
        street: "Berger Straße 142",
        city: "Frankfurt am Main",
        postalCode: "60316",
        notes: opts.notes,
        createdAt: opts.createdAt,
        acceptedAt:
          opts.status === "PLACED" || opts.status === "REJECTED"
            ? null
            : addDays(opts.createdAt, 0),
        deliveredAt: delivered ? addDays(opts.createdAt, 0) : null,
        items: {
          create: {
            menuItemId: item.id,
            name: item.name,
            priceCents: item.priceCents,
            quantity: opts.qty,
          },
        },
      },
    });
  }

  let n = 1;
  const anadoluDeliveredA = await placeOrder({
    n: n++,
    customerId: customer.id,
    restaurant: anadolu,
    itemIndex: 0,
    qty: 2,
    status: "DELIVERED",
    paymentMethod: "CARD",
    paymentStatus: "PAID",
    createdAt: addDays(lastWeek, 1),
    courierId: courier.id,
  });
  const anadoluDeliveredB = await placeOrder({
    n: n++,
    customerId: customerTr.id,
    restaurant: anadolu,
    itemIndex: 1,
    qty: 1,
    status: "DELIVERED",
    paymentMethod: "CASH",
    paymentStatus: "CASH_ON_DELIVERY",
    createdAt: addDays(lastWeek, 2),
    courierId: courier.id,
  });
  await placeOrder({
    n: n++,
    customerId: customer.id,
    restaurant: pizza,
    itemIndex: 0,
    qty: 2,
    status: "DELIVERED",
    paymentMethod: "APPLE_PAY",
    paymentStatus: "PAID",
    createdAt: addDays(lastWeek, 3),
    courierId: courier2.id,
    discountCents: Math.round(1090 * 2 * 0.1),
  });
  await placeOrder({
    n: n++,
    customerId: customer.id,
    restaurant: burger,
    itemIndex: 0,
    qty: 2,
    status: "DELIVERED",
    paymentMethod: "GOOGLE_PAY",
    paymentStatus: "PAID",
    createdAt: addDays(lastWeek, 4),
    courierId: courier.id,
  });
  await placeOrder({
    n: n++,
    customerId: customerTr.id,
    restaurant: pho,
    itemIndex: 0,
    qty: 1,
    status: "DELIVERED",
    paymentMethod: "CARD",
    paymentStatus: "PAID",
    createdAt: addDays(lastWeek, 5),
    courierId: courier2.id,
  });

  await placeOrder({
    n: n++,
    customerId: customer.id,
    restaurant: anadolu,
    itemIndex: 0,
    qty: 1,
    status: "PLACED",
    paymentMethod: "CARD",
    paymentStatus: "PAID",
    createdAt: new Date(),
    notes: "Bitte extra scharf, klingeln lassen.",
  });
  await placeOrder({
    n: n++,
    customerId: customerTr.id,
    restaurant: pizza,
    itemIndex: 1,
    qty: 1,
    status: "PREPARING",
    paymentMethod: "CASH",
    paymentStatus: "CASH_ON_DELIVERY",
    createdAt: addDays(thisWeek, 0),
  });
  await placeOrder({
    n: n++,
    customerId: customer.id,
    restaurant: burger,
    itemIndex: 2,
    qty: 1,
    status: "READY",
    paymentMethod: "CARD",
    paymentStatus: "PAID",
    createdAt: new Date(Date.now() - 40 * 60 * 1000),
  });

  const { regeneratePayouts } = await import("../src/lib/payouts");
  await regeneratePayouts();

  const { refreshRestaurantRating } = await import("../src/lib/reviews");
  await prisma.review.create({
    data: {
      orderId: anadoluDeliveredA.id,
      restaurantId: anadolu.id,
      customerId: customer.id,
      rating: 5,
      comment: "Adana Kebap war perfekt, pünktlich an der Tür.",
      reply: "Danke! Freuen uns auf deinen nächsten Besuch.",
      repliedAt: new Date(),
    },
  });
  await prisma.review.create({
    data: {
      orderId: anadoluDeliveredB.id,
      restaurantId: anadolu.id,
      customerId: customerTr.id,
      rating: 4,
      comment: "Lezzetliydi, biraz geç geldi.",
    },
  });
  await refreshRestaurantRating(anadolu.id);

  await prisma.partnerApplication.createMany({
    data: [
      {
        businessName: "Café Mainblick",
        cuisine: "Gesund",
        street: "Mainkai 12",
        postalCode: "60311",
        city: "Frankfurt am Main",
        contactName: "Mira Keller",
        email: "mira@cafemainblick.example",
        phone: "+49 69 24001100",
        website: "https://cafemainblick.example",
        message: "Frühstück und Bowls, Innenstadt. Lieferzeiten 8–16 Uhr.",
        status: "PENDING",
      },
      {
        cuisine: "Deutsch",
        businessName: "Apfelwein Stube Höchst",
        street: "Bolongarostraße 88",
        postalCode: "65929",
        city: "Frankfurt am Main",
        contactName: "Karl Bender",
        email: "karl@apfelweinstube.example",
        phone: "+49 69 30002200",
        message: "Klassische hessische Küche, abends geöffnet.",
        status: "CONTACTED",
      },
    ],
  });

  await prisma.wayPointsSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", pointsPerEuro: 10 },
  });

  console.log("Lieferway seed ready.");
  console.log("  kunde@lieferway.de / lieferway");
  console.log("  restaurant@lieferway.de / lieferway   (Anadolu Grill)");
  console.log("  kurier@lieferway.de / lieferway");
  console.log("  admin@lieferway.de / lieferway");
  console.log("  Partner applications: Café Mainblick (pending), Apfelwein Stube Höchst (contacted)");
  void admin;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
