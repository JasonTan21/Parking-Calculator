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

/* Malaysia mall extension — researched 5 Nov 2026.
 * Load AFTER mall-rates.js and BEFORE script.js. Works with existing 3- or 9-mall engine.
 * This module does not modify any earlier mall's rate profile.
 * All rates are estimates for a single parking stay of <= 24 hours, not overnight,
 * discounts, redemption, multi-day resets, or other promotions.
 */
(() => {
  "use strict";
  const base = typeof PARKING_MALL_RATES !== "undefined" ? PARKING_MALL_RATES : null;
  if (!base || !base.MALLS) {
    console.error("Multi-mall extension requires mall-rates.js.");
    return;
  }
  const ADDITIONS = {
    tamarind: {
      name: "Tamarind Square — Cyberjaya",
      source: "https://parkinginmalaysia.com/tamarind-square-cyberjaya-parking-info/",
      note: "Published parking notice updated Jan 2026, corroborated for standard parking by Setel. Outdoor/multi-level and premium have 15-minute free entry grace; valet is RM20 Mon–Thu, RM25 Fri–Sun/PH. Check the on-site signs, especially for overnight stays.",
      modes: [{id:"standard",name:"Outdoor / Multi-level"},{id:"premium",name:"Premium parking"},{id:"valet",name:"Valet per entry"},{id:"motorcycle",name:"Motorcycle (free)"}]
    },
    mall118: {
      name: "118 Mall (Merdeka 118)",
      source: "https://118mall-kl.com/getting-here/",
      note: "Official standard tariff: RM3 per hour, maximum RM21/day; RM2 per motorcycle entry. Cashless and includes 6% SST. Opening-week promotion: first 3h reportedly free 1–8 November 2026; the promotion is NOT included in these calculations. Verify the current offer at the car park.",
      modes: [{id:"car",name:"Car parking (standard tariff)"}, {id:"motorcycle",name:"Motorcycle parking"}]
    },
    velocity: {
      name: "Sunway Velocity Mall",
      source: "https://www.sunwayvelocitymall.com/getting-here",
      note: "Official normal/preferred rates. 15 minutes AFTER PAYMENT is exit grace, not free entry. No overnight parking without approval.",
      modes: [{id:"standard",name:"Standard parking"},{id:"preferred",name:"Preferred parking"}]
    },
    mytown: {
      name: "MyTOWN Shopping Centre — Cheras",
      source: "https://www.mytownkl.com.my/information",
      note: "Official prices include IKEA parking. Early-bird weekday special, spending redemptions and lost-card fees are not calculated.",
      modes: [{id:"standard",name:"Standard car park"},{id:"valet",name:"Valet parking"}]
    },
    paradigm: {
      name: "Paradigm Mall — Petaling Jaya",
      source: "https://parking.com.my/item/paradigm-mall/",
      note: "Third-party verified listing (10 Aug 2026), not an operator-confirmed tariff. Time-limited promotions are excluded; this is Paradigm PJ, not Paradigm JB.",
      modes: [{id:"standard",name:"Main car park"},{id:"valet",name:"Valet parking"}]
    },
    suria: {
      name: "Suria KLCC",
      source: "https://www.suriaklcc.com.my/mall-services/parking/",
      note: "Official rates. Saturday noon changes tariff. Weekday entries from 5pm can qualify for an RM18 maximum. Premium adds a per-entry surcharge; other redemption rules excluded.",
      modes: [{id:"standard",name:"Main car park"},{id:"premium",name:"Premium parking"},{id:"valet",name:"Valet parking"},{id:"motorcycle",name:"Motorcycle"}]
    },
    trx: {
      name: "The Exchange TRX",
      source: "https://www.theexchange.my/visit/getting-here/",
      note: "Official rates. Evening entry 5pm–5am has a flat rate. Daily limits, valet and member benefits may have terms not modeled here.",
      modes: [{id:"casual",name:"Casual parking"},{id:"premium",name:"Premium parking"},{id:"valet",name:"Valet parking"},{id:"motorcycle",name:"Motorcycle"}]
    },
    klgcc: {
      name: "KLGCC Mall",
      source: "https://www.simedarbyproperty.com/malls/klgcc-mall/",
      note: "Rates effective 1 Sep 2026. Published charges EXCLUDE 6% SST; estimate adds it. 15-minute drive-through grace, no overnight parking.",
      modes: [{id:"standard",name:"Standard parking"}]
    },
    mitsui: {
      name: "Mitsui Outlet Park KLIA Sepang",
      source: "https://mitsui-shopping-park.com.my/MOPKLIA/About/aboutMall?dian_id=2&id=41&name=LOCATION",
      note: "Official usual rate: RM2/hour; motorcycles free. Limited-date special tariffs are excluded. Do not confuse with the KLIA terminal or gateway@klia2 car park.",
      modes: [{id:"car",name:"Car"},{id:"motorcycle",name:"Motorcycle"}]
    },
    putra: {
      name: "Sunway Putra Mall",
      source: "https://www.sunwayputramall.com/faq",
      note: "Official normal parking is capped at RM26/day; the 2nd and 3rd hours have distinct rates. Valet varies Monday–Thursday versus Friday–Sunday/PH.",
      modes: [{id:"standard",name:"Standard parking"},{id:"valet",name:"Valet parking"}]
    },
    square: {
      name: "Sunway Square Mall",
      source: "https://www.sunwaysquare.com/mall/getting-here",
      note: "Official rates. Any shopping-spend free-parking campaign or redemption is excluded.",
      modes: [{id:"standard",name:"Normal parking"},{id:"preferred",name:"Preferred parking"},{id:"valet",name:"Valet / outside parking"}]
    },
    berjaya: {
      name: "Berjaya Times Square — KL",
      source: "https://parkinginmalaysia.com/berjaya-times-square-basement-parking-rate/",
      note: "Third-party rate-board information updated 20 Jul 2026; daily rate resets at 7am, which is not modeled. Verify at entrance.",
      modes: [{id:"standard",name:"Basement / multi-level"},{id:"valet",name:"Valet parking"},{id:"motorcycle",name:"Motorcycle"}]
    },
    curve: {
      name: "the Curve — Mutiara Damansara",
      source: "https://thecurve.com.my/parking/",
      note: "Official new rates effective 1 Oct 2026. The RM9.90 daily maximum has been REMOVED; 6% SST is added to the posted base charges.",
      modes: [{id:"standard",name:"Standard parking"}]
    },
    dpulze: {
      name: "DPULZE Shopping Centre — Cyberjaya",
      source: "https://dpulze.com/contact-us/",
      note: "Official car-park prices, with different initial duration on weekdays versus weekends/public holidays. Valet pricing not estimated.",
      modes: [{id:"standard",name:"Normal parking"}]
    },
    klgateway: {
      name: "KL Gateway Mall — Kerinchi",
      source: "https://www.klgatewaymall.com/getting-here-driving",
      note: "Official rates inclusive of SST. Weekdays 6pm–midnight entry has a flat price; weekends/PH are per entry. 15-minute free drive-through.",
      modes: [{id:"standard",name:"Standard parking"}]
    },
    nuempire: {
      name: "NU Empire — Subang Jaya",
      source: "https://my.parkopedia.com/parking/carpark/nu_empire/47500/subang_jaya/",
      note: "Parkopedia listing, not an operator tariff; figures should be verified with NU Empire. Weekdays RM2 first hour, weekends RM3, then +RM1/hour.",
      modes: [{id:"standard",name:"Underground parking"}]
    },
    onecity: {
      name: "One City — USJ Subang Jaya",
      source: "https://parkinginmalaysia.com/one-city-subang-jaya-parking-info/",
      note: "Community rate board (Jul 2026). Basement and premium have separate daily caps; confirm on-site.",
      modes: [{id:"basement",name:"Basement parking"},{id:"premium",name:"Ground floor premium"},{id:"motorcycle",name:"Motorcycle"}]
    },
    setiawalk: {
      name: "SetiaWalk — Puchong",
      source: "https://parkinginmalaysia.com/setiawalk-mall-parking-rate/",
      note: "Community rate board (Jan 2026): first hour free in normal basement. Preferred parking has an evening flat rate; merchant rebate excluded.",
      modes: [{id:"normal",name:"Basement — normal"},{id:"preferred",name:"Basement — preferred"},{id:"valet",name:"Valet / self-street"}]
    },
    ioipuchong: {
      name: "IOI Mall Puchong",
      source: "https://ioimallpuchong.freshdesk.com/support/solutions/articles/150000204705-what-are-the-parking-rates-",
      note: "Operator FAQ. First hour differs on weekends/PH. The 15-minute allowance AFTER PAYMENT is not a free-entry period.",
      modes: [{id:"standard",name:"Normal car parking"},{id:"motorcycle",name:"Motorcycle"}]
    },
    ombak: {
      name: "Ombak KLCC",
      source: "https://parkinginmalaysia.com/ombak-klcc-parking-info/",
      note: "Community parking-rate report updated 26 Oct 2026; the operator has not clearly published a full tariff online. Do NOT assume Suria KLCC's prices apply; confirm at Ombak gantry.",
      modes: [{id:"standard",name:"Basement parking (indicative)"},{id:"motorcycle",name:"Motorcycle"}]
    },
    ekocheras: {
      name: "EkoCheras Mall",
      source: "https://parkinginmalaysia.com/ekocheras-mall-parking-rate/",
      note: "Rate board updated May 2026. Friday counts as weekend pricing; public holidays AND their eves use higher rates. Published prices EXCLUDE 6% SST.",
      modes: [{id:"standard",name:"Normal parking"}]
    },
    pearlpoint: {
      name: "Pearl Point / Pearl Shopping Gallery",
      source: "https://parkinginmalaysia.com/pearl-point-shopping-mall-parking-rate/",
      note: "Community rate board updated Jul 2026; shared rate between Pearl Point and Pearl Gallery. 15-minute entry grace and retail spending rebates; rebates excluded.",
      modes: [{id:"basement",name:"Basement parking"},{id:"premium",name:"Premium parking"}]
    },
    lot10: {
      name: "Lot 10 — Bukit Bintang",
      source: "https://parking.com.my/item/lot-10/",
      note: "Rate-board report: weekday 5pm–7am entry offers flat RM7; weekday early-bird offer has eligibility conditions and is excluded. Weekend maximum applies until a day-rate reset.",
      modes: [{id:"standard",name:"Standard parking"}]
    }
  };
  const own = Object.prototype.hasOwnProperty;
  const ids = Object.keys(ADDITIONS).filter((id) => !own.call(base.MALLS, id)).sort((a,b) => ADDITIONS[a].name.localeCompare(ADDITIONS[b].name));
  const newlyAddedIds = new Set(ids);
  for (const id of ids) base.MALLS[id] = ADDITIONS[id];
  // Append new options to the existing selector; keep all earlier options and their order.
  const mallSelect = document.getElementById("mallSelect");
  if (mallSelect) {
    const group = document.createElement("optgroup");
    group.label = "More Malaysian shopping malls";
    for (const id of ids) {
      const item = document.createElement("option");
      item.value = id;
      item.textContent = ADDITIONS[id].name;
      group.appendChild(item);
    }
    if (ids.length) mallSelect.appendChild(group);
  }

  const original = {
    getProfile: base.getProfile, fee: base.fee,
    maxMinutesForBudget: base.maxMinutesForBudget,
    getPeriod: base.getPeriod, timeline: base.timeline
  };
  const maxStay = base.MAX_SUPPORTED_MINUTES || 1440;
  const weekend = (dateStr) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
    const [y,m,d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d &&
      (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  };
  const dayOfWeek = (dateStr) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return null;
    const [y,m,d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d ? date.getUTCDay() : null;
  };
  const entryMinutes = (str) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(str || "") ? Number(str.slice(0,2))*60 + Number(str.slice(3,5)) : 720;
  // A step's fee is the cumulative RM amount charged through that minute.
  const make = (mallId,modeId,steps,extra=0,cap=null,grace=0,tax=0,summary="") => ({
    _addition: true, mallId,modeId,steps,extraHourFee:extra,maxFee:cap,graceMinutes:grace,
    firstMinutes:steps[0].until,firstFee:steps[0].fee,taxPercent:tax,summary
  });
  const simple = (id,mode,hours,first,extra,cap=null,grace=0,tax=0,summary="") =>
    make(id,mode,[{until:hours*60,fee:first}],extra,cap,grace,tax,summary);
  const flat = (id,mode,amount,grace=0,tax=0,summary="") =>
    make(id,mode,[{until:maxStay,fee:amount}],0,amount,grace,tax,summary);

  base.getProfile = function(mallId,modeId,dateStr,holiday=false,timeStr="") {
    if (!newlyAddedIds.has(mallId)) return original.getProfile(mallId,modeId,dateStr,holiday,timeStr);
    const isPH = holiday === true;
    const wknd = weekend(dateStr);
    const day = dayOfWeek(dateStr);
    const special = wknd || isPH;
    const minute = entryMinutes(timeStr);
    const evening = minute >= 17*60 || minute < 5*60;
    switch(mallId) {
      case "tamarind": {
        if (modeId === "motorcycle")
          return flat(mallId,modeId,0,0,0,"Motorcycle parking free (check designated parking levels).");
        if (modeId === "valet") {
          const isFridayOrWeekend = day === 5 || day === 6 || day === 0 || isPH;
          return flat(mallId,modeId,isFridayOrWeekend?25:20,0,0,
            "Valet RM"+(isFridayOrWeekend?25:20)+" per entry/day (Fri–Sun and public holidays RM25; Mon–Thu RM20).");
        }
        if (modeId === "premium")
          return simple(mallId,modeId,2,3,2,20,15,0,
            "Premium: 15 minutes entry grace; RM3 first 2 hours, +RM2/hour, RM20 daily max.");
        return simple(mallId,"standard",2,2,1,15,15,0,
          "Outdoor / multi-level: 15 minutes entry grace; RM2 first 2 hours, +RM1/hour, RM15 daily max.");
      }
      case "mall118":
        return modeId === "motorcycle"
          ? flat(mallId,modeId,2,0,0,"Official motorcycle RM2 per entry, 24 hours. Inclusive of 6% SST.")
          : simple(mallId,"car",1,3,3,21,0,0,"Official car RM3/hour, maximum RM21/day, inclusive of 6% SST. Opening-week free parking promotion not applied.");
      case "velocity":
        return modeId === "preferred" ? simple(mallId,modeId,2,special?6:5,2,30,0,0,"Preferred RM"+(special?6:5)+" first 2h, +RM2/h, max RM30.")
          :simple(mallId,"standard",2,special?4:3,1,20,0,0,"Normal RM"+(special?4:3)+" first 2h, +RM1/h, max RM20.");
      case "mytown":
        if(modeId === "valet") return simple(mallId,modeId,3,20,3,null,0,0,"Valet RM20 first 3h, +RM3 each following hour.");
        return simple(mallId,"standard",2,special?4.40:3.30,1.10,null,0,0,"Normal RM"+(special?"4.40":"3.30")+" first 2h, +RM1.10/hour.");
      case "paradigm": {
        if (modeId === "valet") return simple(mallId,modeId,6,12,2,30,0,0,"Valet: RM12 first 6h, +RM2/h, max RM30 (unofficial listing).");
        const first = special?3:2;
        return make(mallId,"standard",[
          {until:180,fee:first},{until:240,fee:first+1},{until:300,fee:first+2},{until:360,fee:first+3}
        ],2,null,0,0,"First 3h RM"+first+", then +RM1/h through 6h, +RM2/h after.");
      }
      case "suria": {
        if(modeId === "motorcycle") return flat(mallId,modeId,3,0,0,"Motorcycle RM3 per entry.");
        if(modeId === "valet") return simple(mallId,modeId,3,35,5,null,0,0,"Valet RM35 first 3h, +RM5 per hour.");
        const weekendSpecial = isPH || day === 0 || (day === 6 && minute >= 720);
        const premium = modeId === "premium" ? 10 : 0;
        if(weekendSpecial) return make(mallId,modeId,[{until:180,fee:5+premium},{until:240,fee:10+premium}],4,null,0,0,"Saturday afternoon / Sunday / PH: RM5 first 3h, +RM5 fourth, +RM4/h; premium adds RM10 entry.");
        const cap = day !== null && day >= 1 && day <= 5 && !isPH && evening && modeId !== "premium" ? 18 : null;
        return make(mallId,modeId,[{until:60,fee:5+premium},{until:120,fee:10+premium}],4,cap,0,0,"RM5 first hour, +RM5 second, +RM4/h after. Weekday evening standard cap RM18 if eligible.");
      }
      case "trx": {
        if(modeId === "motorcycle") return flat(mallId,modeId,2,0,0,"Motorcycle RM2 per entry.");
        if(modeId === "valet") return simple(mallId,modeId,3,(day!==null&&day>=1&&day<=4&&!isPH)?40:50,5,null,0,0,"Valet RM40 Mon–Thu, RM50 Fri–Sun/PH first 3h, +RM5/h.");
        if(modeId === "premium") return evening ? flat(mallId,modeId,25,0,0,"Premium evening entry 5pm–5am: RM25 flat.")
          :simple(mallId,modeId,1,15,4,50,0,0,"Premium RM15 first hour, +RM4/h, daily max RM50.");
        return evening ? flat(mallId,"casual",10,0,0,"Casual evening entry 5pm–5am: RM10 flat.")
          :simple(mallId,"casual",1,special?4:5,4,40,0,0,"Casual RM"+(special?4:5)+" first hour, +RM4/h, max RM40/day.");
      }
      case "klgcc":
        return special ? simple(mallId,modeId,3,3,2,10,15,6,"Weekend RM3 first 3h, +RM2/h, cap RM10 plus SST.")
          :flat(mallId,modeId,3,15,6,"Weekday RM3 flat plus 6% SST.");
      case "mitsui":
        return modeId === "motorcycle" ? flat(mallId,modeId,0,0,0,"Motorcycle free.")
          :simple(mallId,"car",1,2,2,null,0,0,"Car RM2 per hour.");
      case "putra":
        return modeId === "valet" ? simple(mallId,modeId,4,(day!==null&&day>=1&&day<=4&&!isPH)?16:20,2,null,0,0,"Valet RM16 Mon–Thu, RM20 Fri–Sun/PH first 4h, +RM2/h.")
          :make(mallId,"standard",[{until:60,fee:3},{until:120,fee:5},{until:180,fee:6}],2,26,0,0,"Normal: RM3 first, +RM2 second, +RM1 third, +RM2/h after; max RM26.");
      case "square":
        if(modeId === "valet") return flat(mallId,modeId,(day!==null&&day>=1&&day<=4&&!isPH)?20:25,0,0,"Valet/outside RM20 Mon–Thu, RM25 Fri–Sun/PH per entry.");
        return modeId === "preferred" ? simple(mallId,modeId,2,3,2,20,0,0,"Preferred RM3 first 2h, +RM2/h, max RM20.")
          :simple(mallId,"standard",2,2,1,10,0,0,"Normal RM2 first 2h, +RM1/h, max RM10.");
      case "berjaya":
        if(modeId === "motorcycle") return flat(mallId,modeId,2,0,0,"Motorcycle RM2 per entry.");
        if(modeId === "valet") return flat(mallId,modeId,special?30:20,0,0,"Valet RM20 weekday, RM30 weekends/PH per entry.");
        return simple(mallId,"standard",1,3,3,special?18:15,0,0,"RM3/hour; daily maximum RM"+(special?18:15)+" until reset 7am (not calculated).");
      case "curve":
        return simple(mallId,"standard",2,special?3.30:2.20,1.10,null,0,6,"First 2h RM"+(special?"3.30":"2.20")+", +RM1.10/h, plus 6% SST; no daily maximum.");
      case "dpulze":
        return special ? simple(mallId,"standard",3,3.30,1.10,null,0,0,"Weekend/PH RM3.30 first 3h, +RM1.10/h.")
          :simple(mallId,"standard",2,2.20,1.10,null,0,0,"Weekday RM2.20 first 2h, +RM1.10/h.");
      case "klgateway":
        return special ? flat(mallId,modeId,4,15,0,"Weekend/PH RM4 per entry (15-min pass-through).")
          :minute>=18*60 ? flat(mallId,modeId,2,15,0,"Weekday entry 6pm–11:59pm RM2 per entry (15-min pass-through).")
          :simple(mallId,"standard",1,2,2,null,15,0,"Weekday entry before 6pm RM2/hour, no daily cap (15-min pass-through).");
      case "nuempire":
        return simple(mallId,"standard",1,special?3:2,1,null,0,0,"Indicative RM"+(special?3:2)+" first hour, +RM1/hour (third-party source).");
      case "onecity":
        if(modeId === "motorcycle") return flat(mallId,modeId,0,0,0,"Motorcycle free.");
        return modeId === "premium" ?simple(mallId,modeId,1,4,4,30,0,0,"Premium RM4/hour, max RM30/day.")
          :simple(mallId,"basement",1,1.50,1.50,10,0,0,"Basement RM1.50/hour, max RM10/day.");
      case "setiawalk":
        if(modeId === "valet") return make(mallId,modeId,[{until:60,fee:0}],6,6,60,0,"Valet: first hour free, +RM6/h, max RM6.");
        if(modeId === "preferred") return (minute>=18*60||minute<7*60)
          ?flat(mallId,modeId,2,15,0,"Preferred: evening entry 6pm–6:59am, RM2 per entry.")
          :simple(mallId,modeId,1,2,1,6,15,0,"Preferred: RM2 first hour, +RM1/h, max RM6.");
        return make(mallId,"normal",[{until:60,fee:0},{until:180,fee:2}],1,special?5:4,60,0,"Basement normal: first hour free, next 2h RM2, then +RM1/h; max RM"+(special?5:4)+".");
      case "ioipuchong":
        return modeId === "motorcycle" ?flat(mallId,modeId,1,0,0,"Motorcycle RM1 per entry.")
          :simple(mallId,"standard",1,special?3:2,1,null,0,0,"First hour RM"+(special?3:2)+", +RM1 every subsequent hour.");
      case "ombak":
        if(modeId === "motorcycle") return flat(mallId,modeId,3,0,0,"Motorcycle RM3 per entry (third-party report).");
        if(special) return make(mallId,"standard",[{until:180,fee:5},{until:240,fee:10}],4,null,0,0,"Reported weekend/PH: RM5 first 3h, RM5 fourth, +RM4/h.");
        return make(mallId,"standard",[{until:60,fee:5},{until:120,fee:10}],4,evening?18:null,0,0,"Reported weekday: RM5 first, RM5 second, +RM4/h; evening cap RM18 if eligible.");
      case "ekocheras": {
        const high = special || day === 5;
        return simple(mallId,"standard",3,high?3:2,2,null,0,6,""+(high?"Friday–Sunday / PH / eve RM3":"Monday–Thursday RM2")+" first 3h, +RM2/h, plus 6% SST.");
      }
      case "pearlpoint":
        return modeId === "premium" ?simple(mallId,modeId,3,15,2.50,25,15,0,"Premium RM15 first 3h, +RM2.50/h, max RM25/24h.")
          :simple(mallId,"basement",1,2.50,1,special?7:null,15,0,"Basement RM2.50 first hour, +RM1/h, weekend max RM7/day.");
      case "lot10":
        if(special) return make(mallId,"standard",[{until:480,fee:10}],5,15,0,0,"Weekend/PH RM10 first 8h, then RM15 maximum before daily reset.");
        if(minute>=17*60 || minute<7*60) return flat(mallId,"standard",7,0,0,"Weekday entry 5pm–7am: RM7 flat (check eligibility).");
        return simple(mallId,"standard",3,5,3,null,0,0,"Weekday RM5 first 3h, +RM3/h; early-bird offer excluded.");
      default: return original.getProfile(mallId,modeId,dateStr,holiday,timeStr);
    }
  };

  const rawFee = (minutes,profile) => {
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > maxStay) return null;
    if(minutes===0 || minutes<=profile.graceMinutes) return 0;
    let value = profile.steps[profile.steps.length-1].fee;
    let previous = 0;
    for(const step of profile.steps) {
      if (minutes <= step.until) { value = step.fee; break; }
      previous = step.until;
    }
    if(minutes > previous && minutes > profile.steps[profile.steps.length-1].until) {
      value = profile.steps[profile.steps.length-1].fee + Math.ceil((minutes-previous)/60)*profile.extraHourFee;
    }
    if(profile.maxFee!==null) value=Math.min(value,profile.maxFee);
    return Math.round((value*(1+profile.taxPercent/100)+Number.EPSILON)*100)/100;
  };
  base.fee = function(minutes,profile) {
    if (!profile || !profile._addition) return original.fee(minutes,profile);
    return rawFee(minutes,profile);
  };
  base.maxMinutesForBudget = function(budget,profile) {
    if (!profile || !profile._addition) return original.maxMinutesForBudget(budget,profile);
    if(!Number.isFinite(budget)||budget<0) return 0;
    let low=0,high=maxStay;
    while(low<high) {
      const mid=Math.floor((low+high+1)/2);
      if(rawFee(mid,profile)<=budget) low=mid;
      else high=mid-1;
    }
    return low;
  };
  base.getPeriod = function(minutes,profile) {
    if (!profile || !profile._addition) return original.getPeriod(minutes,profile);
    if(minutes<=0) return {label:"Not started yet",nextBoundary:0,nextFee:rawFee(1,profile)};
    if(minutes>maxStay) return {label:"Beyond 24-hour estimate",nextBoundary:null,nextFee:null};
    const current=rawFee(minutes,profile);
    let label=current===0?"Free / grace period":"Parking rate active";
    if(profile.maxFee!==null && current >= profile.maxFee*(1+profile.taxPercent/100)-0.005) label="Daily maximum reached";
    const start=Math.floor(minutes)+1;
    if(start>maxStay || rawFee(maxStay,profile)<=current) return {label,nextBoundary:null,nextFee:null};
    let low=start,high=maxStay;
    while(low<high) {
      const mid=Math.floor((low+high)/2);
      if(rawFee(mid,profile)>current)high=mid;else low=mid+1;
    }
    return {label,nextBoundary:low-1,nextFee:rawFee(low,profile)};
  };
  base.timeline = function(profile) {
    if (!profile || !profile._addition) return original.timeline(profile);
    const rows=[];
    if(profile.graceMinutes>0)rows.push({name:"Free entry/grace",price:"Free",detail:"First "+profile.graceMinutes+" min (conditions apply)",from:0,to:profile.graceMinutes});
    let last=0,previousFee=0;
    for(const step of profile.steps){
      const increment=step.fee-previousFee;
      rows.push({name:"Through "+(step.until/60).toFixed(step.until%60?1:0)+"h",price:(previousFee?"+":"")+"RM"+increment.toFixed(2),detail:"Per charging band",from:last,to:step.until});
      last=step.until;previousFee=step.fee;
    }
    if(profile.extraHourFee>0)rows.push({name:"Each additional hour",price:"+RM"+profile.extraHourFee.toFixed(2),detail:"Or part thereof",from:last,to:null});
    if(profile.maxFee!==null)rows.push({name:"Maximum / flat",price:"RM"+profile.maxFee.toFixed(2),detail:profile.taxPercent?"Before "+profile.taxPercent+"% SST":"Within first day/entry",from:null,to:null});
    if(profile.taxPercent)rows.push({name:"Service tax",price:"+"+profile.taxPercent+"%",detail:"Applied to displayed estimate",from:null,to:null});
    return rows;
  };
})();

/* GROUPED_MALL_SELECTOR_v1 | All mall data merged into script.js */
(() => {
  "use strict";
  if (typeof document === "undefined" || typeof PARKING_MALL_RATES === "undefined") return;
  const select = document.getElementById("mallSelect");
  if (!select) return;

  // Area order: KL first, then PJ/Damansara, Subang, Puchong, Putrajaya,
  // Cyberjaya and KLIA/Sepang. Alphabetical inside each area.
  const areas = [
    ["Kuala Lumpur", [
      "mall118", "berjaya", "ekocheras", "gardens", "klgateway", "klgcc", "lot10",
      "midvalley", "mytown", "ombak", "pavilionbj", "pavilionkl",
      "pearlpoint", "putra", "suria", "trx", "velocity"
    ]],
    ["Petaling Jaya & Damansara", [
      "curve", "paradigm", "starling", "utama"
    ]],
    ["Subang Jaya & Bandar Sunway", [
      "nuempire", "onecity", "square", "sunway"
    ]],
    ["Puchong", ["ioipuchong", "setiawalk"]],
    ["Putrajaya", ["ioi"]],
    ["Cyberjaya", ["dpulze", "tamarind"]],
    ["Sepang / KLIA", ["mitsui"]]
  ];

  const mallData = PARKING_MALL_RATES.MALLS;
  const previousSelection = select.value;
  const included = new Set();
  select.replaceChildren();

  function appendGroup(label, ids) {
    const valid = ids.filter((id) => Object.prototype.hasOwnProperty.call(mallData, id) && !included.has(id));
    if (!valid.length) return;
    valid.sort((a, b) => mallData[a].name.localeCompare(mallData[b].name, undefined, {
      numeric: true, sensitivity: "base"
    }));
    const group = document.createElement("optgroup");
    group.label = label;
    for (const id of valid) {
      included.add(id);
      const option = document.createElement("option");
      option.value = id;
      // The optgroup supplies the location; do not repeat it after an em dash.
      option.textContent = mallData[id].name.replace(/\s+—\s+.+$/, "");
      group.appendChild(option);
    }
    select.appendChild(group);
  }

  for (const [label, ids] of areas) appendGroup(label, ids);
  // Prevent future mall additions from silently disappearing.
  appendGroup("Other Malaysian Locations", Object.keys(mallData));
  select.value = included.has(previousSelection) ? previousSelection : "starling";
})();

/* ORIGINAL PARKING CALCULATOR APPLICATION CODE */
const $ = (selector) => document.querySelector(selector);

const entryDateInput = $("#entryDate");
const entryTimeInput = $("#entryTime");
const exitTimeInput = $("#exitTime");
const budgetAmountInput = $("#budgetAmount");
const mallSelectInput = $("#mallSelect");
const parkingTypeInput = $("#parkingType");
const holidayRateInput = $("#holidayRate");
const mallRateNoteEl = $("#mallRateNote");
const mallRateSourceEl = $("#mallRateSource");
const alertBeforeInput = $("#alertBefore");
const emailAlertInput = $("#emailAlert");
const whatsappAlertInput = $("#whatsappAlert");
const profilePhoneInput = $("#profilePhone");
const themeModeInput = $("#themeMode");
const clockFormatInput = $("#clockFormat");
const languageChoiceInput = $("#languageChoice");
const fontChoiceInput = $("#fontChoice");
const customFontInput = $("#customFont");
const fontColorPresetInput = $("#fontColorPreset");
const fontRedInput = $("#fontRed");
const fontGreenInput = $("#fontGreen");
const fontBlueInput = $("#fontBlue");
const enableAlertsButton = $("#enableAlerts");
const useNowButton = $("#useNow");
const alertBox = $("#alert");

const currentTimeEl = $("#currentTime");
const currentDateEl = $("#currentDate");
const clockSourceEl = $("#clockSource");
const currentFeeEl = $("#currentFee");
const currentBandEl = $("#currentBand");
const elapsedTimeEl = $("#elapsedTime");
const elapsedHintEl = $("#elapsedHint");
const leaveByEl = $("#leaveBy");
const nextChargeEl = $("#nextCharge");
const plannedFeeEl = $("#plannedFee");
const plannedDurationEl = $("#plannedDuration");
const budgetExitEl = $("#budgetExit");
const budgetHintEl = $("#budgetHint");
const rateTimelineEl = $("#rateTimeline");
const alertStatusEl = $("#alertStatus");
const fontColorPreviewEl = $("#fontColorPreview");
const notificationDotEl = $("#notificationDot");
const notificationListEl = $("#notificationList");
const markAllReadButton = $("#markAllRead");
const clearNotificationsButton = $("#clearNotifications");
const profileForm = $("#profileForm");
const profileUsernameInput = $("#profileUsername");
const profileEmailInput = $("#profileEmail");
const profilePasswordInput = $("#profilePassword");
const profilePictureInput = $("#profilePicture");
const profilePreviewEl = $("#profilePreview");
const profileInitialEl = $("#profileInitial");
const profilePictureButton = $("#profilePictureButton");
const changeProfilePictureButton = $("#changeProfilePicture");
const removeProfilePictureButton = $("#removeProfilePictureButton");
const removeProfilePictureInput = $("#removeProfilePicture");
const adminUserBodyEl = $("#adminUserBody");
const adminAccountBodyEl = $("#adminAccountBody");
const deleteAccountForm = $("#deleteAccountForm");
const deletePasswordInput = $("#deletePassword");
const deletePasswordConfirmInput = $("#deletePasswordConfirm");
const profilePasswordConfirmInput = $("#profilePasswordConfirm");
const profileCropModal = $("#profileCropModal");
const profileCropCanvas = $("#profileCropCanvas");
const cropZoomInput = $("#cropZoom");
const cropApplyButton = $("#cropApply");
const cropCancelButton = $("#cropCancel");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");
const messageModal = $("#messageModal");
const messageModalTitle = $("#messageModalTitle");
const messageModalBody = $("#messageModalBody");
const userModal = $("#userModal");
const userModalBody = $("#userModalBody");

const ENTRY_STORAGE_KEY = "parking-calculator-entry";
const SETTINGS_STORAGE_KEY = "parking-calculator-settings";
const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";
const CURRENT_USER = window.PARKING_USER || { username: "guest", email: "", phone: "", guest: true };
const IS_GUEST = CURRENT_USER.guest === true || CURRENT_USER.role === "guest";
const STORAGE_SCOPE = CURRENT_USER.username || "guest";
const SESSION_ID = CURRENT_USER.sid || sessionStorage.getItem("parking-tab-session") || "";
let internalNavigation = false;
let cropImage = null;
let cropOffset = { x: 0, y: 0 };
let cropDragging = false;
let cropLastPoint = { x: 0, y: 0 };
let croppedProfileBlob = null;

const fontOptions = [
  ["system", "System UI", "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
  ["arial", "Arial", "Arial, 'Liberation Sans', sans-serif"],
  ["helvetica", "Helvetica", "Helvetica, 'Helvetica Neue', Arial, sans-serif"],
  ["verdana", "Verdana", "Verdana, Geneva, sans-serif"],
  ["tahoma", "Tahoma", "Tahoma, Geneva, sans-serif"],
  ["trebuchet", "Trebuchet MS", "'Trebuchet MS', Arial, sans-serif"],
  ["georgia", "Georgia", "Georgia, 'Times New Roman', serif"],
  ["times", "Times New Roman", "'Times New Roman', Times, serif"],
  ["garamond", "Garamond", "Garamond, Georgia, serif"],
  ["palatino", "Palatino", "Palatino, 'Palatino Linotype', serif"],
  ["baskerville", "Baskerville", "Baskerville, 'Libre Baskerville', Georgia, serif"],
  ["courier", "Courier New", "'Courier New', Courier, monospace"],
  ["monaco", "Monaco", "Monaco, Consolas, monospace"],
  ["consolas", "Consolas", "Consolas, 'Courier New', monospace"],
  ["menlo", "Menlo", "Menlo, Monaco, Consolas, monospace"],
  ["sfmono", "SF Mono", "'SFMono-Regular', Menlo, Consolas, monospace"],
  ["impact", "Impact", "Impact, Haettenschweiler, sans-serif"],
  ["optima", "Optima", "Optima, Candara, sans-serif"],
  ["candara", "Candara", "Candara, Calibri, sans-serif"],
  ["calibri", "Calibri", "Calibri, Candara, sans-serif"],
  ["cambria", "Cambria", "Cambria, Georgia, serif"],
  ["constantia", "Constantia", "Constantia, Georgia, serif"],
  ["corbel", "Corbel", "Corbel, Calibri, sans-serif"],
  ["didot", "Didot", "Didot, 'Bodoni 72', 'Playfair Display', 'Bodoni MT', 'Times New Roman', serif"],
  ["futura", "Futura", "Futura, Trebuchet MS, sans-serif"],
  ["gill", "Gill Sans", "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif"],
  ["avenir", "Avenir", "Avenir, Montserrat, sans-serif"],
  ["proxima", "Proxima Nova", "'Proxima Nova', 'IBM Plex Sans', 'Avenir Next', Avenir, Arial, sans-serif"],
  ["segoe", "Segoe UI", "'Segoe UI', Arial, sans-serif"],
  ["lucida", "Lucida Grande", "'Lucida Grande', 'Lucida Sans Unicode', sans-serif"],
  ["franklin", "Franklin Gothic", "'Franklin Gothic Medium', Arial, sans-serif"],
  ["century", "Century Gothic", "'Century Gothic', AppleGothic, sans-serif"],
  ["bookman", "Bookman", "'Bookman Old Style', Bookman, Domine, 'URW Bookman L', Georgia, serif"],
  ["copperplate", "Copperplate", "Copperplate, Papyrus, fantasy"],
  ["bradley", "Bradley Hand", "'Bradley Hand', 'Comic Sans MS', cursive"],
  ["comic", "Comic Sans MS", "'Comic Sans MS', cursive"],
  ["papyrus", "Papyrus", "Papyrus, fantasy"],
  ["marker", "Marker Felt", "'Marker Felt', 'Comic Sans MS', cursive"],
  ["arialblack", "Arial Black", "'Arial Black', Gadget, sans-serif"],
  ["hoefler", "Hoefler Text", "'Hoefler Text', Georgia, serif"],
  ["notosans", "Noto Sans", "'Noto Sans', 'Segoe UI', system-ui, sans-serif"],
  ["notoserif", "Noto Serif", "'Noto Serif', Georgia, serif"],
  ["opensans", "Open Sans", "'Open Sans', 'Segoe UI', Arial, sans-serif"],
  ["roboto", "Roboto", "Roboto, 'Segoe UI', Arial, sans-serif"],
  ["lato", "Lato", "Lato, 'Gill Sans', Calibri, sans-serif"],
  ["montserrat", "Montserrat", "Avenir, 'Trebuchet MS', Arial, sans-serif"],
  ["poppins", "Poppins", "Poppins, 'Century Gothic', 'Trebuchet MS', sans-serif"],
  ["merriweather", "Merriweather", "Merriweather, Georgia, serif"],
  ["sourcecode", "Source Code Pro", "'Source Code Pro', 'Courier New', Courier, monospace"],
  ["ubuntu", "Ubuntu", "Ubuntu, Arial, sans-serif"],
  ["aptos", "Aptos", "Aptos, Calibri, Arial, sans-serif"],
  ["aptosdisplay", "Aptos Display", "'Aptos Display', 'Barlow Condensed', Bahnschrift, 'Arial Narrow', sans-serif"],
  ["bahnschrift", "Bahnschrift", "Bahnschrift, 'Segoe UI', sans-serif"],
  ["cascadia", "Cascadia Code", "'Cascadia Code', 'Source Code Pro', Consolas, 'Courier New', monospace"],
  ["cascadiamono", "Cascadia Mono", "'Cascadia Mono', 'IBM Plex Mono', Monaco, Menlo, monospace"],
  ["century-schoolbook", "Century Schoolbook", "'Century Schoolbook', Century, 'Libre Baskerville', Georgia, serif"],
  ["charter", "Charter", "Charter, 'Source Serif 4', Cambria, Georgia, serif"],
  ["cochin", "Cochin", "Cochin, Georgia, serif"],
  ["din", "DIN Alternate", "'DIN Alternate', 'Arial Narrow', sans-serif"],
  ["geneva", "Geneva", "Geneva, Verdana, sans-serif"],
  ["hiragino", "Hiragino Sans", "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, 'Yu Gothic', sans-serif"],
  ["ibmplexsans", "IBM Plex Sans", "'IBM Plex Sans', Arial, sans-serif"],
  ["ibmplexserif", "IBM Plex Serif", "'IBM Plex Serif', Georgia, serif"],
  ["ibmplexmono", "IBM Plex Mono", "'IBM Plex Mono', Consolas, monospace"],
  ["jost", "Jost", "Jost, Futura, Avenir, sans-serif"],
  ["nunito", "Nunito", "Nunito, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif"],
  ["ptserif", "PT Serif", "'PT Serif', Georgia, serif"],
  ["ptsans", "PT Sans", "'PT Sans', Candara, Calibri, sans-serif"],
  ["raleway", "Raleway", "Raleway, Optima, Candara, sans-serif"],
  ["rubik", "Rubik", "Rubik, 'Arial Rounded MT Bold', Arial, sans-serif"],
  ["system-rounded", "System Rounded", "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif"],
  ["ui-serif", "UI Serif", "ui-serif, Georgia, serif"],
  ["ui-mono", "UI Mono", "ui-monospace, 'SFMono-Regular', Consolas, monospace"],
  ["custom", "Custom installed font", "Inter, ui-sans-serif, system-ui, sans-serif"]
];

const languageOptions = [
  ["zh", "Chinese (Simplified)"],
  ["en", "English"],
  ["ms", "Malay"],
  ["ta", "Tamil"]
];

const translations = {
  en: {
    calculator: "Calculator",
    notifications: "Notifications",
    settings: "Settings",
    admin: "Admin",
    logout: "Logout",
    signedInAs: "Signed in as",
    globalMalaysiaTime: "Global Malaysia Time",
    syncingTime: "Syncing time...",
    parkingFeeTool: "Parking fee tool",
    settingsSubtitle: "Adjust alerts, display mode, fonts, language, and text color for your parking calculator.",
    profile: "Profile",
    signInDifferent: "Sign In Different Account",
    profilePicture: "Profile Picture",
    edit: "Edit",
    remove: "Remove",
    profilePictureHelp: "JPG, PNG, GIF, or WebP. Maximum 2 MB.",
    username: "Username",
    email: "Email",
    phone: "Phone Number",
    newPassword: "New Password",
    verifyNewPassword: "Verify New Password",
    saveProfile: "Save Profile",
    accountSafety: "Account Safety",
    alerts: "Alerts",
    enableAlerts: "Enable Alerts",
    alertBeforePlannedExit: "Alert Before Planned Exit",
    emailAlert: "Email Alert",
    whatsappAlert: "WhatsApp Alert",
    whatsappDestination: "WhatsApp Destination",
    browserAlertStatus: "Browser Alert Status",
    emailDestination: "Email Destination",
    display: "Display",
    mode: "Mode",
    font: "Font",
    liveClockFormat: "Live Clock Format",
    language: "Language",
    customFontName: "Custom Font Name",
    fontColor: "Font Color",
    colorStyle: "Color Style",
    preview: "Preview",
    entryDetails: "Entry Details",
    useCurrentTime: "Use Current Time",
    entryDate: "Entry Date",
    entryTime: "Entry Time",
    checkExitTime: "Check Exit Time",
    budgetPlanner: "Budget Planner",
    targetBudget: "Target Budget",
    exitBy: "Exit By",
    feeIfExitNow: "Fee If Exit Now",
    parkedTime: "Parked Time",
    exitBefore: "Exit Before",
    checkedExitFee: "Checked Exit Fee",
    parkingRates: "Parking Rates",
    ratesNote: "Any part of a charge period is counted.",
    waitingForEntry: "Waiting for entry time",
    liveTimer: "Live timer",
    avoidNextCharge: "to avoid the next charge",
    chooseAnyExitTime: "Choose any exit time",
    enterBudget: "Enter an amount to plan your exit time.",
    notificationsUnavailable: "Notifications unavailable",
    enabled: "Enabled",
    blocked: "Blocked",
    notEnabled: "Not enabled",
    adminUsers: "Users",
    adminAccounts: "Admin Accounts",
    userAccounts: "User Accounts"
  },
  ms: {
    calculator: "Kalkulator",
    notifications: "Notifikasi",
    settings: "Tetapan",
    admin: "Admin",
    logout: "Log keluar",
    signedInAs: "Log masuk sebagai",
    globalMalaysiaTime: "Masa Malaysia Global",
    syncingTime: "Menyegerakkan masa...",
    parkingFeeTool: "Alat bayaran parkir",
    settingsSubtitle: "Laraskan amaran, mod paparan, fon, bahasa dan warna teks untuk kalkulator parkir anda.",
    profile: "Profil",
    signInDifferent: "Log Masuk Akaun Lain",
    profilePicture: "Gambar Profil",
    edit: "Edit",
    remove: "Buang",
    profilePictureHelp: "JPG, PNG, GIF atau WebP. Maksimum 2 MB.",
    username: "Nama pengguna",
    email: "E-mel",
    phone: "Nombor telefon",
    newPassword: "Kata Laluan Baharu",
    verifyNewPassword: "Sahkan Kata Laluan Baharu",
    saveProfile: "Simpan Profil",
    accountSafety: "Keselamatan Akaun",
    alerts: "Amaran",
    enableAlerts: "Aktifkan Amaran",
    alertBeforePlannedExit: "Amaran Sebelum Masa Keluar",
    emailAlert: "Amaran E-mel",
    whatsappAlert: "Amaran WhatsApp",
    whatsappDestination: "Destinasi WhatsApp",
    browserAlertStatus: "Status Amaran Pelayar",
    emailDestination: "Destinasi E-mel",
    display: "Paparan",
    mode: "Mod",
    font: "Fon",
    liveClockFormat: "Format Jam Langsung",
    language: "Bahasa",
    customFontName: "Nama Fon Tersuai",
    fontColor: "Warna Fon",
    colorStyle: "Gaya Warna",
    preview: "Pratonton",
    entryDetails: "Butiran Masuk",
    useCurrentTime: "Guna Masa Semasa",
    entryDate: "Tarikh Masuk",
    entryTime: "Masa Masuk",
    checkExitTime: "Semak Masa Keluar",
    budgetPlanner: "Perancang Bajet",
    targetBudget: "Bajet Sasaran",
    exitBy: "Keluar Sebelum",
    feeIfExitNow: "Bayaran Jika Keluar Sekarang",
    parkedTime: "Masa Parkir",
    exitBefore: "Keluar Sebelum",
    checkedExitFee: "Bayaran Keluar Disemak",
    parkingRates: "Kadar Parkir",
    ratesNote: "Sebarang bahagian tempoh caj akan dikira.",
    waitingForEntry: "Menunggu masa masuk",
    liveTimer: "Pemasa langsung",
    avoidNextCharge: "untuk elak caj seterusnya",
    chooseAnyExitTime: "Pilih mana-mana masa keluar",
    enterBudget: "Masukkan jumlah untuk merancang masa keluar anda.",
    notificationsUnavailable: "Notifikasi tidak tersedia",
    enabled: "Aktif",
    blocked: "Disekat",
    notEnabled: "Belum aktif",
    adminUsers: "Pengguna",
    adminAccounts: "Akaun Admin",
    userAccounts: "Akaun Pengguna"
  },
  zh: {
    calculator: "计算器",
    notifications: "通知",
    settings: "设置",
    admin: "管理员",
    logout: "退出",
    signedInAs: "当前登录",
    globalMalaysiaTime: "马来西亚全球时间",
    syncingTime: "正在同步时间...",
    parkingFeeTool: "停车费工具",
    settingsSubtitle: "调整提醒、显示模式、字体、语言和文字颜色。",
    profile: "个人资料",
    signInDifferent: "登录其他账号",
    profilePicture: "头像",
    edit: "编辑",
    remove: "移除",
    profilePictureHelp: "支持 JPG、PNG、GIF 或 WebP。最大 2 MB。",
    username: "用户名",
    email: "电子邮件",
    phone: "电话号码",
    newPassword: "新密码",
    verifyNewPassword: "确认新密码",
    saveProfile: "保存资料",
    accountSafety: "账号安全",
    alerts: "提醒",
    enableAlerts: "启用提醒",
    alertBeforePlannedExit: "计划离开前提醒",
    emailAlert: "邮件提醒",
    whatsappAlert: "WhatsApp 提醒",
    whatsappDestination: "WhatsApp 收件号码",
    browserAlertStatus: "浏览器提醒状态",
    emailDestination: "邮件收件地址",
    display: "显示",
    mode: "模式",
    font: "字体",
    liveClockFormat: "实时钟格式",
    language: "语言",
    customFontName: "自定义字体名称",
    fontColor: "字体颜色",
    colorStyle: "颜色样式",
    preview: "预览",
    entryDetails: "入场资料",
    useCurrentTime: "使用当前时间",
    entryDate: "入场日期",
    entryTime: "入场时间",
    checkExitTime: "检查离场时间",
    budgetPlanner: "预算规划",
    targetBudget: "目标预算",
    exitBy: "离开时间",
    feeIfExitNow: "现在离开费用",
    parkedTime: "停车时长",
    exitBefore: "请在之前离开",
    checkedExitFee: "检查离场费用",
    parkingRates: "停车费率",
    ratesNote: "不足一个收费时段也会计算。",
    waitingForEntry: "等待入场时间",
    liveTimer: "实时计时",
    avoidNextCharge: "以避免下一次收费",
    chooseAnyExitTime: "请选择离场时间",
    enterBudget: "输入金额来规划离场时间。",
    notificationsUnavailable: "通知不可用",
    enabled: "已启用",
    blocked: "已阻止",
    notEnabled: "未启用",
    adminUsers: "用户",
    adminAccounts: "管理员账号",
    userAccounts: "用户账号"
  },
  ta: {
    calculator: "கணிப்பான்",
    notifications: "அறிவிப்புகள்",
    settings: "அமைப்புகள்",
    admin: "நிர்வாகம்",
    logout: "வெளியேறு",
    signedInAs: "உள்நுழைந்தவர்",
    globalMalaysiaTime: "உலக மலேசிய நேரம்",
    syncingTime: "நேரம் ஒத்திசைக்கிறது...",
    parkingFeeTool: "நிறுத்த கட்டண கருவி",
    settingsSubtitle: "எச்சரிக்கை, காட்சி, எழுத்துரு, மொழி மற்றும் உரை நிறத்தை மாற்றவும்.",
    profile: "சுயவிவரம்",
    signInDifferent: "வேறு கணக்கில் உள்நுழை",
    profilePicture: "சுயவிவர படம்",
    edit: "திருத்து",
    remove: "அகற்று",
    profilePictureHelp: "JPG, PNG, GIF அல்லது WebP. அதிகபட்சம் 2 MB.",
    username: "பயனர்பெயர்",
    email: "மின்னஞ்சல்",
    phone: "தொலைபேசி எண்",
    newPassword: "புதிய கடவுச்சொல்",
    verifyNewPassword: "புதிய கடவுச்சொல் சரிபார்",
    saveProfile: "சுயவிவரம் சேமி",
    accountSafety: "கணக்கு பாதுகாப்பு",
    alerts: "எச்சரிக்கைகள்",
    enableAlerts: "எச்சரிக்கைகள் இயக்கு",
    alertBeforePlannedExit: "திட்டமிட்ட வெளியேறும் முன் எச்சரிக்கை",
    emailAlert: "மின்னஞ்சல் எச்சரிக்கை",
    whatsappAlert: "WhatsApp எச்சரிக்கை",
    whatsappDestination: "WhatsApp இலக்கு",
    browserAlertStatus: "உலாவி எச்சரிக்கை நிலை",
    emailDestination: "மின்னஞ்சல் இலக்கு",
    display: "காட்சி",
    mode: "முறை",
    font: "எழுத்துரு",
    liveClockFormat: "நேரடி கடிகார வடிவம்",
    language: "மொழி",
    customFontName: "தனிப்பயன் எழுத்துரு பெயர்",
    fontColor: "எழுத்துரு நிறம்",
    colorStyle: "நிற முறை",
    preview: "முன்னோட்டம்",
    entryDetails: "நுழைவு விவரம்",
    useCurrentTime: "தற்போதைய நேரம் பயன்படுத்து",
    entryDate: "நுழைவு தேதி",
    entryTime: "நுழைவு நேரம்",
    checkExitTime: "வெளியேறும் நேரம் பார்க்க",
    budgetPlanner: "பட்ஜெட் திட்டம்",
    targetBudget: "இலக்கு பட்ஜெட்",
    exitBy: "வெளியேறு முன்",
    feeIfExitNow: "இப்போது வெளியேறினால் கட்டணம்",
    parkedTime: "நிறுத்திய நேரம்",
    exitBefore: "முன் வெளியேறு",
    checkedExitFee: "சரிபார்த்த வெளியேறும் கட்டணம்",
    parkingRates: "நிறுத்த கட்டணங்கள்",
    ratesNote: "கட்டண காலத்தின் ஒரு பகுதியும் கணக்கிடப்படும்.",
    waitingForEntry: "நுழைவு நேரம் காத்திருக்கிறது",
    liveTimer: "நேரடி டைமர்",
    avoidNextCharge: "அடுத்த கட்டணத்தை தவிர்க்க",
    chooseAnyExitTime: "வெளியேறும் நேரம் தேர்வு செய்க",
    enterBudget: "வெளியேறும் நேரம் திட்டமிட தொகையை உள்ளிடவும்.",
    notificationsUnavailable: "அறிவிப்புகள் இல்லை",
    enabled: "இயக்கப்பட்டது",
    blocked: "தடுக்கப்பட்டது",
    notEnabled: "இயக்கப்படவில்லை",
    adminUsers: "பயனர்கள்",
    adminAccounts: "நிர்வாக கணக்குகள்",
    userAccounts: "பயனர் கணக்குகள்"
  }
};

const colorPresets = {
  amber: { label: "Amber", light: [146, 64, 14], dark: [251, 191, 36] },
  auto: { label: "Auto readable", light: [23, 32, 42], dark: [247, 250, 252] },
  black: { label: "Black", light: [0, 0, 0], dark: [0, 0, 0] },
  blue: { label: "Blue", light: [30, 64, 175], dark: [147, 197, 253] },
  burgundy: { label: "Burgundy", light: [128, 24, 47], dark: [251, 113, 133] },
  charcoal: { label: "Charcoal", light: [31, 41, 55], dark: [229, 231, 235] },
  codex: { label: "Codex neutral", light: [17, 24, 39], dark: [244, 247, 250] },
  cyan: { label: "Cyan", light: [14, 116, 144], dark: [103, 232, 249] },
  emerald: { label: "Emerald", light: [4, 120, 87], dark: [110, 231, 183] },
  graphite: { label: "Graphite", light: [31, 41, 55], dark: [229, 231, 235] },
  indigo: { label: "Indigo", light: [67, 56, 202], dark: [165, 180, 252] },
  lavender: { label: "Lavender", light: [109, 40, 217], dark: [216, 180, 254] },
  navy: { label: "Navy", light: [30, 58, 138], dark: [191, 219, 254] },
  rose: { label: "Rose", light: [190, 18, 60], dark: [253, 164, 175] },
  slate: { label: "Slate", light: [51, 65, 85], dark: [226, 232, 240] },
  teal: { label: "Teal", light: [15, 93, 82], dark: [125, 211, 197] },
  violet: { label: "Violet", light: [91, 33, 182], dark: [196, 181, 253] },
  white: { label: "White", light: [255, 255, 255], dark: [255, 255, 255] },
  custom: { label: "Custom RGB", light: [23, 32, 42], dark: [247, 250, 252] }
};

const RM = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: MALAYSIA_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const rateSteps = [
  { name: "First 2 hours", fromMinutes: 0, toMinutes: 120, fee: 1 },
  { name: "3rd hour", fromMinutes: 120, toMinutes: 180, fee: 2 },
  { name: "4th hour", fromMinutes: 180, toMinutes: 240, fee: 3 },
  { name: "5th hour", fromMinutes: 240, toMinutes: 300, fee: 5 }
];

let lastExitAlertKey = "";
let timeOffsetMs = 0;
let timeSource = "Local fallback";
let lastTimeSync = null;
let stateSaveTimer = null;
let currentLanguage = "en";

function pad(value) {
  return String(value).padStart(2, "0");
}

function clampRgb(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  return Math.min(255, Math.max(0, Math.round(number)));
}

function storageKey(baseKey) {
  return `${baseKey}-${STORAGE_SCOPE}`;
}

function apiPath(path) {
  if (!SESSION_ID) return path;
  return `${path}${path.includes("?") ? "&" : "?"}sid=${encodeURIComponent(SESSION_ID)}`;
}

function sessionHeaders(extra = {}) {
  return SESSION_ID ? { ...extra, "X-Parking-Session": SESSION_ID } : extra;
}

function prepareTabSession() {
  if (!SESSION_ID) return;
  sessionStorage.setItem("parking-tab-session", SESSION_ID);
  document.querySelectorAll('a[href$=".php"], a[href*=".php?"]').forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (["login.php", "signup.php", "forgot_password.php", "verify_signup.php"].some((name) => url.pathname.endsWith(name))) return;
    url.searchParams.set("sid", SESSION_ID);
    link.href = url.toString();
  });
}

function getNow() {
  return new Date(Date.now() + timeOffsetMs);
}

function useAmPmClock() {
  return readSettings().clockFormat !== "24";
}

function formatTime(date, includeSeconds = false) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: MALAYSIA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: useAmPmClock()
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: MALAYSIA_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: useAmPmClock()
  }).format(date);
}

function formatNotificationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateTime(date);
}

function parseDateParts(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseTimeParts(value) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { hour, minute };
}

function malaysiaDateFromParts(dateValue, timeValue) {
  const date = parseDateParts(dateValue);
  const time = parseTimeParts(timeValue);
  if (!date || !time) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour - 8, time.minute, 0, 0));
}

function getMalaysiaParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === "24" ? "00" : values.hour,
    minute: values.minute
  };
}

function toDateInputValue(date) {
  const parts = getMalaysiaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toTimeInputValue(date) {
  const parts = getMalaysiaParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function toDateTimeLocalValue(date) {
  return `${toDateInputValue(date)}T${toTimeInputValue(date)}`;
}

function parseEntryDate() {
  if (!entryDateInput?.value || !entryTimeInput?.value) return null;
  return malaysiaDateFromParts(entryDateInput.value, entryTimeInput.value);
}

function parseExitDate() {
  if (!exitTimeInput?.value) return null;
  const [dateValue, timeValue] = exitTimeInput.value.split("T");
  return malaysiaDateFromParts(dateValue, timeValue);
}

function rawMinutesBetween(start, end) {
  return Math.ceil((end.getTime() - start.getTime()) / 60000);
}

function billableMinutesBetween(start, end) {
  return Math.max(0, rawMinutesBetween(start, end));
}

function selectedRateProfile() {
  if (!mallSelectInput || mallSelectInput.value === "starling") return null;
  return PARKING_MALL_RATES.getProfile(
    mallSelectInput.value,
    parkingTypeInput?.value || "",
    entryDateInput?.value || "",
    holidayRateInput?.value === "yes",
    entryTimeInput?.value || ""
  );
}

function displayParkingFee(amount) {
  return amount === null ? "Check mall" : RM.format(amount);
}

function updateMallChoices(selectedType = "") {
  if (!mallSelectInput || !parkingTypeInput) return;
  const mallId = PARKING_MALL_RATES.MALLS[mallSelectInput.value] ? mallSelectInput.value : "starling";
  const modes = PARKING_MALL_RATES.modesFor(mallId);
  parkingTypeInput.replaceChildren(...modes.map((mode) => {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.name;
    return option;
  }));
  parkingTypeInput.value = modes.some((mode) => mode.id === selectedType) ? selectedType : modes[0].id;
  if (holidayRateInput) {
    const holidayField = holidayRateInput.closest(".field");
    if (holidayField) holidayField.hidden = !["sunway", "midvalley", "gardens", "ioi", "velocity", "pavilionbj", "pavilionkl", "mytown", "paradigm", "suria", "trx", "klgcc", "putra", "square", "berjaya", "curve", "dpulze", "klgateway", "nuempire", "setiawalk", "ioipuchong", "ombak", "ekocheras", "pearlpoint", "lot10", "tamarind"].includes(mallId);
  }
  updateMallInformation();
}

function updateMallInformation() {
  if (!mallSelectInput || !mallRateNoteEl || !mallRateSourceEl) return;
  const mall = PARKING_MALL_RATES.MALLS[mallSelectInput.value] || PARKING_MALL_RATES.MALLS.starling;
  const profile = selectedRateProfile();
  mallRateNoteEl.textContent = (profile ? profile.summary + " " : "") + mall.note +
    " Estimates only. Confirm the rate board; multi-day charges are not modeled.";
  mallRateSourceEl.href = mall.source;
  mallRateSourceEl.textContent = "View rate source";
}

function calculateFee(minutes) {
  const profile = selectedRateProfile();
  if (profile) return PARKING_MALL_RATES.fee(minutes, profile);
  if (minutes <= 0) return 0;
  if (minutes <= 120) return 1;
  if (minutes <= 180) return 2;
  if (minutes <= 240) return 3;
  return 3 + Math.ceil((minutes - 240) / 60) * 2;
}

function maxMinutesForBudget(budget) {
  const profile = selectedRateProfile();
  if (profile) return PARKING_MALL_RATES.maxMinutesForBudget(budget, profile);
  if (budget < 1) return 0;
  if (budget < 2) return 120;
  if (budget < 3) return 180;
  if (budget < 5) return 240;
  return 240 + Math.floor((budget - 3) / 2) * 60;
}

function nextFeeAfterBudget(budget) {
  return calculateFee(maxMinutesForBudget(budget) + 1);
}

function getPeriod(minutes) {
  const profile = selectedRateProfile();
  if (profile) return PARKING_MALL_RATES.getPeriod(minutes, profile);
  if (minutes <= 0) return { label: "Not started yet", nextBoundary: 0, nextFee: 1 };
  if (minutes <= 120) return { label: "First 2 hours", nextBoundary: 120, nextFee: 2 };
  if (minutes <= 180) return { label: "3rd hour", nextBoundary: 180, nextFee: 3 };
  if (minutes <= 240) return { label: "4th hour", nextBoundary: 240, nextFee: 5 };

  const hoursAfterFourth = Math.ceil((minutes - 240) / 60);
  const nextBoundary = 240 + hoursAfterFourth * 60;
  const hourNumber = 4 + hoursAfterFourth;
  return {
    label: `${hourNumber}${ordinalSuffix(hourNumber)} hour`,
    nextBoundary,
    nextFee: calculateFee(nextBoundary + 1)
  };
}

function ordinalSuffix(value) {
  if (value % 100 >= 11 && value % 100 <= 13) return "th";
  if (value % 10 === 1) return "st";
  if (value % 10 === 2) return "nd";
  if (value % 10 === 3) return "rd";
  return "th";
}

function formatDuration(minutes) {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const text = hours === 0 ? `${mins}m` : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  return minutes < 0 ? `${text} before entry` : text;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function updateClockSource() {
  if (!clockSourceEl) return;
  const syncedAt = lastTimeSync ? formatTime(lastTimeSync) : "--";
  clockSourceEl.textContent = `${timeSource} - synced ${syncedAt}`;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function fetchWorldTime() {
  const response = await fetchWithTimeout("https://worldtimeapi.org/api/timezone/Asia/Kuala_Lumpur", {
    cache: "no-store"
  });
  if (!response.ok) throw new Error("World time request failed");
  const data = await response.json();
  const globalMs = typeof data.unixtime === "number" ? data.unixtime * 1000 : Date.parse(data.datetime);
  if (Number.isNaN(globalMs)) throw new Error("World time response was invalid");
  return { ms: globalMs, source: "Global internet time" };
}

async function fetchServerTime() {
  const response = await fetchWithTimeout(window.location.href, {
    cache: "no-store",
    method: "HEAD"
  });
  const dateHeader = response.headers.get("Date");
  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) throw new Error("Server time header unavailable");
  return { ms: serverMs, source: "Website server time" };
}

async function syncGlobalTime() {
  try {
    const synced = await fetchServerTime().catch(fetchWorldTime);
    timeOffsetMs = synced.ms - Date.now();
    timeSource = synced.source;
    lastTimeSync = new Date(synced.ms);
  } catch {
    timeOffsetMs = 0;
    timeSource = "Local fallback";
    lastTimeSync = new Date();
  }
  updateClockSource();
  render();
}

function showAlert(message, type = "notice") {
  if (!alertBox) {
    if (message) window.alert(message);
    return;
  }
  alertBox.textContent = message;
  alertBox.dataset.type = type;
  alertBox.hidden = !message;
}

function sortedFontOptions() {
  return [...fontOptions].sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
}

function sortedColorPresets() {
  return Object.entries(colorPresets).sort((a, b) => a[1].label.localeCompare(b[1].label, undefined, { sensitivity: "base" }));
}

function sortedLanguageOptions() {
  return [...languageOptions].sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
}

function populateLanguages() {
  if (!languageChoiceInput || languageChoiceInput.options.length > 0) return;
  sortedLanguageOptions().forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    languageChoiceInput.append(option);
  });
}

function t(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function setText(selector, key) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key);
}

function setClosestLabel(input, key) {
  const label = input?.closest("label");
  const span = label?.querySelector(":scope > span");
  if (span) span.textContent = t(key);
}

function setHeadingText(currentEnglish, key) {
  document.querySelectorAll(".panel-heading h2, .section-title h2").forEach((heading) => {
    if (heading.dataset.i18nKey === key || heading.textContent.trim() === currentEnglish) {
      heading.dataset.i18nKey = key;
      heading.textContent = t(key);
    }
  });
}

function applyLanguage(settings = readSettings()) {
  const language = translations[settings.language] ? settings.language : "en";
  currentLanguage = language;
  document.documentElement.lang = language;
  if (languageChoiceInput) languageChoiceInput.value = language;

  document.querySelectorAll(".top-nav a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.includes("index.php")) link.childNodes[0].nodeValue = t("calculator");
    if (href.includes("notifications.php")) link.childNodes[0].nodeValue = t("notifications");
    if (href.includes("settings.php")) link.textContent = t("settings");
    if (href.includes("admin.php")) link.textContent = t("admin");
    if (href.includes("logout.php")) link.textContent = t("logout");
  });

  const accountStrip = document.querySelector(".account-strip");
  if (accountStrip?.firstChild) accountStrip.firstChild.nodeValue = `${t("signedInAs")} `;

  setText(".hero-clock span", "globalMalaysiaTime");
  setText("#settings-title", "settings");
  setText("#app-title", "calculator");
  setText("#admin-title", "adminUsers");
  setText(".settings-header .subtitle", "settingsSubtitle");
  setText(".input-panel .panel-heading h2", "entryDetails");
  setText("#useNow", "useCurrentTime");
  setText("#changeProfilePicture", "edit");
  setText("#removeProfilePictureButton", "remove");
  setText(".profile-upload small", "profilePictureHelp");
  setText(".profile-save", "saveProfile");
  setText("#enableAlerts", "enableAlerts");
  setText(".section-title p", "ratesNote");
  setText(".planner-result span", "exitBy");

  const profileLink = document.querySelector(".panel-heading .link-button[href*='logout.php']");
  if (profileLink) profileLink.textContent = t("signInDifferent");

  setHeadingText("Profile", "profile");
  setHeadingText("Account Safety", "accountSafety");
  setHeadingText("Alerts", "alerts");
  setHeadingText("Display", "display");
  setHeadingText("Font Color", "fontColor");
  setHeadingText("Budget Planner", "budgetPlanner");
  setHeadingText("Parking Rates", "parkingRates");
  setHeadingText("Admin Accounts", "adminAccounts");
  setHeadingText("User Accounts", "userAccounts");

  setClosestLabel(entryDateInput, "entryDate");
  setClosestLabel(entryTimeInput, "entryTime");
  setClosestLabel(exitTimeInput, "checkExitTime");
  setClosestLabel(budgetAmountInput, "targetBudget");
  setClosestLabel(profilePictureInput, "profilePicture");
  setClosestLabel(profileUsernameInput, "username");
  setClosestLabel(profileEmailInput, "email");
  setClosestLabel(profilePhoneInput, "phone");
  setClosestLabel(profilePasswordInput, "newPassword");
  setClosestLabel(profilePasswordConfirmInput, "verifyNewPassword");
  setClosestLabel(alertBeforeInput, "alertBeforePlannedExit");
  setClosestLabel(emailAlertInput, "emailAlert");
  setClosestLabel(whatsappAlertInput, "whatsappAlert");
  setClosestLabel(themeModeInput, "mode");
  setClosestLabel(fontChoiceInput, "font");
  setClosestLabel(clockFormatInput, "liveClockFormat");
  setClosestLabel(languageChoiceInput, "language");
  setClosestLabel(customFontInput, "customFontName");
  setClosestLabel(fontColorPresetInput, "colorStyle");

  const colorPreviewLabel = fontColorPreviewEl?.previousElementSibling;
  if (colorPreviewLabel) colorPreviewLabel.textContent = t("preview");

  document.querySelectorAll(".metric span").forEach((span, index) => {
    const keys = ["feeIfExitNow", "parkedTime", "exitBefore", "checkedExitFee"];
    if (keys[index]) span.textContent = t(keys[index]);
  });

  document.querySelectorAll(".status-box span").forEach((span, index) => {
    const keys = ["browserAlertStatus", "emailDestination", "whatsappDestination"];
    if (keys[index]) span.textContent = t(keys[index]);
  });
}

function populateColorPresets() {
  if (!fontColorPresetInput) return;
  const current = fontColorPresetInput.value || readSettings().fontColorPreset;
  fontColorPresetInput.innerHTML = "";
  sortedColorPresets().forEach(([value, preset]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = preset.label;
    fontColorPresetInput.append(option);
  });
  fontColorPresetInput.value = colorPresets[current] ? current : "auto";
}

function populateFonts() {
  if (!fontChoiceInput || fontChoiceInput.options.length > 0) return;
  sortedFontOptions().forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    fontChoiceInput.append(option);
  });
}

function getSettings() {
  const saved = readSettings();
  return {
    alertBefore: alertBeforeInput?.value || "5",
    emailAlert: emailAlertInput?.value || saved.emailAlert,
    whatsappAlert: whatsappAlertInput?.value || saved.whatsappAlert,
    themeMode: themeModeInput?.value || saved.themeMode,
    clockFormat: clockFormatInput?.value || saved.clockFormat,
    language: languageChoiceInput?.value || saved.language,
    font: fontChoiceInput?.value || saved.font,
    customFont: customFontInput?.value || saved.customFont,
    fontColorPreset: fontColorPresetInput?.value || saved.fontColorPreset,
    fontRed: fontRedInput?.value || saved.fontRed,
    fontGreen: fontGreenInput?.value || saved.fontGreen,
    fontBlue: fontBlueInput?.value || saved.fontBlue
  };
}

function defaultSettings() {
  return {
    alertBefore: "5",
    emailAlert: "on",
    whatsappAlert: "off",
    themeMode: "system",
    clockFormat: "12",
    language: "en",
    font: "system",
    customFont: "",
    fontColorPreset: "auto",
    fontRed: "23",
    fontGreen: "32",
    fontBlue: "42"
  };
}

function readSettings() {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(storageKey(SETTINGS_STORAGE_KEY))) };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings = getSettings()) {
  localStorage.setItem(storageKey(SETTINGS_STORAGE_KEY), JSON.stringify(settings));
  scheduleServerStateSave();
}

function resolveTheme(mode) {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveFontFamily(settings, selectedFont) {
  if (settings.font === "custom" && settings.customFont.trim()) {
    return `"${settings.customFont.trim()}", ${fontOptions.find(([value]) => value === "system")?.[2] || fontOptions[0][2]}`;
  }
  return selectedFont[2];
}

function resolveFontColor(settings, theme) {
  if (settings.fontColorPreset === "custom") {
    return [clampRgb(settings.fontRed), clampRgb(settings.fontGreen), clampRgb(settings.fontBlue)];
  }
  const preset = colorPresets[settings.fontColorPreset] || colorPresets.auto;
  return theme === "dark" ? preset.dark : preset.light;
}

function applySettings(settings = readSettings()) {
  const selectedFont = fontOptions.find(([value]) => value === settings.font) || fontOptions[0];
  const theme = resolveTheme(settings.themeMode);
  const [red, green, blue] = resolveFontColor(settings, theme);
  const fontFamily = resolveFontFamily(settings, selectedFont);

  document.documentElement.style.fontFamily = fontFamily;
  document.body.style.fontFamily = fontFamily;
  document.body.style.setProperty("--font-color", `rgb(${red}, ${green}, ${blue})`);
  document.body.classList.toggle("theme-dark", theme === "dark");

  if (alertBeforeInput) alertBeforeInput.value = settings.alertBefore;
  if (emailAlertInput) emailAlertInput.value = IS_GUEST ? "off" : settings.emailAlert;
  if (whatsappAlertInput) whatsappAlertInput.value = IS_GUEST ? "off" : settings.whatsappAlert;
  [emailAlertInput, whatsappAlertInput].forEach((input) => { if (input) input.disabled = IS_GUEST; });
  if (themeModeInput) themeModeInput.value = settings.themeMode;
  if (clockFormatInput) clockFormatInput.value = settings.clockFormat;
  applyLanguage(settings);
  if (fontChoiceInput) fontChoiceInput.value = settings.font;
  if (customFontInput) {
    customFontInput.value = settings.customFont || "";
    customFontInput.disabled = settings.font !== "custom";
  }
  if (fontColorPresetInput) fontColorPresetInput.value = settings.fontColorPreset;
  if (fontRedInput) fontRedInput.value = String(red);
  if (fontGreenInput) fontGreenInput.value = String(green);
  if (fontBlueInput) fontBlueInput.value = String(blue);
  [fontRedInput, fontGreenInput, fontBlueInput].forEach((input) => {
    if (input) input.disabled = settings.fontColorPreset !== "custom";
  });
  if (fontColorPreviewEl) {
    fontColorPreviewEl.textContent = `rgb(${red}, ${green}, ${blue})`;
    fontColorPreviewEl.style.color = `rgb(${red}, ${green}, ${blue})`;
  }

  updateAlertStatus();
  saveSettings(settings);
}

function saveEntry() {
  if (!entryDateInput?.value || !entryTimeInput?.value) return;
  localStorage.setItem(
    storageKey(ENTRY_STORAGE_KEY),
    JSON.stringify({
      date: entryDateInput.value,
      time: entryTimeInput.value,
      exit: exitTimeInput?.value || "",
      budget: budgetAmountInput?.value || "3",
      mall: mallSelectInput?.value || "starling",
      parkingType: parkingTypeInput?.value || "standard",
      holidayRate: holidayRateInput?.value || "no"
    })
  );
  scheduleServerStateSave();
}

function readEntry() {
  try {
    return JSON.parse(localStorage.getItem(storageKey(ENTRY_STORAGE_KEY))) || {};
  } catch {
    return {};
  }
}

async function loadServerState() {
  if (!SESSION_ID) return;
  try {
    const response = await fetchWithTimeout(apiPath("api_state.php"), {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) return;
    const state = await response.json();
    if (state.entry) {
      localStorage.setItem(storageKey(ENTRY_STORAGE_KEY), JSON.stringify(state.entry));
    }
    if (state.settings) {
      localStorage.setItem(storageKey(SETTINGS_STORAGE_KEY), JSON.stringify({ ...defaultSettings(), ...state.settings }));
    }
  } catch {
    // Local storage still keeps the app usable if the server sync is unavailable.
  }
}

function scheduleServerStateSave() {
  window.clearTimeout(stateSaveTimer);
  stateSaveTimer = window.setTimeout(saveServerState, 350);
}

async function saveServerState() {
  try {
    await fetch(apiPath("api_state.php"), {
      method: "POST",
      credentials: "same-origin",
      headers: sessionHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        entry: readEntry(),
        settings: readSettings()
      })
    });
  } catch {
    // The next local change will try again.
  }
}

async function recordNotification(title, message, type = "system") {
  try {
    await fetch(apiPath("api_notifications.php"), {
      method: "POST",
      credentials: "same-origin",
      headers: sessionHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ action: "add", title, message, type })
    });
    loadNotifications();
  } catch {
    // Notification history is helpful, but alerts should still work without it.
  }
}

async function updateNotifications(action, id = "") {
  const response = await fetch(apiPath("api_notifications.php"), {
    method: "POST",
    credentials: "same-origin",
    headers: sessionHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ action, id })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Notification update failed.");
  }
}

async function loadNotifications() {
  if (!SESSION_ID) return;
  try {
    const response = await fetchWithTimeout(apiPath("api_notifications.php"), {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) return;
    const data = await response.json();
    const notifications = Array.isArray(data.notifications) ? data.notifications : [];
    const unreadCount = notifications.filter((item) => !item.read_at).length;

    if (notificationDotEl) notificationDotEl.hidden = unreadCount === 0;
    if (!notificationListEl) return;

    if (notifications.length === 0) {
      notificationListEl.innerHTML = `<div class="notification-empty">No notifications yet.</div>`;
      return;
    }

    notificationListEl.innerHTML = notifications.map((item) => `
      <article class="notification-card ${item.read_at ? "" : "unread"}" data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title || "Notification")}" data-message="${escapeHtml(item.message || "")}" tabindex="0">
        <div class="notification-title">
          <span>${escapeHtml(item.title || "Notification")}</span>
          <time>${escapeHtml(formatNotificationDate(item.created_at))}</time>
        </div>
        <div class="notification-message">${escapeHtml(item.message || "")}</div>
      </article>
    `).join("");
  } catch {
    if (notificationListEl) {
      notificationListEl.innerHTML = `<div class="notification-empty">Could not load notifications right now.</div>`;
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sortUsersByUsername(users) {
  return [...users].sort((a, b) => String(a.username || "").localeCompare(String(b.username || ""), undefined, { sensitivity: "base" }));
}

function renderAdminRows(users) {
  return sortUsersByUsername(users).map((account) => {
    const initial = (account.username || "?").slice(0, 1).toUpperCase();
    const photo = account.profile_picture
      ? `<img class="table-avatar profile-open" src="${escapeHtml(account.profile_picture)}" alt="">`
      : `<span class="table-avatar empty-avatar profile-open">${escapeHtml(initial)}</span>`;
    return `
      <tr data-username="${escapeHtml(account.username || "")}" data-email="${escapeHtml(account.email || "")}" data-phone="${escapeHtml(account.phone || "")}" data-role="${escapeHtml(account.role || "user")}" data-status="${escapeHtml(account.status || "active")}" data-picture="${escapeHtml(account.profile_picture || "")}" data-joined="${escapeHtml(account.created_display || account.created_at || "")}" data-updated="${escapeHtml(account.updated_display || account.updated_at || "")}">
        <td>${photo}</td>
        <td>${escapeHtml(account.username || "")}</td>
        <td class="wrap-cell">${escapeHtml(account.email || "")}</td>
        <td>${escapeHtml(account.phone || "")}</td>
        <td>${escapeHtml(account.role || "user")}</td>
        <td>${escapeHtml(account.status || "active")}</td>
        <td><code>${escapeHtml(account.password_hash || "")}</code></td>
        <td>${escapeHtml(account.created_display || account.created_at || "")}</td>
        <td>${escapeHtml(account.updated_display || account.updated_at || "")}</td>
      </tr>
    `;
  }).join("");
}

async function loadAdminUsers() {
  if (!SESSION_ID || (!adminUserBodyEl && !adminAccountBodyEl)) return;
  try {
    const response = await fetchWithTimeout(apiPath("api_admin_users.php"), {
      cache: "no-store",
      credentials: "same-origin"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    const users = Array.isArray(data.users) ? data.users : [];
    if (adminAccountBodyEl) adminAccountBodyEl.innerHTML = renderAdminRows(users.filter((account) => account.role === "admin"));
    if (adminUserBodyEl) adminUserBodyEl.innerHTML = renderAdminRows(users.filter((account) => account.role !== "admin"));
  } catch {
    // The server-rendered table remains visible if refresh fails.
  }
}

function readSavedPlannedExit() {
  const entry = readEntry();
  if (!entry.exit) return null;
  const [dateValue, timeValue] = entry.exit.split("T");
  const plannedExit = malaysiaDateFromParts(dateValue, timeValue);
  return !plannedExit || Number.isNaN(plannedExit.getTime()) ? null : plannedExit;
}

function setEntryToNow() {
  const now = getNow();
  entryDateInput.value = toDateInputValue(now);
  entryTimeInput.value = toTimeInputValue(now);
  if (exitTimeInput) exitTimeInput.value = toDateTimeLocalValue(addMinutes(now, 120));
  saveEntry();
  render();
}

function renderTimeline(entry, elapsedMinutes) {
  if (!rateTimelineEl) return;
  const profile = selectedRateProfile();
  rateTimelineEl.classList.toggle("multi-mall", Boolean(profile));
  if (profile) {
    const rows = PARKING_MALL_RATES.timeline(profile).map((step) => {
      const active = step.from !== null && elapsedMinutes > step.from &&
        (step.to === null || elapsedMinutes <= step.to);
      return '<li class="' + (active ? 'active' : '') + '">' +
        '<span class="rate-name">' + step.name + '</span>' +
        '<span class="rate-price">' + step.price + '</span>' +
        '<span class="rate-time">' + step.detail + '</span></li>';
    });
    rateTimelineEl.innerHTML = rows.join("");
    return;
  }
  const rows = rateSteps.map((step) => {
    const start = addMinutes(entry, step.fromMinutes);
    const end = addMinutes(entry, step.toMinutes);
    const isActive = elapsedMinutes > step.fromMinutes && elapsedMinutes <= step.toMinutes;

    return `
      <li class="${isActive ? "active" : ""}">
        <span class="rate-name">${step.name}</span>
        <span class="rate-price">${RM.format(step.fee)}</span>
        <span class="rate-time">${formatTime(start)} - ${formatTime(end)}</span>
      </li>
    `;
  });

  const fifthStart = addMinutes(entry, 300);
  rows.push(`
    <li class="${elapsedMinutes > 300 ? "active" : ""}">
      <span class="rate-name">6th hour onward</span>
      <span class="rate-price">+RM2 / hour</span>
      <span class="rate-time">After ${formatTime(fifthStart)}</span>
    </li>
  `);

  rateTimelineEl.innerHTML = rows.join("");
}

function renderBudgetPlanner(entry) {
  if (!budgetAmountInput || !budgetExitEl || !budgetHintEl) return;
  const budget = Number(budgetAmountInput.value);
  if (!entry || Number.isNaN(entry.getTime()) || Number.isNaN(budget)) {
    budgetExitEl.textContent = "--";
    budgetHintEl.textContent = t("enterBudget");
    return;
  }

  const maxMinutes = maxMinutesForBudget(budget);
  const exitBy = addMinutes(entry, maxMinutes);
  const exactFee = calculateFee(maxMinutes);
  const nextFee = nextFeeAfterBudget(budget);

  if (maxMinutes === 0) {
    budgetExitEl.textContent = formatTime(entry);
    budgetHintEl.textContent = "This budget does not cover paid parking time.";
    return;
  }

  budgetExitEl.textContent = formatDateTime(exitBy);
  if (selectedRateProfile() && maxMinutes >= PARKING_MALL_RATES.MAX_SUPPORTED_MINUTES) {
    budgetHintEl.textContent = "Within the first 24 hours: up to " + RM.format(exactFee) +
      ". Confirm any overnight or longer-stay rules with the mall.";
  } else {
    budgetHintEl.textContent = `Stay up to ${formatDuration(maxMinutes)} for ${RM.format(exactFee)}. Next charge is ${displayParkingFee(nextFee)}.`;
  }
}

function updateAlertStatus() {
  if (!alertStatusEl) return;
  if (!("Notification" in window)) {
    alertStatusEl.textContent = t("notificationsUnavailable");
    return;
  }
  alertStatusEl.textContent =
    Notification.permission === "granted"
      ? t("enabled")
      : Notification.permission === "denied"
        ? t("blocked")
        : t("notEnabled");
}

async function enableAlerts() {
  if (IS_GUEST) {
    showAlert("Guest mode cannot receive alerts. Please create an account to enable reminders.", "warning");
    return;
  }
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if ("vibrate" in navigator) navigator.vibrate(120);
  updateAlertStatus();
  showAlert("Alert setting saved. Keep this page open for browser alerts to run.", "notice");
}

function triggerPlannedExitAlert(plannedExit, minutesBefore) {
  const title = "Parking Exit Reminder";
  const body = `Your planned exit is ${formatTime(plannedExit)}. Please prepare to leave.`;
  const settings = readSettings();

  if (IS_GUEST) {
    showAlert("Guest mode does not include alerts. Please create an account to use browser, email, or WhatsApp alerts.", "warning");
    return;
  }

  showAlert(`Alert: ${minutesBefore} minutes before your planned exit at ${formatTime(plannedExit)}.`, "warning");
  recordNotification(title, `${minutesBefore} minutes before planned exit at ${formatDateTime(plannedExit)}.`, "browser");

  if ("vibrate" in navigator) {
    navigator.vibrate([350, 150, 350, 150, 550]);
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
  if (settings.emailAlert === "on") {
    sendEmailAlert(plannedExit, minutesBefore);
  }
  if (settings.whatsappAlert === "on") {
    openWhatsAppAlert(plannedExit, minutesBefore);
  }
}

function normalizedPhoneDigits() {
  return String(CURRENT_USER.phone || "").replace(/\D/g, "");
}

function reminderMessage(plannedExit, minutesBefore) {
  return `Parking reminder: your planned exit is ${formatDateTime(plannedExit)}. This is your ${minutesBefore}-minute reminder.`;
}

function openWhatsAppAlert(plannedExit, minutesBefore) {
  const phone = normalizedPhoneDigits();
  if (!phone) {
    showAlert("WhatsApp alert needs a phone number in your account profile.", "warning");
    return;
  }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(reminderMessage(plannedExit, minutesBefore))}`;
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) {
    showAlert("WhatsApp could not open. Please allow pop-ups for this website or open WhatsApp manually.", "warning");
    recordNotification("WhatsApp alert blocked", `WhatsApp reminder could not open for +${phone}.`, "whatsapp");
    return;
  }
  recordNotification("WhatsApp alert opened", `Prepared WhatsApp reminder for +${phone}.`, "whatsapp");
}

async function sendEmailAlert(plannedExit, minutesBefore) {
  try {
    const response = await fetch(apiPath("api_email_alert.php"), {
      method: "POST",
      credentials: "same-origin",
      headers: sessionHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        plannedExit: formatDateTime(plannedExit),
        minutesBefore
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && result.error) {
      showAlert(`Alert shown, but email was not sent: ${result.error}`, "warning");
    } else {
      loadNotifications();
    }
  } catch {
    showAlert("Alert shown, but email was not sent. Please check your server mail setup.", "warning");
  }
}

function renderPlannedExitAlert(now, plannedExit) {
  if (!plannedExit || Number.isNaN(plannedExit.getTime())) return false;

  const settings = readSettings();
  const minutesBefore = Number(settings.alertBefore);
  const alertAt = addMinutes(plannedExit, -minutesBefore);
  const msUntilAlert = alertAt.getTime() - now.getTime();
  const msAfterAlert = now.getTime() - alertAt.getTime();
  const key = `${plannedExit.getTime()}-${minutesBefore}`;

  if (msUntilAlert > 0) {
    lastExitAlertKey = "";
    return false;
  }

  if (msAfterAlert <= 60000 && lastExitAlertKey !== key) {
    lastExitAlertKey = key;
    triggerPlannedExitAlert(plannedExit, minutesBefore);
    document.title = `Exit reminder - ${formatTime(plannedExit)}`;
    return true;
  }

  return false;
}

function renderLiveFeeAlert(entry, now, leaveBy, period) {
  if (!leaveBy || period.nextFee === null) {
    showAlert("");
    document.title = "Parking Calculator";
    return;
  }
  const settings = readSettings();
  const alertBefore = Number(settings.alertBefore);
  const minutesUntilNextCharge = rawMinutesBetween(now, leaveBy);

  if (entry > now) {
    showAlert("Entry time is in the future. You can still use planned exit and budget planner.", "notice");
    document.title = "Parking Calculator";
    return;
  }

  if (minutesUntilNextCharge > 0 && minutesUntilNextCharge <= alertBefore) {
    showAlert(`Fee notice: ${formatDuration(minutesUntilNextCharge)} left before the fee changes to ${RM.format(period.nextFee)}.`, "warning");
    document.title = `Leave soon - ${formatTime(leaveBy)}`;
    return;
  }

  showAlert("");
  document.title = "Parking Calculator";
}

function renderClock() {
  const now = getNow();
  if (currentTimeEl) currentTimeEl.textContent = formatTime(now, true);
  if (currentDateEl) currentDateEl.textContent = dateFormatter.format(now);
  updateClockSource();
}

function renderCalculator() {
  if (!entryDateInput || !entryTimeInput) return;

  const now = getNow();
  const entry = parseEntryDate();
  const plannedExit = parseExitDate();

  if (!entry || Number.isNaN(entry.getTime())) {
    currentFeeEl.textContent = RM.format(0);
    currentBandEl.textContent = t("waitingForEntry");
    elapsedTimeEl.textContent = "0m";
    elapsedHintEl.textContent = t("liveTimer");
    leaveByEl.textContent = "--";
    nextChargeEl.textContent = t("avoidNextCharge");
    plannedFeeEl.textContent = RM.format(0);
    plannedDurationEl.textContent = t("chooseAnyExitTime");
    budgetExitEl.textContent = "--";
    budgetHintEl.textContent = t("enterBudget");
    if (rateTimelineEl) rateTimelineEl.innerHTML = "";
    showAlert("");
    return;
  }

  saveEntry();

  const elapsedMinutes = billableMinutesBetween(entry, now);
  const currentFee = calculateFee(elapsedMinutes);
  const period = getPeriod(elapsedMinutes);
  const leaveBy = period.nextBoundary === null ? null : addMinutes(entry, period.nextBoundary);

  currentFeeEl.textContent = displayParkingFee(currentFee);
  currentBandEl.textContent = period.label;
  elapsedTimeEl.textContent = formatDuration(rawMinutesBetween(entry, now));
  elapsedHintEl.textContent = entry > now ? "Before entry time" : "Since entry";
  leaveByEl.textContent = !leaveBy || period.nextBoundary === 0 ? "--" : formatTime(leaveBy);

  if (period.nextBoundary === null) {
    nextChargeEl.textContent = elapsedMinutes > 1440
      ? "Beyond 24h: confirm mall policy"
      : "No further increase within 24h";
  } else if (period.nextBoundary === 0) {
    nextChargeEl.textContent = "parking has not started";
  } else {
    const timeLeft = rawMinutesBetween(now, leaveBy);
    nextChargeEl.textContent =
      timeLeft > 0
        ? `${formatDuration(timeLeft)} left before ${RM.format(period.nextFee)}`
        : `next fee is ${RM.format(period.nextFee)} after this period`;
  }

  if (plannedExit && !Number.isNaN(plannedExit.getTime())) {
    const plannedRawMinutes = rawMinutesBetween(entry, plannedExit);
    const plannedMinutes = billableMinutesBetween(entry, plannedExit);
    plannedFeeEl.textContent = displayParkingFee(calculateFee(plannedMinutes));
    plannedDurationEl.textContent =
      plannedRawMinutes < 0
        ? "Exit time is before entry time"
        : `${formatDuration(plannedMinutes)} total parking`;
  } else {
    plannedFeeEl.textContent = RM.format(0);
    plannedDurationEl.textContent = t("chooseAnyExitTime");
  }

  renderBudgetPlanner(entry);
  updateMallInformation();
  const plannedAlertShown = renderPlannedExitAlert(now, plannedExit);
  if (!plannedAlertShown) renderLiveFeeAlert(entry, now, leaveBy, period);
  renderTimeline(entry, elapsedMinutes);
}

function render() {
  renderClock();
  renderCalculator();
  if (!entryDateInput || !entryTimeInput) {
    const shown = renderPlannedExitAlert(getNow(), readSavedPlannedExit());
    if (!shown) document.title = document.title || "Parking Settings";
  }
}

function loadSavedEntry() {
  if (!entryDateInput || !entryTimeInput) return;
  const entry = readEntry();
  if (mallSelectInput) {
    mallSelectInput.value = PARKING_MALL_RATES.MALLS[entry.mall] ? entry.mall : "starling";
    if (holidayRateInput) holidayRateInput.value = entry.holidayRate === "yes" ? "yes" : "no";
    updateMallChoices(entry.parkingType || "");
  }
  if (!entry.date || !entry.time) {
    setEntryToNow();
    return;
  }

  entryDateInput.value = entry.date;
  entryTimeInput.value = entry.time;
  if (exitTimeInput) exitTimeInput.value = entry.exit || "";
  if (budgetAmountInput) budgetAmountInput.value = entry.budget || "3";
}

function initializeProfilePreview() {
  if (!profilePreviewEl) return;
  const existingSrc = profilePreviewEl.getAttribute("src");
  const hasPicture = Boolean(existingSrc);
  profilePreviewEl.hidden = !hasPicture;
  if (profileInitialEl) profileInitialEl.hidden = hasPicture;
}

function previewProfilePicture() {
  if (!profilePictureInput?.files?.[0] || !profilePreviewEl) return;
  const file = profilePictureInput.files[0];
  if (!file.type.startsWith("image/")) {
    showAlert("Please choose a supported image file.", "warning");
    profilePictureInput.value = "";
    return;
  }
  if (removeProfilePictureInput) removeProfilePictureInput.value = "0";
  openProfileCropper(file);
}

function chooseProfilePicture() {
  profilePictureInput?.click();
}

function removeProfilePicture() {
  if (removeProfilePictureInput) removeProfilePictureInput.value = "1";
  croppedProfileBlob = null;
  if (profilePictureInput) profilePictureInput.value = "";
  if (profilePreviewEl) {
    profilePreviewEl.removeAttribute("src");
    profilePreviewEl.hidden = true;
  }
  if (profileInitialEl) profileInitialEl.hidden = false;
  if (removeProfilePictureButton) removeProfilePictureButton.disabled = true;
  showAlert("Profile picture will be removed after you save profile.", "notice");
}

async function saveProfile(event) {
  event.preventDefault();
  if (!profileForm) return;

  const username = profileUsernameInput?.value.trim() || "";
  const email = profileEmailInput?.value.trim() || "";
  const phone = profilePhoneInput?.value.trim() || "";
  const password = profilePasswordInput?.value || "";
  const passwordConfirm = profilePasswordConfirmInput?.value || "";

  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    showAlert("Username must be 3-24 characters and use only letters, numbers, or underscore.", "warning");
    return;
  }
  if (profileEmailInput?.required) {
    const emailError = validateEmailInput(email);
    if (emailError) {
      showAlert(emailError, "warning");
      return;
    }
  }
  if (profilePhoneInput?.required && !/^\d{8,10}$/.test(phone)) {
    showAlert("Please enter numbers only after +60. Example: 162345678.", "warning");
    return;
  }
  if (password && (password.length < 7 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))) {
    showAlert("Password must be at least 7 characters and include one number and one special character.", "warning");
    return;
  }
  if (password !== passwordConfirm) {
    showAlert("New password and verify password must match.", "warning");
    return;
  }

  const formData = new FormData(profileForm);
  if (croppedProfileBlob) formData.set("profile_picture", croppedProfileBlob, "profile-picture.jpg");
  try {
    const response = await fetch(apiPath("api_profile.php"), {
      method: "POST",
      credentials: "same-origin",
      headers: sessionHeaders(),
      body: formData
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAlert(result.error || "Profile could not be updated.", "warning");
      return;
    }
    showAlert("Profile saved successfully.", "notice");
    if (profilePasswordInput) profilePasswordInput.value = "";
    croppedProfileBlob = null;
    window.setTimeout(() => { internalNavigation = true; window.location.reload(); }, 700);
  } catch {
    showAlert("Profile could not be updated. Please check the server connection.", "warning");
  }
}

async function deleteAccount(event) {
  event.preventDefault();
  const password = deletePasswordInput?.value || "";
  const passwordConfirm = deletePasswordConfirmInput?.value || "";
  if (!password) {
    showAlert("Enter your password before deleting the account.", "warning");
    return;
  }
  if (password !== passwordConfirm) {
    showAlert("Password and verify password must match before deleting the account.", "warning");
    return;
  }
  const confirmed = window.confirm("Delete this account permanently? This removes your saved parking data and notifications.");
  if (!confirmed) return;

  try {
    const response = await fetch(apiPath("api_delete_account.php"), {
      method: "POST",
      credentials: "same-origin",
      headers: sessionHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ password, password_confirm: passwordConfirm })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAlert(result.error || "Account could not be deleted.", "warning");
      return;
    }
    internalNavigation = true; window.location.href = "signup.php";
  } catch {
    showAlert("Account could not be deleted. Please check the server connection.", "warning");
  }
}

async function markNotificationRead(id) {
  try {
    await updateNotifications("mark_read", id);
    await loadNotifications();
  } catch (error) {
    showAlert(error.message, "warning");
  }
}

async function markAllNotificationsRead() {
  try {
    await updateNotifications("mark_read", "all");
    await loadNotifications();
    showAlert("All notifications marked as read.", "notice");
  } catch (error) {
    showAlert(error.message, "warning");
  }
}

async function clearAllNotifications() {
  try {
    await updateNotifications("clear");
    await loadNotifications();
    showAlert("Notifications cleared.", "notice");
  } catch (error) {
    showAlert(error.message, "warning");
  }
}

async function refreshAccountState() {
  await loadServerState();
  loadSavedEntry();
  applySettings(readSettings());
  render();
}




function validateEmailInput(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  const domain = email.split("@").pop().toLowerCase();
  const knownTypos = {
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "outlook.co": "outlook.com",
    "yahoo.co": "yahoo.com"
  };
  if (knownTypos[domain]) return `Please check your email domain. Did you mean ${knownTypos[domain]}?`;
  return null;
}

function validatePasswordConfirmationForms() {
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      const emailInput = form.querySelector('input[type="email"]');
      if (emailInput?.required) {
        const emailError = validateEmailInput(emailInput.value.trim());
        if (emailError) {
          event.preventDefault();
          showAlert(emailError, "warning");
          emailInput.focus();
          return;
        }
      }
      const phoneInput = form.querySelector('input[name="phone"], #profilePhone');
      if (phoneInput?.required && !/^\d{8,10}$/.test(phoneInput.value.trim())) {
        event.preventDefault();
        showAlert("Please enter numbers only after +60. Example: 162345678.", "warning");
        phoneInput.focus();
        return;
      }
      const password = form.querySelector('input[name="password"], #deletePassword');
      const confirm = form.querySelector('input[name="password_confirm"], #deletePasswordConfirm, #profilePasswordConfirm');
      if (!password || !confirm) return;
      if (password.value !== confirm.value) {
        event.preventDefault();
        showAlert("Password and verify password must match.", "warning");
      }
    });
  });
}

function revealPassword(button, reveal) {
  const input = button.closest(".password-control")?.querySelector("input");
  if (!input) return;
  input.type = reveal ? "text" : "password";
  button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
}

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function drawCropCanvas() {
  if (!profileCropCanvas || !cropImage) return;
  const ctx = profileCropCanvas.getContext("2d");
  const size = profileCropCanvas.width;
  const zoom = Number(cropZoomInput?.value || 1);
  ctx.clearRect(0, 0, size, size);
  const scale = Math.max(size / cropImage.width, size / cropImage.height) * zoom;
  const width = cropImage.width * scale;
  const height = cropImage.height * scale;
  const x = (size - width) / 2 + cropOffset.x;
  const y = (size - height) / 2 + cropOffset.y;
  ctx.drawImage(cropImage, x, y, width, height);
}

function openProfileCropper(file) {
  if (!profileCropModal || !profileCropCanvas) return;
  cropImage = new Image();
  cropOffset = { x: 0, y: 0 };
  cropImage.onload = () => {
    drawCropCanvas();
    openModal(profileCropModal);
  };
  cropImage.src = URL.createObjectURL(file);
}

function applyProfileCrop() {
  if (!profileCropCanvas) return;
  profileCropCanvas.toBlob((blob) => {
    if (!blob) return;
    croppedProfileBlob = blob;
    if (profilePreviewEl) {
      profilePreviewEl.src = URL.createObjectURL(blob);
      profilePreviewEl.hidden = false;
    }
    if (profileInitialEl) profileInitialEl.hidden = true;
    if (removeProfilePictureInput) removeProfilePictureInput.value = "0";
    if (removeProfilePictureButton) removeProfilePictureButton.disabled = false;
    closeModal(profileCropModal);
  }, "image/jpeg", 0.9);
}

function showMessageDetails(card) {
  if (!messageModal || !messageModalTitle || !messageModalBody) return;
  messageModalTitle.textContent = card.dataset.title || "Notification";
  messageModalBody.textContent = card.dataset.message || "";
  openModal(messageModal);
}

function showUserDetails(row) {
  if (!userModal || !userModalBody) return;
  const picture = row.dataset.picture
    ? `<img class="profile-avatar modal-avatar" src="${escapeHtml(row.dataset.picture)}" alt="">`
    : `<span class="profile-avatar modal-avatar modal-avatar-placeholder empty-avatar">${escapeHtml((row.dataset.username || "?").slice(0, 1).toUpperCase())}</span>`;
  userModalBody.innerHTML = `
    ${picture}
    <h2>${escapeHtml(row.dataset.username || "")}</h2>
    <p>${escapeHtml(row.dataset.email || "No email")}</p>
    <div class="modal-detail-grid">
      <span>Phone</span><strong>${escapeHtml(row.dataset.phone || "")}</strong>
      <span>Role</span><strong>${escapeHtml(row.dataset.role || "user")}</strong>
      <span>Status</span><strong>${escapeHtml(row.dataset.status || "active")}</strong>
      <span>Joined</span><strong>${escapeHtml(row.dataset.joined || "")}</strong>
      <span>Updated</span><strong>${escapeHtml(row.dataset.updated || "")}</strong>
    </div>`;
  openModal(userModal);
}

async function initialize() {
  prepareTabSession();
  validatePasswordConfirmationForms();
  populateFonts();
  populateLanguages();
  populateColorPresets();
  await loadServerState();
  const settings = readSettings();
  applySettings(settings);
  loadSavedEntry();
  initializeProfilePreview();
  await loadNotifications();
  await loadAdminUsers();
  render();
  syncGlobalTime();
}

entryDateInput?.addEventListener("input", render);
entryTimeInput?.addEventListener("input", render);
exitTimeInput?.addEventListener("input", render);
budgetAmountInput?.addEventListener("input", render);
mallSelectInput?.addEventListener("change", () => {
  updateMallChoices();
  saveEntry();
  render();
});
parkingTypeInput?.addEventListener("change", () => { saveEntry(); render(); });
holidayRateInput?.addEventListener("change", () => { saveEntry(); render(); });
alertBeforeInput?.addEventListener("change", () => {
  const settings = { ...readSettings(), alertBefore: alertBeforeInput.value };
  applySettings(settings);
  render();
});
emailAlertInput?.addEventListener("change", () => applySettings({ ...readSettings(), emailAlert: emailAlertInput.value }));
whatsappAlertInput?.addEventListener("change", () => applySettings({ ...readSettings(), whatsappAlert: whatsappAlertInput.value }));
themeModeInput?.addEventListener("change", () => applySettings({ ...readSettings(), themeMode: themeModeInput.value }));
clockFormatInput?.addEventListener("change", () => {
  applySettings({ ...readSettings(), clockFormat: clockFormatInput.value });
  render();
});
languageChoiceInput?.addEventListener("change", () => {
  applySettings({ ...readSettings(), language: languageChoiceInput.value });
  render();
});
fontChoiceInput?.addEventListener("change", () => applySettings({ ...readSettings(), font: fontChoiceInput.value }));
customFontInput?.addEventListener("input", () => applySettings({ ...readSettings(), font: "custom", customFont: customFontInput.value }));
fontColorPresetInput?.addEventListener("change", () => {
  applySettings({ ...readSettings(), fontColorPreset: fontColorPresetInput.value });
});
[fontRedInput, fontGreenInput, fontBlueInput].forEach((input) => {
  input?.addEventListener("input", () => {
    applySettings({
      ...readSettings(),
      fontColorPreset: "custom",
      fontRed: fontRedInput.value,
      fontGreen: fontGreenInput.value,
      fontBlue: fontBlueInput.value
    });
  });
});
enableAlertsButton?.addEventListener("click", enableAlerts);
useNowButton?.addEventListener("click", setEntryToNow);
profilePictureInput?.addEventListener("change", previewProfilePicture);
profilePictureButton?.addEventListener("click", chooseProfilePicture);
changeProfilePictureButton?.addEventListener("click", chooseProfilePicture);
removeProfilePictureButton?.addEventListener("click", removeProfilePicture);
document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); revealPassword(button, true); });
  button.addEventListener("pointerup", () => revealPassword(button, false));
  button.addEventListener("pointercancel", () => revealPassword(button, false));
  button.addEventListener("pointerleave", () => revealPassword(button, false));
  button.addEventListener("blur", () => revealPassword(button, false));
});
document.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { internalNavigation = true; }));
profileForm?.addEventListener("submit", saveProfile);
deleteAccountForm?.addEventListener("submit", deleteAccount);
notificationListEl?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const card = target?.closest(".notification-card");
  if (card?.dataset.id) { showMessageDetails(card); markNotificationRead(card.dataset.id); }
});
notificationListEl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target instanceof Element ? event.target : null;
  const card = target?.closest(".notification-card");
  if (!card?.dataset.id) return;
  event.preventDefault();
  showMessageDetails(card);
  markNotificationRead(card.dataset.id);
});
markAllReadButton?.addEventListener("click", markAllNotificationsRead);
modalCloseButtons.forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); closeModal(button.closest(".modal-backdrop")); }));
cropZoomInput?.addEventListener("input", drawCropCanvas);
cropApplyButton?.addEventListener("click", applyProfileCrop);
cropCancelButton?.addEventListener("click", () => closeModal(profileCropModal));
profileCropCanvas?.addEventListener("pointerdown", (event) => { cropDragging = true; cropLastPoint = { x: event.clientX, y: event.clientY }; profileCropCanvas.setPointerCapture(event.pointerId); });
profileCropCanvas?.addEventListener("pointermove", (event) => { if (!cropDragging) return; cropOffset.x += event.clientX - cropLastPoint.x; cropOffset.y += event.clientY - cropLastPoint.y; cropLastPoint = { x: event.clientX, y: event.clientY }; drawCropCanvas(); });
profileCropCanvas?.addEventListener("pointerup", () => { cropDragging = false; });
adminUserBodyEl?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest(".profile-open")) return;
  const row = target.closest("tr");
  if (row) showUserDetails(row);
});
adminAccountBodyEl?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest(".profile-open")) return;
  const row = target.closest("tr");
  if (row) showUserDetails(row);
});
clearNotificationsButton?.addEventListener("click", clearAllNotifications);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applySettings(readSettings()));

initialize();
setInterval(render, 1000);
setInterval(syncGlobalTime, 300000);
setInterval(loadNotifications, 30000);
setInterval(refreshAccountState, 60000);
setInterval(loadAdminUsers, 30000);
