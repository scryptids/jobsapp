// cSpell: ignore appspecific

import {
  type RouteConfig,
  route,
  index,
  // layout,
  prefix,
} from "@react-router/dev/routes";

export const homePathSegment = "dash";
export const jobsPathSegment = "jobs";
export const employersPathSegment = "employers";

export const homePath = `/${homePathSegment}`;

export const jobsListPath = `/${homePathSegment}/${jobsPathSegment}`;
export const jobCreationFormPath = `${jobsListPath}/new`;
export const jobDetailPath = (jobId: number) => `${jobsListPath}/${jobId}`;
export const jobEditPath = (jobId: number) => `${jobsListPath}/${jobId}/edit`;
export const jobDeletePath = (jobId: number) => `${jobsListPath}/${jobId}/delete`;

export const employersListPath = `/${homePathSegment}/${employersPathSegment}`;
export const employerCreationFormPath = `${employersListPath}/new`;
export const employerDetailPath = (employerId: number) =>
  `${employersListPath}/${employerId}`;
export const employerEditPath = (employerId: number) =>
  `${employersListPath}/${employerId}/edit`;
export const employerDeletePath = (employerId: number) =>
  `${employersListPath}/${employerId}/delete`;

let appRoutes = [
  index("./routes/index.tsx"),

  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.tsx"),
  route("signup", "./routes/signup.tsx"),

  ...prefix(homePathSegment, [
    index("./routes/dash.tsx"),
    ...prefix(jobsPathSegment, [
      index("./routes/jobs-index.tsx"),
      route("new", "./routes/jobs-submit.tsx"),
      route(":jobId", "./routes/jobs-detail.tsx"),
      route(":jobId/edit", "./routes/jobs-edit.tsx"),
      route(":jobId/delete", "./routes/jobs-delete.tsx"),
    ]),
    ...prefix(employersPathSegment, [
      index("./routes/employers-index.tsx"),
      route("new", "./routes/employers-submit.tsx"),
      route(":employerId", "./routes/employers-detail.tsx"),
      route(":employerId/edit", "./routes/employers-edit.tsx"),
      route(":employerId/delete", "./routes/employers-delete.tsx"),
    ]),
  ]),
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
