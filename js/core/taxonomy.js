// ORVYRA Space Economy Domain Taxonomy & Evidence Classification

const SpaceTaxonomy = {
    LAUNCH: { id: "launch", label: "Launch & Space Transportation", keywords: ["launch", "launcher", "rocket", "propulsion", "first stage", "methalox"] },
    SATCOM: { id: "satcom", label: "Satellite Communications", keywords: ["satellite communications", "satcom", "broadband", "connectivity", "telecommunication"] },
    EO: { id: "eo", label: "Earth Observation & Remote Sensing", keywords: ["earth observation", "remote sensing", "sar", "synthetic aperture radar", "thermal imaging", "satellite imagery"] },
    NAVIGATION: { id: "navigation", label: "Satellite Navigation & PNT", keywords: ["gnss", "gps", "galileo", "positioning", "navigation", "timing"] },
    SPACE_SCIENCE: { id: "space_science", label: "Space Science & Astronomy", keywords: ["astronomy", "astrophysics", "space science", "solar physics", "cosmology"] },
    PLANETARY: { id: "planetary", label: "Planetary Science & Exploration", keywords: ["planetary science", "lunar", "mars", "deep space", "interplanetary"] },
    SPACE_WEATHER: { id: "space_weather", label: "Space Weather & Heliophysics", keywords: ["space weather", "heliophysics", "solar flare", "magnetosphere"] },
    ROBOTICS: { id: "robotics", label: "Space Robotics & Autonomous Systems", keywords: ["robotics", "robotic arm", "autonomous rendezvous", "space manipulation"] },
    ISM: { id: "ism", label: "In-Space Manufacturing & Materials", keywords: ["in-space manufacturing", "microgravity", "crystal growth", "orbital production", "semiconductor materials"] },
    PROPULSION: { id: "propulsion", label: "Spacecraft Propulsion Systems", keywords: ["electric propulsion", "chemical propulsion", "thruster", "hall thruster", "ion engine"] },
    AVIONICS: { id: "avionics", label: "Avionics & Flight Software", keywords: ["avionics", "gnc", "guidance navigation control", "flight computer", "onboard processing"] },
    SSA: { id: "ssa", label: "Space Situational Awareness & Debris", keywords: ["space debris", "space situational awareness", "ssa", "conjunction assessment", "orbital tracking"] },
    HUMAN_SPACEFLIGHT: { id: "human_spaceflight", label: "Human Spaceflight & Space Medicine", keywords: ["human spaceflight", "astronaut", "space station", "life support", "space medicine"] },
    SPACE_RESOURCES: { id: "space_resources", label: "Space Resources & Lunar Operations", keywords: ["isru", "space resources", "lunar regolith", "asteroid mining"] }
};

class TaxonomyClassifier {
    static classifyFromEvidence(evidenceText) {
        if (!evidenceText) return [];
        const text = String(evidenceText).toLowerCase();
        const matches = [];
        for (const [key, category] of Object.entries(SpaceTaxonomy)) {
            if (category.keywords.some(kw => text.includes(kw))) {
                matches.push(category);
            }
        }
        return matches;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpaceTaxonomy, TaxonomyClassifier };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Taxonomy = { SpaceTaxonomy, TaxonomyClassifier };
}
