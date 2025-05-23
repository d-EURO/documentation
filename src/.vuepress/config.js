const { description } = require("../../package");

module.exports = {
  title: "dEURO",
  description: description,

  head: [
    ["link", { rel: "icon", href: "/assets/favicon.png" }],
    ["meta", { name: "theme-color", content: "#092f62" }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" }],
    [ "script", { type: "text/javascript", src: "https://cdn.weglot.com/weglot.min.js" }, ],
    [
      "script",
      {},
      `Weglot.initialize({
        api_key: 'wg_3fa7772719c0808c3a058c58e13b59890'
      });
      `,
    ],
  ],

  themeConfig: {
    repo: "d-EURO/documentation",
    logo: "/assets/logo.png",
    editLinks: true,
    editLinkText: "Edit this page on Github",
    docsBranch: "develop",
    docsDir: "src",
    lastUpdated: true,

    nav: [
      {
        text: "dEuro.com",
        link: "https://dEuro.com/",
      },
    ],

    sidebar: [
      { title: "Overview", path: "/overview" },

      { title: "Stablecoin Bridges", path: "/swap" },

      { title: "Collateralized Minting", path: "/positions",
        children: [
          "/positions/open",
          "/positions/clone",
          "/positions/adjust",
          "/positions/auctions",
        ],
      },

      { title: "Reserve", path: "/reserve",
        children: [
          "/reserve/pool-shares",
        ],
      },

      { title: "Governance", path: "/governance" },


      { title: "Telegram API Bot", path: "/telegram-api-bot" },
      { title:  "Disclaimer", path: "/disclaimer" },
      { title: "Privacy", path: "/privacy" },
      { title: "Imprint", path: "/imprint" },
      { title: "FAQ", path: "/faq" },

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
