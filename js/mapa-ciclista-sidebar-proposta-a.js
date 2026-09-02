
/* === BICIPARK SIDEBAR PROPOSTA A: START === */
(function () {
  const STARTED_CLASS = 'bp-proposal-a-ready';

  const starSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3.5l2.6 5.26 5.81.84-4.2 4.09.99 5.79L12 16.73l-5.2 2.75.99-5.79-4.2-4.09 5.81-.84L12 3.5z"></path>
    </svg>`;

  const listSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>`;

  const arrowSvg = `
    <svg class="bp-featured-card-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`;

  function repairRouteText(value) {
    let result = String(value == null ? '' : value);

    const replacements = [
      [/\u00c3\u00a0/g, '\u00e0'],
      [/\u00c3\u00a1/g, '\u00e1'],
      [/\u00c3\u00a8/g, '\u00e8'],
      [/\u00c3\u00a9/g, '\u00e9'],
      [/\u00c3\u00ad/g, '\u00ed'],
      [/\u00c3\u00b2/g, '\u00f2'],
      [/\u00c3\u00b3/g, '\u00f3'],
      [/\u00c3\u00ba/g, '\u00fa'],
      [/\u00c3\u00bc/g, '\u00fc'],
      [/\u00c3\u00a7/g, '\u00e7'],
      [/\u00c3\u00b1/g, '\u00f1'],
      [/\u00c2\u00b7/g, '\u00b7'],
      [/\u00c2\u00ba/g, '\u00ba'],
      [/\u00c2\u00aa/g, '\u00aa']
    ];

    replacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern, replacement);
    });

    return result;
  }

  function text(el) {
    return repairRouteText(
      (el?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  function matchesLabel(el, expected) {
    return text(el).toLowerCase() === expected.toLowerCase();
  }

  function findSidebar() {
    const nodes = Array.from(document.querySelectorAll('aside, section, div'));
    return nodes.find((node) => {
      if (!(node instanceof HTMLElement)) return false;
      const nodeText = text(node);
      const selectCount = node.querySelectorAll('select').length;
      return /explora rutes/i.test(nodeText) && selectCount >= 2;
    }) || null;
  }

  function findMapPane(sidebar) {
    if (!sidebar) return null;
    const parent = sidebar.parentElement;
    if (!parent) return null;

    const directLeafletPane = Array.from(parent.children).find((child) => child !== sidebar && child.querySelector && child.querySelector('.leaflet-container'));
    if (directLeafletPane) return directLeafletPane;

    const sameParentLeaflet = parent.querySelector('.leaflet-container');
    return sameParentLeaflet ? sameParentLeaflet.closest('section, div, article') : null;
  }

  function getSelectBlock(sidebar, labelText) {
    const labels = Array.from(sidebar.querySelectorAll('label, p, span, div')).filter((el) => matchesLabel(el, labelText));
    for (const label of labels) {
      const group = label.closest('div, section, article');
      if (group && group.querySelector('select')) {
        return { label, group, select: group.querySelector('select') };
      }
    }

    const selects = Array.from(sidebar.querySelectorAll('select'));
    if (labelText.toLowerCase() === 'modalitat' && selects[0]) return { label: null, group: selects[0].parentElement, select: selects[0] };
    if (labelText.toLowerCase() === 'dificultat' && selects[1]) return { label: null, group: selects[1].parentElement, select: selects[1] };
    return null;
  }

  function extractTitle(sidebar) {
    const titleNode = Array.from(sidebar.querySelectorAll('h1, h2, h3, .title, .panel-title')).find((el) => /explora rutes/i.test(text(el)));
    return titleNode || null;
  }

  function findRouteCards(sidebar) {
    const candidates = Array.from(sidebar.querySelectorAll('article, .card, .route-card, li, a, div')).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const t = text(el);
      const titleHit = /aigÃ¼es|aigues|bes[oÃ²]s|mar[iÃ­]tim/i.test(t);
      const metricHit = /(km|m\+|seguretat|qualitat)/i.test(t);
      const childrenEnough = el.querySelectorAll('*').length >= 3;
      return titleHit && metricHit && childrenEnough;
    });

    const unique = [];
    for (const node of candidates) {
      if (!unique.some((existing) => existing.contains(node) || node.contains(existing))) {
        unique.push(node);
      }
    }
    return unique.slice(0, 3);
  }

  function parseCardData(card) {
    const raw = text(card);
    const titleNode = Array.from(card.querySelectorAll('h1,h2,h3,h4,strong,b,.title,.route-title')).find((el) => text(el).length > 0);
    let title = titleNode ? text(titleNode) : raw.split(/\d+\.?\d*\s*km/i)[0].trim();
    if (!title) title = raw;

    const kmMatch = raw.match(/(\d+[\.,]?\d*)\s*km/i);
    const elevMatch = raw.match(/(\d+[\.,]?\d*)\s*m\+/i);
    const diffMatch = raw.match(/(f[aÃ ]cil|mitjana|moderada|dif[iÃ­]cil|experta)/i);
    const secMatch = raw.match(/Seguretat\s*(\d+)/i);
    const qualMatch = raw.match(/Qualitat\s*(\d+)/i);

    return {
      title: title.replace(/\s+/g, ' ').trim(),
      km: kmMatch ? kmMatch[1].replace('.', ',') + ' km' : '',
      elev: elevMatch ? elevMatch[1] + ' m+' : '',
      difficulty: diffMatch ? diffMatch[1] : '',
      safety: secMatch ? 'Seguretat ' + secMatch[1] : '',
      quality: qualMatch ? 'Qualitat ' + qualMatch[1] : '',
      href: card.getAttribute('href') || '#'
    };
  }

  function buildCard(data, accent) {
    data = {
      ...data,
      title: repairRouteText(data.title),
      difficulty: repairRouteText(data.difficulty),
      safety: repairRouteText(data.safety),
      quality: repairRouteText(data.quality)
    };
    const card = document.createElement('a');
    card.className = 'bp-featured-card ' + accent;
    card.href = data.href || '#';
    card.innerHTML = `
      <div class="bp-featured-card-header">
        <div>
          <div class="bp-featured-card-title">${data.title}</div>
          <div class="bp-featured-meta">
            ${data.km ? `<span>${data.km}</span>` : ''}
            ${data.elev ? `<span>${data.elev}</span>` : ''}
            ${data.difficulty ? `<span>${data.difficulty}</span>` : ''}
          </div>
          <div class="bp-featured-tags">
            ${data.safety ? `<span class="bp-chip">${data.safety}</span>` : ''}
            ${data.quality ? `<span class="bp-chip bp-chip-blue">${data.quality}</span>` : ''}
          </div>
        </div>
        ${arrowSvg}
      </div>`;
    return card;
  }

  function buildFeaturedSidebar(sidebar) {
    if (sidebar.classList.contains(STARTED_CLASS)) return;
    sidebar.classList.add(STARTED_CLASS, 'bp-proposal-a-sidebar');

    const parent = sidebar.parentElement;
    const mapPane = findMapPane(sidebar);
    if (parent) parent.classList.add('bp-proposal-a-layout');
    if (mapPane) mapPane.classList.add('bp-proposal-a-map-pane');

    const titleNode = extractTitle(sidebar);
    const modalitat = getSelectBlock(sidebar, 'Modalitat');
    const dificultat = getSelectBlock(sidebar, 'Dificultat');
    const cards = findRouteCards(sidebar).map(parseCardData);

    sidebar.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'bp-title';
    title.textContent = titleNode ? text(titleNode) : 'Explora rutes';
    sidebar.appendChild(title);

    const filterGroup1 = document.createElement('div');
    filterGroup1.className = 'bp-filter-group';
    filterGroup1.innerHTML = `<label class="bp-filter-label">Modalitat</label>`;
    if (modalitat?.select) {
      modalitat.select.classList.add('bp-filter-select');
      filterGroup1.appendChild(modalitat.select);
    }
    sidebar.appendChild(filterGroup1);

    const filterGroup2 = document.createElement('div');
    filterGroup2.className = 'bp-filter-group';
    filterGroup2.innerHTML = `<label class="bp-filter-label">Dificultat</label>`;
    if (dificultat?.select) {
      dificultat.select.classList.add('bp-filter-select');
      filterGroup2.appendChild(dificultat.select);
    }
    sidebar.appendChild(filterGroup2);

    const divider = document.createElement('div');
    divider.className = 'bp-divider';
    sidebar.appendChild(divider);

    const header = document.createElement('div');
    header.className = 'bp-featured-header';
    header.innerHTML = `${starSvg}<span>Rutes destacades</span>`;
    sidebar.appendChild(header);

    const list = document.createElement('div');
    list.className = 'bp-featured-list';
    const accents = ['bp-accent-green', 'bp-accent-blue', 'bp-accent-red'];
    const fallbackCards = [
      { title: 'Carretera de les AigÃ¼es', km: '18,4 km', elev: '270 m+', difficulty: 'mitjana', safety: 'Seguretat 88', quality: 'Qualitat 92', href: '#' },
      { title: 'Front MarÃ­tim de Barcelona', km: '14,2 km', elev: '40 m+', difficulty: 'fÃ cil', safety: 'Seguretat 83', quality: 'Qualitat 86', href: '#' },
      { title: 'Ruta del riu BesÃ²s', km: '20,1 km', elev: '65 m+', difficulty: 'fÃ cil', safety: 'Seguretat 91', quality: 'Qualitat 84', href: '#' }
    ];

    const sourceCards = cards.length ? cards : fallbackCards;
    sourceCards.slice(0, 3).forEach((card, index) => {
      list.appendChild(buildCard(card, accents[index] || 'bp-accent-green'));
    });
    sidebar.appendChild(list);

    const allRoutes = document.createElement('a');
    allRoutes.className = 'bp-all-routes';
    allRoutes.href = '/route-explorer/';
    allRoutes.innerHTML = `${listSvg}<span>Veure totes les rutes</span>`;
    sidebar.appendChild(allRoutes);
  }

  function init() {
    const sidebar = findSidebar();
    if (!sidebar) return;
    buildFeaturedSidebar(sidebar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* === BICIPARK SIDEBAR PROPOSTA A: END === */

/* BICIPARK_DIFFICULTY_COMPAT_V3_START */
(() => {
  "use strict";

  if (window.__BICIPARK_DIFFICULTY_COMPAT_V3__) return;
  window.__BICIPARK_DIFFICULTY_COMPAT_V3__ = true;

  function repairText(value) {
    let result = String(value == null ? "" : value);

    const replacements = [
      [/\u00c3\u00a0/g, "\u00e0"],
      [/\u00c3\u00a1/g, "\u00e1"],
      [/\u00c3\u00a8/g, "\u00e8"],
      [/\u00c3\u00a9/g, "\u00e9"],
      [/\u00c3\u00ad/g, "\u00ed"],
      [/\u00c3\u00b2/g, "\u00f2"],
      [/\u00c3\u00b3/g, "\u00f3"],
      [/\u00c3\u00ba/g, "\u00fa"],
      [/\u00c3\u00bc/g, "\u00fc"],
      [/\u00c3\u00a7/g, "\u00e7"],
      [/\u00c2\u00b7/g, "\u00b7"]
    ];

    replacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern, replacement);
    });

    return result;
  }

  function key(value) {
    const clean = repairText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");

    if (["totes", "tots", "all", "any", "qualsevol"].includes(clean)) {
      return "all";
    }

    if (["facil", "easy", "baixa", "baix"].includes(clean)) {
      return "easy";
    }

    if (["mitjana", "mitja", "moderada", "moderat", "medium"].includes(clean)) {
      return "medium";
    }

    if (["dificil", "hard", "alta", "alt"].includes(clean)) {
      return "hard";
    }

    if (["experta", "expert", "moltalta"].includes(clean)) {
      return "expert";
    }

    return clean;
  }

  const displayNames = {
    all: "Totes",
    easy: "F\u00e0cil",
    medium: "Mitjana",
    hard: "Dif\u00edcil",
    expert: "Experta"
  };

  function findDifficultySelect() {
    const sidebar = document.querySelector(".bp-proposal-a-sidebar");
    if (!sidebar) return null;

    const groups = Array.from(sidebar.querySelectorAll(".bp-filter-group"));
    const group = groups.find(item =>
      /dificultat/i.test(repairText(item.textContent || ""))
    );

    return group?.querySelector("select") ||
      sidebar.querySelectorAll("select")[1] ||
      null;
  }

  function repairOptions(select) {
    if (!select) return;

    Array.from(select.options).forEach(option => {
      const fixedLabel = repairText(option.textContent);
      const optionKey = key(fixedLabel || option.value);

      if (displayNames[optionKey]) {
        option.textContent = displayNames[optionKey];
      } else {
        option.textContent = fixedLabel;
      }

      // Preserve semantic/original values. Only repair encoding damage.
      const fixedValue = repairText(option.value);
      if (fixedValue !== option.value) {
        option.value = fixedValue;
      }
    });
  }

  function cardDifficulty(card) {
    if (card.dataset.bpDifficulty) {
      return card.dataset.bpDifficulty;
    }

    const value = key(card.textContent || "");

    // key() on a full card is intentionally not enough, so detect terms.
    const clean = repairText(card.textContent || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let result = "";
    if (/\bfacil\b|\beasy\b/.test(clean)) result = "easy";
    else if (/\bmitjana\b|\bmitja\b|\bmoderada\b|\bmedium\b/.test(clean)) result = "medium";
    else if (/\bdificil\b|\bhard\b/.test(clean)) result = "hard";
    else if (/\bexperta\b|\bexpert\b/.test(clean)) result = "expert";

    card.dataset.bpDifficulty = result;
    return result;
  }

  function ensureEmptyState(list) {
    let empty = list.parentElement?.querySelector(".bp-featured-empty-v3");

    if (!empty) {
      empty = document.createElement("div");
      empty.className = "bp-featured-empty-v3";
      empty.hidden = true;
      empty.textContent = "No hi ha rutes destacades amb aquesta dificultat.";
      list.insertAdjacentElement("afterend", empty);
    }

    return empty;
  }

  function applyFeaturedFilter(select) {
    const sidebar = document.querySelector(".bp-proposal-a-sidebar");
    const list = sidebar?.querySelector(".bp-featured-list");
    if (!sidebar || !list || !select) return;

    const selected = select.options[select.selectedIndex];
    const selectedKey = key(selected?.textContent || select.value);
    const cards = Array.from(list.querySelectorAll(".bp-featured-card"));

    let visible = 0;

    cards.forEach(card => {
      const difficulty = cardDifficulty(card);
      const show = selectedKey === "all" || selectedKey === difficulty;
      card.hidden = !show;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    const empty = ensureEmptyState(list);
    empty.hidden = visible !== 0;
  }

  function boot() {
    const select = findDifficultySelect();
    if (!select) return false;

    repairOptions(select);
    applyFeaturedFilter(select);

    if (!select.dataset.bpDifficultyCompatBound) {
      select.dataset.bpDifficultyCompatBound = "1";

      select.addEventListener("change", () => {
        repairOptions(select);
        applyFeaturedFilter(select);
      });
    }

    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(boot, 0);
      setTimeout(boot, 250);
    });
  } else {
    setTimeout(boot, 0);
    setTimeout(boot, 250);
  }
})();
/* BICIPARK_DIFFICULTY_COMPAT_V3_END */
