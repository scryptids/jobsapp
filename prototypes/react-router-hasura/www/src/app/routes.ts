import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export const homePathSegment = "dash";
export const jobsPathSegment = "jobs";

export const homePath = `/${homePathSegment}`;
// export const jobCreationModalPath = `/${homePathSegment}/${jobsPathSegment}/new`;

let appRoutes = [
  index("./routes/index.tsx"),

  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.tsx"),

  ...prefix(homePathSegment, [index("./routes/dash.tsx")]),
];

if (import.meta.env.DEV) {
  appRoutes = [
    route(
      "/.well-known/appspecific/com.chrome.devtools.json",
      "./routes/devtools/chrome-devtools-config.tsx"
    ),
    ...appRoutes,
  ];
}

export default appRoutes satisfies RouteConfig;
