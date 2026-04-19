(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(
      require("./data.js"),
      require("./formulas.js"),
      require("./chart.js"),
      require("./ui.js")
    );
  } else {
    root.MoodyLab = factory(root.MoodyData, root.MoodyFormulas, root.MoodyChart, root.MoodyUI);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (data, formulas, chartLib, ui) {
  const api = Object.assign({}, data, formulas, chartLib, ui);

  if (typeof document !== "undefined") {
    window.addEventListener("DOMContentLoaded", function () {
      ui.initBrowserApp();
    });
  }

  return api;
});
