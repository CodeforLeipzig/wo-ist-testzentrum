# Wo ist Corona-Testzentrum?

A small visualization of the Corona test centers in different cities.

![Screenshot of the website (showing Leipzig)](gfx/website-screenshot-leipzig.png)

# Updating data

## Berlin
To update the data for Berlin: Open a new terminal in the root of the project folder. Then run:
```bash
npm install
node preprocessing/berlin/compile-berlin-geojson.js > cities/berlin.json
```
This will fetch the latest data and put it into `cities/berlin.json`.

## Hessen
To update the data for Hessen: Open a new terminal in the root of the project folder. Then run:
```bash
python preprocessing/hessen/compile-hessen-geojson.py > cities/hessen.json
```
This will fetch the latest data and put it into `cities/hessen.json`.


## Leipzig
To update the data for Leipzig: Open a new terminal in the root of the project folder. Then run:
```bash
npm install
node preprocessing/leipzig/compile-leipzig-geojson.js > cities/leipzig.json
```
This will fetch the latest data and put it into `cities/leipzig.json`.
