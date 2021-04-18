import requests
import json
from xml.dom.minidom import parseString
import xml.etree.ElementTree as ET

url = "https://www.corona-test-hessen.de/data/corona-test-hessen.xml"
r = requests.get(url)

# Funktion, um die Werte zu extrahieren
def get_content(station, xpath):
    if station.find(xpath) == None:
        return 'keine Angabe'
    else:
        return station.find(xpath).text

root = ET.fromstring(r.text)
features = []

for station in root.findall("station"):
    
    # Name
    name = get_content(station, "address/data[@field='name']")

    # Adresse
    street = get_content(station, "address/data[@field='street']")
    plz = get_content(station, "address/data[@field='zip']")
    city = get_content(station, "address/data[@field='city']")
    location= f"{street} {plz} {city}"
    
    # Telefon
    telephone = get_content(station, "address/data[@field='tel']")
    
    # Geokoordinaten
    lat = get_content(station, "address/data[@field='lat']")
    lng = get_content(station, "address/data[@field='lng']")
    
    # URL
    link = get_content(station, "address/data[@field='link']")
    
    # Öffnungszeiten
    monday = get_content(station, "other/data[@field='monday']")
    tuesday = get_content(station, "other/data[@field='tuesday']")
    wednesday = get_content(station, "other/data[@field='wednesday']")
    thursday = get_content(station, "other/data[@field='thursday']")
    friday = get_content(station, "other/data[@field='friday']")
    saturday = get_content(station, "other/data[@field='saturday']")
    
    if monday == tuesday == wednesday == thursday == friday == saturday  == "- -":
        opening_hours = 'keine Angabe'
    elif  monday == tuesday == wednesday == thursday == friday == saturday == " ":
        opening_hours = 'keine Angabe'
    else:
        opening_hours = f"Mo {monday}; Di {tuesday}; Mi {wednesday}; Do {thursday}; Fr {friday}; Sa {saturday}"

    # Anmerkungen
    hints = station.find("other/data[@field='notes']").text
    
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
        "location": location,
        "telephone": telephone,
        "details_url": link,
        "opening_hours": opening_hours,
        "title": name,
        "hints": [
            hints,
            f'PCR-Test: {pcr}',
            f'Terminbuchung notwendig: {appointment}',
        ]
      },
      "type": "Feature"
    })
    
geojson = {
  "metadata": {
    "data_source": {
      "title": "Hessen",
      "url": url
    }
  },
  "type": "FeatureCollection",
  "features": features
}

print(json.dumps(geojson, indent=4))
    
#with open('cities/hessen.json', 'w') as output_file: 
#    json.dump(geojson, output_file, indent = 4)