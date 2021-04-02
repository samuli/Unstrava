# Unstrava

[Eleventy](https://www.11ty.dev/) based static site for viewing .FIT exercise data. Tested with Wahoo BOLT.

Copy .FIT data files to `data`, convert them and run Eleventy.

Optionally track you gear (km's used, in use, worn out etc) by creating Markdown files with frontmatter in `gear`, for example:
```
---
title: Gravelking slick 35 mm (taka), tubeless
inUse:
  - [2020-06-29,2020-07-31]
active: false
---
```

Tweak `/util/convert-fit.js` in case conversion fails.

## Install

`npm install`

## Convert .FIT files to be used by Eleventy. 

Writes a JSON file with map coordinates and a Markdown file with ride summary. Outputs to `/rides`. 

Copy data to `data` and run `npm run convert-fit`

## View Eleventy site

`npm run start-prod`

## Build Eleventy site to `/public`

`npm run build`

