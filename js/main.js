/*
  Site behavior. Kept deliberately small: nav toggle, active-link marking,
  footer year, and a reveal-on-scroll hook that only flips a data
  attribute — the actual transition is designed later in CSS.
*/
document.addEventListener("partials:loaded", () => {
  initNavToggle();
  markActiveNavLink();
  setFooterYear();
  initScrollReveal();
});

function initNavToggle() {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  if (!nav || !toggle) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.getAttribute("data-open") === "true";
    nav.setAttribute("data-open", String(!isOpen));
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function markActiveNavLink() {
  const current = document.body.getAttribute("data-page");
  if (!current) return;
  document
    .querySelectorAll(`[data-nav-link="${current}"]`)
    .forEach((link) => link.setAttribute("aria-current", "page"));
}

function setFooterYear() {
  const el = document.querySelector("[data-current-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initScrollReveal() {
  const targets = document.querySelectorAll("[data-animate]");
  if (targets.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.setAttribute("data-inview", "true"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-inview", "true");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  targets.forEach((el) => observer.observe(el));
}
