import csv
import io
import re
from typing import Dict, List, Tuple, Any, Optional

NON_HTML_TAG_REGEX = re.compile(r'<(?!/?(?:ul|li|b|i|p|br|code|a|span|div|strong|em)\b)([^>]+)>', re.IGNORECASE)
BULLET_REGEX = re.compile(r'^\s*([-*•])\s*(.*)$')

def escape_non_html_tags(text: str) -> str:
    r"""
    Converts custom placeholder tags like <roomName>, <model>, <portableName> to Unicode angle brackets ＜roomName＞
    so TestRail renders them as clean literal text without HTML entity encoding (&lt;) or backslash escaping (\).
    Preserves valid HTML formatting tags like <ul>, <li>, <br>, <b>, <i>, <p>.
    """
    if not text:
        return ""
    return NON_HTML_TAG_REGEX.sub(r'＜\1＞', text)

def clean_test_case_text(
    text: str,
    decode_html_entities: bool = True,
    bullet_format: str = "markdown",
    normalize_smart_quotes: bool = True,
    escape_pipes: bool = True,
    strip_invisible_chars: bool = True,
    custom_find: Optional[str] = None,
    custom_replace: Optional[str] = None,
    is_regex: bool = False,
    match_case: bool = False,
    find_replace_rules: Optional[List[Dict[str, Any]]] = None
) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    
    rules: List[Dict[str, Any]] = []
    if find_replace_rules:
        for r in find_replace_rules:
            if isinstance(r, dict) and r.get('find'):
                rules.append(r)
    if custom_find:
        rules.append({
            'find': custom_find,
            'replace': custom_replace if custom_replace is not None else '',
            'is_regex': is_regex,
            'match_case': match_case
        })

    if not text.strip() and not rules:
        return ""

    # Normalize line breaks to standard LF (\n)
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    if strip_invisible_chars:
        # Strip zero-width space \u200b, zero-width no-break space \ufeff, soft hyphen \u00ad
        text = re.sub(r'[\u200b\ufeff\u00ad]', '', text)
        # Convert non-breaking space \u00a0 to standard space
        text = text.replace('\u00a0', ' ')

    if normalize_smart_quotes:
        text = text.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")

    if decode_html_entities:
        # Fully decode single/double-encoded HTML entities like &amp;lt; or &lt; to raw < > " &
        import html
        for _ in range(3):
            unescaped = html.unescape(text)
            if unescaped == text:
                break
            text = unescaped

    # Step 0: Custom Find & Replace (supports chained sequential rules)
    for rule in rules:
        c_find = str(rule.get('find', '')).replace('\r\n', '\n').replace('\r', '\n')
        if not c_find:
            continue
        rep_val = str(rule.get('replace')) if rule.get('replace') is not None else ""
        rep_val = rep_val.replace('\r\n', '\n').replace('\r', '\n')
        
        m_case = bool(rule.get('match_case', False))
        i_regex = bool(rule.get('is_regex', False))

        if normalize_smart_quotes:
            c_find = c_find.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
            rep_val = rep_val.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")

        if i_regex:
            try:
                flags = 0 if m_case else re.IGNORECASE
                pattern = re.compile(c_find, flags=flags)
                text = pattern.sub(rep_val, text)
            except Exception:
                pass  # Ignore invalid regex patterns gracefully
        else:
            if m_case:
                text = text.replace(c_find, rep_val)
            else:
                try:
                    pattern = re.compile(re.escape(c_find), flags=re.IGNORECASE)
                    text = pattern.sub(lambda m: rep_val, text)
                except Exception:
                    pass

    # Step 1: Strip any leftover HTML formatting tags (span, code, font, div, p, br)
    text = re.sub(r'</?(?:span|code|font|div|p|br)\b[^>]*>', '', text, flags=re.IGNORECASE)

    # Convert custom non-HTML placeholder tags like <model>, <portableName>, <roomName> to Unicode angle brackets ＜tag＞
    # so TestRail renders them literally as ＜model＞ and ＜portableName＞ without &lt; or \ escaping
    text = NON_HTML_TAG_REGEX.sub(r'＜\1＞', text)

    # Split into individual lines (handles both \r\n and \n)
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    
    parsed_items: List[Dict[str, Any]] = []
    INDENT_BULLET_REGEX = re.compile(r'^(\s*)([-*•])\s*(.*)$')
    
    for line in lines:
        match = INDENT_BULLET_REGEX.match(line)
        if match:
            indent_str, bullet_char, content = match.groups()
            content = content.strip()
            if content:
                indent_len = len(indent_str.replace('\t', '  '))
                level = indent_len // 2
                parsed_items.append({
                    "is_bullet": True,
                    "bullet_char": bullet_char,
                    "content": content,
                    "level": level
                })
        else:
            cleaned = line.strip()
            parsed_items.append({"is_bullet": False, "bullet_char": "", "content": cleaned, "level": 0})

    if bullet_format == "html":
        out_lines: List[str] = []
        in_ul = False
        in_sub_ul = False
        current_li_parts: List[str] = []

        def flush_li():
            nonlocal in_sub_ul
            if current_li_parts:
                li_content = "<br>".join(current_li_parts)
                if in_sub_ul:
                    out_lines.append(f"      <li>{li_content}</li>")
                else:
                    out_lines.append(f"  <li>{li_content}</li>")
                current_li_parts.clear()

        def close_sub_ul():
            nonlocal in_sub_ul
            if in_sub_ul:
                flush_li()
                out_lines.append("    </ul>")
                in_sub_ul = False

        for idx, item in enumerate(parsed_items):
            if item["is_bullet"]:
                if not in_ul:
                    out_lines.append("<ul>")
                    in_ul = True
                
                if item["level"] == 1:
                    if not in_sub_ul:
                        flush_li()
                        out_lines.append("    <ul>")
                        in_sub_ul = True
                    else:
                        flush_li()
                else:
                    if in_sub_ul:
                        close_sub_ul()
                    else:
                        flush_li()

                current_li_parts.append(item["content"])
            else:
                if in_ul:
                    if item["content"] != "":
                        # Continuation line of current bullet item
                        current_li_parts.append(item["content"])
                    else:
                        # Empty line: check if there's another bullet coming up later
                        has_upcoming_bullet = False
                        for next_item in parsed_items[idx + 1:]:
                            if next_item["content"] == "":
                                continue
                            if next_item["is_bullet"]:
                                has_upcoming_bullet = True
                            break
                        
                        if not has_upcoming_bullet:
                            close_sub_ul()
                            flush_li()
                            out_lines.append("</ul>")
                            in_ul = False
                        else:
                            flush_li()
                else:
                    if item["content"] != "" or (out_lines and out_lines[-1] != ""):
                        out_lines.append(item["content"])
                        
        if in_ul:
            close_sub_ul()
            flush_li()
            out_lines.append("</ul>")
            
        # Clean up excessive empty lines
        final_lines: List[str] = []
        for line in out_lines:
            if line == "":
                if final_lines and final_lines[-1] != "":
                    final_lines.append("")
            else:
                final_lines.append(line)
                
        while final_lines and final_lines[0] == "":
            final_lines.pop(0)
        while final_lines and final_lines[-1] == "":
            final_lines.pop()
            
        return "\n".join(final_lines)

    elif bullet_format == "unicode_dot":
        cleaned_lines: List[str] = []
        for item in parsed_items:
            if item["is_bullet"]:
                prefix = "  • " if item["level"] == 1 else "• "
                cleaned_lines.append(f"{prefix}{item['content']}")
            else:
                cleaned_lines.append(item["content"])
    else:  # "markdown" default
        cleaned_lines: List[str] = []
        for item in parsed_items:
            if item["is_bullet"]:
                indent_spaces = "  " * item["level"]
                prefix = f"{indent_spaces}- "
                cleaned_lines.append(f"{prefix}{item['content']}")
            else:
                cleaned_lines.append(item["content"])

    # Collapse multiple consecutive empty lines without forcing extra blank lines between bullets
    final_lines: List[str] = []
    
    for line in cleaned_lines:
        if line == "":
            if final_lines and final_lines[-1] != "":
                final_lines.append("")
        else:
            final_lines.append(line)
            
    while final_lines and final_lines[0] == "":
        final_lines.pop(0)
    while final_lines and final_lines[-1] == "":
        final_lines.pop()
        
    return "\n".join(final_lines)

def detect_unbalanced_symbols(text: str, row_idx: int, col_name: str) -> List[Dict[str, Any]]:
    """
    Scans cell string for unclosed or mismatched symbol pairs: ", ', (), {}, [].
    Filters out common English apostrophe contractions (don't, user's, it's).
    """
    warnings: List[Dict[str, Any]] = []
    if not isinstance(text, str) or not text.strip():
        return warnings

    snippet = text[:100] + ('...' if len(text) > 100 else '')

    # 1. Double Quotes (", “ ”)
    q_std = text.count('"')
    q_smart = text.count('“') + text.count('”')
    if (q_std + q_smart) % 2 != 0:
        warnings.append({
            "row": row_idx,
            "column": col_name,
            "symbol": '"',
            "type": "unclosed_double_quote",
            "message": f"Row #{row_idx}, Column [{col_name}]: Unclosed double quote (\") detected.",
            "snippet": snippet
        })

    # 2. Parentheses ()
    open_p = text.count('(')
    close_p = text.count(')')
    if open_p != close_p:
        warnings.append({
            "row": row_idx,
            "column": col_name,
            "symbol": "()",
            "type": "unbalanced_parentheses",
            "message": f"Row #{row_idx}, Column [{col_name}]: Mismatched parentheses () detected (Open: {open_p}, Close: {close_p}).",
            "snippet": snippet
        })

    # 3. Curly Braces {}
    open_c = text.count('{')
    close_c = text.count('}')
    if open_c != close_c:
        warnings.append({
            "row": row_idx,
            "column": col_name,
            "symbol": "{}",
            "type": "unbalanced_curly_braces",
            "message": f"Row #{row_idx}, Column [{col_name}]: Mismatched curly braces {{}} detected (Open: {open_c}, Close: {close_c}).",
            "snippet": snippet
        })

    # 4. Square Brackets []
    open_s = text.count('[')
    close_s = text.count(']')
    if open_s != close_s:
        warnings.append({
            "row": row_idx,
            "column": col_name,
            "symbol": "[]",
            "type": "unbalanced_square_brackets",
            "message": f"Row #{row_idx}, Column [{col_name}]: Mismatched square brackets [] detected (Open: {open_s}, Close: {close_s}).",
            "snippet": snippet
        })

    # 5. Single Quotes (', ‘ ’) - Strip words with internal apostrophe (don't, user's, it's)
    cleaned_single = re.sub(r"\b\w+'\w+\b", "", text)
    sq_std = cleaned_single.count("'")
    sq_smart = cleaned_single.count('‘') + cleaned_single.count('’')
    if (sq_std + sq_smart) % 2 != 0:
        warnings.append({
            "row": row_idx,
            "column": col_name,
            "symbol": "'",
            "type": "unclosed_single_quote",
            "message": f"Row #{row_idx}, Column [{col_name}]: Unclosed single quote (') detected.",
            "snippet": snippet
        })

    return warnings

def process_csv_content(
    input_stream,
    output_stream,
    decode_html_entities: bool = True,
    bullet_format: str = "markdown",
    normalize_smart_quotes: bool = True,
    escape_pipes: bool = True,
    strip_invisible_chars: bool = True,
    custom_find: Optional[str] = None,
    custom_replace: Optional[str] = None,
    is_regex: bool = False,
    match_case: bool = False,
    find_replace_rules: Optional[List[Dict[str, Any]]] = None,
    manual_edits: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Reads CSV content from input_stream, cleans every cell, writes clean CSV to output_stream,
    preserves manual_edits, and returns a summary dictionary of changes and stats.
    """
    # Detect BOM or UTF-8
    raw_content = input_stream.read()
    if isinstance(raw_content, bytes):
        try:
            text_content = raw_content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text_content = raw_content.decode('latin-1')
    else:
        text_content = raw_content

    if not text_content.strip():
        raise ValueError("CSV file is empty.")

    reader = csv.reader(io.StringIO(text_content))
    try:
        header = next(reader)
    except StopIteration:
        raise ValueError("CSV file is empty.")

    writer = csv.writer(output_stream, lineterminator='\n')
    writer.writerow(header)

    # Detect Title or ID column for counting unique test cases
    header_lower = [c.strip().lower() for c in header]
    title_col_idx = None
    for idx, c in enumerate(header_lower):
        if c in ('title', '#', 'id'):
            title_col_idx = idx
            break

    total_rows = 0
    total_test_cases = 0
    cells_checked = 0
    cells_changed = 0
    changes: List[Dict[str, Any]] = []
    rows_preview: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    try:
        for row_idx, row in enumerate(reader, start=1):
            total_rows += 1
            
            # Count testcase when Title or ID is non-empty
            if title_col_idx is not None and title_col_idx < len(row):
                if row[title_col_idx].strip():
                    total_test_cases += 1
            else:
                total_test_cases += 1

            cleaned_row = []
            row_detail: Dict[str, Any] = {}

            # Handle rows that might have fewer or more cells than header
            for col_idx, original_val in enumerate(row):
                cells_checked += 1
                col_name = header[col_idx] if col_idx < len(header) else f"Column_{col_idx+1}"
                cell_key = f"{row_idx}_{col_name}"

                is_manually_edited = False
                if manual_edits and cell_key in manual_edits:
                    val_to_clean = manual_edits[cell_key]
                    is_manually_edited = True
                else:
                    val_to_clean = original_val

                cleaned_val = clean_test_case_text(
                    val_to_clean,
                    decode_html_entities=decode_html_entities,
                    bullet_format=bullet_format,
                    normalize_smart_quotes=normalize_smart_quotes,
                    escape_pipes=escape_pipes,
                    strip_invisible_chars=strip_invisible_chars,
                    custom_find=custom_find,
                    custom_replace=custom_replace,
                    is_regex=is_regex,
                    match_case=match_case,
                    find_replace_rules=find_replace_rules
                )
                cleaned_row.append(cleaned_val)

                # Detect unbalanced symbol pairs in the final cleaned cell
                cell_warns = detect_unbalanced_symbols(cleaned_val, row_idx, col_name)
                if cell_warns:
                    warnings.extend(cell_warns)
                
                is_changed = is_manually_edited or (original_val != cleaned_val)
                if is_changed:
                    cells_changed += 1
                    changes.append({
                        "row": row_idx,
                        "column": col_name,
                        "original": original_val,
                        "cleaned": cleaned_val
                    })
                
                row_detail[col_name] = {
                    "original": original_val,
                    "cleaned": cleaned_val,
                    "changed": is_changed
                }

            # Pad row if shorter than header
            while len(cleaned_row) < len(header):
                cleaned_row.append("")
                
            writer.writerow(cleaned_row)
            
            if row_idx <= 100:  # Cap preview rows to keep response fast for huge files
                rows_preview.append({
                    "row": row_idx,
                    "data": row_detail
                })
    except csv.Error as e:
        raise ValueError(f"CSV Structural Error (Unclosed double quote \" or malformed line format): {str(e)}")

    return {
        "total_rows": total_rows,
        "total_test_cases": total_test_cases if total_test_cases > 0 else total_rows,
        "cells_checked": cells_checked,
        "cells_changed": cells_changed,
        "columns": header,
        "changes": changes,
        "rows_preview": rows_preview,
        "warnings": warnings,
        "warnings_count": len(warnings)
    }

import os
from pathlib import Path

def clean_csv_file(
    input_filepath: str,
    output_filepath: str,
    decode_html_entities: bool = True,
    bullet_format: str = "markdown",
    normalize_smart_quotes: bool = True,
    escape_pipes: bool = True,
    strip_invisible_chars: bool = True,
    custom_find: Optional[str] = None,
    custom_replace: Optional[str] = None,
    is_regex: bool = False,
    match_case: bool = False,
    find_replace_rules: Optional[List[Dict[str, Any]]] = None,
    manual_edits: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Cleans a CSV file at input_filepath and writes to output_filepath.
    Returns stats and preview dictionary.
    """
    with open(input_filepath, 'rb') as f_in:
        out_buffer = io.StringIO()
        stats = process_csv_content(
            f_in,
            out_buffer,
            decode_html_entities=decode_html_entities,
            bullet_format=bullet_format,
            normalize_smart_quotes=normalize_smart_quotes,
            escape_pipes=escape_pipes,
            strip_invisible_chars=strip_invisible_chars,
            custom_find=custom_find,
            custom_replace=custom_replace,
            is_regex=is_regex,
            match_case=match_case,
            find_replace_rules=find_replace_rules,
            manual_edits=manual_edits
        )
        
    output_path = Path(output_filepath)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8', newline='') as f_out:
        f_out.write(out_buffer.getvalue())
        
    return stats
