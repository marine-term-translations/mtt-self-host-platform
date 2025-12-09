#!/usr/bin/env python3
"""
Harvest NERC vocabulary collection from SPARQL endpoint to SQLite database.
Adapted from https://github.com/marine-term-translations/setup-harvest-action
"""

import sys
import sqlite3
import os
import re
import time
from urllib.error import HTTPError
from SPARQLWrapper import SPARQLWrapper, JSON

SPARQL_ENDPOINT = "http://vocab.nerc.ac.uk/sparql/"

# Field mappings: SPARQL variable name -> (field_uri, field_term)
FIELD_MAPPINGS = {
    "prefLabel": ("http://www.w3.org/2004/02/skos/core#prefLabel", "skos:prefLabel"),
    "altLabel": ("http://www.w3.org/2004/02/skos/core#altLabel", "skos:altLabel"),
    "definition": ("http://www.w3.org/2004/02/skos/core#definition", "skos:definition"),
    "notation": ("http://www.w3.org/2004/02/skos/core#notation", "skos:notation"),
    "broader": ("http://www.w3.org/2004/02/skos/core#broader", "skos:broader"),
    "narrower": ("http://www.w3.org/2004/02/skos/core#narrower", "skos:narrower"),
    "related": ("http://www.w3.org/2004/02/skos/core#related", "skos:related"),
}


def validate_collection_uri(uri):
    """
    Validate that the collection URI is properly formatted.

    Args:
        uri: Collection URI to validate

    Returns:
        bool: True if valid

    Raises:
        ValueError: If URI is invalid
    """
    # Basic URI validation - must start with http:// or https://
    if not re.match(r"^https?://", uri):
        raise ValueError(
            f"Invalid collection URI: {uri}. Must start with http:// or https://"
        )

    # Additional validation: should contain vocab.nerc.ac.uk for this specific endpoint
    if "vocab.nerc.ac.uk" not in uri:
        print(f"Warning: Collection URI does not contain 'vocab.nerc.ac.uk': {uri}")

    return True


def create_sparql_query(collection_uri, limit=None, offset=None):
    """
    Create SPARQL query to fetch all concepts from a collection.

    Args:
        collection_uri: URI of the collection to query (will be validated)
        limit: Optional LIMIT for batching
        offset: Optional OFFSET for batching

    Returns:
        SPARQL query string
    """
    # Validate URI before using in query
    validate_collection_uri(collection_uri)

    query = f"""
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX dc: <http://purl.org/dc/terms/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    
    SELECT DISTINCT ?concept ?prefLabel ?altLabel ?definition 
    WHERE {{
        <{collection_uri}> skos:member ?concept .
        OPTIONAL {{ ?concept skos:prefLabel ?prefLabel }}
        OPTIONAL {{ ?concept skos:altLabel ?altLabel }}
        OPTIONAL {{ ?concept skos:definition ?definition }}
    }}
    ORDER BY ?concept
    """
    if limit is not None:
        query += f"\nLIMIT {limit}"
    if offset is not None:
        query += f"\nOFFSET {offset}"
    return query


def get_member_count(collection_uri):
    """
    Query SPARQL endpoint to get the count of members in the collection.
    """
    validate_collection_uri(collection_uri)
    query = f"""
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT (COUNT(DISTINCT ?concept) AS ?count)
    WHERE {{
        <{collection_uri}> skos:member ?concept .
    }}
    """
    sparql = SPARQLWrapper(SPARQL_ENDPOINT)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
        bindings = results.get("results", {}).get("bindings", [])
        if bindings and "count" in bindings[0]:
            return int(bindings[0]["count"]["value"])
        else:
            raise Exception("Could not retrieve member count from SPARQL endpoint.")
    except Exception as e:
        raise Exception(f"SPARQL count query failed: {str(e)}")


def query_sparql_endpoint(
    collection_uri, limit=None, offset=None, max_retries=3, base_delay=1
):
    """
    Query the SPARQL endpoint for collection data.

    Includes retry logic with exponential backoff for transient errors
    such as HTTP 502 Proxy Errors.

    Args:
        collection_uri: URI of the collection to query
        limit: Optional LIMIT for batching
        offset: Optional OFFSET for batching
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Base delay in seconds for exponential backoff (default: 1)

    Returns:
        Query results as JSON

    Raises:
        Exception: If SPARQL query fails after all retries
    """
    sparql = SPARQLWrapper(SPARQL_ENDPOINT)
    sparql.setQuery(create_sparql_query(collection_uri, limit=limit, offset=offset))
    sparql.setReturnFormat(JSON)
    print(
        f"Querying SPARQL endpoint for collection: {collection_uri} LIMIT={limit} OFFSET={offset}"
    )
    for attempt in range(max_retries):
        try:
            results = sparql.query().convert()
            return results
        except HTTPError as e:
            if e.code == 502 and attempt < max_retries - 1:
                delay = base_delay * (2**attempt)  # Exponential backoff
                print(
                    f"502 Proxy Error on attempt {attempt + 1}. Retrying in {delay}s..."
                )
                time.sleep(delay)
                continue
            raise Exception(f"SPARQL query failed: {str(e)}") from e
        except Exception as e:
            raise Exception(f"SPARQL query failed: {str(e)}") from e


def insert_results(conn, collection_uri, results):
    """
    Insert or update query results into the SQLite database.

    For existing databases:
    - Existing terms are updated with new `updated_at` timestamp
    - New term fields are added, duplicates are ignored
    - Existing translations, appeals, etc. are preserved

    Args:
        conn: Database connection
        collection_uri: URI of the collection
        results: SPARQL query results
    """
    cursor = conn.cursor()

    bindings = results.get("results", {}).get("bindings", [])

    print(f"Processing {len(bindings)} results...")

    # Track statistics
    terms_inserted = 0
    terms_updated = 0
    term_fields_inserted = 0

    # Track processed terms to avoid redundant updates
    terms_processed = set()

    for binding in bindings:
        concept_uri = binding.get("concept", {}).get("value", "")
        if not concept_uri:
            continue

        # Check if term already exists
        if concept_uri not in terms_processed:
            cursor.execute("SELECT id FROM terms WHERE uri = ?", (concept_uri,))
            existing_term = cursor.fetchone()

            if existing_term:
                # Update existing term's updated_at timestamp
                cursor.execute(
                    """
                    UPDATE terms SET updated_at = CURRENT_TIMESTAMP WHERE uri = ?
                """,
                    (concept_uri,),
                )
                terms_updated += 1
            else:
                # Insert new term
                cursor.execute(
                    """
                    INSERT INTO terms (uri) VALUES (?)
                """,
                    (concept_uri,),
                )
                terms_inserted += 1

            terms_processed.add(concept_uri)

        # Get term_id
        cursor.execute("SELECT id FROM terms WHERE uri = ?", (concept_uri,))
        term_row = cursor.fetchone()
        if not term_row:
            continue
        term_id = term_row[0]

        # Insert term fields for each SKOS property
        for field_name, (field_uri, field_term) in FIELD_MAPPINGS.items():
            field_value = binding.get(field_name, {}).get("value")
            if field_value:
                # Try to insert, ignore if duplicate (preserves existing translations)
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO term_fields 
                    (term_id, field_uri, field_term, original_value)
                    VALUES (?, ?, ?, ?)
                """,
                    (term_id, field_uri, field_term, field_value),
                )
                if cursor.rowcount > 0:
                    term_fields_inserted += 1

    conn.commit()

    # Print summary
    print(f"Harvest summary:")
    print(f"  - New terms inserted: {terms_inserted}")
    print(f"  - Existing terms updated: {terms_updated}")
    print(f"  - New term fields inserted: {term_fields_inserted}")


def main():
    """Main execution function."""
    if len(sys.argv) < 3:
        print("Error: Collection URI and database path are required")
        print("Usage: python harvest.py <collection-uri> <database-path>")
        sys.exit(1)

    collection_uri = sys.argv[1]
    output_path = sys.argv[2]

    print(f"Starting harvest for collection: {collection_uri}")
    print(f"Output database: {output_path}")

    try:
        # Validate collection URI
        validate_collection_uri(collection_uri)
        
        # Validate database exists and has required schema
        if not os.path.exists(output_path):
            raise Exception(f"Database file does not exist: {output_path}")
        
        # Connect to database (must already exist and have schema)
        conn = sqlite3.connect(output_path)
        
        # Enable foreign keys
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Verify required tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='terms'")
        if not cursor.fetchone():
            raise Exception(f"Database schema not initialized. Missing 'terms' table in {output_path}")

        # Get member count
        print("Querying for member count...")
        member_count = get_member_count(collection_uri)
        print(f"Total members in collection: {member_count}")
        batch_size = 1000

        # Loop to fetch and insert results in batches
        for offset in range(0, member_count, batch_size):
            print(f"Fetching batch: OFFSET={offset} LIMIT={batch_size}")
            results = query_sparql_endpoint(
                collection_uri, limit=batch_size, offset=offset
            )
            insert_results(conn, collection_uri, results)

        # Close connection
        conn.close()

        print(f"Harvest completed successfully!")
        print(f"Database updated: {output_path}")

    except ValueError as e:
        print(f"Invalid input: {e}")
        sys.exit(1)
    except sqlite3.Error as e:
        print(f"Database error during harvest: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error during harvest: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
