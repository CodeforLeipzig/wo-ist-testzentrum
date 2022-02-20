#!/usr/bin/env node
"use strict";

import fetch from "node-fetch";
import dayjs from "dayjs";

const URL = "https://apiv2.direkttesten.berlin/api/v1/testcenter/?page[size]=10000&filter[is_active]=true&filter[is_mobile]=false&filter[is_published]=true";

const NOW_DATE = dayjs().format("DD.MM.YYYY");

const getData = () => {
    return fetch(URL).then(response => response.json());
};

const weekDayMap = {
    "monday": "Mo",
    "tuesday": "Tu",
    "wednesday": "We",
    "thursday": "Th",
    "friday": "Fr",
    "saturday": "Sa",
    "sunday": "Su"
};


// Converts `[{"end":"18:00","start":"09:00"}]` into `09:00-18:00`.
const concatTimeRanges = (timeRangeArray) => {
    return timeRangeArray.map(timeRange => {
        if (timeRange.start === "") {
            throw "'start' property is empty.";
        }
        if (timeRange.end === "") {
            throw "'end' property is empty.";
        }
        return timeRange.start + "-" + timeRange.end;
    });
};

const convertToOpeningHours = (openingHoursObject) => {
    const text = Object.keys(openingHoursObject).reduce((agg, weekDay) => {
        var timeRanges = [];
        try {
            timeRanges = concatTimeRanges(openingHoursObject[weekDay]);
        } catch (e) {
            throw weekDay + " -> " + e;
        }
        if (timeRanges.length == 0) {
            return agg;
        }
        agg += weekDayMap[weekDay] + " " + timeRanges.join(", ") + "; ";
        return agg;
    }, "");
    // Trim trailing semicolon and space
    return text.trim().replace(/;$/, "");
};

const appointmentMap = {
    "OPTIONAL": "optional",
    "YES": "notwendig",
    "NO": "nicht notwendig",
};

const booleanValuesMap = {
    "true": "ja",
    "false": "nein",
};

const convertToHumanReadable = (valuesMap, value) => {
    return value && valuesMap[value] || value;
};

// Prepend "https://" if not present.
// Trim space and trailing slash if present.
const normalizeUrl = (url) => {
    var text;
    if (url && url.length > 0) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            text = url;
        } else {
            text = "https://" + url;
        }
        return text.trim().replace(/\/$/, "");
    }
    return null;
};

// Trim "Telefon: " from the start of the text.
const sanitizePhoneText = (text) => {
    if (text && text.length > 0) {
        if (text.startsWith("Telefon: ")) {
            return text.substring("Telefon: ".length);
        }
        return text;
    }
    return null;
};

const convertToGeoJson = (node) => {
    var openingHours;
    try {
        openingHours = convertToOpeningHours(node.openingHours);
    } catch (e) {
        // Opening hours are dropped if they cannot be parsed.
        console.error("'" + node.name + "' -> " + e);
    }
    const json = {
        "geometry": {
            "coordinates": [
                parseFloat(node.longitude), parseFloat(node.latitude)
            ],
            "type": "Point"
        },
        "properties": {
            "location": `${node.street}, ${node.postalCode} ${node.city}`,
            "telephone": sanitizePhoneText(node.phone) || null,
            "details_url": normalizeUrl(node.website) || null,
            "opening_hours": openingHours || null,
            "title": node.name,
            "hints": [
                `PCR-Nachtestung: ${convertToHumanReadable(booleanValuesMap, node.hasConfirmatoryPcr) || "keine Angabe"}`,
                `Barrierefreiheit: ${convertToHumanReadable(booleanValuesMap, node.isAccessible) || "keine Angabe"}`,
                `Tests für Kinder: ${convertToHumanReadable(booleanValuesMap, node.hasChildTesting) || "keine Angabe"}`,
                `Terminbuchung: ${convertToHumanReadable(appointmentMap, node.requiresAppointment) || "keine Angabe"}`,
            ],
        },
        "type": "Feature"
    };
    if (json.properties.opening_hours == null) {
        json.properties.opening_hours_unclassified = "Keine Angabe";
    }
    return json;
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
    .then(json => json.map(convertToGeoJson)
                      .filter(isValidEntry)
    )
    .then(features => (
        {
            "metadata": {
                "data_source": {
                    "title": "Stadt Berlin, Stand: " + NOW_DATE,
                    "url": "https://www.direkttesten.berlin",
                }
            },
            "type": "FeatureCollection",
            features
        }
    ))
    .then(geoJson => JSON.stringify(geoJson, null, 2))
    .then(console.log);