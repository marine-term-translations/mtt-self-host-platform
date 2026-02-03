const { getDatabase } = require('./src/db/database');

const db = getDatabase();

// Sample terms
const terms = [
  { uri: 'http://vocab.nerc.ac.uk/collection/P01/current/AAMN', label: 'Concentration of nitrogen', definition: 'Atmospheric nitrogen concentration' },
  { uri: 'http://vocab.nerc.ac.uk/collection/P01/current/SALT', label: 'Salinity', definition: 'Salt concentration in water' },
  { uri: 'http://vocab.nerc.ac.uk/collection/P01/current/TEMP', label: 'Temperature', definition: 'Water temperature measurement' },
  { uri: 'http://vocab.nerc.ac.uk/collection/P01/current/PRES', label: 'Pressure', definition: 'Atmospheric or water pressure' },
  { uri: 'http://vocab.nerc.ac.uk/collection/P01/current/OXYG', label: 'Oxygen concentration', definition: 'Dissolved oxygen in water' },
];

// Insert terms and fields
for (const term of terms) {
  // Insert term
  const termResult = db.prepare('INSERT OR IGNORE INTO terms (uri) VALUES (?)').run(term.uri);
  const termId = termResult.lastInsertRowid || db.prepare('SELECT id FROM terms WHERE uri = ?').get(term.uri).id;
  
  // Insert prefLabel field
  const labelResult = db.prepare(`
    INSERT OR IGNORE INTO term_fields (term_id, field_uri, field_roles, original_value)
    VALUES (?, ?, ?, ?)
  `).run(termId, 'http://www.w3.org/2004/02/skos/core#prefLabel', '["label"]', term.label);
  const labelFieldId = labelResult.lastInsertRowid || db.prepare('SELECT id FROM term_fields WHERE term_id = ? AND field_uri = ?').get(termId, 'http://www.w3.org/2004/02/skos/core#prefLabel').id;
  
  // Insert definition field
  const defResult = db.prepare(`
    INSERT OR IGNORE INTO term_fields (term_id, field_uri, field_roles, original_value)
    VALUES (?, ?, ?, ?)
  `).run(termId, 'http://www.w3.org/2004/02/skos/core#definition', '["reference"]', term.definition);
  const defFieldId = defResult.lastInsertRowid || db.prepare('SELECT id FROM term_fields WHERE term_id = ? AND field_uri = ?').get(termId, 'http://www.w3.org/2004/02/skos/core#definition').id;
  
  // Add translations for prefLabel (vary which languages are available)
  const allTranslations = [
    { lang: 'nl', status: 'approved' },
    { lang: 'fr', status: 'review' },
    { lang: 'de', status: 'draft' },
    { lang: 'es', status: 'approved' },
    { lang: 'it', status: 'review' },
  ];
  
  // Not all terms have all translations (to test missing filter)
  const numTranslations = Math.min(3, allTranslations.length);
  const translations = allTranslations.slice(0, numTranslations);
  
  for (const trans of translations) {
    db.prepare(`
      INSERT OR IGNORE INTO translations (term_field_id, language, value, status)
      VALUES (?, ?, ?, ?)
    `).run(labelFieldId, trans.lang, `${term.label} (${trans.lang})`, trans.status);
    
    // Add some for definition too
    db.prepare(`
      INSERT OR IGNORE INTO translations (term_field_id, language, value, status)
      VALUES (?, ?, ?, ?)
    `).run(defFieldId, trans.lang, `${term.definition} (${trans.lang})`, trans.status);
  }
}

console.log('Test data inserted successfully!');
console.log('Total terms:', db.prepare('SELECT COUNT(*) as count FROM terms').get().count);
console.log('Total fields:', db.prepare('SELECT COUNT(*) as count FROM term_fields').get().count);
console.log('Total translations:', db.prepare('SELECT COUNT(*) as count FROM translations').get().count);

