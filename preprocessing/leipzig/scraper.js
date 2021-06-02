const cheerio = require('cheerio');
const fs = require('fs');

exports.scrape = function (rootPath, content) {
    const $ = cheerio.load(content);
    const table = $("#testzentren").find("table > tbody").first();

    const config = [];
    table.find('tr').each((index, tr) => {
        const tds = $(tr).find('td');
        handleName(config, tds);
        handleAddressAndTelephone(config, tds, index);
        handleOpening(config, tds, index);
    });

    const configObj = {
        testcenters: config
    };
    fs.writeFileSync(`${rootPath}/config.json`, JSON.stringify(configObj, null, 2), 'utf-8');
};

const handleName = function(config, tds) {
    config.push({
        title: tds[0].children[0].data.trim()
    });
};

const handleAddressAndTelephone = function(config, tds, index) {
    const cellContent = tds[1].children[0].data.trim();
    const parts = cellContent.split(", Telefon ");
    config[index].location = parts[0];
    if (parts.length > 1) {
      config[index].telephone = parts[1];
    }
};


const weekDayMap = {
  "Montag": "Mo",
  "Dienstag": "Tu",
  "Mittwoch": "We",
  "Donnerstag": "Th",
  "Freitag": "Fr",
  "Samstag": "Sa",
  "Sonntag": "Su"
};

const handleOpening = function(config, tds, index) {
    var cellContent = tds[2] && tds[2].children[0].data.trim();
    if (cellContent) {
      for (var k of Object.keys(weekDayMap)) {
        cellContent = cellContent.replace(k, weekDayMap[k]);
      }
      cellContent = cellContent.replace(" Uhr", "");
      config[index].opening_hours = cellContent;
    }
};
