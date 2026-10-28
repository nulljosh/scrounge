const API = location.hostname === "localhost" ? "http://localhost:8787" : "https://curbside-api.trommatic.workers.dev";
const PAGE = 60;

const CATEGORIES = [
  ["sss", "For sale"], ["cta", "Cars & trucks"], ["hhh", "Housing"], ["apa", "Apartments"],
  ["jjj", "Jobs"], ["ggg", "Gigs"], ["ccc", "Community"], ["rrr", "Resumes"],
];

const $ = (id) => document.getElementById(id);
const grid = $("grid"), status = $("status");

let results = [], shown = 0, showingFavs = false;

// ponytail: favourites are ids -> the card object, so the Saved view needs no
// network at all. A few hundred small objects is nothing for localStorage.
const favs = {
  all: JSON.parse(localStorage.getItem("curbside:favs") || "{}"),
  has(id) { return id in this.all; },
  toggle(item) {
    if (this.has(item.id)) delete this.all[item.id]; else this.all[item.id] = item;
    localStorage.setItem("curbside:favs", JSON.stringify(this.all));
    return this.has(item.id);
  },
};

// Last 12 opened listings, newest first, stored whole like favs.
const recent = {
  all: JSON.parse(localStorage.getItem("scrounger:recent") || "[]"),
  add(item) {
    this.all = [item, ...this.all.filter((r) => r.id !== item.id)].slice(0, 12);
    localStorage.setItem("scrounger:recent", JSON.stringify(this.all));
    drawRecent();
  },
};
function drawRecent() {
  $("recentlist").replaceChildren(...recent.all.map(card));
  $("recent").hidden = !recent.all.length || showingFavs;
}

for (const [v, label] of CATEGORIES) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.dataset.cat = v;
  b.addEventListener("click", () => { $("cat").value = v; markCat(); $("f").requestSubmit(); });
  $("cats").append(b);
}
function markCat() {
  for (const c of $("cats").children) c.setAttribute("aria-pressed", String(c.dataset.cat === $("cat").value));
}
markCat();

// Saved searches: a search's query string plus the newest post it showed, so a quiet check on
// load can say how many are new. ponytail: capped at 5, so a page load costs at most 5 calls.
const FIELDS = ["q", "city", "cat", "min_price", "max_price", "postal", "search_distance", "sort"];
const searches = {
  all: JSON.parse(localStorage.getItem("scrounger:searches") || "[]"),
  store() { localStorage.setItem("scrounger:searches", JSON.stringify(this.all)); drawSearches(); },
};
let current = null; // the search on screen: { params, newest }

function drawSearches() {
  $("searches").hidden = !searches.all.length;
  $("searches").replaceChildren(...searches.all.map((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s.fresh ? `${s.label} · ${s.fresh > 99 ? "99+" : s.fresh} new` : s.label;
    b.setAttribute("aria-pressed", String(s.params === current?.params));
    b.addEventListener("click", () => runSaved(s.params));
    return b;
  }));
  const saved = searches.all.some((s) => s.params === current?.params);
  $("savesearch").textContent = saved ? "Search saved" : "Save search";
  $("savesearch").setAttribute("aria-pressed", String(saved));
}

function runSaved(qs) {
  const p = new URLSearchParams(qs);
  for (const k of FIELDS) $(k).value = p.get(k) ?? (k === "sort" ? "deal" : "");
  $("hasPic").checked = p.has("hasPic");
  markCat();
  $("f").requestSubmit();
}

// Pressing it again on a saved search forgets it.
$("savesearch").addEventListener("click", () => {
  if (!current) return;
  const i = searches.all.findIndex((s) => s.params === current.params);
  if (i >= 0) searches.all.splice(i, 1);
  else {
    const p = new URLSearchParams(current.params);
    const what = p.get("q") || CATEGORIES.find(([v]) => v === p.get("cat"))?.[1] || "Listings";
    searches.all = [{ params: current.params, label: `${what} in ${p.get("city")}`, newest: current.newest, fresh: 0 }, ...searches.all].slice(0, 5);
  }
  searches.store();
});

(async () => {
  for (const s of searches.all) {
    try {
      const p = new URLSearchParams(s.params);
      p.set("sort", "date");
      const d = await (await fetch(`${API}/api/search?${p}`)).json();
      s.fresh = (d.items || []).filter((it) => it.postedDate > s.newest).length;
    } catch {} // offline: keep the last count
  }
  searches.store();
})();

let detailItem = null;
$("dshare").addEventListener("click", async () => {
  const url = $("dlink").href, title = detailItem?.title || "Scrounger";
  if (navigator.share) return navigator.share({ title, url }).catch(() => {});
  await navigator.clipboard?.writeText(url).catch(() => {});
  $("dshare").textContent = "Link copied";
  setTimeout(() => { $("dshare").textContent = "Share"; }, 2000);
});

fetch(`${API}/api/cities`).then((r) => r.json()).then((cities) => {
  const dl = $("cities");
  for (const c of cities) dl.append(new Option(c.name, c.slug));
}).catch(() => {}); // the city box still accepts a typed slug without the list

const ago = (secs) => {
  const m = Math.max(0, (Date.now() / 1000 - secs) / 60);
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function card(item) {
  const li = document.createElement("li");
  li.className = "card cardwrap";

  const open = document.createElement("button");
  open.className = "open";
  open.type = "button";
  open.addEventListener("click", () => showDetail(item));

  if (item.thumb) {
    const img = document.createElement("img");
    img.src = item.thumb;
    img.loading = "lazy";
    img.alt = "";
    open.append(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "noimg";
    ph.textContent = "No photo";
    open.append(ph);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  // textContent throughout: every string below is written by a stranger.
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = item.priceString || "—";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = item.title;
  const sub = document.createElement("span");
  sub.className = "sub";
  sub.textContent = [item.location, ago(item.postedDate)].filter(Boolean).join(" · ");
  meta.append(price, title, sub);
  if (item.dealReason) {
    const reason = document.createElement("span");
    reason.className = "sub deal";
    reason.textContent = item.dealReason;
    meta.append(reason);
  }
  open.append(meta);

  const star = document.createElement("button");
  star.className = "star";
  star.type = "button";
  star.textContent = "★";
  star.setAttribute("aria-label", "Save listing");
  star.setAttribute("aria-pressed", String(favs.has(item.id)));
  star.addEventListener("click", (e) => {
    e.stopPropagation();
    star.setAttribute("aria-pressed", String(favs.toggle(item)));
    if (showingFavs) render(Object.values(favs.all), true);
  });

  li.append(open, star);
  return li;
}

// Static map of the shown results from OpenStreetMap tiles: plain images, no map library.
// Zoom is the closest that fits every pin in ~280x200 (a phone); a 7x3 tile grid covers any box
// up to 1536px wide.
const T = 256;
const project = (lat, lon, z) => {
  const n = 2 ** z * T, r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
};
function drawMap() {
  const box = $("map");
  box.hidden = $("mapbtn").getAttribute("aria-pressed") !== "true";
  const items = results.slice(0, shown).filter((it) => it.lat != null && it.lon != null);
  if (box.hidden || !items.length) return box.replaceChildren();
  let z = 15, pts;
  for (; z > 3; z--) {
    pts = items.map((it) => project(it.lat, it.lon, z));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    if (Math.max(...xs) - Math.min(...xs) <= 280 && Math.max(...ys) - Math.min(...ys) <= 200) break;
  }
  pts = items.map((it) => project(it.lat, it.lon, z));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const gx = (Math.floor(cx / T) - 3) * T, gy = (Math.floor(cy / T) - 1) * T;
  const grid = document.createElement("div");
  grid.className = "tiles";
  grid.style.left = `calc(50% - ${cx - gx}px)`;
  grid.style.top = `calc(50% - ${cy - gy}px)`;
  for (let ty = gy / T; ty < gy / T + 3; ty++)
    for (let tx = gx / T; tx < gx / T + 7; tx++) {
      const img = new Image(T, T);
      img.src = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
      img.alt = "";
      img.style.left = `${tx * T - gx}px`; img.style.top = `${ty * T - gy}px`;
      grid.append(img);
    }
  items.forEach((it, i) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "pin";
    pin.title = pin.ariaLabel = [it.priceString, it.title].filter(Boolean).join(" · ");
    pin.style.left = `${pts[i][0] - gx}px`; pin.style.top = `${pts[i][1] - gy}px`;
    pin.addEventListener("click", () => showDetail(it));
    grid.append(pin);
  });
  const credit = document.createElement("span");
  credit.className = "credit";
  credit.textContent = "© OpenStreetMap";
  box.replaceChildren(grid, credit);
}

function render(items, reset) {
  if (reset) { grid.replaceChildren(); shown = 0; results = items; }
  const next = results.slice(shown, shown + PAGE);
  for (const it of next) grid.append(card(it));
  shown += next.length;
  $("more").hidden = shown >= results.length;
  drawMap();
}

async function showDetail(item) {
  detailItem = item;
  recent.add(item);
  $("dtitle").textContent = item.title;
  $("dsub").textContent = [item.priceString, item.location].filter(Boolean).join(" · ");
  $("dlink").href = item.url;
  $("dshots").replaceChildren();
  $("dattrs").replaceChildren();
  $("dtext").textContent = "Loading…";
  $("detail").showModal();

  try {
    const d = await (await fetch(`${API}/api/post/${encodeURIComponent(item.uuid)}`)).json();
    if (d.error) throw new Error(d.error);
    $("dtext").textContent = d.body || "No description.";
    if (d.url) $("dlink").href = d.url;
    for (const src of d.images || []) {
      const img = document.createElement("img");
      img.src = src; img.alt = ""; img.loading = "lazy";
      $("dshots").append(img);
    }
    for (const a of d.attributes || []) {
      const li = document.createElement("li");
      li.textContent = `${a.label}: ${a.value}`;
      $("dattrs").append(li);
    }
  } catch (e) {
    $("dtext").textContent = "Couldn't load this posting. Open the original instead.";
  }
}

$("dclose").addEventListener("click", () => $("detail").close());
$("more").addEventListener("click", () => render(results, false));
$("toggle").addEventListener("click", () => {
  const open = $("filters").hidden;
  $("filters").hidden = !open;
  $("toggle").setAttribute("aria-expanded", String(open));
});

$("mapbtn").addEventListener("click", () => {
  $("mapbtn").setAttribute("aria-pressed", String($("mapbtn").getAttribute("aria-pressed") !== "true"));
  drawMap();
});

$("favbtn").addEventListener("click", () => {
  showingFavs = !showingFavs;
  $("favbtn").setAttribute("aria-pressed", String(showingFavs));
  drawRecent();
  if (showingFavs) {
    const saved = Object.values(favs.all);
    status.textContent = saved.length ? `${saved.length} saved` : "Nothing saved yet.";
    render(saved, true);
  } else {
    status.textContent = "Search to begin.";
    render([], true);
  }
});

addEventListener("DOMContentLoaded", () => $("f").requestSubmit());
$("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  showingFavs = false;
  $("favbtn").setAttribute("aria-pressed", "false");
  drawRecent();

  const p = new URLSearchParams({ city: $("city").value.trim() || "vancouver", cat: $("cat").value });
  if ($("q").value.trim()) p.set("q", $("q").value.trim());
  for (const k of ["min_price", "max_price", "postal", "search_distance", "sort"]) {
    if ($(k).value) p.set(k, $(k).value);
  }
  if ($("hasPic").checked) p.set("hasPic", "1");

  status.textContent = "Searching…";
  grid.replaceChildren();
  $("more").hidden = true;
  try {
    const d = await (await fetch(`${API}/api/search?${p}`)).json();
    if (d.error) { status.textContent = d.error; return; }
    status.textContent = d.total
      ? `${d.total.toLocaleString()} results in ${d.location?.city || $("city").value}`
      : "No results.";
    // Craigslist reposts the same ad many times; show each title, price and place once.
    const seen = new Set();
    render(d.items.filter((it) => { const k = `${it.title}|${it.price}|${it.location}`; return !seen.has(k) && seen.add(k); }), true);
    current = { params: p.toString(), newest: Math.max(0, ...d.items.map((it) => it.postedDate)) };
    const s = searches.all.find((x) => x.params === current.params);
    if (s) { s.newest = current.newest; s.fresh = 0; }
    searches.store();
  } catch {
    status.textContent = "Couldn't reach the server.";
  }
});

// Near me: nearest Craigslist city to the device, ranked by deal.
$("nearme").addEventListener("click", () => {
  if (!navigator.geolocation) { status.textContent = "Location isn't available here."; return; }
  status.textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const d = await (await fetch(`${API}/api/nearest?lat=${coords.latitude}&lon=${coords.longitude}`)).json();
      if (d.error) { status.textContent = d.error; return; }
      $("city").value = d.city;
      $("sort").value = "deal";
      $("f").requestSubmit();
    } catch { status.textContent = "Couldn't reach the server."; }
  }, () => { status.textContent = "Location was blocked. Type a city instead."; }, { timeout: 10000 });
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
