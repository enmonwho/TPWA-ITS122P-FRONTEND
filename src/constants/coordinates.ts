export interface LocationCoord {
  name: string;
  lng: number;
  lat: number;
  country?: string;
}

export const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  Afghanistan: [67.709953, 33.93911],
  Albania: [20.1683, 41.1533],
  Algeria: [1.6596, 28.0339],
  Andorra: [1.5218, 42.5063],
  Angola: [17.8739, -11.2027],
  Argentina: [-63.6167, -38.4161],
  Armenia: [45.0382, 40.0691],
  Australia: [133.7751, -25.2744],
  Austria: [14.5501, 47.5162],
  Azerbaijan: [47.5769, 40.1431],
  Bahamas: [-77.3963, 25.0343],
  Bahrain: [50.5577, 26.0667],
  Bangladesh: [90.3563, 23.685],
  Barbados: [-59.5432, 13.1939],
  Belarus: [27.9534, 53.7098],
  Belgium: [4.4699, 50.5039],
  Belize: [-88.4976, 17.1899],
  Bhutan: [90.4336, 27.5142],
  Bolivia: [-63.5887, -16.2902],
  'Bosnia and Herzegovina': [17.6791, 43.9159],
  Brazil: [-51.9253, -14.235],
  Brunei: [114.7277, 4.5353],
  Bulgaria: [25.4858, 42.7339],
  Cambodia: [104.991, 12.5657],
  Canada: [-106.3468, 56.1304],
  Chile: [-71.543, -35.6751],
  China: [104.1954, 35.8617],
  Colombia: [-74.2973, 4.5709],
  'Costa Rica': [-83.7534, 9.7489],
  Croatia: [15.2, 45.1],
  Cuba: [-77.7812, 21.5218],
  Cyprus: [33.4299, 35.1264],
  Czechia: [15.473, 49.8175],
  Denmark: [9.5018, 56.2639],
  'Dominican Republic': [-70.1627, 18.7357],
  Ecuador: [-78.1834, -1.8312],
  Egypt: [30.8025, 26.8206],
  Estonia: [25.0136, 58.5953],
  Ethiopia: [40.4897, 9.145],
  Fiji: [178.065, -17.7134],
  Finland: [25.7482, 61.9241],
  France: [2.2137, 46.2276],
  Germany: [10.4515, 51.1657],
  Greece: [21.8243, 39.0742],
  Guatemala: [-90.2308, 15.7835],
  Honduras: [-86.2419, 15.2],
  Hungary: [19.5033, 47.1625],
  Iceland: [-18.598, 64.9631],
  India: [78.9629, 20.5937],
  Indonesia: [113.9213, -0.7893],
  Ireland: [-8.2439, 53.4129],
  Israel: [34.8516, 31.0461],
  Italy: [12.5674, 41.8719],
  Jamaica: [-77.2975, 18.1096],
  Japan: [138.2529, 36.2048],
  Jordan: [36.2384, 30.5852],
  Kenya: [37.9062, -0.0236],
  'Korea, South': [127.7669, 35.9078],
  Laos: [102.4955, 19.8563],
  Latvia: [24.6032, 56.9496],
  Lebanon: [35.8623, 33.8547],
  Lithuania: [23.8813, 55.1694],
  Luxembourg: [6.1296, 49.8153],
  Malaysia: [101.9758, 4.2105],
  Maldives: [73.5361, 3.2028],
  Malta: [14.3754, 35.9375],
  Mexico: [-102.5528, 23.6345],
  Monaco: [7.4246, 43.7384],
  Mongolia: [103.8467, 46.8625],
  Morocco: [-7.0926, 31.7917],
  Nepal: [84.124, 28.3949],
  Netherlands: [5.2913, 52.1326],
  'New Zealand': [174.886, -40.9006],
  Norway: [8.4689, 60.472],
  Oman: [55.9233, 21.5126],
  Pakistan: [69.3451, 30.3753],
  Panama: [-80.7821, 8.538],
  Peru: [-75.0152, -9.19],
  Philippines: [121.774, 12.8797],
  Poland: [19.1451, 51.9194],
  Portugal: [-8.2245, 39.3999],
  Qatar: [51.1839, 25.3548],
  Romania: [24.9668, 45.9432],
  Russia: [105.3188, 61.524],
  'Saudi Arabia': [45.0792, 23.8859],
  Singapore: [103.8198, 1.3521],
  Slovakia: [19.699, 48.669],
  Slovenia: [14.9955, 46.1512],
  'South Africa': [22.9375, -30.5595],
  Spain: [-3.7492, 40.4637],
  'Sri Lanka': [80.7718, 7.8731],
  Sweden: [18.6435, 60.1282],
  Switzerland: [8.2275, 46.8182],
  Taiwan: [120.9605, 23.6978],
  Thailand: [100.9925, 15.87],
  Turkey: [35.2433, 38.9637],
  Ukraine: [31.1656, 48.3794],
  'United Arab Emirates': [53.8478, 23.4241],
  'United Kingdom': [-3.436, 55.3781],
  'United States': [-95.7129, 37.0902],
  Uruguay: [-55.7658, -32.5228],
  'Vatican City': [12.4534, 41.9029],
  Venezuela: [-66.5897, 6.4238],
  Vietnam: [108.2772, 14.0583],
};

export const POPULAR_CITIES: Record<string, [number, number]> = {
  Tokyo: [139.6917, 35.6895],
  Kyoto: [135.7681, 35.0116],
  Osaka: [135.5023, 34.6937],
  Paris: [2.3522, 48.8566],
  Nice: [7.262, 43.7102],
  Rome: [12.4964, 41.9028],
  Florence: [11.2558, 43.7696],
  Venice: [12.3155, 45.4408],
  Manila: [120.9842, 14.5995],
  Cebu: [123.8854, 10.3157],
  Boracay: [121.9248, 11.9674],
  Palawan: [118.7384, 9.8349],
  'El Nido': [119.3976, 11.1954],
  Siargao: [126.046, 9.855],
  Baguio: [120.596, 16.4023],
  London: [-0.1278, 51.5074],
  'New York': [-74.006, 40.7128],
  'Los Angeles': [-118.2437, 34.0522],
  'San Francisco': [-122.4194, 37.7749],
  Seoul: [126.978, 37.5665],
  Busan: [129.0756, 35.1796],
  Bangkok: [100.5018, 13.7563],
  Phuket: [98.3923, 7.8804],
  'Chiang Mai': [98.9853, 18.7883],
  Singapore: [103.8198, 1.3521],
  Sydney: [151.2093, -33.8688],
  Melbourne: [144.9631, -37.8136],
  Barcelona: [2.1734, 41.3851],
  Madrid: [3.7038, 40.4168],
  Amsterdam: [4.9041, 52.3676],
  Berlin: [13.405, 52.52],
  Zurich: [8.5417, 47.3769],
  Bali: [115.1889, -8.4095],
  Jakarta: [106.8456, -6.2088],
  Dubai: [55.2708, 25.2048],
  Cairo: [31.2357, 30.0444],
};

/**
 * Searches for coordinates by destination or country name.
 */
export function getCoordinatesForName(name: string): [number, number] | null {
  if (!name) return null;
  const clean = name.trim();

  // Direct check in popular cities
  for (const [cityName, coords] of Object.entries(POPULAR_CITIES)) {
    if (
      cityName.toLowerCase() === clean.toLowerCase() ||
      clean.toLowerCase().includes(cityName.toLowerCase())
    ) {
      return coords;
    }
  }

  // Direct check in country coordinates
  for (const [countryName, coords] of Object.entries(COUNTRY_COORDINATES)) {
    if (
      countryName.toLowerCase() === clean.toLowerCase() ||
      clean.toLowerCase().includes(countryName.toLowerCase())
    ) {
      return coords;
    }
  }

  return null;
}

/**
 * Generates Great Circle (geodesic arc) points between two coordinates for rendering flight lines on a 3D globe.
 */
export function generateGeodesicArc(
  start: [number, number],
  end: [number, number],
  steps = 50,
): [number, number][] {
  const [lng1, lat1] = start.map((v) => (v * Math.PI) / 180);
  const [lng2, lat2] = end.map((v) => (v * Math.PI) / 180);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2),
      ),
    );

  // If points are identical or extremely close, return start & end
  if (d < 0.0001) return [start, end];

  const arc: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);

    arc.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return arc;
}
