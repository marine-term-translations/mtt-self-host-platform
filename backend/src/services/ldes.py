#!/usr/bin/env python3
"""
LDES (Linked Data Event Stream) service for generating and updating LDES feeds.
This service implements LDES creation and updating for all sources using py-sema.
"""

import sys
import sqlite3
import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from sema.subyt import (
    JinjaBasedGenerator,
    SinkFactory,
    SourceFactory,
    GeneratorSettings,
)
from rdflib import Graph, Namespace, URIRef, Literal
from rdflib.namespace import RDF, DCTERMS, XSD

# LDES and TREE namespaces
LDES = Namespace("https://w3id.org/ldes#")
TREE = Namespace("https://w3id.org/tree#")
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")


def get_ldes_directory(source_id):
    """
    Get the LDES directory path for a given source.
    
    Args:
        source_id: Source identifier
        
    Returns:
        Path object for the LDES directory
    """
    # Use environment variable or default to /data/LDES relative to project root
    ldes_base = os.environ.get('LDES_BASE_DIR')
    if ldes_base:
        base_dir = Path(ldes_base)
    else:
        # Default: find data/LDES relative to this script's location
        # This script is in backend/src/services, so go up 3 levels to project root
        project_root = Path(__file__).parent.parent.parent.parent
        base_dir = project_root / "data" / "LDES"
    
    ldes_dir = base_dir / str(source_id)
    return ldes_dir


def detect_existing_ldes(source_id):
    """
    Check if an LDES feed already exists for the source.
    
    Args:
        source_id: Source identifier
        
    Returns:
        tuple: (exists: bool, latest_file: Path or None)
    """
    ldes_dir = get_ldes_directory(source_id)
    
    if not ldes_dir.exists():
        return False, None
    
    latest_file = ldes_dir / "latest.ttl"
    
    if latest_file.exists():
        return True, latest_file
    
    # Check for any .ttl files (fragments)
    ttl_files = list(ldes_dir.glob("*.ttl"))
    if ttl_files:
        return True, None
    
    return False, None


def get_latest_modified_from_fragment(fragment_path):
    """
    Parse an LDES fragment and find the latest dcterms:modified date.
    
    Args:
        fragment_path: Path to the fragment file
        
    Returns:
        datetime object of the latest modified date, or None
    """
    try:
        g = Graph()
        g.parse(fragment_path, format="turtle")
        
        # Query for all dcterms:modified values
        modified_dates = []
        for s, p, o in g.triples((None, DCTERMS.modified, None)):
            if isinstance(o, Literal):
                try:
                    # Parse the datetime
                    dt = o.toPython()
                    if isinstance(dt, datetime):
                        modified_dates.append(dt)
                except Exception:
                    # Skip invalid datetime literals
                    pass
        
        if modified_dates:
            return max(modified_dates)
        
        return None
    except Exception as e:
        print(f"Error parsing fragment {fragment_path}: {e}")
        return None


def query_translations_for_ldes(db_path, source_id, start_date=None, end_date=None):
    """
    Query the database for translations with status='review' for LDES generation.
    
    Args:
        db_path: Path to the SQLite database
        source_id: Source identifier
        start_date: Optional start date (datetime)
        end_date: Optional end date (datetime)
        
    Returns:
        List of translation records as dictionaries
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Build the query
    query = """
        SELECT 
            t.id as translation_id,
            t.value as translation_value,
            t.language,
            t.status,
            t.modified_at,
            t.created_at,
            tf.id as term_field_id,
            tf.field_uri,
            tf.field_term,
            tf.original_value,
            tm.id as term_id,
            tm.uri as term_uri
        FROM translations t
        JOIN term_fields tf ON t.term_field_id = tf.id
        JOIN terms tm ON tf.term_id = tm.id
        WHERE tm.source_id = ?
        AND t.status = 'review'
    """
    
    params = [source_id]
    
    # Add date filters if provided
    if start_date:
        query += " AND (t.modified_at >= ? OR (t.modified_at IS NULL AND t.created_at >= ?))"
        params.extend([start_date.isoformat(), start_date.isoformat()])
    
    if end_date:
        query += " AND (t.modified_at <= ? OR (t.modified_at IS NULL AND t.created_at <= ?))"
        params.extend([end_date.isoformat(), end_date.isoformat()])
    
    query += " ORDER BY COALESCE(t.modified_at, t.created_at) ASC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    # Convert rows to dictionaries
    results = []
    for row in rows:
        results.append({
            'translation_id': row['translation_id'],
            'translation_value': row['translation_value'],
            'language': row['language'],
            'status': row['status'],
            'modified_at': row['modified_at'] or row['created_at'],
            'term_field_id': row['term_field_id'],
            'field_uri': row['field_uri'],
            'field_term': row['field_term'],
            'original_value': row['original_value'],
            'term_id': row['term_id'],
            'term_uri': row['term_uri'],
        })
    
    conn.close()
    return results


def prepare_ldes_data(translations):
    """
    Transform translation records into LDES-compatible format.
    Groups translations by term URI and preserves all field URIs dynamically.
    
    Args:
        translations: List of translation records
        
    Returns:
        List of dictionaries suitable for LDES fragment generation
    """
    # Group translations by term URI
    terms_data = {}
    
    for trans in translations:
        term_uri = trans['term_uri']
        field_uri = trans['field_uri']
        
        if term_uri not in terms_data:
            terms_data[term_uri] = {
                'concept': term_uri,
                'modified': trans['modified_at'],
                'fields': {}  # Store all fields dynamically
            }
        
        # Update the latest modified date
        if trans['modified_at'] > terms_data[term_uri]['modified']:
            terms_data[term_uri]['modified'] = trans['modified_at']
        
        # Store field value by field_uri (dynamically)
        # Multiple values for the same field_uri are stored as a list
        if field_uri not in terms_data[term_uri]['fields']:
            terms_data[term_uri]['fields'][field_uri] = []
        
        terms_data[term_uri]['fields'][field_uri].append({
            'value': trans['translation_value'],
            'language': trans['language']
        })
    
    return list(terms_data.values())


def generate_ldes_fragment(source_id, ldes_data, fragment_timestamp, next_fragment_timestamp, prefix_uri, next_fragment_time):
    """
    Generate an LDES fragment using py-sema (Subyt).
    
    Args:
        source_id: Source identifier
        ldes_data: List of dictionaries with term data
        fragment_timestamp: Epoch timestamp for this fragment (string)
        next_fragment_timestamp: Epoch timestamp for next fragment (string)
        prefix_uri: Base URI prefix for the LDES
        next_fragment_time: ISO datetime string for tree:value
        
    Returns:
        Path to the generated fragment file
    """
    # Ensure LDES directory exists
    ldes_dir = get_ldes_directory(source_id)
    ldes_dir.mkdir(parents=True, exist_ok=True)
    
    # Prepare output file path
    fragment_filename = f"{fragment_timestamp}.ttl"
    output_file = ldes_dir / fragment_filename
    
    # Create a temporary JSON file with the data
    temp_json = ldes_dir / f"temp_{fragment_timestamp}.json"
    with open(temp_json, 'w') as f:
        json.dump(ldes_data, f)
    
    try:
        # Prepare variables for template
        vars_dict = {
            'source_id': source_id,
            'fragment_timestamp': fragment_timestamp,
            'next_fragment_timestamp': next_fragment_timestamp,
            'next_fragment_time': next_fragment_time,
            'prefix_uri': prefix_uri,
        }
        
        # Get templates folder
        templates_folder = Path(__file__).parent / "ldes_templates"
        
        # Create generator and sink
        service = JinjaBasedGenerator(str(templates_folder))
        sink = SinkFactory.make_sink(str(output_file), False)
        inputs = {'qres': SourceFactory.make_source(str(temp_json))}
        settings = GeneratorSettings()
        settings.iteration = False  # Use collection mode for full fragment generation
        
        # Generate the fragment
        service.process("ldes_fragment.ttl", inputs, settings, sink, vars_dict)
        
        print(f"Generated LDES fragment: {output_file}")
        
        return output_file
        
    finally:
        # Clean up temp file
        if temp_json.exists():
            temp_json.unlink()


def update_latest_symlink(source_id, fragment_file):
    """
    Copy the newest fragment to latest.ttl.
    
    Args:
        source_id: Source identifier
        fragment_file: Path to the fragment file
    """
    ldes_dir = get_ldes_directory(source_id)
    latest_file = ldes_dir / "latest.ttl"
    
    # Copy the content
    shutil.copy2(fragment_file, latest_file)
    
    print(f"Updated latest.ttl -> {fragment_file.name}")


def create_or_update_ldes(source_id, db_path, prefix_uri="https://marine-term-translations.github.io"):
    """
    Main function to create or update LDES feed for a source.
    
    Args:
        source_id: Source identifier
        db_path: Path to SQLite database
        prefix_uri: Base URI prefix for LDES (default: marine-term-translations)
        
    Returns:
        dict: Result with status and message
    """
    print(f"Processing LDES for source {source_id}")
    print(f"Database: {db_path}")
    print(f"Prefix URI: {prefix_uri}")
    
    # Step 1: Detect existing LDES feed
    exists, latest_file = detect_existing_ldes(source_id)
    
    latest_modified_in_ldes = None
    
    if exists and latest_file:
        print(f"Existing LDES feed found at {latest_file}")
        
        # Step 2: Get latest modified date from existing fragment
        latest_modified_in_ldes = get_latest_modified_from_fragment(latest_file)
        
        if latest_modified_in_ldes:
            print(f"Latest modified date in LDES: {latest_modified_in_ldes}")
            
            # Step 3: Query for new translations
            # From latest_modified to now
            start_date = latest_modified_in_ldes
            end_date = datetime.now()
            
            print(f"Querying for translations from {start_date} to {end_date}")
            translations = query_translations_for_ldes(db_path, source_id, start_date, end_date)
            
            # Filter out translations that are not strictly newer than latest_modified_in_ldes
            new_translations = [
                t for t in translations 
                if datetime.fromisoformat(t['modified_at']) > latest_modified_in_ldes
            ]
            
            if not new_translations:
                print("No new translations found. Skipping fragment creation.")
                return {
                    'status': 'skipped',
                    'message': 'No new translations to publish',
                    'fragment': None
                }
            
            translations = new_translations
        else:
            print("Could not determine latest modified date. Querying all translations.")
            translations = query_translations_for_ldes(db_path, source_id)
    else:
        print("No existing LDES feed found. Creating first fragment.")
        
        # Step 4: Query all translations for first-time creation
        translations = query_translations_for_ldes(db_path, source_id)
    
    if not translations:
        print("No translations with status='review' found.")
        return {
            'status': 'skipped',
            'message': 'No translations with status=review found',
            'fragment': None
        }
    
    print(f"Found {len(translations)} translation(s) for LDES")
    
    # Step 5: Prepare LDES data
    ldes_data = prepare_ldes_data(translations)
    
    # Determine fragment timestamp based on latest modified date in translations
    # Use epoch timestamp for fragment naming
    if translations:
        latest_trans_date = max(
            datetime.fromisoformat(t['modified_at']) for t in translations
        )
        # Convert to epoch timestamp (seconds since 1970-01-01)
        epoch_timestamp = int(latest_trans_date.timestamp())
        fragment_timestamp = str(epoch_timestamp)
        # Next fragment timestamp is epoch + 1 second
        next_fragment_timestamp = str(epoch_timestamp + 1)
        # For the tree:value, use the actual datetime
        next_fragment_time = (latest_trans_date + timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        now = datetime.now()
        epoch_timestamp = int(now.timestamp())
        fragment_timestamp = str(epoch_timestamp)
        next_fragment_timestamp = str(epoch_timestamp + 1)
        next_fragment_time = (now + timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Step 6: Generate LDES fragment
    fragment_file = generate_ldes_fragment(
        source_id,
        ldes_data,
        fragment_timestamp,
        next_fragment_timestamp,
        prefix_uri,
        next_fragment_time
    )
    
    # Step 7: Update latest.ttl
    update_latest_symlink(source_id, fragment_file)
    
    return {
        'status': 'success',
        'message': f'LDES fragment created successfully',
        'fragment': str(fragment_file),
        'translations_count': len(translations)
    }


def main():
    """Main execution function."""
    if len(sys.argv) < 3:
        print("Error: Source ID and database path are required")
        print("Usage: python ldes.py <source-id> <database-path> [prefix-uri]")
        sys.exit(1)
    
    source_id = sys.argv[1]
    db_path = sys.argv[2]
    prefix_uri = sys.argv[3] if len(sys.argv) > 3 else "https://marine-term-translations.github.io"
    
    # Validate inputs
    if not os.path.exists(db_path):
        print(f"Error: Database file not found: {db_path}")
        sys.exit(1)
    
    try:
        result = create_or_update_ldes(source_id, db_path, prefix_uri)
        print(f"\nResult: {result['status']}")
        print(f"Message: {result['message']}")
        
        if result.get('fragment'):
            print(f"Fragment: {result['fragment']}")
        if result.get('translations_count'):
            print(f"Translations processed: {result['translations_count']}")
        
        # Return appropriate exit code
        sys.exit(0 if result['status'] in ['success', 'skipped'] else 1)
        
    except Exception as e:
        print(f"Error during LDES generation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
