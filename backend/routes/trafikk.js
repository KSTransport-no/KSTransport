const express = require("express");
const axios = require("axios");
const logger = require("../utils/logger");

const router = express.Router();

const TOMTOM_BASE = "https://api.tomtom.com";

function getApiKey() {
  return process.env.TOMTOM_API_KEY;
}

// Bounding box for Rogaland/Stavanger area (TomTom format: minLon,minLat,maxLon,maxLat)
const BBOX = "5.45,58.75,6.10,59.15";

// Key road segments to monitor for flow/delays (lat,lon pairs)
const FLOW_SEGMENTS = [
  { name: "E39 Stavanger sentrum", lat: 58.9700, lon: 5.7331 },
  { name: "E39 Sandnes", lat: 58.8500, lon: 5.7350 },
  { name: "Rv13 Ryfylke", lat: 59.0500, lon: 5.9500 },
  { name: "E39 Ålgård", lat: 58.7650, lon: 5.8500 },
  { name: "Rv509 Sola/Tananger", lat: 58.9300, lon: 5.5800 },
];

router.get("/", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.error("TOMTOM_API_KEY is not configured");
    return res.json({
      roadwork: [],
      incidents: [],
      delays: [],
      message: "Trafikktjeneste ikke konfigurert (mangler API-nøkkel)",
    });
  }

  try {
    logger.debug('Fetching traffic info from TomTom');

    const [incidentData, flowData] = await Promise.all([
      hentIncidents(apiKey),
      hentFlowDelays(apiKey),
    ]);

    const roadwork = [];
    const incidents = [];

    for (const item of incidentData) {
      if (item.category === "roadwork") {
        roadwork.push(item.text);
      } else {
        incidents.push(item.text);
      }
    }

    res.json({
      roadwork,
      incidents,
      delays: flowData,
      message: "Trafikkinformasjon fra TomTom",
    });
  } catch (error) {
    logger.error("Feil ved henting av TomTom trafikkinformasjon:", error.message);
    res.json({
      roadwork: [],
      incidents: [],
      delays: [],
      message: "Kunne ikke hente trafikkinformasjon",
    });
  }
});

async function hentIncidents(apiKey) {
  try {
    // TomTom Incident Details API v5
    const url = `${TOMTOM_BASE}/traffic/services/5/incidentDetails`;
    const response = await axios.get(url, {
      params: {
        key: apiKey,
        bbox: BBOX,
        fields:
          "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,roadNumbers}}}",
        language: "nb-NO",
        categoryFilter: "0,1,2,3,4,5,6,7,8,9,10,11,14",
        timeValidityFilter: "present",
      },
      timeout: 10000,
    });

    const items = response.data?.incidents || [];

    return items.map((inc) => {
      const props = inc.properties || {};
      const from = props.from || "";
      const to = props.to || "";
      const events = (props.events || [])
        .map((e) => e.description)
        .filter(Boolean)
        .join(". ");
      const roads = (props.roadNumbers || []).join(", ");
      const delay = props.delay
        ? ` (${Math.round(props.delay / 60)} min forsinkelse)`
        : "";

      const location = [roads, from, to ? `→ ${to}` : ""]
        .filter(Boolean)
        .join(" ");
      const description = events || "Trafikkmelding";

      return {
        category: mapCategory(props.iconCategory),
        text: `${location}: ${description}${delay}`.trim(),
      };
    });
  } catch (error) {
    logger.error(
      "Feil ved henting av TomTom incidents:",
      error.response?.status || error.message,
    );
    return [];
  }
}

async function hentFlowDelays(apiKey) {
  try {
    const results = await Promise.all(
      FLOW_SEGMENTS.map(async (seg) => {
        try {
          const url = `${TOMTOM_BASE}/traffic/services/4/flowSegmentData/absolute/10/json`;
          const response = await axios.get(url, {
            params: {
              key: apiKey,
              point: `${seg.lat},${seg.lon}`,
              unit: "KMPH",
            },
            timeout: 8000,
          });

          const flow = response.data?.flowSegmentData;
          if (!flow) return null;

          const current = flow.currentSpeed;
          const freeFlow = flow.freeFlowSpeed;

          if (!current || !freeFlow) return null;

          // Only report if current speed is significantly below free-flow
          const ratio = current / freeFlow;
          if (ratio >= 0.75) return null;

          const delayPercent = Math.round((1 - ratio) * 100);
          return `${seg.name}: ${current} km/t (normalt ${freeFlow} km/t, ${delayPercent}% tregere)`;
        } catch {
          return null;
        }
      }),
    );

    return results.filter(Boolean);
  } catch (error) {
    logger.error(
      "Feil ved henting av TomTom flow:",
      error.message,
    );
    return [];
  }
}

function mapCategory(iconCategory) {
  // TomTom icon categories: 1=accident, 2=fog, 3=dangerous, 4=rain,
  // 5=ice, 6=jam, 7=lane closed, 8=road closed, 9=road works,
  // 10=wind, 11=flooding, 14=broken down vehicle
  if (iconCategory === 9) return "roadwork";
  return "incident";
}

module.exports = router;
