#!/usr/bin/env node
"use strict";

const fetch = require('node-fetch');

const URL = 'https://test-to-go.berlin/wp-admin/admin-ajax.php?action=asl_load_stores&nonce=3a3f19feff&load_all=1&layout=1';

const getData = () => {
    return fetch(URL).then(response => response.json())
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
                `Barrierefreiheit: ${node.barrierefreiheit || "nein"}`,
                `Terminbuchung: ${node.terminbuchung}`,
            ],
        },
        "type": "Feature"
    };
};

getData()
    .then(entries => entries.map(convertToGeoJson))
    .then(features => (
        {
            "metadata": {
                "data_source": {
                    "title": "Stadt Berlin",
                    "url": "https://test-to-go.berlin/testzentren-und-teststellen/",
                }
            },
            "type": "FeatureCollection",
            features
        }
    ))
    .then(geoJson => JSON.stringify(geoJson, null, 2))
    .then(console.log);