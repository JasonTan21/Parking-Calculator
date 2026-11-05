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
