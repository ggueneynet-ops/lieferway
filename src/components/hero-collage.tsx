const PHOTOS = [
  "/media/restaurants/anadolu-grill.jpg",
  "/media/restaurants/pizza-vesuvio.jpg",
  "/media/restaurants/sakura-sushi.jpg",
];

export function HeroCollage() {
  return (
    <div className="pointer-events-none relative mx-auto hidden h-[300px] w-[300px] lg:block" aria-hidden>
      <span className="absolute -right-6 -top-8 size-40 rounded-full bg-[#FCE4EC]/90" />
      <span className="absolute -bottom-10 left-4 size-28 rounded-full bg-[#F8BBD0]/40" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTOS[0]}
        alt=""
        className="absolute top-6 left-0 h-40 w-32 rounded-2xl object-cover shadow-[0_16px_40px_rgba(17,24,39,0.18)] ring-2 ring-white"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTOS[1]}
        alt=""
        className="absolute right-2 top-0 h-36 w-40 rounded-2xl object-cover shadow-[0_16px_40px_rgba(17,24,39,0.16)] ring-2 ring-white"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTOS[2]}
        alt=""
        className="absolute bottom-2 left-14 h-32 w-44 rounded-2xl object-cover shadow-[0_16px_40px_rgba(17,24,39,0.18)] ring-2 ring-white"
      />
    </div>
  );
}
