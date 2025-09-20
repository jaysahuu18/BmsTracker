const express = require("express");
const cors = require("cors");


const app = express();
app.use(cors());

// ✅ City details
const cities = {
  hyderabad: {
    city_code: "HYD",
    region_code: "HYD",
    sub_region_code: "HYD",
    region_slug: "hyderabad",
    latitude: "17.385044",
    longitude: "78.486671"
  }
};

// ✅ Fixed date
function getFixedDate() {
  return "2025-09-25"; // YYYY-MM-DD
}

// ✅ Format numbers with Indian commas
function formatNumber(num) {
  if (num === null || num === undefined) return num;
  if (!isNaN(num)) {
    return Number(num).toLocaleString("en-IN");
  }
  return num;
}

// ✅ Process API response
function processShowtimeData(data) {
  const results = [];
  let grandTotalMaxSeats = 0,
    grandTotalSeatsAvailable = 0,
    grandTotalBookedTickets = 0;
  let grandTotalGross = 0,
    grandBookedGross = 0;
  let totalShows = 0,
    fastFillingShows = 0,
    soldOutShows = 0;

  if (!data.ShowDetails || data.ShowDetails.length === 0) {
    return {
      results,
      totalShows,
      fastFillingShows,
      soldOutShows,
      totalBookedGross: "0.00",
      totalGross: "0.00",
      totalOccupancy: "NaN%",
      totalBookedTickets: 0,
      totalMaxSeats: 0
    };
  }

  data.ShowDetails.forEach((showDetail) => {
    showDetail.Venues.forEach((venue) => {
      venue.ShowTimes.forEach((showTime) => {
        totalShows++;
        let totalMaxSeats = 0,
          totalSeatsAvailable = 0,
          totalBookedTickets = 0;
        let totalGross = 0,
          bookedGross = 0;

        showTime.Categories.forEach((category) => {
          const maxSeats = parseInt(category.MaxSeats, 10) || 0;
          const seatsAvail = parseInt(category.SeatsAvail, 10) || 0;
          const bookedTickets = maxSeats - seatsAvail;
          const currentPrice = parseFloat(category.CurPrice) || 0;

          totalMaxSeats += maxSeats;
          totalSeatsAvailable += seatsAvail;
          totalBookedTickets += bookedTickets;
          totalGross += maxSeats * currentPrice;
          bookedGross += bookedTickets * currentPrice;
        });

        if (totalSeatsAvailable === 0) soldOutShows++;
        else if ((totalMaxSeats - totalSeatsAvailable) / totalMaxSeats >= 0.5)
          fastFillingShows++;

        grandTotalMaxSeats += totalMaxSeats;
        grandTotalSeatsAvailable += totalSeatsAvailable;
        grandTotalBookedTickets += totalBookedTickets;
        grandTotalGross += totalGross;
        grandBookedGross += bookedGross;

        results.push({
          VenueName: venue.VenueName,
          ShowTime: showTime.ShowTime,
          MaxSeats: formatNumber(totalMaxSeats),
          SeatsAvailable: formatNumber(totalSeatsAvailable),
          BookedTickets: formatNumber(totalBookedTickets),
          Occupancy: `${((totalBookedTickets / totalMaxSeats) * 100).toFixed(
            2
          )}%`,
          TotalGross: formatNumber(totalGross.toFixed(2)),
          BookedGross: formatNumber(bookedGross.toFixed(2))
        });
      });
    });
  });

  return {
    totalShows,
    fastFillingShows,
    soldOutShows,
    totalBookedGross: formatNumber(grandBookedGross.toFixed(2)),
    totalOccupancy: `${(
      (grandTotalBookedTickets / grandTotalMaxSeats) *
      100
    ).toFixed(2)}%`,
    totalBookedTickets: formatNumber(grandTotalBookedTickets)
  };
}

// ✅ Fetch showtimes
async function fetchShowtimes(city, cityName) {
  const eventCode = "ET00369074";
  const date = getFixedDate();

  const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${eventCode}&regionCode=${city.region_code}&subRegion=${city.sub_region_code}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=${city.latitude}&lon=${city.longitude}&query=&date=${date}`;

  const headers = {
    "x-bms-id": "1.21345445.1703250084656",
    "x-region-code": city.region_code,
    "x-subregion-code": city.sub_region_code,
    "x-region-slug": city.region_slug,
    "x-platform": "AND",
    "x-platform-code": "ANDROID",
    "x-app-code": "MOBAND2",
    "x-device-make": "Google-Pixel XL",
    "x-screen-height": "2392",
    "x-screen-width": "1440",
    "x-screen-density": "3.5",
    "x-app-version": "14.3.4",
    "x-app-version-code": "14304",
    "x-network": "Android | WIFI",
    "x-latitude": city.latitude,
    "x-longitude": city.longitude,
    "x-ab-testing": "adtechHPSlug=default",
    "x-location-selection": "manual",
    "x-location-shared": "false",
    "lang": "en",
    "user-agent":
      "Dalvik/2.1.0 (Linux; U; Android 12; Pixel XL Build/SP2A.220505.008)"
  };

  const response = await fetch(url, { method: "GET", headers });
  const data = await response.json();
  return {
    ...processShowtimeData(data),
    cityName
  };
}

// ✅ API endpoint
app.get("/fetch-city/:city", async (req, res) => {
  const cityKey = req.params.city;
  const cityData = cities[cityKey];

  if (!cityData) return res.status(400).json({ error: "Invalid city" });

  try {
    const results = await fetchShowtimes(cityData, cityKey);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Serve frontend (optional)
const path = require("path");
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
