const { description } = require("../../package");

module.exports = {
  title: "Docs",
  description: description,

  head: [
    ["meta", { name: "theme-color", content: "#072440" }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" }],
    ["script", { type: "text/javascript", src: "https://cdn.weglot.com/weglot.min.js" }],
    ["script", {}, `Weglot.initialize({ api_key: 'wg_7f9157a1a49a3f646f90478c579242547' });`],
  ],

  themeConfig: {
    repo: "DFXswiss/frankencoin-docu",
    logo: "/assets/logo.svg",
    editLinks: true,
    editLinkText: "Edit this page on Github",
    docsBranch: "dev",
    docsDir: "src",
    lastUpdated: true,

    nav: [
      {
        text: "Frankencoin.com",
        link: "https://frankencoin.com",
      },
    ],

    sidebar: [
      { title: "🧀  Overview", path: "/overview" },

      { title: "🌁  Stablecoin Bridges", path: "/swap" },

      { title: "💰  Collateralized Minting", path: "/positions",
        children: [
          "/positions/open",
          "/positions/clone",
          "/positions/adjust",
          "/positions/auctions",
        ],
      },

      { title: "🏦  Reserve", path: "/reserve",
        children: [
          "/reserve/borrowers-reserve",
          "/reserve/bridge-reserve",
          "/reserve/pool-shares",
        ],
      },

      { title: "⚖️  Governance", path: "/governance" },

      { title: "⁉️  FAQ", path: "/faq" },
    ],
  },

  plugins: ["@vuepress/plugin-back-to-top", "@vuepress/plugin-medium-zoom"],

  chainWebpack: (config) => {
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap((options) => ({
        ...options,
        compilerOptions: {
          isCustomElement: (tag) => tag.includes("dfx"),
        },
      }));
  },
};
