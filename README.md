# TestRail Test Case Formatter (`testrail-testcase-formatter`)

A specialized Python Flask web application designed to clean and normalize CSV test case files before importing them into **TestRail**.

---

## Key Features

- **Bullet Point Normalization**: Converts indented bullets (`  - `, `   - `, `    - `) into standardized `- ` bullets without deleting `-` or corrupting content.
- **Line Break & Indentation Cleanup**: Trims unnecessary trailing spaces and collapses excessive blank lines while preserving intentional test case paragraph breaks.
- **XML / HTML Tag Preservation**: Keeps `<roomName>`, `<model>`, `<portableName>`, and HTML entities like `&lt;` untouched.
- **Quotation Mark & Special Character Safety**: Preserves quotation marks (`"Select"`, `"I don't see my product"`), punctuation, commas inside CSV cells, and UTF-8 / Vietnamese characters.
- **Interactive UI Preview**: Displays a visual diff table highlighting changed cells along with statistics (`Total Rows`, `Cells Checked`, `Cells Changed`).
- **CSV Download**: Export cleaned CSV ready for direct import into TestRail without column or row ordering changes.

---

## Installation & Setup Instructions

### 1. Create Virtual Environment

```bash
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
venv\Scripts\activate.bat
```

**Linux / macOS:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Running the Application

Start the Flask development server:

```bash
python app.py
```

Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## Project Structure

```text
testrail-testcase-formatter/
│
├── app.py                      # Flask web server & routes
├── requirements.txt            # Project dependencies
├── README.md                   # Setup & documentation
├── .gitignore                  # Git ignore rules
│
├── templates/
│   └── index.html              # Frontend HTML structure
│
├── static/
│   ├── css/
│   │   └── style.css           # Modern dark-mode UI styles
│   └── js/
│       └── app.js              # Interactivity, drag-and-drop & AJAX upload
│
├── services/
│   ├── csv_cleaner.py          # Core testcase cleaner algorithm & CSV processor
│   └── testrail_service.py     # TestRail API integration service
│
├── uploads/                    # Temporary uploaded files
└── outputs/                    # Temporary cleaned CSV outputs
```
