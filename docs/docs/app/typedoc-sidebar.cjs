// @ts-check
/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const typedocSidebar = { items: [
  {
    "type": "doc",
    "id": "app/auth/index",
    "label": "auth"
  },
  {
    "type": "doc",
    "id": "app/components/index",
    "label": "components"
  },
  {
    "type": "category",
    "label": "cookies",
    "items": [
      {
        "type": "category",
        "label": "Variables",
        "items": [
          {
            "type": "doc",
            "id": "app/cookies/variables/loginMachineCookie",
            "label": "loginMachineCookie"
          },
          {
            "type": "doc",
            "id": "app/cookies/variables/signupMachineCookie",
            "label": "signupMachineCookie"
          }
        ]
      }
    ],
    "link": {
      "type": "doc",
      "id": "app/cookies/index"
    }
  },
  {
    "type": "category",
    "label": "root",
    "items": [
      {
        "type": "category",
        "label": "Functions",
        "items": [
          {
            "type": "doc",
            "id": "app/root/functions/Layout",
            "label": "Layout"
          },
          {
            "type": "doc",
            "id": "app/root/functions/default",
            "label": "default"
          },
          {
            "type": "doc",
            "id": "app/root/functions/loader",
            "label": "loader"
          }
        ]
      }
    ],
    "link": {
      "type": "doc",
      "id": "app/root/index"
    }
  },
  {
    "type": "category",
    "label": "routes",
    "items": [
      {
        "type": "category",
        "label": "_index",
        "items": [
          {
            "type": "category",
            "label": "Functions",
            "items": [
              {
                "type": "doc",
                "id": "app/routes/_index/functions/default",
                "label": "default"
              },
              {
                "type": "doc",
                "id": "app/routes/_index/functions/meta",
                "label": "meta"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/routes/_index/index"
        }
      },
      {
        "type": "category",
        "label": "home",
        "items": [
          {
            "type": "category",
            "label": "route",
            "items": [
              {
                "type": "category",
                "label": "Functions",
                "items": [
                  {
                    "type": "doc",
                    "id": "app/routes/home/route/functions/default",
                    "label": "default"
                  },
                  {
                    "type": "doc",
                    "id": "app/routes/home/route/functions/loader",
                    "label": "loader"
                  }
                ]
              }
            ],
            "link": {
              "type": "doc",
              "id": "app/routes/home/route/index"
            }
          }
        ]
      },
      {
        "type": "category",
        "label": "login.$state",
        "items": [
          {
            "type": "category",
            "label": "Functions",
            "items": [
              {
                "type": "doc",
                "id": "app/routes/login.$state/functions/default",
                "label": "default"
              },
              {
                "type": "doc",
                "id": "app/routes/login.$state/functions/loader",
                "label": "loader"
              },
              {
                "type": "doc",
                "id": "app/routes/login.$state/functions/readLoginMachineCookie",
                "label": "readLoginMachineCookie"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/routes/login.$state/index"
        }
      },
      {
        "type": "category",
        "label": "login._index",
        "items": [
          {
            "type": "category",
            "label": "Functions",
            "items": [
              {
                "type": "doc",
                "id": "app/routes/login._index/functions/default",
                "label": "default"
              },
              {
                "type": "doc",
                "id": "app/routes/login._index/functions/loader",
                "label": "loader"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/routes/login._index/index"
        }
      },
      {
        "type": "category",
        "label": "logout",
        "items": [
          {
            "type": "category",
            "label": "Functions",
            "items": [
              {
                "type": "doc",
                "id": "app/routes/logout/functions/action",
                "label": "action"
              },
              {
                "type": "doc",
                "id": "app/routes/logout/functions/default",
                "label": "default"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/routes/logout/index"
        }
      },
      {
        "type": "doc",
        "id": "app/routes/signup.$state/index",
        "label": "signup.$state"
      },
      {
        "type": "category",
        "label": "signup._index",
        "items": [
          {
            "type": "category",
            "label": "Functions",
            "items": [
              {
                "type": "doc",
                "id": "app/routes/signup._index/functions/action",
                "label": "action"
              },
              {
                "type": "doc",
                "id": "app/routes/signup._index/functions/createAccount",
                "label": "createAccount"
              },
              {
                "type": "doc",
                "id": "app/routes/signup._index/functions/default",
                "label": "default"
              },
              {
                "type": "doc",
                "id": "app/routes/signup._index/functions/loader",
                "label": "loader"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/routes/signup._index/index"
        }
      }
    ]
  },
  {
    "type": "category",
    "label": "utils",
    "items": [
      {
        "type": "category",
        "label": "api.server",
        "items": [
          {
            "type": "category",
            "label": "Variables",
            "items": [
              {
                "type": "doc",
                "id": "app/utils/api.server/variables/sdk",
                "label": "sdk"
              }
            ]
          }
        ],
        "link": {
          "type": "doc",
          "id": "app/utils/api.server/index"
        }
      }
    ]
  }
]};
module.exports = typedocSidebar.items;