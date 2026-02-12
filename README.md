# Expense Divider

Full-stack receipt expense divider app:
- Backend: Django + Django REST Framework
- Frontend: React + Vite + TypeScript
- AI receipt parsing: OpenAI vision model (image upload -> items + totals JSON)
- Shared account logic for 2 users with monthly settlement + notifications
- Session-based household login (household code + member name + passcode)

## Project Structure

- `backend/` Django API
- `frontend/` React TypeScript app
- `docker-compose.yml` full stack containers

## Environment Files

Create these before running:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Required backend env:
- `OPENAI_API_KEY`

## Run With Docker (Recommended)

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

Stop:

```bash
docker compose down
```

## Run Locally Without Docker

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2) Frontend (TypeScript)

```bash
cd frontend
npm install
npm run dev
```

## API Endpoint

### `POST /api/receipts/households/create/`

Creates a new household session and signs in member 1.

Request:

```json
{
  "household_name": "Home Base",
  "member_1_name": "Alex",
  "member_2_name": "Jamie",
  "passcode": "shared123"
}
```

Response includes `household_code` to share with the second member.

### `POST /api/receipts/analyze/`

Multipart form-data field:
- `image`: receipt image file

Requires active session user (set via `/api/receipts/session/login/`).

Response (example):

```json
{
  "receipt": {
    "id": 12,
    "uploaded_by": "user_1",
    "expense_date": "2026-02-12",
    "vendor": "Store Name",
    "currency": "USD",
    "subtotal": 24.5,
    "tax": 1.96,
    "tip": 0,
    "total": 26.46,
    "items": [
      {
        "name": "Milk",
        "quantity": 1,
        "unit_price": 3.5,
        "total_price": 3.5,
        "assigned_to": "shared"
      }
    ],
    "uploaded_at": "2026-02-12T21:15:00Z"
  }
}
```

Each parsed item includes `assigned_to` (`shared`, `user_1`, or `user_2`) and defaults to `shared`.

### `PATCH /api/receipts/{receipt_id}/items/`

Update item ownership used for split calculation.

Request:

```json
{
  "assignments": [
    { "index": 0, "assigned_to": "shared" },
    { "index": 1, "assigned_to": "user_1" }
  ]
}
```

### `GET /api/receipts/dashboard/`

Returns:
- `household_code`
- `household_name`
- `current_date`
- `current_user`
- `current_user_name`
- `members`
- `current_month` totals for `user_1`, `user_2`, and combined
- `last_month` totals for `user_1`, `user_2`, and combined
- `settlement` (who should pay whom this month)
- `notifications` for each user
- `recent_receipts`

### `POST /api/receipts/session/login/`

Request:

```json
{
  "household_code": "A1B2C3",
  "name": "Alex",
  "passcode": "shared123"
}
```

### `POST /api/receipts/session/logout/`

Clears active user session.

### `GET /api/receipts/session/me/`

Returns current session user:

```json
{
  "user": "user_1",
  "user_name": "Alex",
  "household_code": "A1B2C3",
  "household_name": "Home Base",
  "members": {
    "user_1": "Alex",
    "user_2": "Jamie"
  }
}
```

## Notes

- The AI extraction quality depends on image clarity and model output.
- Settlement amount is calculated from each member's paid amount minus owed amount, using item-level split rules.
