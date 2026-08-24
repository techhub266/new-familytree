# 🌳 Family Tree Heritage Explorer (Python + SQLite Database)

A full-stack interactive Family Tree web application built with **Python (Flask)**, **SQLite Database**, and a modernized responsive frontend.

---

## 🚀 Key Features & Enhancements

- **Python & SQLite Backend**:
  - Persistent SQLite database (`family_tree.db`) with full schema defined in `database.sql`.
  - Complete REST API: Add, Edit, View, Delete, Search, and Export/Import family data.
  - Automatically loads a 3-generation sample family tree on first run.
- **Complete Relationship Support**:
  - **Husbands & Wives**
  - **Sons & Daughters**
  - **Sons-in-law & Daughters-in-law** (paired side-by-side with spouse connectors)
  - **Fathers & Mothers**
  - **Brothers & Sisters**
- **Interactive UI & Controls**:
  - **Live Statistics**: Total Members, Males, Females, and In-laws counters.
  - **Search & Filter**: Real-time member search with highlighted nodes.
  - **Zoom & Pan Canvas**: Smooth zoom in/out, 100% reset, and mouse drag navigation.
  - **Quick Add**: Click `+` on any card to instantly add a child, spouse, or relative under them.
  - **Member Profile Modal**: View full biographical notes, spouse, children, and dates.
  - **Backup & Export**: One-click download of the complete database as JSON.

---

## 🛠️ How to Run the Project

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Python Server
```bash
python app.py
```

### 3. Open in Browser
Visit **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser.

---

## 📁 Project Structure

```
├── app.py                  # Python Flask server & RESTful API endpoints
├── database.sql            # SQLite database schema and 3-generation seed data
├── family_tree.db          # Auto-generated SQLite database
├── requirements.txt        # Python package requirements
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Modern HTML5 UI with modals & control toolbar
└── static/
    ├── css/
    │   └── style.css       # Polished stylesheet with dark gradient theme
    └── js/
        └── script.js       # Dynamic tree renderer & REST API communication
```
