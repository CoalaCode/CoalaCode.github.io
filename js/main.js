let translations = {};
let currentLang = localStorage.getItem('lang') || 'de';
let projectsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  await loadProjects();
  setupLanguageToggle();
  setupHeaderScrollOffset();
  setupHamburgerMenu();
  setupEmailCopy();
  applyTranslations(currentLang);
  restoreHashPosition();
});

/**
 * Fetches and parses a JSON file, throwing on a non-2xx response so that a
 * deploy serving an HTML error page fails loudly instead of silently.
 *
 * `cache: 'no-cache'` forces a revalidation on every load. Without it the
 * browser caches these files heuristically — the local server sends no
 * Cache-Control at all, and GitHub Pages sends max-age=600 — and renders an
 * outdated projects.json without ever asking the server. Unchanged files still
 * come back as a cheap 304.
 */
async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response.json();
}

/**
 * Loads translations from data/translations.json.
 */
async function loadTranslations() {
  try {
    translations = await fetchJson('data/translations.json');
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

/**
 * Loads projects from data/projects.json. Rendering happens in
 * applyTranslations() so the cards are only built once, in the right language.
 */
async function loadProjects() {
  // The legal pages share this script but have no projects section.
  if (!document.getElementById('project-cards')) return;

  try {
    projectsData = await fetchJson('data/projects.json');
  } catch (error) {
    console.error('Failed to load projects:', error);
    showProjectsError();
  }
}

/**
 * Replaces the projects section with a readable message when the data fails to
 * load, rather than leaving the visitor with an empty page.
 */
function showProjectsError() {
  const container = document.getElementById('project-cards');
  if (!container) return;
  const message = currentLang === 'de'
    ? 'Die Projekte konnten nicht geladen werden. Bitte lade die Seite neu.'
    : 'Projects could not be loaded. Please reload the page.';
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'project-cards__error';
  p.setAttribute('role', 'alert');
  p.textContent = message;
  container.appendChild(p);
}

/**
 * Applies translations to all elements with data-i18n or data-i18n-html attributes.
 */
function applyTranslations(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);

  const t = translations[lang];
  if (!t) return;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = getNestedValue(t, key);
    if (value !== undefined) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    const value = getNestedValue(t, key);
    if (value !== undefined) {
      el.innerHTML = value;
    }
  });

  // Attribute translations, e.g. data-i18n-attr="aria-label:a11y.mainNav".
  // Several pairs can be separated by semicolons.
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (!attr || !key) return;
      const value = getNestedValue(t, key);
      if (value !== undefined) el.setAttribute(attr, value);
    });
  });

  document.title = getNestedValue(t, 'meta.title') || document.title;
  const metaDescription = document.querySelector('meta[name="description"]');
  const description = getNestedValue(t, 'meta.description');
  if (metaDescription && description) metaDescription.setAttribute('content', description);

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.textContent = lang === 'en' ? 'DE' : 'EN';
    toggle.setAttribute('aria-label', getNestedValue(t, lang === 'en' ? 'a11y.switchToGerman' : 'a11y.switchToEnglish') || '');
  }

  // Legal pages hold both languages inline so they survive with JS disabled.
  document.querySelectorAll('[data-lang-block]').forEach((block) => {
    block.hidden = block.getAttribute('data-lang-block') !== lang;
  });

  renderProjects();
}

/**
 * Renders the category sidebar and project cards in the current language.
 * Called once on load and again on every language switch.
 */
function renderProjects() {
  if (!projectsData.length) return;
  carouselIdCounter = 0;
  renderCategories(projectsData);
  renderProjectCards(projectsData);
  setupCarousels();
  observeCategorySections();
}

/**
 * Resolves a dot-notation key like "nav.projects" from a nested object.
 */
function getNestedValue(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * Sets up the language toggle click handler.
 */
function setupLanguageToggle() {
  const toggle = document.getElementById('lang-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const newLang = currentLang === 'en' ? 'de' : 'en';
    applyTranslations(newLang);
  });
}

/**
 * Extracts unique categories and renders the sidebar navigation.
 */
function renderCategories(projects) {
  const container = document.getElementById('project-categories');
  if (!container) return;
  const categories = [...new Set(projects.map(p => p.category))];

  container.innerHTML = categories.map((category) => `
    <a href="#category-${slugify(category)}" class="project-list__category" data-category="${slugify(category)}">
      <span class="project-list__category-line"></span>
      <span class="project-list__category-name">${escapeHtml(category)}</span>
    </a>
  `).join('');
}

/**
 * Groups projects by category and renders project cards.
 */
function renderProjectCards(projects) {
  const container = document.getElementById('project-cards');
  if (!container) return;
  const grouped = groupByCategory(projects);
  const t = translations[currentLang];

  container.innerHTML = Object.entries(grouped).map(([category, categoryProjects]) => `
    <div class="project-category" id="category-${slugify(category)}">
      ${categoryProjects.map((project, index) => `
        ${index === 0 ? `<h3 class="project-category__title">${escapeHtml(category)}</h3>` : ''}
        ${createProjectCard(project, t)}
      `).join('')}
    </div>
  `).join('');
}

/**
 * Creates HTML for a single project card with image carousel.
 */
let carouselIdCounter = 0;

function createProjectCard(project, t) {
  const title = project['title_' + currentLang] || project.title_en;
  const description = project['description_' + currentLang] || project.description_en;
  const projectInfoLabel = t && t.projectCard ? t.projectCard.projectInfo : 'Project Info';
  const yearLabel = t && t.projectCard ? t.projectCard.year : 'Year';
  const techStackLabel = t && t.projectCard ? t.projectCard.techStack : 'Tech Stack';
  const liveDemoLabel = t && t.projectCard ? t.projectCard.liveDemo : 'Live Demo';
  const githubLabel = t && t.projectCard ? t.projectCard.github : 'See on Github';

  // Support both single image and images array
  const images = project.images || [project.image];
  const hasMultipleImages = images.length > 1;
  const carouselId = `carousel-${carouselIdCounter++}`;

  const imagesHtml = images.map((img, index) => `
    <img src="${escapeHtml(img)}" alt="${escapeHtml(imageAlt(project, title, index, images.length))}" class="project-card__image ${index === 0 ? 'project-card__image--active' : ''}" data-index="${index}" loading="lazy" decoding="async">
  `).join('');

  const links = [
    { url: project.liveUrl, label: liveDemoLabel, icon: 'assets/icons/arrow.svg' },
    { url: project.repoUrl, label: githubLabel, icon: 'assets/icons/github-small.svg' }
  ].filter(link => isRealUrl(link.url));

  const linksHtml = links.length ? `
    <div class="project-card__links">
      ${links.map(link => `
        <a href="${escapeHtml(link.url)}" class="project-card__link" target="_blank" rel="noopener noreferrer">
          <span class="project-card__link-content">
            ${escapeHtml(link.label)} <span class="visually-hidden">— ${escapeHtml(title)}</span>
            <img src="${link.icon}" alt="" class="project-card__link-icon">
          </span>
          <span class="project-card__link-underline"></span>
        </a>
      `).join('')}
    </div>
  ` : '';

  const prevLabel = t && t.projectCard ? t.projectCard.prevImage : 'Previous image';
  const nextLabel = t && t.projectCard ? t.projectCard.nextImage : 'Next image';
  const imageLabel = t && t.projectCard ? t.projectCard.image : 'Image';

  const arrowsHtml = hasMultipleImages ? `
    <button type="button" class="project-card__arrow project-card__arrow--prev" aria-label="${escapeHtml(prevLabel)} — ${escapeHtml(title)}" aria-controls="${carouselId}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <button type="button" class="project-card__arrow project-card__arrow--next" aria-label="${escapeHtml(nextLabel)} — ${escapeHtml(title)}" aria-controls="${carouselId}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
    <div class="project-card__dots" role="tablist" aria-label="${escapeHtml(title)}">
      ${images.map((_, index) => `<button type="button" role="tab" class="project-card__dot ${index === 0 ? 'project-card__dot--active' : ''}" data-index="${index}" aria-label="${escapeHtml(imageLabel)} ${index + 1}/${images.length}" aria-selected="${index === 0}"></button>`).join('')}
    </div>
    <p class="visually-hidden project-card__status" role="status" aria-live="polite"></p>
  ` : '';

  return `
    <article class="project-card" data-carousel-id="${carouselId}">
      <div class="project-card__image-wrapper" id="${carouselId}">
        ${imagesHtml}
        ${arrowsHtml}
      </div>
      <div class="project-card__info">
        <div>
          <h4 class="project-card__header">${escapeHtml(title)}</h4>
          <p class="project-card__description">${escapeHtml(description)}</p>
        </div>
        <div>
          <div class="project-card__details">
            <span class="project-card__details-title">${escapeHtml(projectInfoLabel)}</span>
            <div class="project-card__details-list">
              <div class="project-card__detail-row">
                <span class="project-card__detail-label">${escapeHtml(yearLabel)}</span>
                <span class="project-card__detail-value">${escapeHtml(project.year)}</span>
              </div>
              <div class="project-card__detail-row">
                <span class="project-card__detail-label">${escapeHtml(techStackLabel)}</span>
                <div class="project-card__detail-icons">
                  ${project.tags.map(tag => `<span class="project-card__detail-value">${escapeHtml(tag)}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
          ${linksHtml}
        </div>
      </div>
    </article>
  `;
}

/**
 * Sets up carousel navigation for all project cards.
 */
function setupCarousels() {
  document.querySelectorAll('.project-card').forEach((card) => {
    const wrapper = card.querySelector('.project-card__image-wrapper');
    const images = wrapper.querySelectorAll('.project-card__image');
    const dots = wrapper.querySelectorAll('.project-card__dot');
    const prevBtn = wrapper.querySelector('.project-card__arrow--prev');
    const nextBtn = wrapper.querySelector('.project-card__arrow--next');

    if (images.length <= 1) return;

    const status = wrapper.querySelector('.project-card__status');
    let currentIndex = 0;

    function showImage(index, announce) {
      images.forEach((img, i) => {
        const isActive = i === index;
        img.classList.toggle('project-card__image--active', isActive);
        // Keeps inactive slides out of the accessibility tree; without this
        // they stay readable even though they are visually faded out.
        img.setAttribute('aria-hidden', String(!isActive));
      });
      dots.forEach((dot, i) => {
        const isActive = i === index;
        dot.classList.toggle('project-card__dot--active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
      currentIndex = index;

      if (announce && status) {
        status.textContent = images[index].getAttribute('alt') || `${index + 1} / ${images.length}`;
      }
    }

    const step = (delta) => {
      showImage((currentIndex + delta + images.length) % images.length, true);
    };

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      step(-1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      step(1);
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(index, true);
      });
    });

    // Left/right arrows move between slides once any carousel control has focus.
    wrapper.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!e.target.closest('.project-card__arrow, .project-card__dot')) return;
      e.preventDefault();
      step(e.key === 'ArrowLeft' ? -1 : 1);
    });

    showImage(0, false);
  });
}

/**
 * Groups an array of projects by their category property.
 */
function groupByCategory(projects) {
  return projects.reduce((acc, project) => {
    if (!acc[project.category]) {
      acc[project.category] = [];
    }
    acc[project.category].push(project);
    return acc;
  }, {});
}

/**
 * Escapes a value for interpolation into HTML, in either text or attribute
 * position. The project data is self-authored, but the card template builds
 * markup by string concatenation, so unescaped values are a latent hazard.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Alt text for a carousel image. Projects may supply per-image alt text via an
 * "imageAlts" array in projects.json; otherwise each image is distinguished by
 * position, so a five-image card no longer announces the same title five times.
 */
function imageAlt(project, title, index, total) {
  const alts = project['imageAlts_' + currentLang] || project.imageAlts_en || project.imageAlts;
  if (Array.isArray(alts) && alts[index]) return alts[index];
  return total > 1 ? `${title} — screenshot ${index + 1} of ${total}` : `${title} — screenshot`;
}

/**
 * Returns true for a URL that actually points somewhere. Projects without a
 * public demo or repo carry "#" as a placeholder; those links are not rendered.
 */
function isRealUrl(url) {
  return Boolean(url) && url !== '#';
}

/**
 * Creates a URL-friendly slug from a string.
 */
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Watches .project-category sections and highlights the matching sidebar link.
 */
let categoryObserver = null;
let categoryTopMargin = null;
let categoryResizeBound = false;

function observeCategorySections() {
  const sections = document.querySelectorAll('.project-category');
  const links = document.querySelectorAll('.project-list__category');

  if (!sections.length || !links.length) return;

  // Always replace the previous observer; re-rendering the cards on a language
  // switch invalidates the nodes it was watching.
  if (categoryObserver) categoryObserver.disconnect();

  categoryTopMargin = getCategoryTopMargin();

  categoryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const category = entry.target.id.replace('category-', '');
      links.forEach((link) => {
        link.classList.toggle('project-list__category--active', link.dataset.category === category);
      });
    });
  }, {
    rootMargin: `-${categoryTopMargin}px 0px -40% 0px`,
    threshold: 0
  });

  sections.forEach((section) => categoryObserver.observe(section));

  // rootMargin can't be updated on a live observer, so the observer is rebuilt
  // when the sticky offset changes. Bind the listener only once.
  if (!categoryResizeBound) {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (getCategoryTopMargin() !== categoryTopMargin) {
          observeCategorySections();
        }
      }, 250);
    });
    categoryResizeBound = true;
  }
}

/**
 * Height that sticky elements occupy at the top of the viewport: the header,
 * plus the project list on mobile where it also sticks.
 */
function getCategoryTopMargin() {
  const header = document.querySelector('.header');
  const projectList = document.querySelector('.project-list');
  const headerHeight = header ? header.offsetHeight : 0;
  const isMobile = window.innerWidth <= 768;
  const projectListHeight = isMobile && projectList ? projectList.offsetHeight : 0;
  return headerHeight + projectListHeight;
}

/**
 * Accounts for the sticky header height when using anchor navigation.
 */
function setupHeaderScrollOffset() {
  // Delegated, because the category links are rendered from JSON after load
  // and are replaced again on every language switch.
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href');

    if (targetId === '#' || targetId === '#top') {
      e.preventDefault();
      scrollToPosition(0);
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();
    let offset = document.querySelector('.header').offsetHeight;

    // On mobile, category links need to also clear the sticky project list
    if (window.innerWidth <= 768 && anchor.closest('.project-list')) {
      const projectList = document.querySelector('.project-list');
      if (projectList) offset += projectList.offsetHeight;
    }

    scrollToPosition(target.getBoundingClientRect().top + window.scrollY - offset);
  });
}

/**
 * Re-applies a landing #hash once the cards exist.
 *
 * The browser resolves the fragment during load, but the project cards are
 * only rendered after two awaited fetches. Anything below the projects section
 * — which is what datenschutz.html's "index.html#contact" link points at — has
 * moved hundreds of pixels down by then, leaving the visitor mid-projects.
 *
 * Jumps rather than smooth-scrolling: an animation on first paint reads as a
 * glitch, not as navigation.
 */
function restoreHashPosition() {
  if (!window.location.hash) return;

  let target;
  try {
    target = document.querySelector(window.location.hash);
  } catch (error) {
    // A fragment that isn't a valid selector, e.g. "#1foo".
    return;
  }
  if (!target) return;

  const header = document.querySelector('.header');
  const offset = header ? header.offsetHeight : 0;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'auto' });
}

/**
 * Scrolls to a position, honouring the visitor's reduced-motion preference.
 */
function scrollToPosition(top) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

/**
 * Copy-to-clipboard for the contact email. The address is always present as
 * selectable text, so this is an enhancement rather than the only route.
 */
function setupEmailCopy() {
  const button = document.querySelector('.contact__copy');
  const status = document.querySelector('.contact__copy-status');
  if (!button) return;

  const email = button.dataset.email;
  if (!email) return;

  button.addEventListener('click', async () => {
    const t = translations[currentLang] || {};
    let ok = false;

    try {
      // Requires a secure context; github.io and localhost both qualify.
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }

    if (status) {
      status.textContent = getNestedValue(t, ok ? 'contact.copied' : 'contact.copyFailed') || (ok ? 'Copied' : 'Copy failed');
    }
    button.classList.toggle('contact__copy--copied', ok);
    setTimeout(() => button.classList.remove('contact__copy--copied'), 2000);
  });
}

/**
 * Toggles the mobile hamburger menu.
 */
function setupHamburgerMenu() {
  const hamburger = document.querySelector('.header__hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (!hamburger || !mobileNav) return;

  function setOpen(open, moveFocus = true) {
    hamburger.classList.toggle('header__hamburger--active', open);
    mobileNav.classList.toggle('mobile-nav--open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    // The overlay covers the page, so its content must be the only thing
    // reachable while it is open.
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (!moveFocus) return;

    if (open) {
      const firstLink = mobileNav.querySelector('.mobile-nav__link');
      if (firstLink) firstLink.focus();
    } else {
      hamburger.focus();
    }
  }

  hamburger.addEventListener('click', () => {
    setOpen(!mobileNav.classList.contains('mobile-nav--open'));
  });

  mobileNav.querySelectorAll('.mobile-nav__link').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (!mobileNav.classList.contains('mobile-nav--open')) return;

    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (e.key !== 'Tab') return;

    // Focus trap: cycle between the close button and the overlay's links.
    const focusable = [hamburger, ...mobileNav.querySelectorAll('.mobile-nav__link')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Establish the initial ARIA state without stealing focus on page load.
  setOpen(false, false);
}
