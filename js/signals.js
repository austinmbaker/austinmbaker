/*
  Renders Orbital Dawn posts from /data/signals.json into any element with
  [data-signals-feed]. Item markup lives in a <template> inside that element,
  so layout stays in HTML. Fields are filled by data attributes:
    data-field="title|excerpt|date"   text content (date also sets datetime)
    data-field-href                   receives the post URL
  data-limit caps the item count. [data-signals-fallback] children are removed
  once posts render; if the feed is empty or unavailable they stay as-is.
  Dispatches "signals:rendered" on the list for animation hooks.
*/
(function () {
  const lists = document.querySelectorAll("[data-signals-feed]");
  if (lists.length === 0) return;

  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  fetch("/data/signals.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.items) || data.items.length === 0) return;
      const items = data.items.filter((item) => isSubstackUrl(item.url));
      lists.forEach((list) => render(list, items));
    })
    .catch(() => {});

  function render(list, items) {
    const template = list.querySelector("template");
    if (!template) return;
    const limit = parseInt(list.getAttribute("data-limit"), 10) || items.length;
    const fragment = document.createDocumentFragment();

    items.slice(0, limit).forEach((item, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.style.setProperty("--item-index", index);
      fill(node, item);
      fragment.append(node);
    });

    list.querySelectorAll("[data-signals-fallback]").forEach((el) => el.remove());
    list.append(fragment);
    list.setAttribute("data-signals-state", "loaded");
    list.dispatchEvent(new CustomEvent("signals:rendered", { bubbles: true }));
  }

  function fill(node, item) {
    node.querySelectorAll("[data-field]").forEach((el) => {
      const field = el.getAttribute("data-field");
      if (field === "date") {
        if (!item.date) return el.remove();
        el.textContent = dateFormat.format(new Date(item.date));
        el.setAttribute("datetime", item.date);
      } else if (item[field]) {
        el.textContent = item[field];
      } else {
        el.remove();
      }
    });
    node.querySelectorAll("[data-field-href]").forEach((a) => a.setAttribute("href", item.url));
  }

  function isSubstackUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "orbitaldawn.substack.com";
    } catch {
      return false;
    }
  }
})();
