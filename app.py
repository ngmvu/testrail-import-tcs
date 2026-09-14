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

    manual_edits_json = request.form.get('manual_edits', '{}')
    try:
        manual_edits = json.loads(manual_edits_json)
    except Exception:
        manual_edits = {}

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
            find_replace_rules=find_replace_rules,
            manual_edits=manual_edits
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

@app.route('/update-cell', methods=['POST'])
def update_cell():
    data = request.get_json(silent=True) or request.form
    file_id = data.get('file_id')
    row_num = data.get('row')
    col_name = data.get('column')
    new_value = data.get('value', '')

    if not file_id or file_id not in DOWNLOAD_CACHE:
        return jsonify({"error": "Invalid or expired file session."}), 400

    output_path = Path(DOWNLOAD_CACHE[file_id]['output_path'])
    if not output_path.exists():
        return jsonify({"error": "Cleaned CSV file no longer exists."}), 404

    try:
        row_idx = int(row_num)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid row index."}), 400

    if not col_name:
        return jsonify({"error": "Column name is required."}), 400

    import csv
    from services.csv_cleaner import detect_unbalanced_symbols

    rows = []
    try:
        with open(output_path, 'r', encoding='utf-8-sig', newline='') as f:
            reader = csv.reader(f)
            for r in reader:
                rows.append(r)
    except Exception:
        return jsonify({"error": "Failed to read CSV file."}), 500

    if not rows:
        return jsonify({"error": "CSV file is empty."}), 400

    header = rows[0]
    if col_name not in header:
        return jsonify({"error": f"Column '{col_name}' not found in CSV."}), 400

    col_idx = header.index(col_name)

    if row_idx < 1 or row_idx >= len(rows):
        return jsonify({"error": f"Row #{row_idx} out of range."}), 400

    while len(rows[row_idx]) <= col_idx:
        rows[row_idx].append("")

    rows[row_idx][col_idx] = new_value

    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, lineterminator='\n')
            writer.writerows(rows)
    except Exception:
        return jsonify({"error": "Failed to update CSV file."}), 500

    cell_warns = detect_unbalanced_symbols(new_value, row_idx, col_name)

    return jsonify({
        "success": True,
        "row": row_idx,
        "column": col_name,
        "value": new_value,
        "cell_warnings": cell_warns
    })



@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found."}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error."}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
