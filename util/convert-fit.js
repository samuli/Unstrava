var FitParser = require('fit-file-parser').default;
const fs = require('fs');
const path = require('path');
const process = require("process");
var yaml = require('js-yaml');
var moment = require('moment-timezone');
const yargs = require('yargs');


const argv = yargs
  .command('convert-fit', 'Convert fit-files to markdown.', {
    inDir: {
      description: 'Input directory of fit-files',
      type: 'string'
    },
    outDir: {
      description: 'Output directory for ride data files',
      type: 'string'
    }
  })
  .argv;

const dataIn = argv.inDir;
const dataOut = argv.outDir;

if (!dataIn || !dataOut) {
  console.log("Usage: convert-fit --inDir=<input directory> --outDir=<output directory>");
  return;
}


var parseFile = function(content, callback) {
  var fitParser = new FitParser({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'cascade'
  });

  var getFields = function(obj) {
    var fields = {
      'total_timer_time': 'total_timer_time',
      'total_elapsed_time': 'total_elapsed_time',
      'timestamp': 'start_time',
      'avg_speed': 'avg_speed',
      'max_speed': 'max_speed',
      'total_distance': 'total_distance',
      'avg_temperature': 'avg_temperature',
      'total_ascent': 'total_ascent',
      'total_descent': 'total_descent'
    };

    var result = {};
    for (let [key, val] of Object.entries(fields)) {
      result[key] = obj[val];
    }
    return result;
  };

  fitParser.parse(content, function (error, data) {
    if (error) {
      console.log(error);
    } else {
      var dataOut = {'sessions': []};
      var dataOutCoords = {'sessions': []};
      var coords = [];
      
      for (var i in Object.keys(data.activity.sessions)) {
        var session = data.activity.sessions[i];

        var sessionOut = getFields(session);
        sessionOut.laps = [];

        // Coordinates
        var sessionOutCoords = { "timestamp": session["start_time"], "laps": [] };
        
        for (var j in Object.keys(session.laps)) {
          var l = session.laps[j];
          if (l.event_type !== 'stop') {
            continue;
          }
          var lap = getFields(l);
          sessionOut.laps.push(lap);

          var lapCoords = {};
          
          var records = l["records"];
          var step = 5;
          //var coords = [];
          for (var k=0; k<records.length; k += step) {
            var r = records[k];
            if (typeof r["position_lat"] === "undefined"
                || typeof r["position_long"] === "undefined"
            ) {
              continue;
            }
            coords.push([r["position_lat"], r["position_long"]]);
          }
          lapCoords.coords = coords;
          sessionOutCoords.laps.push(lapCoords);
        }
        dataOut.sessions.push(sessionOut);
        dataOutCoords.sessions.push(sessionOutCoords);
      }
      callback({"data": dataOut, "coords": {"coords": coords}});
    }
  });
};



fs.readdir(dataIn, function (err, files) {
  if (err) {
    console.error("Could not list the directory.", err);
    process.exit(1);
  }
  files.forEach(function (file, index) {
    const fromPath = path.join(dataIn, file);
    const toPath = path.join(dataOut, file);

    // Ride info
    var mdFile = file.substr(0, file.lastIndexOf('.')) + ".md";
    mdFile = path.join(dataOut, mdFile);
    try {
      if (fs.existsSync(mdFile)) {
        return;
      }
    } catch(err) {
    }

    // Map coordinates
    var jsonFile = file.substr(0, file.lastIndexOf('.')) + ".json";
    jsonFile = path.join(dataOut, jsonFile);

    fs.stat(fromPath, function (error, stat) {
      if (error) {
        return;
      }      
      if (!stat.isFile()) {
        return;
      }
      
      fs.readFile(fromPath, function(err, content) {      
        parseFile(content, function(dataObj) {
          var data = dataObj.data;
          var coords = dataObj.coords;
          
          if (!data.sessions.length) {
            return;
          }
          // Fix minus zero temperature...
          var fixTemp = function(temp) {
            return temp > 100 ? -1*(256-temp) : temp;
          };
          

          data.sessions = data.sessions.map(function(s) {
            var laps = s.laps.map(function(l) {
              l.avg_temperature = fixTemp(l.avg_temperature);
              return l;
            });
            s.laps = laps;
            s.avg_temperature = fixTemp(s.avg_temperature);
            return s;
          });;

          
          
          var date = moment(data.sessions[0].timestamp);
          var year = date.year().toString();
          var month = (date.month()+1).toString();

          // Add additional data
          //data.tags = ["rides", year, `${year}-${month}`];
          data.date = date.format();
          coords.date = data.date;
          
          data = "---\n" + yaml.safeDump(data, {"skipInvalid": true}) + "\n---";
          fs.writeFileSync(mdFile, data);

          coords = JSON.stringify(coords);
          fs.writeFileSync(jsonFile, coords);

          console.log(file);
        });
      });
    });
  });
});

