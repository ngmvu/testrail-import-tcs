import csv
import io
import json
import base64
import urllib.request
import urllib.error
import re
from typing import Dict, List, Any, Optional

class TestRailAPIClient:
    def __init__(self, base_url: str, email: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.email = email
        self.api_key = api_key
        
        # Base64 encode credentials for HTTP Basic Auth
        auth_str = f"{email}:{api_key}"
        self.auth_header = f"Basic {base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')}"

    def _request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/index.php?/api/v2/{endpoint.lstrip('/')}"
        
        headers = {
            'Authorization': self.auth_header,
            'Content-Type': 'application/json',
            'User-Agent': 'TestRailTestCaseFormatter/1.0'
        }
        
        json_data = json.dumps(data).encode('utf-8') if data is not None else None
        req = urllib.request.Request(url, data=json_data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_text = response.read().decode('utf-8')
                return json.loads(resp_text) if resp_text else {}
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                err_json = json.loads(error_body)
                error_msg = err_json.get('error', error_body)
            except Exception:
                error_msg = error_body or str(e)
            raise ValueError(f"TestRail API Error ({e.code}): {error_msg}")
        except Exception as e:
            raise ValueError(f"Failed to connect to TestRail: {str(e)}")

    def get_sections(self, project_id: int, suite_id: Optional[int] = None) -> List[Dict[str, Any]]:
        endpoint = f"get_sections/{project_id}"
        if suite_id:
            endpoint += f"&suite_id={suite_id}"
        result = self._request("GET", endpoint)
        return result.get('sections', result) if isinstance(result, dict) else result

    def add_section(self, project_id: int, name: str, parent_id: Optional[int] = None, suite_id: Optional[int] = None) -> Dict[str, Any]:
        endpoint = f"add_section/{project_id}"
        payload = {"name": name}
        if parent_id:
            payload["parent_id"] = parent_id
        if suite_id:
            payload["suite_id"] = suite_id
        return self._request("POST", endpoint, payload)

    def add_case(self, section_id: int, case_data: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = f"add_case/{section_id}"
        return self._request("POST", endpoint, case_data)


def get_sections_dropdown_list(
    testrail_url: str,
    email: str,
    api_key: str,
    project_id: int,
    suite_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Fetches all sections for project_id and returns a sorted hierarchical list with full path strings.
    """
    client = TestRailAPIClient(testrail_url, email, api_key)
    sections = client.get_sections(project_id, suite_id)

    if not sections:
        return []

    # Map sections by ID
    sec_by_id = {sec['id']: sec for sec in sections}

    def get_full_path(sec: Dict[str, Any]) -> str:
        path = [sec.get('name', '').strip()]
        curr = sec
        while curr.get('parent_id') and curr['parent_id'] in sec_by_id:
            curr = sec_by_id[curr['parent_id']]
            path.append(curr.get('name', '').strip())
        return " > ".join(reversed(path))

    result = []
    for sec in sections:
        full_path = get_full_path(sec)
        result.append({
            "id": sec['id'],
            "name": sec.get('name', ''),
            "path": full_path,
            "parent_id": sec.get('parent_id')
        })

    # Sort alphabetically by path
    result.sort(key=lambda x: x['path'].lower())
    return result


NON_HTML_TAG_REGEX = re.compile(r'<(?!/?(?:ul|li|b|i|p|br|code|a|span|div|strong|em)\b)([^>]+)>', re.IGNORECASE)

def escape_non_html_tags(text: str) -> str:
    """
    Escapes custom placeholder tags like <roomName>, <model>, <portableName> to &lt;roomName&gt;
    so TestRail's HTML sanitizer displays them literally on screen instead of stripping them as unknown HTML tags.
    Preserves valid HTML formatting tags like <ul>, <li>, <br>, <b>, <i>, <p>.
    """
    if not text:
        return ""
    return NON_HTML_TAG_REGEX.sub(r'&lt;\1&gt;', text)

def map_type_id(type_str: str) -> int:
    if not type_str:
        return 1
    t = type_str.lower()
    if 'func' in t:
        return 1
    elif 'auto' in t:
        return 2
    elif 'regress' in t:
        return 3
    elif 'smoke' in t:
        return 4
    return 1

def map_priority_id(priority_str: str) -> int:
    if not priority_str:
        return 3 # Default High
    p = priority_str.lower()
    if 'critical' in p or '4' in p:
        return 4
    elif 'high' in p or '1' in p:
        return 3
    elif 'medium' in p or '2' in p:
        return 2
    elif 'low' in p or '3' in p:
        return 1
    return 3

def parse_csv_into_test_cases(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parses clean CSV content and groups multi-line row steps under parent test cases.
    Detects new test cases when 'Title' or '#' is non-empty.
    """
    reader = csv.reader(io.StringIO(csv_text))
    try:
        header = next(reader)
    except StopIteration:
        return []

    # Map headers (case insensitive)
    header_map = {col.strip().lower(): idx for idx, col in enumerate(header)}
    
    col_id = header_map.get('#') or header_map.get('id')
    col_type = header_map.get('type')
    col_priority = header_map.get('priority')
    col_applicable_prods = header_map.get('applicable products') or header_map.get('applicable_products')
    col_links_to_docs = header_map.get('links to related document') or header_map.get('links_to_related_document')
    col_section = header_map.get('section')
    col_sub_section = header_map.get('sub-section') or header_map.get('sub_section') or header_map.get('subsection')
    col_title = header_map.get('title')
    col_preconds = header_map.get('preconditions') or header_map.get('precondition')
    col_steps = header_map.get('steps') or header_map.get('step')
    col_expected = (header_map.get('steps (expected result)') or 
                    header_map.get('expected result') or 
                    header_map.get('expected_result'))
    col_refs = header_map.get('references') or header_map.get('reference') or header_map.get('refs')
    col_assigned = header_map.get('assigned')
    
    test_cases: List[Dict[str, Any]] = []
    current_case: Optional[Dict[str, Any]] = None

    last_section = "General"
    last_sub_section = ""

    for row in reader:
        if not any(row):
            continue

        id_val = row[col_id].strip() if col_id is not None and col_id < len(row) else ""
        type_val = row[col_type].strip() if col_type is not None and col_type < len(row) else ""
        priority_val = row[col_priority].strip() if col_priority is not None and col_priority < len(row) else ""
        prods_val = row[col_applicable_prods].strip() if col_applicable_prods is not None and col_applicable_prods < len(row) else ""
        links_val = row[col_links_to_docs].strip() if col_links_to_docs is not None and col_links_to_docs < len(row) else ""
        title_val = row[col_title].strip() if col_title is not None and col_title < len(row) else ""
        section_val = row[col_section].strip() if col_section is not None and col_section < len(row) else ""
        sub_section_val = row[col_sub_section].strip() if col_sub_section is not None and col_sub_section < len(row) else ""
        preconds_val = row[col_preconds].strip() if col_preconds is not None and col_preconds < len(row) else ""
        step_val = row[col_steps].strip() if col_steps is not None and col_steps < len(row) else ""
        expected_val = row[col_expected].strip() if col_expected is not None and col_expected < len(row) else ""
        refs_val = row[col_refs].strip() if col_refs is not None and col_refs < len(row) else ""

        # Update persistent section if provided
        if section_val:
            last_section = section_val
        if sub_section_val:
            last_sub_section = sub_section_val

        # Detect new test case strictly when Title (or # ID) is non-empty
        is_new_case = bool(title_val or id_val)

        if is_new_case or current_case is None:
            if current_case:
                test_cases.append(current_case)
            
            current_case = {
                "section": section_val or last_section,
                "sub_section": sub_section_val or last_sub_section,
                "title": title_val or "Untitled Test Case",
                "type": type_val,
                "priority": priority_val,
                "applicable_products": prods_val,
                "links_to_docs": links_val,
                "preconditions": preconds_val,
                "references": refs_val,
                "steps": []
            }

        if step_val or expected_val:
            current_case["steps"].append({
                "content": step_val,
                "expected": expected_val
            })

    if current_case:
        test_cases.append(current_case)

    return test_cases


def push_cleaned_csv_to_testrail(
    csv_text: str,
    testrail_url: str,
    email: str,
    api_key: str,
    project_id: int,
    suite_id: Optional[int] = None,
    target_section: Optional[str] = None,
    custom_fields: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Pushes test cases from clean CSV text to TestRail, creating missing Section and Sub-Section tree nodes.
    Supports customizable field key mappings for Preconditions, Type, Priority, References, etc.
    """
    client = TestRailAPIClient(testrail_url, email, api_key)
    test_cases = parse_csv_into_test_cases(csv_text)
    
    if not test_cases:
        raise ValueError("No test cases found in CSV data to push.")

    # Customizable Field Key Mapping
    field_map = {
        "preconditions": "custom_preconds",
        "type": "type_id",
        "priority": "priority_id",
        "references": "refs",
        "applicable_products": "custom_swpd_tc_applicable_prods",
        "links_to_docs": "custom_tc_links_to_docs"
    }
    if custom_fields:
        for k, v in custom_fields.items():
            if v and v.strip():
                field_map[k] = v.strip()

    precond_key = field_map["preconditions"]
    type_key = field_map["type"]
    priority_key = field_map["priority"]
    refs_key = field_map["references"]
    prods_key = field_map["applicable_products"]
    links_key = field_map["links_to_docs"]

    # 1. Fetch existing sections tree
    existing_sections = client.get_sections(project_id, suite_id)
    
    # Cache mapping: (parent_id, section_name.lower()) -> section_id
    section_cache: Dict[tuple, int] = {}
    for sec in existing_sections:
        p_id = sec.get('parent_id')
        name_key = sec.get('name', '').strip().lower()
        section_cache[(p_id, name_key)] = sec['id']

    def resolve_section_id(section_name: str, parent_id: Optional[int] = None) -> int:
        clean_name = section_name.strip()
        key = (parent_id, clean_name.lower())
        if key in section_cache:
            return section_cache[key]
        
        # Section doesn't exist, create it via API
        new_sec = client.add_section(project_id, name=clean_name, parent_id=parent_id, suite_id=suite_id)
        sec_id = new_sec['id']
        section_cache[key] = sec_id
        return sec_id

    # 2. Resolve optional target_section root path (e.g. "API Tests > Bonding" or "Vunguyen")
    root_parent_id: Optional[int] = None
    target_path_str = ""

    if target_section and target_section.strip():
        # Handle path separators like '>' or '/'
        path_parts = [p.strip() for p in target_section.replace('/', '>').split('>') if p.strip()]
        for part in path_parts:
            root_parent_id = resolve_section_id(part, parent_id=root_parent_id)
        target_path_str = " > ".join(path_parts)

    created_cases_count = 0
    logs: List[str] = []

    for tc in test_cases:
        sec_name = tc.get('section') or "General"
        sub_sec_name = tc.get('sub_section') or ""

        current_parent_id = root_parent_id

        # Step A: Resolve Section
        if target_path_str:
            if sec_name.strip().lower() != target_path_str.split('>')[-1].strip().lower():
                current_parent_id = resolve_section_id(sec_name, parent_id=current_parent_id)
        else:
            current_parent_id = resolve_section_id(sec_name, parent_id=None)

        # Step B: Resolve Sub-Section if present
        target_sec_id = current_parent_id
        if sub_sec_name:
            target_sec_id = resolve_section_id(sub_sec_name, parent_id=current_parent_id)

        # Build separated steps list AND concatenated steps string for compatibility across all TestRail templates
        raw_steps = tc["steps"]
        separated_steps = []
        steps_text_list = []
        expected_text_list = []
        
        for idx, st in enumerate(raw_steps, 1):
            c = escape_non_html_tags(st.get("content", "").strip())
            e = escape_non_html_tags(st.get("expected", "").strip())
            separated_steps.append({"content": c, "expected": e})
            if c:
                steps_text_list.append(c)
            if e:
                expected_text_list.append(e)

        concat_steps = "\n\n".join(steps_text_list)
        concat_expected = "\n\n".join(expected_text_list)

        escaped_preconds = escape_non_html_tags(tc["preconditions"])

        # Build TestRail API case payload with broad compatibility fields
        case_payload: Dict[str, Any] = {
            "title": escape_non_html_tags(tc["title"]),
            "template_id": 2, # Test Case (Steps)
            type_key: map_type_id(tc.get("type")),
            priority_key: map_priority_id(tc.get("priority")),
            precond_key: escaped_preconds,
            "custom_tc_preconditions": escaped_preconds,
            "custom_steps_separated": separated_steps,
            "custom_steps": concat_steps,
            "custom_expected": concat_expected,
            refs_key: tc.get("references", "")
        }

        if tc.get("applicable_products"):
            case_payload[prods_key] = tc["applicable_products"]
        if tc.get("links_to_docs"):
            case_payload[links_key] = tc["links_to_docs"]

        created_case = client.add_case(target_sec_id, case_payload)
        case_id = created_case.get('id', 'N/A')
        created_cases_count += 1
        
        full_sec_path = []
        if target_path_str:
            full_sec_path.append(target_path_str)
        if sec_name and (not target_path_str or sec_name.strip().lower() != target_path_str.split('>')[-1].strip().lower()):
            full_sec_path.append(sec_name)
        if sub_sec_name:
            full_sec_path.append(sub_sec_name)
            
        display_path = " > ".join(full_sec_path)
        logs.append(f"Created C{case_id}: '{tc['title']}' in [{display_path}]")

    return {
        "success": True,
        "total_cases_pushed": created_cases_count,
        "logs": logs
    }
