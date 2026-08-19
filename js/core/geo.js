// ORVYRA Geographic Normalization & Location Entities

class GeoNormalizer {
    static normalizeLocation(rawGeo) {
        if (!rawGeo) return null;
        
        const lat = (rawGeo.lat != null) ? Number(rawGeo.lat) : ((rawGeo.latitude != null) ? Number(rawGeo.latitude) : null);
        const lng = (rawGeo.lng != null) ? Number(rawGeo.lng) : ((rawGeo.longitude != null) ? Number(rawGeo.longitude) : null);
        
        const city = rawGeo.city || rawGeo.name || null;
        const country = rawGeo.country || rawGeo.country_name || null;
        const countryCode = rawGeo.countryCode || rawGeo.country_code || null;
        const source = rawGeo.source || 'ROR';

        if (lat == null || lng == null) {
            return {
                city,
                country,
                countryCode,
                coordinates: null,
                source,
                withheld: 'missing latitude/longitude in source record'
            };
        }

        return {
            city,
            country,
            countryCode,
            lat,
            lng,
            coordinates: { lat, lng },
            source
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeoNormalizer };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Geo = { GeoNormalizer };
}
