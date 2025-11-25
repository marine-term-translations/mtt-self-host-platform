import { Term } from '../types';

export const MOCK_TERMS: Term[] = [
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/AHDFXX01/",
    prefLabel: "Wave height maximum",
    definition: "The greatest vertical distance between a wave crest and the adjacent wave trough.",
    category: "Physical Oceanography",
    translations: {
      en_plain: "Highest point a wave reaches above the lowest point",
      es: null,
      fr: "Hauteur maximale de la vague",
      nl: null
    },
    contributors: ["alice", "bob"]
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/PSALST01/",
    prefLabel: "Practical Salinity",
    definition: "Salinity derived from conductivity ratio measurements according to the Practical Salinity Scale of 1978.",
    category: "Chemical Oceanography",
    translations: {
      en_plain: "A measure of the saltiness of seawater based on how well it conducts electricity.",
      es: "Salinidad práctica",
      fr: null,
      nl: null
    },
    contributors: ["charlie"]
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/TEMPPR01/",
    prefLabel: "Temperature of the water body",
    definition: "The degree of hotness or coldness of a body of water as measured by a thermometer.",
    category: "Physical Oceanography",
    translations: {
      en_plain: "How hot or cold the water is.",
      es: null,
      fr: null,
      nl: null
    },
    contributors: []
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/DOXYAA01/",
    prefLabel: "Dissolved oxygen concentration",
    definition: "The amount of gaseous oxygen dissolved in the water.",
    category: "Chemical Oceanography",
    translations: {
      en_plain: null,
      es: null,
      fr: null,
      nl: null
    },
    contributors: []
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P06/current/UVAA/",
    prefLabel: "Bathyal zone",
    definition: "The biogeographic region of the ocean bottom between the sublittoral and abyssal zones, from depths of approximately 200 to 4,000 meters.",
    category: "Marine Ecology",
    translations: {
      en_plain: "The deep part of the ocean where no sunlight reaches, between 200m and 4000m deep.",
      es: null,
      fr: null,
      nl: null
    },
    contributors: ["alice"]
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/CPHLPR01/",
    prefLabel: "Chlorophyll-a concentration",
    definition: "The concentration of the photosynthetic pigment chlorophyll-a per unit volume of the water body.",
    category: "Biological Oceanography",
    translations: {
      en_plain: null,
      es: null,
      fr: null,
      nl: null
    },
    contributors: []
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P02/current/GP050/",
    prefLabel: "Anthropogenic debris",
    definition: "Man-made solid waste materials found in the marine environment.",
    category: "Pollution",
    translations: {
      en_plain: "Human-made trash found in the ocean.",
      es: "Basura marina",
      fr: null,
      nl: null
    },
    contributors: ["bob", "dave"]
  },
  {
    id: "http://vocab.nerc.ac.uk/collection/P01/current/TURBXXXX/",
    prefLabel: "Water Turbidity",
    definition: "A measure of the degree to which the water loses its transparency due to the presence of suspended particulates.",
    category: "Physical Oceanography",
    translations: {
      en_plain: "Cloudiness of the water.",
      es: null,
      fr: null,
      nl: null
    },
    contributors: ["alice"]
  }
];

export const getTermById = (id: string): Term | undefined => {
  // Simple encoded ID matching since URLs contain slashes
  return MOCK_TERMS.find(t => encodeURIComponent(t.id) === id || t.id === id);
};

export const mockApiDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
