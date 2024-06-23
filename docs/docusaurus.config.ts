import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Job Application Tracker',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.ico',

  url: 'https://scryptids.github.com',
  baseUrl: '/jobsapp/',
  trailingSlash: true,

  // GitHub pages deployment config.
  organizationName: 'scryptids',
  projectName: 'jobsapp',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    // [
    //   'docusaurus-plugin-typedoc',
    //   {
    //     tsconfig: '../www/tsconfig.json',
    //     entryPoints: [
    //       '../www/app/auth/**/*.{js,jsx,ts,tsx}',
    //       '../www/app/components/**/*.{js,jsx,ts,tsx}',
    //       '../www/app/routes/**/*.{js,jsx,ts,tsx}',
    //       '../www/app/utils/**/*.{js,jsx,ts,tsx}',
    //       '../www/app/cookies.ts',
    //       '../www/app/root.tsx',
    //     ],
    //     out: './docs/app',
    //     entryFileName: 'index.md',
    //     sidebar: { pretty: true },
    //     textContentMappings: {
    //       'title.indexPage': 'Remix app source',
    //       'title.memberPage': '{name}',
    //     },
    //     indexFormat: 'table',
    //     parametersFormat: 'table',
    //     enumMembersFormat: 'table',
    //     watch: true,
    //   },
    // ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/scryptids/jobsapp/tree/main/docs',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'My Site',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/scryptids/jobsapp',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Docs',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/scryptids/jobsapp',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
