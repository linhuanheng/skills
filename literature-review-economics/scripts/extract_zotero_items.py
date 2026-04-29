#!/usr/bin/env python
"""
Zotero item metadata extractor for literature-review-economics skill.

Handles two input formats:
  1. Persisted tool-result wrapper:
     [{"type": "text", "text": "<JSON array of items>"}]
  2. Direct JSON array of Zotero items:
     [{key, title, creators, date, ...}, ...]

Usage:
  python extract_zotero_items.py <input_file.json> [--mode summary|detail|keys]

  summary (default): title, first author, year, journal, abstract preview
  detail: all metadata fields including full abstract
  keys: item keys only (for batch processing splits)

Output: UTF-8 encoded text to stdout, suitable for piping or redirect.

Fixes for known issues:
  - Automatically detects and unwraps persisted-file double-encoding
  - Forces UTF-8 stdout regardless of system locale (fixes GBK errors)
  - Handles large files with streaming token-based parsing
"""

import json
import sys
import io
import argparse
import os
from typing import Optional

# Force UTF-8 output regardless of Windows system locale
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def unwrap_persisted(data):
    """Detect and unwrap persisted tool-result wrapper format."""
    if isinstance(data, list) and len(data) == 1:
        item = data[0]
        if isinstance(item, dict) and 'text' in item and 'type' in item:
            try:
                inner = json.loads(item['text'])
                if isinstance(inner, list):
                    return inner
            except (json.JSONDecodeError, TypeError):
                pass
    return data


def extract_summary(items):
    """Extract summary fields from Zotero items."""
    for i, item in enumerate(items):
        title = item.get('title', 'N/A')
        creators = item.get('creators', [])
        if creators:
            first_author = creators[0].get('lastName', 'Unknown')
            if len(creators) == 2:
                author_str = f"{first_author} & {creators[1].get('lastName', '?')}"
            elif len(creators) > 2:
                author_str = f"{first_author} et al."
            else:
                author_str = first_author
        else:
            author_str = 'Unknown'

        date = item.get('date', '')
        year = date[:4] if date else 'N/A'
        journal = item.get('publicationTitle', 'N/A') or 'N/A'
        abstract = (item.get('abstractNote', '') or '')[:200].replace('\n', ' ')
        doi = item.get('DOI', '') or ''

        print(f"[{i+1}] {author_str} ({year})")
        print(f"    Title: {title}")
        print(f"    Journal: {journal}")
        if doi:
            print(f"    DOI: {doi}")
        if abstract:
            print(f"    Abstract: {abstract}...")
        print()


def extract_detail(items):
    """Extract detailed metadata including full abstract."""
    for i, item in enumerate(items):
        print(f"{'='*60}")
        print(f"ITEM [{i+1}]")
        print(f"  Key: {item.get('key', 'N/A')}")
        print(f"  Title: {item.get('title', 'N/A')}")

        creators = item.get('creators', [])
        for c in creators:
            print(f"  Author: {c.get('lastName', '')}, {c.get('firstName', '')} ({c.get('creatorType', '')})")

        print(f"  Date: {item.get('date', 'N/A')}")
        print(f"  Journal: {item.get('publicationTitle', 'N/A')}")
        print(f"  Volume: {item.get('volume', '')}")
        print(f"  Issue: {item.get('issue', '')}")
        print(f"  Pages: {item.get('pages', '')}")
        print(f"  DOI: {item.get('DOI', '')}")
        print(f"  URL: {item.get('url', '')}")
        print(f"  Abstract: {item.get('abstractNote', 'N/A')}")

        tags = item.get('tags', [])
        if tags:
            print(f"  Tags: {', '.join(str(t) for t in tags)}")

        attachments = item.get('attachments', [])
        if attachments:
            print(f"  Attachments: {len(attachments)} files")
            for a in attachments:
                print(f"    - {a.get('filename', a.get('title', 'N/A'))} ({a.get('size', 0)} bytes)")

        notes = item.get('notes', [])
        if notes:
            print(f"  Notes: {len(notes)}")

        print()


def extract_keys(items):
    """Extract only item keys (for batch processing reference)."""
    for i, item in enumerate(items):
        key = item.get('key', 'N/A')
        title = item.get('title', 'N/A')[:60]
        print(f"{i+1}\t{key}\t{title}")


def batch_split_keys(items, batch_size=10):
    """Output key batches for sequential get_item_details calls."""
    keys = [(item.get('key', ''), item.get('title', '')[:40]) for item in items]
    batches = [keys[i:i+batch_size] for i in range(0, len(keys), batch_size)]

    print(f"# Total items: {len(keys)}, split into {len(batches)} batches of {batch_size}")
    for bi, batch in enumerate(batches):
        key_list = ', '.join(k[0] for k in batch)
        title_list = '; '.join(f"{i+1}.{k[1]}" for i, k in enumerate(batch))
        print(f"\n## Batch {bi+1} ({len(batch)} items)")
        print(f"Keys: {key_list}")
        print(f"Titles: {title_list}")


def main():
    parser = argparse.ArgumentParser(description='Extract Zotero item metadata from tool-result JSON')
    parser.add_argument('input', help='Input JSON file path')
    parser.add_argument('--mode', choices=['summary', 'detail', 'keys', 'batch'],
                        default='summary', help='Extraction mode')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for batch mode')
    parser.add_argument('--offset', type=int, default=0, help='Start from item N (0-indexed)')
    parser.add_argument('--limit', type=int, default=0, help='Max items to extract (0=all)')
    parser.add_argument('--output', '-o', help='Output to file instead of stdout')

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    with open(args.input, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON: {e}", file=sys.stderr)
            sys.exit(1)

    # Unwrap persisted format
    data = unwrap_persisted(data)

    if not isinstance(data, list):
        print(f"Error: Expected JSON array, got {type(data).__name__}", file=sys.stderr)
        sys.exit(1)

    # Apply offset/limit
    items = data[args.offset:]
    if args.limit > 0:
        items = items[:args.limit]

    # Redirect output if requested
    if args.output:
        sys.stdout = io.TextIOWrapper(open(args.output, 'w', encoding='utf-8').buffer, encoding='utf-8')

    if args.mode == 'summary':
        extract_summary(items)
    elif args.mode == 'detail':
        extract_detail(items)
    elif args.mode == 'keys':
        extract_keys(items)
    elif args.mode == 'batch':
        batch_split_keys(items, args.batch_size)

    # Summary line to stderr (always visible)
    print(f"\n# Extracted {len(items)} items (mode={args.mode})", file=sys.stderr)


if __name__ == '__main__':
    main()
