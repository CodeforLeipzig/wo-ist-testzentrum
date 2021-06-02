const nunjucks = require('nunjucks');
const fs = require('fs');
var request = require("request");
const { scrape } = require('./scraper.js');

const rootPath = './preprocessing/leipzig';
const url = 'https://www.leipzig.de/jugend-familie-und-soziales/gesundheit/neuartiges-coronavirus-2019-n-cov/testzentrum/';

request({
  uri: url,
}, function (error, response, body) {
  scrape(rootPath, body);
  nunjucks.configure({ autoescape: true });
  const template = fs.readFileSync(`${rootPath}/city_template.njk`, 'utf-8');
  const config = require(`./config.json`, 'utf-8');
  const locations = require(`./locations.json`, 'utf-8');
  const newTestcenters = [];
  config.testcenters.forEach(testcenter => {
    const newTestcenter = {};
    newTestcenter.location = testcenter.location;
    newTestcenter.title = testcenter.title;
    newTestcenter.telephone = testcenter.telephone;
    newTestcenter.opening_hours = testcenter.opening_hours;
    const matchingLocs = locations.locations.filter(loc => loc.title === testcenter.title);
    if (matchingLocs.length > 0) {
      for (var index in matchingLocs) {
        newTestcenter.coordinates = matchingLocs[index].coordinates;
      }
    } else {
      testcenter.coordinates = [51, 12];
    }
    newTestcenters.push(newTestcenter);
  });
  config.testcenters = newTestcenters;
  const rendered = nunjucks.renderString(template, config);
  fs.writeFileSync('./leipzig.json', rendered, 'utf-8');
});