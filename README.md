# Wo ist Corona-Testzentrum?

A small visualization of the Corona test centers in different cities.


# Updating data

## Berlin
To update the data for Berlin: Open a new terminal in the root of the project folder. Then run:
```bash
npm install
node preprocessing/berlin/compile-berlin-geojson.js > cities/berlin.json
```
This will fetch the latest data and put it into `berlin/cities.json`.