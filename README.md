# react-tailwindcss-vercel-starter

[![Vercel Deployment Status](https://img.shields.io/github/deployments/mikesprague/react-tailwindcss-vercel-starter/production?label=Vercel%20%28build%20%26%20deploy%29&logo=Vercel&logoColor=white)](https://vercel.com/m5ls5e/react-tailwindcss-vercel-starter/deployments)

My basic project starter for [Vercel](https://vercel.com) hosted projects.

Sets up a barebones React/Tailwind CSS PWA front-end with a serverless function that can be used as an API on the back-end.

- React
- Tailwind CSS
- Vite

Lighthouse scores (rebuilt every 6 hours): <https://mikesprague.github.io/react-tailwindcss-vercel-starter/lighthouse-report.html>

## Getting started

### Quickstart

Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fmikesprague%2Freact-tailwindcss-vercel-starter&env=FONT_AWESOME_TOKEN)

### Manual Setup

1. Clone this repo into a new directory:<br>
   `git clone https://github.com/mikesprague/react-tailwindcss-vercel-starter.git your-project-name`
2. Go into the new directory:<br>
   `cd your-project-name`
3. Remove the `.git` folder from this source repo:<br>
   `rm -rf .git`
4. Inistantiate a new git repo for your project and these files:<br>
   `git init && git add . && git commit -m "Initial commit"`

### Local Development

Requires Node.js 24 or newer and npm 11 or newer.

1. Install dependencies: `npm install`.
2. Start the frontend: `npm run dev:vite`.
3. Open `http://localhost:5173`.

The frontend uses React, Vite, Tailwind CSS, and JavaScript/JSX. This command
does not require a Vercel account. If PowerShell blocks `npm.ps1`, use
`npm.cmd install` and `npm.cmd run dev:vite` instead.

Vite alone does not run the Node.js function in `api/sample-endpoint.js`.
The example joke request therefore fails in frontend-only development and the
existing UI displays an error; no mock response is provided.

For the frontend and API together, use `npm start` (Vercel development server at
`http://localhost:3001`). Vercel authentication and project setup may be required.
The API remains a Vercel Node.js Function using the existing extensionless route
`/api/sample-endpoint` and the rewrites in `vercel.json`.

Run `npm test` for formatting and lint checks, `npm run format` to format source,
and `npm run build` to generate the production frontend in `dist/`.
`npm run preview` serves that build locally, but does not run the API.

The `@/` alias points to `src/` in both `vite.config.js` and `jsconfig.json`.
Tailwind uses its Vite plugin and `src/index.css`; shadcn is configured to generate
JavaScript components. There is no application TypeScript build step. Dependencies
may still include TypeScript or type declarations for their own tooling.

## License

MIT License

Copyright (c) 2021 Michael Sprague

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
