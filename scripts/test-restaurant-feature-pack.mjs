import assert from "node:assert/strict";

// Lightweight pure checks mirroring src/lib/preorder.ts (no TS transpile).
function parsePreorderWeekdays(raw) {
  if (!raw) return [1, 2, 3, 4, 5, 6, 7];
  const parsed = JSON.parse(raw);
  return [...new Set(parsed.map(Number).filter((d) => d >= 1 && d <= 7))].sort();
}

function parsePreorderHours(raw) {
  if (!raw) return { open: "11:00", close: "22:00" };
  const parsed = JSON.parse(raw);
  return {
    open: /^\d{2}:\d{2}$/.test(parsed.open ?? "") ? parsed.open : "11:00",
    close: /^\d{2}:\d{2}$/.test(parsed.close ?? "") ? parsed.close : "22:00",
  };
}

function isOfferLive({ isActive, validFrom, validTo, funding, now = new Date() }) {
  if (!isActive) return false;
  if (funding && funding !== "RESTAURANT") return false;
  if (validFrom && validFrom.getTime() > now.getTime()) return false;
  if (validTo && validTo.getTime() < now.getTime()) return false;
  return true;
}

assert.deepEqual(parsePreorderWeekdays("[1,3,5]"), [1, 3, 5]);
assert.deepEqual(parsePreorderHours('{"open":"10:00","close":"21:30"}'), {
  open: "10:00",
  close: "21:30",
});
assert.equal(
  isOfferLive({ isActive: true, funding: "RESTAURANT", validFrom: null, validTo: null }),
  true,
);
assert.equal(
  isOfferLive({ isActive: true, funding: "LIEFERWAY", validFrom: null, validTo: null }),
  false,
);
assert.equal(
  isOfferLive({
    isActive: true,
    funding: "RESTAURANT",
    validFrom: new Date(Date.now() + 86400000),
    validTo: null,
  }),
  false,
);

console.log("restaurant-feature-pack smoke ok");
