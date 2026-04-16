function isUniquePattern(pattern, allSources) {
  let count = 0;
  for (const src of allSources) {
    if (src.includes(pattern)) {
      count++;
      if (count > 1) return false;
    }
  }
  return count === 1;
}

function getCenterOutIndices(length) {
  const res = [];
  const mid = Math.floor(length / 2);
  res.push(mid);
  for (let offset = 1; offset <= length; offset++) {
    const left = mid - offset;
    const right = mid + offset;
    if (left >= 0) res.push(left);
    if (right < length) res.push(right);
    if (left < 0 && right >= length) break;
  }
  return res;
}

export function findSmallestUniquePattern(src, allSources, startLen = 20) {
  for (let len = startLen; len <= src.length; len++) {
    const possible = src.length - len + 1;
    for (const i of getCenterOutIndices(possible)) {
      const sub = src.substring(i, i + len);
      if (isUniquePattern(sub, allSources))
        return sub;
    }
  }
  return src;
}

export function extractAllPaths(src) {
  const paths = [];
  const reD = /(?<![a-zA-Z])d:["']([^"']{5,})["']/g;
  let m;
  while ((m = reD.exec(src)) !== null)
    paths.push({ d: m[1], type: "path" });

  const rePoly = /points:["']([^"']{5,})["']/g;
  while ((m = rePoly.exec(src)) !== null)
    paths.push({ d: m[1], type: "polygon" });

  return paths;
}

function isValidSvgShape(p) {
  if (p.type === "polygon") return /\d/.test(p.d);
  return /^[Mm]/.test(p.d) && /\d/.test(p.d);
}

function extractViewBox(factorySrc) {
  const m = factorySrc.match(/viewBox:["']([^"']+)["']/)
    || factorySrc.match(/viewBox="([^"]+)"/);
  return m ? m[1] : "0 0 24 24";
}

function extractDisplayName(factorySrc) {
  const m = factorySrc.match(/\.displayName\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : null;
}

export function buildSvgString(paths, { fill = "currentColor", size = 24, viewBox = "0 0 24 24" } = {}) {
  const els = paths.map(p => {
    if (p.type === "polygon")
      return `<polygon points="${p.d}" fill="${fill}"/>`;
    return `<path fill-rule="evenodd" clip-rule="evenodd" d="${p.d}" fill="${fill}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" focusable="false" aria-hidden="true" role="presentation">${els}</svg>`;
}

const { createElement } = FrankerFaceZ.utilities.dom;

import STYLE_URL from "../../components/main_menu/styles/icon-finder.scss";

export class Twilight_IconFinder extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");
    this.inject("site.web_munch");

    this.settings.addUI("addon.trubbel.twilight.icon-finder", {
      path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Icon Finder >> Icon Finder @{\"profile_warning\": false}",
      component: () => import("../../components/main_menu/icon-finder.vue"),
      force_seen: true,

      getIcons: () => this.getIcons(),
      rescan: () => this.rescan(),
      isScanning: () => this._scanning,
      generateFind: (icon) => this.generateFind(icon),
      getFFZ: () => this.resolve("core")
    });

    this._icons = null;
    this._factorySources = null;
    this._scanning = false;
    this.style_link = null;
  }

  async onEnable() {
    if (!this.style_link) {
      document.head.appendChild(this.style_link = createElement("link", {
        id: "trubbel-icon-finder",
        "data-addon": "trubbel",
        href: STYLE_URL,
        rel: "stylesheet",
        type: "text/css",
        crossOrigin: "anonymous"
      }));
    }
  }

  getIcons() {
    return this._icons ?? [];
  }

  rescan() {
    this._icons = null;
    this._factorySources = null;
    return this.scanIcons();
  }

  scanIcons() {
    this._scanning = true;
    const require = this.web_munch._require;

    if (!require?.m) {
      this.log.warn("webpack require not available");
      this._scanning = false;
      return [];
    }

    const allModules = require.m;
    const moduleIds = Object.keys(allModules);
    this.log.info(`Scanning ${moduleIds.length} webpack modules…`);

    let passed_prefilter = 0;
    let rejected_no_paths = 0;
    let required_count = 0;

    const icons = [];
    const factorySources = [];

    for (const id of moduleIds) {
      const factory = allModules[id];
      if (typeof factory !== "function") continue;

      const factorySrc = factory.toString();
      if (!factorySrc.includes('viewBox:') && !factorySrc.includes('viewBox="') && !factorySrc.includes("viewBox='"))
        continue;

      passed_prefilter++;

      const paths = extractAllPaths(factorySrc);
      if (!paths.length || !paths.some(isValidSvgShape)) {
        rejected_no_paths++;
        continue;
      }

      const viewBox = extractViewBox(factorySrc);
      const displayName = extractDisplayName(factorySrc);

      let mod, component;
      try {
        mod = require(id);
        required_count++;
        component = mod?.default;
        if (!component || (typeof component !== "function" && typeof component !== "object")) {
          const vals = Object.values(mod ?? {});
          component = vals.find(v => typeof v === "function" || (v && typeof v === "object" && v.$$typeof));
        }
      } catch(e) {
        component = null;
      }

      factorySources.push(factorySrc);
      icons.push({ id, factorySrc, paths, viewBox, displayName, component });
    }

    this.log.info(
      `Scan complete: ${moduleIds.length} total, ` +
      `${passed_prefilter} passed pre-filter, ` +
      `${required_count} required, ` +
      `${icons.length} icons found. ` +
      `Rejections - no paths: ${rejected_no_paths}`
    );

    this._scanning = false;
    this._icons = icons;
    this._factorySources = factorySources;
    return icons;
  }

  generateFind(icon) {
    if (!this._icons?.length || !icon)
      return "// No icons scanned yet";

    const allFactorySources = this._factorySources ?? this._icons.map(i => i.factorySrc);
    const pattern = findSmallestUniquePattern(icon.factorySrc, allFactorySources);
    const escaped = JSON.stringify(pattern);

    const name = icon.displayName ?? `Icon_${icon.id}`;

    return `// ${name}
      // Search by factory source - reliable even as class names change
      const ${name} = (() => {
        const req = this.web_munch._require;
        for (const [id, factory] of Object.entries(req.m)) {
          if (factory.toString().includes(${escaped})) {
            const mod = req(id);
            return mod?.default ?? Object.values(mod ?? {}).find(v => v && (typeof v === "function" || v.$$typeof));
          }
        }
      })();`;
  }
}