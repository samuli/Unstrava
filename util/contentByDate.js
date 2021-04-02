const moment = require("moment");

function sortByDate(a, b) {
  return b.date - a.date;
}

function makeDateFormatter(datePattern) {
  return function (date) {
	return moment(date).format(datePattern);
  }
}

function generatePostDateSet(posts, dateFormatter) {
  const fomattedDates = posts.map(item => {
	return dateFormatter(item.data.page.date);
  });
  return [...new Set(fomattedDates)];
}

function getPostsByDate(posts, date, dateFormatter){
  return posts.filter(post => {
	return dateFormatter(post.data.page.date) === date;
  }).sort(sortByDate);
}

const contentByDateString = (posts, dateFormatter) => {
  return generatePostDateSet(posts, dateFormatter)
	.reduce(function(collected, fomattedDate){
	  return Object.assign({}, collected, {
		// lowercase to match month directory page.url
		[fomattedDate.toLowerCase()]: getPostsByDate(posts, fomattedDate, dateFormatter)
	  })
	},{});
}

function getAllPosts(collection) {
  var posts = collection.getFilteredByTag('ride');
  if ("development" === process.env.ELEVENTY_ENV) {
    posts = posts.filter(ride => {
      return ride.data.debug === true;
    });
  }
  return posts;
}
/*
exports.allContent = collection => {
  return getAllPosts(collection);
};
*/
exports.contentByMonth = collection => {
  var result = contentByDateString(
  	getAllPosts(collection),
  	makeDateFormatter("/YYYY/MM/")
  );
  return result;
}

exports.contentByYear = collection => {
  var result = contentByDateString(
  	getAllPosts(collection),
  	makeDateFormatter("/YYYY/")
  );
  var years = Object.keys(result).sort().reverse();
  var sorted = {};
  years.forEach(year => {
    sorted[year] = result[year];
  });
  return sorted;
}
