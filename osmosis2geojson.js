#!/usr/bin/env node
"use strict";

const PRECISION = 12;  // Precision for floating point comparison

const END = "END"; // End marker in Osmosis polygon filter file
const SUBTRACT = "!"; // Subtract marker in Osmosis polygon filter file

const POLYGON = "Polygon"; // GeoJSON Polygon type indicator
const MULTIPOLYGON = "MultiPolygon"; // GeoJSON MultiPolygon type indicator

let async = require('async');
let fse = require('fs-extra');
let lineReader = require('line-reader');

// Converts from Osmosis polygon format to GeoJSON format.
// Implementation loosely modelled on the strategy pattern (abstract example below)

//function abstractExaminer(inLine, gjObj) {
//  inspect inLine
//  if inLine valid for Examiner, then process to update gjObj and return appropriate Examiner for next expected line
//  else log error and return null
//}

function fileExaminer(inLine, gjObj) {
  if (inLine) {
    gjObj.properties.name = inLine;
    return polygonExaminer;
  } else {
    console.error("Null input, file not in expected format");
    return null;
  }
}

function endExaminer(inLine, gjObj) {
  if (inLine === END) {
    return endExaminer;
  } else {
    if (inLine[0] === SUBTRACT) {
      if (gjObj.geometry.type === MULTIPOLYGON) {
        gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1].push([]);
      } else {
        gjObj.geometry.coordinates.push([]);
      }
    } else {
      if (gjObj.geometry.type === POLYGON) {
        gjObj.geometry.coordinates = [gjObj.geometry.coordinates]; // Move existing coordinates to initial polygon
        gjObj.geometry.type = MULTIPOLYGON;
      }
      gjObj.geometry.coordinates.push([[]]);
    }
    return polygonExaminer;
  }
}

function polygonExaminer(inLine, gjObj) {
  if (inLine === END) {
    return endExaminer;
  } else {
    if (readCoordinatePair(inLine, gjObj)) {
      return coordinateExaminer;
    } else {
      if (inLine) {
        if (gjObj.geometry.type === MULTIPOLYGON) {
          gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1].push([]);
        } else {
          gjObj.geometry.coordinates.push([]);
        }
        return coordinateExaminer;
      } else {
        console.error("Null input, file not in expected format");
        return null;
      }
    }
  }
}

function coordinateExaminer(inLine, gjObj) {
  if (inLine === END) {
    if (!ensureClosingCoordinates(gjObj)) {
      console.error("Polygon coordinates not valid, file not in expected format");
      return null;
    }
    return endExaminer;
  } else {
    if (readCoordinatePair(inLine, gjObj)) {
      return coordinateExaminer;
    } else {
      if (inLine) {
        if (gjObj.geometry.type === MULTIPOLYGON) {
          gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1].push([]);
        } else {
          gjObj.geometry.coordinates.push([]);
        }
        return polygonExaminer;
      } else {
        console.error("Null input, file not in expected format");
        return null;
      }
    }
  }
}

function readCoordinatePair(fileLine, gjObj) {
  let result = false;
  let splitLine = fileLine.split(/  +/g, 3); // Ignore the first element in the array
  if (splitLine.length > 2) {
    let lonVal = Number.parseFloat(splitLine[1]);
    let latVal = Number.parseFloat(splitLine[2]);
    if (Number.isNaN(lonVal) || Number.isNaN(latVal)) {
      console.error("readCoordinatePair: could not parse float: %s, %s", splitLine[1], splitLine[2]);
    } else {
      if (gjObj.geometry.type === MULTIPOLYGON) {
        let endPoly = gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1];
        endPoly[endPoly.length -1].push([lonVal, latVal]);
      } else {
        gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1].push([lonVal, latVal]);
      }
      result = true;
    }
  }
  return result;
}

function ensureClosingCoordinates(gjObj) {
  let result = false;
  let ring = null;
  if (gjObj.geometry.type === MULTIPOLYGON) {
    let poly = gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1];
    ring = poly[poly.length - 1];
  } else {
    ring = gjObj.geometry.coordinates[gjObj.geometry.coordinates.length - 1];
  }
  if (ring.length > 2) {
    result = true; // Sufficient coordinates to ensure validity
    // Check that first and last positions are equivalent
    let firstPair = ring[0];
    let lastPair = ring[ring.length - 1];
    if ((firstPair[0].toFixed(PRECISION) !== lastPair[0].toFixed(PRECISION)) ||
        (firstPair[1].toFixed(PRECISION) !== lastPair[1].toFixed(PRECISION))) {
      ring.push(firstPair);
    }
  }
  return result;
}

function asyncReadLines(polyFilePath, callback) {
  let examiner = fileExaminer;
  let gjObj = {
    "type": "Feature",
    "geometry": {
        "type": POLYGON,
        "coordinates": []
    },
    "properties": {}
  };
  
  lineReader.eachLine(polyFilePath, function(line, last) {
    examiner = examiner(line, gjObj);
    if (!examiner) {
      callback(new Error("Processing terminated"), null);
    } else {
      if (last) {
        callback(null, gjObj);
      }
    }
  });
}

async.waterfall([
  function(callback) {
    if (process.argv[2]) {
      let polyFilePath = process.argv[2];
      if (fse.existsSync(polyFilePath)) {
        asyncReadLines(polyFilePath, callback);
      } else {
        callback(new Error("File not found"));
      }
    } else {
      callback(new Error("No file specified"));
    }
  }],
  function (err, result) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      console.log(JSON.stringify(result));
      process.exit();
    }
  }
);
