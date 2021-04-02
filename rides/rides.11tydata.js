module.exports = {
  eleventyComputed: {
    permalink: data => { return process.env.ELEVENTY_ENV === "production" || data.debug ? "{{ date | date: '%Y/%m'}}/{{ date | date: '%d-%H:%M' }}.html" : false; }
  }
};
