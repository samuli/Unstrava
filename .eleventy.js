const htmlmin = require('html-minifier');
const Terser = require("terser");
const CleanCSS = require("clean-css");
const moment = require('moment-timezone');

const iconsprite = require('./shortcodes/iconsprite.js');

const monthsCollection = require("./util/contentByDate").contentByMonth;
const yearsCollection = require("./util/contentByDate").contentByYear;
//const allCollection = require("./util/contentByDate").allContent;


var summaryRides = null;

var development = process.env.ELEVENTY_ENV === "development";

module.exports = function(eleventyConfig) {
  // Filters
  eleventyConfig.addFilter("dateToStr", function(date, format) {
    if (typeof format === "undefined") {
      format = "ddd D.M.";
    }
    return moment(date).format(format);
  });
  eleventyConfig.addFilter("dateClass", function(date) {
    return moment(date).format("ddd").toLowerCase();
  });

  eleventyConfig.addFilter("durationToStr", function(sec) {
    return moment.utc(moment.duration(sec, 'seconds').asMilliseconds()).format("HH:mm");
  });

  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  eleventyConfig.addFilter("pad", function(num) {
    return num.toString().padStart(2, '0');
  });
/*
  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });
*/
  eleventyConfig.addFilter("jsmin", function(code) {
    let minified = Terser.minify(code);
    if (minified.error) {
      return code;
    }
    
    return minified.code;
  });

  // Shortcodes
  eleventyConfig.addShortcode("monthToStr", function(month) {
    return moment().month(month).format("MMMM");
  });

  // SVG icons
  eleventyConfig.addNunjucksAsyncShortcode('iconsprite', iconsprite);
  eleventyConfig.addShortcode('icon', function(name) {
    return `<svg class="icon icon--${name}" role="img" aria-hidden="true" width="24" height="24">
                    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-${name}"></use>
                </svg>`;
  });

  var binLimits = [20,50,100,150,200,300];

  eleventyConfig.addShortcode("summary", function(rides) {    
    if (typeof rides === "undefined") {
      return "";
    }
    var total = 0;
    var duration = 0;
    var bins = new Array(binLimits.length).fill(0);
    
    for (var i=0; i<rides.length; i++) {
      var rideData = rides[i].data;
      if (typeof rideData.sessions === "undefined"
          || !rideData.sessions.length
      ) {
        continue;
      }
      var s = rideData.sessions[0];
      var distance = s.total_distance;
      total += distance;
      duration += s.total_timer_time;

      if (rideData.legacy !== true) {
        var bin = 0;
        for (var j=0; j<binLimits.length; j++) {
          if (binLimits[j] > distance) {
            break;
          }
          bin = j;
        }
        bins[j]++;
      }
    }
    summaryRides = {total: total, duration: duration, bins: bins};
    return '';
  });

  eleventyConfig.addShortcode("summaryTotal", function() {
    if (!summaryRides) {
      return "";
    }
    return Math.floor(summaryRides.total).toString();
  });
  eleventyConfig.addShortcode("summaryDuration", function() {
    if (!summaryRides) {
      return "";
    }
    var duration = moment.duration(summaryRides.duration, 'seconds');
    if (duration > moment.duration(1, "hour")) {
      duration = Math.floor(duration.asHours()).toString() + " h";
    } else {
      duration = Math.floor(duration.asMinutes()).toString() + " min";
    }
    return duration;
  });


  var binColors = [
    "#49adad",
    "#cc5a43",
    "#6ca74d",
    "#8d70c9",
    "#b68f40",
    "#c8588c"
  ];
  eleventyConfig.addShortcode("summaryBins", function() {
    if (!summaryRides) {
      return "";
    }
    var html = summaryRides.bins.map((val,idx) => `<div style="background-color:${binColors[idx]};" class="bin">${val}</div>`);
    return `<div class="bins">` + html.join("") + "</div>";
  });
  eleventyConfig.addShortcode("binLegend", function() {
    var html = "";
    var prev = 0;
    for (var i=0; i<binLimits.length; i++) {
      var start = prev;
      var end = binLimits[i];

      html += `<div style="background-color:${binColors[i]};" class="bin">${start}-${end} km</div>`;
      prev = end;
    }
    return `<div class="bins">${html}</div>`;    
  });
  
  eleventyConfig.addShortcode("ridesInfo", function() {
    if (!summaryRides) {
      return "";
    }
    var total = Math.floor(summaryRides.total).toString();
    var duration = Math.floor(moment.duration(summaryRides.duration, 'seconds').asHours()).toString();
    return `<span class="info"><span class="total">${total} km</span><span class="duration">${duration} h</span></span>`;
  });

  var periodToDates = function(period) {
    var startDate = moment(period[0]).startOf("day");
    var endDate = period.length > 1 ? moment(period[1]).endOf("day") : moment().endOf("day");
    return [startDate, endDate];
  };
  
  var getGearPeriods = function(gear) {
    return gear.data.inUse.map(function(period) {
      return periodToDates(period);
    });
  };

  eleventyConfig.addShortcode("periodToStr", function(period) {
    var dates = periodToDates(period);
    return dates[0].format("D.M.YYYY") + " - "  + dates[1].format("D.M.YYYY");
  });

  var kmUsed = function(rides, gear) {
    if (typeof rides === "undefined") {
      return 0;
    }
    var periods = getGearPeriods(gear);
    
    var total = rides.reduce(function(acc, ride) {
      var s = ride.data.sessions[0];
      var timestamp = moment(s.timestamp);
      var inUse = false;
      periods.forEach(function(period) {
        if (timestamp.isBetween(period[0], period[1])) {
          inUse = true;
          return;
        }
      });
      return acc + (inUse ? s.total_distance : 0);
    }, 0.0);
    return Math.floor(total);
  };
  
  eleventyConfig.addShortcode("kmUsed", function(rides, gear) {
    return kmUsed(rides, gear).toString();
  });


  var filterGear = function(collection, inUse) {
    var rides = collection.getFilteredByTag("ride");
    
    var now = moment();
    var gear = collection.getFilteredByTag("gear").filter(function(gear) {
      return typeof gear.data.active === "undefined" || gear.data.active;
    }).filter(function(gear) {
      var periods = getGearPeriods(gear);
      var _inUse = false;
      periods.forEach(function(period) {
        if (now.isBetween(period[0], period[1])) {
          _inUse = true;
        }
      });
      return inUse === _inUse;
    });
    return gear.sort(function (a, b) {
      var km1 = kmUsed(rides, a);
      var km2 = kmUsed(rides, b);
      if (km1 > km2 ) {
        return -1;
      } else if (km1 < km2) {
        return 1;
      } else {
        return 0;
      }
    });
  };

  
  // Collections
  eleventyConfig.addCollection("gearInUse", function(collection) {
    return filterGear(collection, true);
  });
  eleventyConfig.addCollection("gearInStash", function(collection) {
    return filterGear(collection, false);
  });
  eleventyConfig.addCollection("gearWornOut", function(collection) {
    return collection.getFilteredByTag("gear").filter(function(gear) {
      return gear.data.active === false;
    });
  });
  
  eleventyConfig.addCollection("contentByMonth", monthsCollection);
  eleventyConfig.addCollection("contentByYear", yearsCollection);
//  eleventyConfig.addCollection("allContent", allCollection);



  

  eleventyConfig.addPassthroughCopy({"static/css": "css"});
  eleventyConfig.addPassthroughCopy({"static/js": "js"});
  
  return {
    dir: {
      output: "public"
    },
    pathPrefix: "",
    templateFormats: ['md', 'njk', 'jpg', 'png', 'gif', 'pdf']
  };
};
