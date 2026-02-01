# Clerk + FastAPI + Supabase MVP

This project is a minimal full-stack application demonstrating authentication with **Clerk**, a **FastAPI** backend, and a **Supabase** database.

## Project Structure

- `backend/`: FastAPI application.
- `frontend/`: React + TypeScript (Vite) application.
- `database/`: SQL schema for Supabase.

## Setup Instructions

### 1. Database (Supabase)
1. Create a project on [Supabase](https://supabase.com/).
2. Run the SQL script in `database/schema.sql` in the SQL Editor.
3. Note your `SUPABASE_URL` and `SUPABASE_KEY` (service role key).

### 2. Authentication (Clerk)
1. Create an application on [Clerk](https://clerk.com/).
2. Note your `VITE_CLERK_PUBLISHABLE_KEY`.
3. Set your Issuer URL (usually `https://your-instance.clerk.accounts.dev`).

### 3. Backend Setup
1. `cd backend`
2. `py -3.12 -m venv venv`
3. `.\venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. Create `.env` based on `.env.example` and fill in your keys.
6. Run: `python main.py`

### 4. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create `.env` based on `.env.example` and fill in your `VITE_CLERK_PUBLISHABLE_KEY`.
4. Run: `npm run dev`

## Running the Application

To run the full-stack application, you need to start both the backend and the frontend servers in separate terminal windows.

### 1. Start the Backend Server
- **Directory**: `backend/`
- **Command**:
  ```powershell
  cd backend
  .\venv\Scripts\activate
  python main.py
  ```
- **Note**: Ensure your `.env` file is configured with Supabase and Clerk keys.

### 2. Start the Frontend Server
- **Directory**: `frontend/`
- **Command**:
  ```powershell
  cd frontend
  npm run dev
  ```
- **Note**: Ensure your `.env` file contains your `VITE_CLERK_PUBLISHABLE_KEY`.

## Usage
1. Open the frontend URL (usually `http://localhost:3000`).
2. Log in using Clerk.
3. Click the button to fetch notes from the backend API.
4. The backend will verify your identity via Clerk JWT and fetch your notes from Supabase.
