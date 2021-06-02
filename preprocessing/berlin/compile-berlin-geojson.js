#!/usr/bin/env node
"use strict";

const fetch = require('node-fetch');
const dayjs = require('dayjs');

const URL = 'https://test-to-go.berlin/wp-admin/admin-ajax.php?action=asl_load_stores&nonce=3a3f19feff&load_all=1&layout=1';

const NOW_DATE = dayjs().format("DD.MM.YYYY");

const getData = () => {
    return fetch(URL).then(response => response.json());
};

const weekDayMap = {
    "mon": "Mo",
    "tue": "Tu",
    "wed": "We",
    "thu": "Th",
    "fri": "Fr",
    "sat": "Sa",
    "sun": "Su"
};

const convertToOpeningHours = (openingString) => {
    const data = JSON.parse(openingString);
    return Object.keys(data).reduce((agg, key) => {
        const value = data[key];
        if (value === "0" || value === "1"){
            return agg;
        }
        agg += `${weekDayMap[key]} ${value.join(',')}; `;
        return agg;
    }, "");
};

const appointmentMap = {
    "mit": "notwendig",
    "mit_dritt": "notwendig",
    "möglich": "telefonisch möglich",
    "moeglich": "möglich",
    "moeglich_dritt": "möglich",
    "ohne": "nicht notwendig",
    "ohne_dritt": "nicht notwendig",
};

const accessibilityMap = {
    "mit": "ja",
    "ohne": "nein",
};

const convertToHumanReadable = (valuesMap, value) => {
    return value && valuesMap[value.toLowerCase()] || value;
};

const convertToGeoJson = (node) => {
    return {
        "geometry": {
            "coordinates": [
                parseFloat(node.lng), parseFloat(node.lat)
            ],
            "type": "Point"
        },
        "properties": {
            "location": `${node.street} ${node.postal_code} ${node.city}`,
            "telephone": node.phone || null,
            "details_url": node.website,
            "opening_hours": convertToOpeningHours(node.open_hours),
            "title": node.title,
            "hints": [
                `PCR-Nachtestung: ${node.pcr_nachtestung || "nein"}`,
                `Barrierefreiheit: ${convertToHumanReadable(accessibilityMap, node.barrierefreiheit) || "nein"}`,
                `Terminbuchung: ${convertToHumanReadable(appointmentMap, node.terminbuchung)}`,
            ],
        },
        "type": "Feature"
    };
};

const isValidEntry = (entry) => {
    // There are some entries in the original dataset without
    // coordinates. Since those would be displayed in our map
    // in the middle of the ocean, we filter them out using
    // this function.
    const [lat, lon] = entry.geometry.coordinates;
    return lat !== 0 && lon !== 0;
};

getData()
    .then(entries =>
        entries.map(convertToGeoJson)
               .filter(isValidEntry)
    )
    .then(features => (
        {
            "metadata": {
                "data_source": {
                    "title": "Stadt Berlin, Stand: " + NOW_DATE,
                    "url": "https://test-to-go.berlin",
                }
            },
            "type": "FeatureCollection",
            features
        }
    ))
    .then(geoJson => JSON.stringify(geoJson, null, 2))
    .then(console.log);