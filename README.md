# TestRail Test Case Formatter (`testrail-testcase-formatter`)

A specialized Python Flask web application designed to clean and normalize CSV test case files before importing them into **TestRail**.

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
