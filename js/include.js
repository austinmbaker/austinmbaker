/*
  Minimal partial loader. Elements marked data-include="/partials/x.html"
  are replaced with that file's contents. Dispatches "partials:loaded" on
  document once every include on the page has resolved, so other scripts
  (nav toggle, active-link marking) can run after the DOM is in place.

  Requires serving the site over http(s) — fetch() of local files does not
  work from file://. Use any static file server during development.
*/
(function () {
  const includeNodes = Array.from(document.querySelectorAll("[data-include]"));

  if (includeNodes.length === 0) {
    document.dispatchEvent(new CustomEvent("partials:loaded"));
    return;
  }

  Promise.all(
    includeNodes.map((node) =>
      fetch(node.getAttribute("data-include"))
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load partial: " + node.getAttribute("data-include"));
          return res.text();
        })
        .then((html) => {
          node.outerHTML = html;
        })
        .catch((err) => {
          console.error(err);
        })
    )
  ).then(() => {
    document.dispatchEvent(new CustomEvent("partials:loaded"));
  });
})();
