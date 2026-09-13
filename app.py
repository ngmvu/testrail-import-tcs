import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, send_from_directory

from services.csv_cleaner import clean_csv_file

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent

def load_env_file():
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

load_env_file()

UPLOAD_FOLDER = BASE_DIR / "uploads"
OUTPUT_FOLDER = BASE_DIR / "outputs"

UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['OUTPUT_FOLDER'] = str(OUTPUT_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size

# In-memory store mapping file_id to output filename
DOWNLOAD_CACHE = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        "testrail_url": os.getenv("TESTRAIL_URL", ""),
        "email": os.getenv("TESTRAIL_EMAIL", ""),
        "api_key": os.getenv("TESTRAIL_API_KEY", ""),
        "project_id": os.getenv("TESTRAIL_PROJECT_ID", "")
    })

@app.route('/clean', methods=['POST'])
def clean_csv():
    if 'file' not in request.files:
        return jsonify({"error": "Please upload a CSV file."}), 400
    
    file = request.files['file']
    if not file or file.filename.strip() == '':
        return jsonify({"error": "Please upload a CSV file."}), 400
    
    original_filename = secure_filename(file.filename) or "testcases.csv"
    if not original_filename.lower().endswith('.csv'):
        return jsonify({"error": "Please upload a CSV file."}), 400
    
    file_id = str(uuid.uuid4())
    input_path = UPLOAD_FOLDER / f"{file_id}_{original_filename}"
    output_filename = f"cleaned_{original_filename}"
    output_path = OUTPUT_FOLDER / f"{file_id}_{output_filename}"

    try:
        file.save(str(input_path))
    except Exception:
        return jsonify({"error": "Unable to save uploaded file."}), 500

    decode_html = request.form.get('decode_html_entities', 'true').lower() == 'true'
    bullet_format = request.form.get('bullet_format', 'html')
    normalize_quotes = request.form.get('normalize_smart_quotes', 'true').lower() == 'true'
    escape_pipes = request.form.get('escape_pipes', 'true').lower() == 'true'
    strip_invisible = request.form.get('strip_invisible_chars', 'true').lower() == 'true'
    
    import json
    custom_find = request.form.get('custom_find', '')
    custom_replace = request.form.get('custom_replace', '')
    is_regex = request.form.get('is_regex', 'false').lower() == 'true'
    match_case = request.form.get('match_case', 'false').lower() == 'true'
    rules_json = request.form.get('find_replace_rules', '[]')
    try:
        find_replace_rules = json.loads(rules_json)
    except Exception:
        find_replace_rules = []

    try:
        stats = clean_csv_file(
            str(input_path),
            str(output_path),
            decode_html_entities=decode_html,
            bullet_format=bullet_format,
            normalize_smart_quotes=normalize_quotes,
            escape_pipes=escape_pipes,
            strip_invisible_chars=strip_invisible,
            custom_find=custom_find if custom_find else None,
            custom_replace=custom_replace,
            is_regex=is_regex,
            match_case=match_case,
            find_replace_rules=find_replace_rules
        )
        DOWNLOAD_CACHE[file_id] = {
            "output_path": str(output_path),
            "download_name": output_filename
        }
        return jsonify({
            "success": True,
            "file_id": file_id,
            "filename": original_filename,
            "stats": stats
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Unable to read CSV file. Please check the CSV format."}), 400

@app.route('/download/<file_id>', methods=['GET'])
def download_file(file_id):
    file_info = DOWNLOAD_CACHE.get(file_id)
    if not file_info or not os.path.exists(file_info['output_path']):
        return jsonify({"error": "File not found or link expired."}), 404
    
    output_path = Path(file_info['output_path'])
    return send_from_directory(
        directory=output_path.parent,
        path=output_path.name,
        as_attachment=True,
        download_name=file_info['download_name'],
        mimetype='text/csv'
    )

@app.route('/get-testrail-sections', methods=['POST'])
def get_testrail_sections():
    from services.testrail_service import get_sections_dropdown_list

    data = request.get_json(silent=True) or request.form
    testrail_url = data.get('testrail_url', '').strip()
    email = data.get('email', '').strip()
    api_key = data.get('api_key', '').strip()
    project_id_raw = data.get('project_id', '').strip()
    suite_id_raw = data.get('suite_id', '').strip()

    if not testrail_url or not email or not api_key or not project_id_raw:
        return jsonify({"error": "Please fill in TestRail URL, Email, API Key, and Project ID to load sections."}), 400

    try:
        project_id = int(project_id_raw)
    except ValueError:
        return jsonify({"error": "Project ID must be a number."}), 400

    suite_id = int(suite_id_raw) if suite_id_raw.isdigit() else None

    try:
        sections = get_sections_dropdown_list(
            testrail_url=testrail_url,
            email=email,
            api_key=api_key,
            project_id=project_id,
            suite_id=suite_id
        )
        return jsonify({"success": True, "sections": sections})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch sections: {str(e)}"}), 500

@app.route('/push-to-testrail', methods=['POST'])
def push_to_testrail():
    from services.testrail_service import push_cleaned_csv_to_testrail

    data = request.get_json(silent=True) or request.form
    file_id = data.get('file_id')
    testrail_url = data.get('testrail_url', '').strip()
    email = data.get('email', '').strip()
    api_key = data.get('api_key', '').strip()
    project_id_raw = data.get('project_id', '').strip()
    suite_id_raw = data.get('suite_id', '').strip()
    target_section = data.get('target_section', '').strip()
    custom_fields = data.get('custom_fields')

    if not file_id or file_id not in DOWNLOAD_CACHE:
        return jsonify({"error": "Invalid or expired file session. Please clean CSV first."}), 400

    if not testrail_url or not email or not api_key or not project_id_raw:
        return jsonify({"error": "Please provide TestRail URL, Email, API Key, and Project ID."}), 400

    try:
        project_id = int(project_id_raw)
    except ValueError:
        return jsonify({"error": "Project ID must be a valid number."}), 400

    suite_id = int(suite_id_raw) if suite_id_raw.isdigit() else None

    output_path = DOWNLOAD_CACHE[file_id]['output_path']
    if not os.path.exists(output_path):
        return jsonify({"error": "Cleaned CSV file no longer exists."}), 404

    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            csv_text = f.read()
        
        result = push_cleaned_csv_to_testrail(
            csv_text=csv_text,
            testrail_url=testrail_url,
            email=email,
            api_key=api_key,
            project_id=project_id,
            suite_id=suite_id,
            target_section=target_section,
            custom_fields=custom_fields
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to push to TestRail: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found."}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error."}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
