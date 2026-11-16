# Job Application Tracker

[Documentation website](https://scryptids.github.io/jobsapp/)

| Path | What |
|---|---|
| [`app/`](./app/) | The app: React Router (SSR) + SQLite, packaged as one container with nginx and Litestream |
| [`infra/`](./infra/) | AWS CDK: ECS Fargate blue/green, S3 replicas, SSM runbooks |
| [`docs/`](./docs/) | Docusaurus site, including [operations docs](./docs/docs/operations/) |
| [`prototypes/`](./prototypes/) | Earlier prototypes ([React Router + Hasura](./prototypes/react-router-hasura/), Blazor), kept for reference |

Quick start: `cd app && npm install && npm run dev`.
