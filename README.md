# osmosis2geojson

Converts from [Osmosis polygon filter file format](https://wiki.openstreetmap.org/wiki/Osmosis/Polygon_Filter_File_Format) to [GeoJSON format](https://tools.ietf.org/html/rfc7946).

### Install

```
git clone https://github.com/spatialoperator/osmosis2geojson.git
npm install osmosis2geojson
```

### Usage

The osmosis2geojson script will read an Osmosis polygon file and output to GeoJSON format.

`./osmosis2geojson.js shuna.poly >> shuna.geojson`

GeoJSON uses the WGS84 geographic coordinate reference system.  Polygon file coordinates are assumed to be in WGS84.

### Limitations

The Osmosis polygon format allows for several files to be combined to form a multi-sectioned file.  This is not currently supported.

### Dependencies

* [line-reader](https://github.com/nickewing/line-reader)
* [fs-extra](https://github.com/jprichardson/node-fs-extra)

### Authors

* **[spatialoperator](https://github.com/spatialoperator)** - *initial work*

### Licence

This project is licensed under the ISC Licence - see the [LICENCE.txt](LICENCE.txt) file for details

### Acknowledgments

* [Geofabrik](https://www.geofabrik.de) - an excellent [OSM](https://www.openstreetmap.org/) resource
