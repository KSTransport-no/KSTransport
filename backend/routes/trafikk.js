const express = require("express");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const logger = require("../utils/logger");

const router = express.Router();

const DATEX_BASE_URL =
  "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
});

router.get("/", async (req, res) => {
  try {
    logger.log("Henter trafikkinformasjon fra DATEX II...");

    const [trafikkmeldinger, reisetider] = await Promise.all([
      hentTrafikkmeldinger(),
      hentReisetider(),
    ]);

    res.json({
      roadwork: trafikkmeldinger.filter((m) => m.type === "roadworks"),
      incidents: trafikkmeldinger.filter((m) =>
        [
          "accident",
          "incident",
          "networkManagement",
          "maintenanceWorks",
        ].includes(m.type),
      ),
      delays: reisetider,
      message: "Trafikkinformasjon fra Statens vegvesen DATEX II",
    });
  } catch (error) {
    logger.error("Feil ved henting av DATEX II trafikkinformasjon:", error);
    res.json({
      roadwork: [],
      incidents: [],
      delays: [],
      message: "Kunne ikke hente trafikkinformasjon",
    });
  }
});

async function hentTrafikkmeldinger() {
  try {
    const response = await axios.get(
      `${DATEX_BASE_URL}/GetSituation/pullsnapshotdata`,
      {
        headers: {
          Accept: "application/xml",
          "User-Agent": "KSTransport/1.0",
        },
        timeout: 15000,
      },
    );

    return parseTrafikkmeldinger(response.data);
  } catch (error) {
    logger.error(
      "Feil ved henting av trafikkmeldinger:",
      error.response?.status || error.message,
    );
    return [];
  }
}

async function hentReisetider() {
  try {
    const response = await axios.get(
      `${DATEX_BASE_URL}/GetTravelTimeData/pullsnapshotdata`,
      {
        headers: {
          Accept: "application/xml",
          "User-Agent": "KSTransport/1.0",
        },
        timeout: 15000,
      },
    );

    return parseReisetider(response.data);
  } catch (error) {
    logger.error(
      "Feil ved henting av reisetider:",
      error.response?.status || error.message,
    );
    return [];
  }
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstText(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value._text === "string") return value._text;
  }
  return null;
}

function parseTrafikkmeldinger(xmlData) {
  try {
    const json = parser.parse(xmlData);

    const payload =
      json?.payloadPublication ||
      json?.d2LogicalModel?.payloadPublication ||
      json?.D2LogicalModel?.payloadPublication;

    const situations = toArray(payload?.situation);

    const records = situations.flatMap((situation) => {
      return toArray(situation?.situationRecord);
    });

    return records
      .map((record) => {
        const comments = toArray(record?.generalPublicComment);
        const commentText =
          comments
            .flatMap((c) => toArray(c?.comment))
            .flatMap((c) => toArray(c?.value))
            .map(firstText)
            .find(Boolean) || null;

        const group =
          record?.groupOfLocations?.locationContainedInGroup ||
          record?.groupOfLocations ||
          null;

        const roadName =
          firstText(group?.tpegOtherPointDescriptor?.descriptor) ||
          firstText(group?.alertCPoint?.alertCLocation?.specificLocation) ||
          firstText(
            record?.groupOfLocations?.supplementaryPositionalDescription
              ?.locationDescriptor,
          ) ||
          "Ukjent lokasjon";

        return {
          id: record?.["@_id"] || record?.id || cryptoSafeId(),
          type: mapSituationType(
            record?.["@_xsi:type"] || record?.["@_type"] || "",
          ),
          beskrivelse: commentText || "Ingen beskrivelse tilgjengelig",
          lokasjon: roadName,
          tidspunkt:
            record?.overallStartTime ||
            record?.probabilityOfOccurrence ||
            new Date().toISOString(),
        };
      })
      .filter((m) => m.beskrivelse)
      .slice(0, 50);
  } catch (error) {
    logger.error("Feil ved parsing av trafikkmeldinger:", error);
    return [];
  }
}

function parseReisetider(xmlData) {
  try {
    const json = parser.parse(xmlData);

    const payload =
      json?.payloadPublication ||
      json?.d2LogicalModel?.payloadPublication ||
      json?.D2LogicalModel?.payloadPublication;

    const publications = toArray(payload?.travelTimePublication);
    const measurements = publications.flatMap((pub) =>
      toArray(pub?.travelTime),
    );

    return measurements
      .map((item) => {
        const sekunder =
          Number(item?.travelTime) || Number(item?.averageTravelTime) || null;

        if (!sekunder) return null;

        const routeName =
          firstText(item?.name) ||
          firstText(item?.measurementSiteReference) ||
          "Ukjent lokasjon";

        return {
          id: item?.["@_id"] || item?.id || cryptoSafeId(),
          tid: Math.round(sekunder / 60),
          lokasjon: routeName,
          tidspunkt: item?.measurementTimeDefault || new Date().toISOString(),
        };
      })
      .filter(Boolean)
      .slice(0, 50);
  } catch (error) {
    logger.error("Feil ved parsing av reisetider:", error);
    return [];
  }
}

function mapSituationType(rawType) {
  const value = String(rawType || "").toLowerCase();

  if (value.includes("roadworks") || value.includes("maintenance")) {
    return "roadworks";
  }
  if (value.includes("accident")) {
    return "accident";
  }
  if (value.includes("incident") || value.includes("network")) {
    return "incident";
  }
  return "ukjent";
}

function cryptoSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = router;
