/* Multi-mall parking-rate profiles — last reviewed 5 November 2026.
 * Source: official mall/operator pages except IOI City Mall's itemised rates,
 * which are corroborated by specialist parking listings and its operator FAQ.
 * Estimates only: confirm current rates and terms with each car park.
 * No overnight, calendar-day reset, payment grace, promotions, or multi-day pricing.
 * Legacy The Starling calculation is preserved in script.js.
 */
const PARKING_MALL_RATES = (() => {
  "use strict";
  const MAX_SUPPORTED_MINUTES = 1440;
  const MALLS = {
    starling: {
      name: "The Starling Mall",
      source: "https://parkinginmalaysia.com/the-starling-mall-parking-rates/",
      note: "Original Starling formula retained for compatibility. Confirm current displayed rates at the mall.",
      modes: [{ id: "standard", name: "Basement / Multi-level" }]
    },
    sunway: {
      name: "Sunway Pyramid",
      source: "https://www.sunwaypyramid.com/faq/carpark-what-are-the-parking-rates-54887754c20fce497eea890aff8ec1fb",
      note: "Standard parking has 10-minute entry grace. Public holidays and their eves must be marked manually; overnight stays require separate confirmation.",
      modes: [{ id: "standard", name: "Standard parking" }, { id: "preferred", name: "Preferred parking" }]
    },
    utama: {
      name: "1 Utama Shopping Centre",
      source: "https://www.1utama.com.my/services/",
      note: "1PAY prices require a registered vehicle. Express, Dataran, valet, rebates and promotions are excluded.",
      modes: [
        { id: "regular-1pay", name: "Regular — registered 1PAY" },
        { id: "regular-non1pay", name: "Regular — non-1PAY" },
        { id: "preferred-1pay", name: "ONECARD Preferred — 1PAY" }
      ]
    },
    midvalley: {
      name: "Mid Valley Megamall",
      source: "https://www.midvalley.com.my/pdf/MVM_New_CarParkRates_2026.pdf",
      note: "2026 rates effective 1 January. Standard zones: first 15 minutes free ONLY with card validation at the autopay station. No daily maximum. Special fourth-hour charge applies.",
      modes: [{ id: "standard", name: "Standard — zones A/B/C/G/H/U" }, { id: "premier", name: "Premier parking" }]
    },
    gardens: {
      name: "The Gardens Mall",
      source: "https://www.thegardensmall.com.my/parking",
      note: "Standard car park: first 15 minutes free with eligible card validation. No daily maximum. Valet and other services excluded.",
      modes: [{ id: "standard", name: "Standard parking" }, { id: "premier", name: "Premier parking" }]
    },
    ioi: {
      name: "IOI City Mall",
      source: "https://ioicitymall.freshdesk.com/support/solutions/articles/150000192800-what-are-the-parking-rate-",
      note: "Rates corroborated by independent parking listings; recheck with the mall. Any 20-minute grace after PAYMENT is not free entry parking. CLUB IOI rebates and valet excluded.",
      modes: [{ id: "standard", name: "Standard / Basement parking" }, { id: "premier", name: "Premier parking" }]
    },
    velocity: {
      name: "Sunway Velocity Mall",
      source: "https://www.sunwayvelocitymall.com/getting-here",
      note: "First 15 minutes are free on a drive-through. No overnight parking is permitted without approval; a new day is levied after 6am. Valet, motorcycles and promotions excluded.",
      modes: [{ id: "standard", name: "Standard parking" }, { id: "preferred", name: "Preferred parking" }]
    },
    pavilionbj: {
      name: "Pavilion Bukit Jalil",
      source: "https://www.pavilion-bukitjalil.com/about",
      note: "First 15 minutes are free; daily maximum is RM15. Valet, motorcycles, vouchers and merchant rebates excluded.",
      modes: [{ id: "standard", name: "Standard parking" }]
    },
    pavilionkl: {
      name: "Pavilion Kuala Lumpur",
      source: "https://www.pavilion-kl.com/about/",
      note: "RM40 daily maximum for regular parking. RM10 per entry for weekday entries from 5pm until before 7am; restrictions apply. No free-entry grace is assumed, especially for Touch 'n Go and season passes.",
      modes: [{ id: "standard", name: "Standard parking (auto evening rate)" }]
    }
  };

  function modesFor(mallId) {
    return (MALLS[mallId] || MALLS.starling).modes;
  }
  function weekday(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return null;
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date.getUTCDay();
  }
  function isWeekend(isoDate) {
    const day = weekday(isoDate);
    return day === 0 || day === 6;
  }
  function regularProfile(mallId, modeId, hours, firstFee, extraHourFee, graceMinutes, maxFee, summary) {
    return {
      mallId, modeId, firstMinutes: hours * 60, firstFee, extraHourFee, graceMinutes, maxFee,
      steps: [{ until: hours * 60, charge: firstFee, name: `First ${hours} hour${hours === 1 ? "" : "s"}` }],
      summary
    };
  }
  function tieredProfile(mallId, modeId, firstFee, fourthFee, subsequent, special, graceMinutes) {
    return {
      mallId, modeId, firstMinutes: 180, firstFee, extraHourFee: subsequent, graceMinutes,
      maxFee: null,
      steps: [
        { until: 180, charge: firstFee, name: "First 3 hours" },
        { until: 240, charge: fourthFee, name: "4th hour" }
      ],
      summary: `${special ? "Weekend / public holiday" : "Weekday"}: RM${firstFee} for 3 hours, +RM${fourthFee} for the 4th, +RM${subsequent.toFixed(2)} per later hour.`
    };
  }

  function getProfile(mallId, modeId, isoEntryDate, holidayOrEve = false, entryTime = "") {
    if (mallId === "starling") return null;
    const day = weekday(isoEntryDate);
    const special = isWeekend(isoEntryDate) || holidayOrEve === true;

    if (mallId === "sunway") {
      if (modeId === "preferred")
        return regularProfile(mallId, modeId, 1, 5, 2, 0, null,
          "Preferred: RM5 for first hour, +RM2 every following hour. No published maximum.");
      return regularProfile(mallId, "standard", 1, special ? 3 : 2, 1, 10, special ? 15 : 12,
        `${special ? "Weekend / holiday / eve" : "Weekday"}: RM${special ? 3 : 2} for first hour, +RM1/hour, maximum RM${special ? 15 : 12}.`);
    }
    if (mallId === "utama") {
      const price = modeId === "regular-non1pay" || modeId === "preferred-1pay" ? 4 : 2;
      return regularProfile(mallId, modeId, 4, price, 2, 0, null,
        `RM${price} first 4 hours, +RM2/hour thereafter. Membership eligibility applies.`);
    }
    if (mallId === "midvalley" || mallId === "gardens") {
      if (modeId === "premier")
        return regularProfile(mallId, modeId, 1, 4, 2.50, 0, null,
          "Premier: RM4 first hour, +RM2.50/hour. No daily maximum.");
      return tieredProfile(mallId, "standard", special ? 4 : 3, 1, special ? 1 : 2.50, special, 15);
    }
    if (mallId === "ioi") {
      if (modeId === "premier")
        return regularProfile(mallId, modeId, 3, special ? 20 : 15, 2, 0, null,
          `Premier: RM${special ? 20 : 15} first 3 hours, +RM2/hour.`);
      return regularProfile(mallId, "standard", 1, special ? 5 : 3, 1, 0, null,
        `Standard: RM${special ? 5 : 3} first hour, +RM1/hour.`);
    }
    if (mallId === "velocity") {
      if (modeId === "preferred")
        return regularProfile(mallId, modeId, 2, special ? 6 : 5, 2, 15, 30,
          `Preferred: RM${special ? 6 : 5} first 2 hours, +RM2/hour, maximum RM30 per entry/day.`);
      return regularProfile(mallId, "standard", 2, special ? 4 : 3, 1, 15, 20,
        `Standard: RM${special ? 4 : 3} first 2 hours, +RM1/hour, maximum RM20 per entry/day.`);
    }
    if (mallId === "pavilionbj")
      return regularProfile(mallId, "standard", 1, special ? 3 : 2, 1, 15, 15,
        `RM${special ? 3 : 2} first hour, +RM1/hour, maximum RM15/day.`);
    if (mallId === "pavilionkl") {
      const timeMatch = /^(\d{2}):(\d{2})$/.exec(entryTime || "");
      const minutesOfDay = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 12 * 60;
      const evening = day !== null && day >= 1 && day <= 5 && !holidayOrEve &&
        (minutesOfDay >= 17 * 60 || minutesOfDay < 7 * 60);
      return evening
        ? regularProfile(mallId, "standard", 24, 10, 0, 0, 10,
            "Weekday entry 5pm–7am: RM10 flat per entry. Confirm overnight and special conditions with the operator.")
        : regularProfile(mallId, "standard", 1, 4, 4, 0, 40,
            "RM4 per hour or part; maximum RM40/day. Weekday 5pm–7am entry may qualify for RM10 flat rate.");
    }
    return null;
  }
  function fee(minutes, profile) {
    if (!profile || !Number.isFinite(minutes)) return null;
    if (minutes <= 0) return 0;
    if (minutes > MAX_SUPPORTED_MINUTES) return null;
    if (minutes <= profile.graceMinutes) return 0;
    let total = 0;
    let previousUntil = 0;
    for (const step of profile.steps) {
      total += step.charge;
      if (minutes <= step.until) return profile.maxFee === null ? total : Math.min(total, profile.maxFee);
      previousUntil = step.until;
    }
    total += Math.ceil((minutes - previousUntil) / 60) * profile.extraHourFee;
    return profile.maxFee === null ? total : Math.min(total, profile.maxFee);
  }
  function maxMinutesForBudget(budget, profile) {
    if (!Number.isFinite(budget) || budget < 0 || !profile) return 0;
    let low = 0, high = MAX_SUPPORTED_MINUTES;
    while (low < high) {
      const middle = Math.floor((low + high + 1) / 2);
      if (fee(middle, profile) <= budget) low = middle;
      else high = middle - 1;
    }
    return low;
  }
  function getPeriod(minutes, profile) {
    if (minutes <= 0) return { label: "Not started yet", nextBoundary: 0, nextFee: fee(1, profile) };
    if (minutes > MAX_SUPPORTED_MINUTES)
      return { label: "Beyond 24-hour estimate", nextBoundary: null, nextFee: null };
    const cost = fee(minutes, profile);
    const currentStep = profile.steps.find((step) => minutes <= step.until);
    const label = cost === 0 && profile.graceMinutes > 0 ? "Entry grace period"
      : profile.maxFee !== null && cost === profile.maxFee ? "Daily maximum reached"
      : currentStep ? currentStep.name : "Subsequent hours";
    const start = Math.floor(minutes) + 1;
    if (start > MAX_SUPPORTED_MINUTES || fee(MAX_SUPPORTED_MINUTES, profile) <= cost)
      return { label, nextBoundary: null, nextFee: null };
    let low = start, high = MAX_SUPPORTED_MINUTES;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (fee(middle, profile) > cost) high = middle;
      else low = middle + 1;
    }
    return { label, nextBoundary: low - 1, nextFee: fee(low, profile) };
  }
  function timeline(profile) {
    const rows = [];
    if (profile.graceMinutes > 0)
      rows.push({ name: "Entry grace", price: "Free", detail: `First ${profile.graceMinutes} min (conditions apply)`, from: 0, to: profile.graceMinutes });
    let previousUntil = 0;
    for (const [index, step] of profile.steps.entries()) {
      rows.push({ name: step.name,
        price: (index ? "+" : "") + "RM" + step.charge.toFixed(2),
        detail: `Up to ${step.until / 60}h (or part)`, from: Math.max(previousUntil, profile.graceMinutes), to: step.until });
      previousUntil = step.until;
    }
    if (profile.extraHourFee > 0)
      rows.push({ name: "Every subsequent hour", price: "+RM" + profile.extraHourFee.toFixed(2),
        detail: "Or part thereof", from: previousUntil, to: null });
    if (profile.maxFee !== null)
      rows.push({ name: "Maximum / flat", price: "RM" + profile.maxFee.toFixed(2),
        detail: "First parking day/entry; check terms", from: null, to: null });
    return rows;
  }
  return { MALLS, modesFor, getProfile, fee, maxMinutesForBudget, getPeriod, timeline, MAX_SUPPORTED_MINUTES };
})();
