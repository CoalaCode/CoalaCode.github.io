let translations = {};
let currentLang = localStorage.getItem('lang') || 'en';
let projectsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  await loadProjects();
  setupLanguageToggle();
  setupHeaderScrollOffset();
  setupHamburgerMenu();
  applyTranslations(currentLang);
});

/**
 * Loads translations from data/translations.json.
 */
async function loadTranslations() {
  try {
    const response = await fetch('data/translations.json');
    translations = await response.json();
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

/**
 * Loads projects from data/projects.json and renders them.
 */
async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    projectsData = await response.json();
    renderCategories(projectsData);
    renderProjectCards(projectsData);
    setupCarousels();
    observeCategorySections();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
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

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.textContent = lang === 'en' ? 'DE' : 'EN';
  }

  // Re-render project cards with the current language
  if (projectsData.length) {
    carouselIdCounter = 0; // Reset counter on re-render
    renderProjectCards(projectsData);
    setupCarousels();
    observeCategorySections();
  }
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
  const categories = [...new Set(projects.map(p => p.category))];

  container.innerHTML = categories.map((category) => `
    <a href="#category-${slugify(category)}" class="project-list__category" data-category="${slugify(category)}">
      <span class="project-list__category-line"></span>
      <span class="project-list__category-name">${category}</span>
    </a>
  `).join('');
}

/**
 * Groups projects by category and renders project cards.
 */
function renderProjectCards(projects) {
  const container = document.getElementById('project-cards');
  const grouped = groupByCategory(projects);
  const t = translations[currentLang];

  container.innerHTML = Object.entries(grouped).map(([category, categoryProjects]) => `
    <div class="project-category" id="category-${slugify(category)}">
      ${categoryProjects.map((project, index) => `
        ${index === 0 ? `<h3 class="project-category__title">${category}</h3>` : ''}
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
    <img src="${img}" alt="${title}" class="project-card__image ${index === 0 ? 'project-card__image--active' : ''}" data-index="${index}" loading="lazy">
  `).join('');

  const arrowsHtml = hasMultipleImages ? `
    <button class="project-card__arrow project-card__arrow--prev" aria-label="Previous image">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <button class="project-card__arrow project-card__arrow--next" aria-label="Next image">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
    <div class="project-card__dots">
      ${images.map((_, index) => `<span class="project-card__dot ${index === 0 ? 'project-card__dot--active' : ''}" data-index="${index}"></span>`).join('')}
    </div>
  ` : '';

  return `
    <article class="project-card" data-carousel-id="${carouselId}">
      <div class="project-card__image-wrapper">
        ${imagesHtml}
        ${arrowsHtml}
      </div>
      <div class="project-card__info">
        <div>
          <h4 class="project-card__header">${title}</h4>
          <p class="project-card__description">${description}</p>
        </div>
        <div>
          <div class="project-card__details">
            <span class="project-card__details-title">${projectInfoLabel}</span>
            <div class="project-card__details-list">
              <div class="project-card__detail-row">
                <span class="project-card__detail-label">${yearLabel}</span>
                <span class="project-card__detail-value">${project.year}</span>
              </div>
              <div class="project-card__detail-row">
                <span class="project-card__detail-label">${techStackLabel}</span>
                <div class="project-card__detail-icons">
                  ${project.tags.map(tag => `<span class="project-card__detail-value">${tag}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="project-card__links">
            <a href="${project.liveUrl}" class="project-card__link" target="_blank" rel="noopener noreferrer">
              <span class="project-card__link-content">
                ${liveDemoLabel}
                <img src="assets/icons/arrow.svg" alt="" class="project-card__link-icon">
              </span>
              <span class="project-card__link-underline"></span>
            </a>
            <a href="${project.repoUrl}" class="project-card__link" target="_blank" rel="noopener noreferrer">
              <span class="project-card__link-content">
                ${githubLabel}
                <img src="assets/icons/github-small.svg" alt="" class="project-card__link-icon">
              </span>
              <span class="project-card__link-underline"></span>
            </a>
          </div>
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

    let currentIndex = 0;

    function showImage(index) {
      images.forEach((img, i) => {
        img.classList.toggle('project-card__image--active', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('project-card__dot--active', i === index);
      });
      currentIndex = index;
    }

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
      showImage(newIndex);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
      showImage(newIndex);
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(index);
      });
    });
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
 * Creates a URL-friendly slug from a string.
 */
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Watches .project-category sections and highlights the matching sidebar link.
 */
function observeCategorySections() {
  const sections = document.querySelectorAll('.project-category');
  const links = document.querySelectorAll('.project-list__category');

  if (!sections.length || !links.length) return;

  const header = document.querySelector('.header');
  const projectList = document.querySelector('.project-list');

  function getTopMargin() {
    const headerHeight = header.offsetHeight;
    const isMobile = window.innerWidth <= 768;
    const projectListHeight = isMobile ? projectList.offsetHeight : 0;
    return headerHeight + projectListHeight;
  }

  let topMargin = getTopMargin();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle(
            'project-list__category--active',
            link.dataset.category === id.replace('category-', '')
          );
        });
      }
    });
  }, {
    rootMargin: `-${topMargin}px 0px -40% 0px`,
    threshold: 0
  });

  sections.forEach((section) => observer.observe(section));

  // Re-create observer on resize since rootMargin can't update dynamically
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newTopMargin = getTopMargin();
      if (newTopMargin !== topMargin) {
        topMargin = newTopMargin;
        observer.disconnect();
        const newObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              links.forEach((link) => {
                link.classList.toggle(
                  'project-list__category--active',
                  link.dataset.category === id.replace('category-', '')
                );
              });
            }
          });
        }, {
          rootMargin: `-${newTopMargin}px 0px -40% 0px`,
          threshold: 0
        });
        sections.forEach((section) => newObserver.observe(section));
      }
    }, 250);
  });
}

/**
 * Accounts for the sticky header height when using anchor navigation.
 */
function setupHeaderScrollOffset() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');

      if (targetId === '#' || targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const headerHeight = document.querySelector('.header').offsetHeight;
      let offset = headerHeight;

      // On mobile, category links need to also clear the sticky project list
      if (window.innerWidth <= 768 && anchor.closest('.project-list')) {
        const projectList = document.querySelector('.project-list');
        if (projectList) {
          offset += projectList.offsetHeight;
        }
      }

      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/**
 * Toggles the mobile hamburger menu.
 */
function setupHamburgerMenu() {
  const hamburger = document.querySelector('.header__hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('header__hamburger--active');
    mobileNav.classList.toggle('mobile-nav--open');
    document.body.style.overflow = mobileNav.classList.contains('mobile-nav--open') ? 'hidden' : '';
  });

  mobileNav.querySelectorAll('.mobile-nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('header__hamburger--active');
      mobileNav.classList.remove('mobile-nav--open');
      document.body.style.overflow = '';
    });
  });
}
