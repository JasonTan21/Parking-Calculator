/* Multi-mall parking-rate profiles. Reviewed 2026-11-05. Estimates only.
 * Rates may change. Do not use for multi-day or overnight fee calculation.
 * The Starling legacy calculation is intentionally preserved in script.js.
 */
const PARKING_MALL_RATES = (() => {
  "use strict";
  const MAX_SUPPORTED_MINUTES = 1440;
  const MALLS = {
    starling: {
      name: "The Starling Mall",
      source: "https://parkinginmalaysia.com/the-starling-mall-parking-rates/",
      note: "Existing Starling formula: RM1 first 2 hours, +RM1 in the 3rd and 4th hours, then +RM2 per hour. Verify rates at the entrance.",
      modes: [{ id: "standard", name: "Basement / Multi-level" }]
    },
    sunway: {
      name: "Sunway Pyramid",
      source: "https://www.sunwaypyramid.com/faq/carpark-what-are-the-parking-rates-54887754c20fce497eea890aff8ec1fb",
      note: "Standard parking has a 10-minute entry grace period and a daily maximum. Overnight parking is not permitted. Select public holidays and their eves manually.",
      modes: [{ id: "standard", name: "Standard parking" }, { id: "preferred", name: "Preferred parking" }]
    },
    utama: {
      name: "1 Utama Shopping Centre",
      source: "https://www.1utama.com.my/services/",
      note: "1PAY requires a registered vehicle. Does not cover Express, Dataran, valet, merchant rebates or promotions.",
      modes: [
        { id: "regular-1pay", name: "Regular — registered 1PAY" },
        { id: "regular-non1pay", name: "Regular — non-1PAY" },
        { id: "preferred-1pay", name: "ONECARD Preferred — 1PAY" }
      ]
    }
  };
  function modesFor(mallId) {
    return (MALLS[mallId] || MALLS.starling).modes;
  }
  function isWeekend(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return false;
    const parts = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return false;
    return date.getUTCDay() === 0 || date.getUTCDay() === 6;
  }
  function getProfile(mallId, modeId, isoEntryDate, holidayOrEve = false) {
    if (mallId === "starling") return null;
    if (mallId === "sunway") {
      if (modeId === "preferred") {
        return { mallId, modeId, firstMinutes: 60, firstFee: 5,
          extraHourFee: 2, graceMinutes: 0, maxFee: null,
          summary: "Preferred parking: RM5 first hour, then +RM2/hour; no stated maximum." };
      }
      const special = isWeekend(isoEntryDate) || holidayOrEve === true;
      return { mallId, modeId: "standard", firstMinutes: 60,
        firstFee: special ? 3 : 2, extraHourFee: 1, graceMinutes: 10,
        maxFee: special ? 15 : 12,
        summary: special
          ? "Weekend / holiday / eve: RM3 first hour, then +RM1/hour, RM15 daily maximum."
          : "Weekday: RM2 first hour, then +RM1/hour, RM12 daily maximum." };
    }
    if (mallId === "utama") {
      const price = modeId === "regular-non1pay" || modeId === "preferred-1pay" ? 4 : 2;
      const name = modeId === "preferred-1pay" ? "ONECARD Preferred"
        : modeId === "regular-non1pay" ? "Regular non-1PAY" : "Regular 1PAY";
      return { mallId, modeId, firstMinutes: 240, firstFee: price,
        extraHourFee: 2, graceMinutes: 0, maxFee: null,
        summary: name + ": RM" + price + " first 4 hours, then +RM2/hour." };
    }
    return null;
  }
  function fee(minutes, profile) {
    if (!profile || !Number.isFinite(minutes)) return null;
    if (minutes <= 0) return 0;
    if (minutes > MAX_SUPPORTED_MINUTES) return null;
    if (minutes <= profile.graceMinutes) return 0;
    const amount = profile.firstFee +
      Math.ceil(Math.max(0, minutes - profile.firstMinutes) / 60) * profile.extraHourFee;
    return profile.maxFee === null ? amount : Math.min(amount, profile.maxFee);
  }
  function maxMinutesForBudget(budget, profile) {
    if (!Number.isFinite(budget) || budget < 0 || !profile) return 0;
    let low = 0, high = MAX_SUPPORTED_MINUTES;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (fee(mid, profile) <= budget) low = mid;
      else high = mid - 1;
    }
    return low;
  }
  function getPeriod(minutes, profile) {
    if (minutes <= 0) return { label: "Not started yet", nextBoundary: 0, nextFee: fee(1, profile) };
    if (minutes > MAX_SUPPORTED_MINUTES) return { label: "Beyond 24-hour estimate", nextBoundary: null, nextFee: null };
    const cost = fee(minutes, profile);
    const label = cost === 0 && profile.graceMinutes > 0 ? "Entry grace period"
      : profile.maxFee !== null && cost === profile.maxFee ? "Daily maximum reached"
      : minutes <= profile.firstMinutes
        ? "First " + (profile.firstMinutes / 60) + " hour" + (profile.firstMinutes === 60 ? "" : "s")
        : "Subsequent hours";
    const lowStart = Math.floor(minutes) + 1;
    if (lowStart > MAX_SUPPORTED_MINUTES || fee(MAX_SUPPORTED_MINUTES, profile) <= cost)
      return { label, nextBoundary: null, nextFee: null };
    let low = lowStart, high = MAX_SUPPORTED_MINUTES;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (fee(mid, profile) > cost) high = mid;
      else low = mid + 1;
    }
    return { label, nextBoundary: low - 1, nextFee: fee(low, profile) };
  }
  function timeline(profile) {
    const rows = [];
    if (profile.graceMinutes > 0)
      rows.push({ name: "Entry grace", price: "Free", detail: "First " + profile.graceMinutes + " minutes", from: 0, to: profile.graceMinutes });
    const hours = profile.firstMinutes / 60;
    rows.push({ name: "First " + hours + " hour" + (hours === 1 ? "" : "s"),
      price: "RM" + profile.firstFee.toFixed(2), detail: "Or part thereof",
      from: profile.graceMinutes, to: profile.firstMinutes });
    rows.push({ name: "Each additional hour", price: "+RM" + profile.extraHourFee.toFixed(2),
      detail: "Or part thereof", from: profile.firstMinutes, to: null });
    if (profile.maxFee !== null)
      rows.push({ name: "Daily maximum", price: "RM" + profile.maxFee.toFixed(2),
        detail: "First parking day only", from: null, to: null });
    return rows;
  }
  return { MALLS, modesFor, getProfile, fee, maxMinutesForBudget, getPeriod, timeline, MAX_SUPPORTED_MINUTES };
})();
