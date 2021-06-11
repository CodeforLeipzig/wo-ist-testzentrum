import requests
import json
from xml.dom.minidom import parseString
import xml.etree.ElementTree as ET
import sys
import re

# print to stderr
def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

data_source = "https://www.corona-test-hessen.de"
data_url = "https://www.corona-test-hessen.de/data/corona-test-hessen.xml"
r = requests.get(data_url)
r.encoding = r.apparent_encoding

# Funktion, um die Werte zu extrahieren
def get_content(station, xpath, default_value):
    if station.find(xpath) == None:
        return default_value
    else:
        return station.find(xpath).text

root = ET.fromstring(r.text)
features = []

for station in root.findall("station"):
    # Station id & last modified date
    stationid = station.attrib['stationid']
    modified = station.attrib['modified']

    # Name
    name = get_content(station, "address/data[@field='name']", "Testzentrum")

    # Adresse
    street = get_content(station, "address/data[@field='street']", None)
    plz = get_content(station, "address/data[@field='zip']", None)
    city = get_content(station, "address/data[@field='city']", None)

    if street != None and plz != None and city != None:
        location= f"{street}, {plz} {city}"
    else:
        eprint("Fehler in der Adressangabe:", street, plz, city)
        continue

    # Telefon
    telephone = get_content(station, "address/data[@field='tel']", "keine Angabe")

    # Geokoordinaten
    lat = float(get_content(station, "address/data[@field='lat']", 0))
    lng = float(get_content(station, "address/data[@field='lng']", 0))

    if lat == 0 or lng == 0:
        eprint("Invalid geodata for station", stationid)
        continue

    # URL
    link = get_content(station, "address/data[@field='link']", data_source)

    def parseSpecialOpeningHourFormat(day_of_week, hessen_opening_hours_string):
        # example values from the xml file:
        # - -
        # - 18:20-19:20
        # 09:00-11:00 00:00-00:00
        # 07:00-10:00 -
        # 10:00-13:00 14:00-17:00
        # 08:00- -16:00

        # no opening hours for today
        if hessen_opening_hours_string.strip() in ['', '-']:
            return day_of_week + " closed, "

        # regex that matches a single time range
        regex_opening_hours = re.compile('^(\d\d:\d\d)?-(\d\d:\d\d)?$')

        # parse time points into array
        time_points = []
        for time_range_string in hessen_opening_hours_string.strip().split(' '):
            matches = regex_opening_hours.match(time_range_string.strip())
            if not matches:
                #eprint(stationid, "Invalid opening hour format (regex did not match): '" + hessen_opening_hours_string + "'")
                #return 'invalid'
                raise ValueError("Station " + stationid + " has invalid opening hour format (regex did not match): '" + hessen_opening_hours_string + "'")

            # append time points if at least one time point is not None
            if matches.group(1) != None or matches.group(2) != None:
                time_points.append(matches.group(1))
                time_points.append(matches.group(2))

        if len(time_points) == 0:
            # e.g. '', '-', or '- -'
            # no opening hours for today
            return day_of_week + " closed, "
        if len(time_points) == 2 and not None in time_points:
            # e.g. 08:30-09:00 -
            return day_of_week + ' ' + time_points[0] + '-' + time_points[1] + ', '
        elif len(time_points) == 4 and not None in time_points:
            # e.g. 08:30-09:00 12:30-14:00
            return day_of_week + ' ' + time_points[0] + '-' + time_points[1] + ', ' + day_of_week + ' ' + time_points[2] + '-' + time_points[3] + ', '
        elif len(time_points) == 4 and time_points[0] != None and time_points[1] == time_points[2] == None and time_points[3] != None:
            # e.g. 08:00- -18:00
            return day_of_week + ' ' + time_points[0] + '-' + time_points[3] + ', '
        else:
            raise ValueError("Station " + stationid + " has invalid opening hour format (unknown time point positioning): '" + hessen_opening_hours_string + "'")

    opening_hours = None
    try:
        monday    = parseSpecialOpeningHourFormat("Mo", get_content(station, "other/data[@field='monday']", ''))
        tuesday   = parseSpecialOpeningHourFormat("Tu", get_content(station, "other/data[@field='tuesday']", ''))
        wednesday = parseSpecialOpeningHourFormat("We", get_content(station, "other/data[@field='wednesday']", ''))
        thursday  = parseSpecialOpeningHourFormat("Th", get_content(station, "other/data[@field='thursday']", ''))
        friday    = parseSpecialOpeningHourFormat("Fr", get_content(station, "other/data[@field='friday']", ''))
        saturday  = parseSpecialOpeningHourFormat("Sa", get_content(station, "other/data[@field='saturday']", ''))

        opening_hours = monday + tuesday + wednesday + thursday + friday + saturday
        opening_hours = opening_hours.strip().strip(",")
    except ValueError as e:
        eprint(e)
        opening_hours = 'unbekannt'

    # Anmerkungen
    notes = station.find("other/data[@field='notes']").text

    # PCR-Test-Möglichkeit
    if (station.find("other/data[@field='pcr']").text) == '1':
        pcr = 'ja'
    elif (station.find("other/data[@field='pcr']").text) == '0':
        pcr = 'nein'
    else:
        pcr = 'keine Angabe'

    # Terminbuchung nötig
    if (station.find("other/data[@field='appointment']").text) == 'true':
        appointment = 'ja'
    elif (station.find("other/data[@field='appointment']").text) == 'false':
        appointment = 'nein'
    else:
        pcr = 'keine Angabe'

    hints = []
    if notes is not None:
        hints.append(notes)
    hints.append(f'PCR-Test: {pcr}')
    hints.append(f'Terminbuchung notwendig: {appointment}')

    # JSON-Objekt erstellen
    features.append({
      "geometry": {
        "coordinates": [
          lng,
          lat
        ],
        "type": "Point"
      },
      "properties": {
        "stationid": stationid,
        "modified": modified,
        "location": location,
        "telephone": telephone,
        "details_url": link,
        "opening_hours": opening_hours,
        "title": name,
        "hints": hints,
      },
      "type": "Feature"
    })

geojson = {
  "metadata": {
    "data_source": {
      "title": "Hessen",
      "url": data_source,
    }
  },
  "type": "FeatureCollection",
  "features": features
}

print(json.dumps(geojson, indent=4))

#with open('cities/hessen.json', 'w') as output_file:
#    json.dump(geojson, output_file, indent = 4)
