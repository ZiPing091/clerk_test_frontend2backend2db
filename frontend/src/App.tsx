import React, { useState } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth
} from "@clerk/clerk-react";

interface Note {
  id: number;
  content: string;
  created_at: string;
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function NotesList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // 1. 取得 Clerk JWT Token
      const token = await getToken();

      // 2. 發送請求到 FastAPI
      const response = await fetch("http://localhost:8000/api/notes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (Array.isArray(data)) {
        setNotes(data);
      } else {
        console.error("Unexpected data format", data);
      }
    } catch (err) {
      console.error("抓取資料失敗", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setCreating(true);
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8000/api/notes", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote }),
      });

      if (response.ok) {
        setNewNote('');
        fetchNotes(); // 重新抓取列表
      }
    } catch (err) {
      console.error("新增筆記失敗", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <form onSubmit={handleCreateNote} style={{ marginBottom: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="在此輸入新的筆記內容..."
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            width: '300px',
            fontSize: '14px'
          }}
        />
        <button type="submit" style={btnStyle} disabled={creating}>
          {creating ? '新增中...' : '新增筆記'}
        </button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />

      <button onClick={fetchNotes} style={{ ...btnStyle, backgroundColor: '#a29bfe' }} disabled={loading}>
        {loading ? '載入中...' : '從資料庫提取資料 (GET)'}
      </button>
      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', maxWidth: '400px', margin: '20px auto' }}>
        {notes.map(note => (
          <li key={note.id} style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: 'white', marginBottom: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: '500', color: '#2d3436' }}>{note.content}</div>
            <small style={{ color: '#b2bec3', display: 'block', marginTop: '5px' }}>{new Date(note.created_at).toLocaleString()}</small>
          </li>
        ))}
        {notes.length === 0 && !loading && <p style={{ textAlign: 'center', color: '#636e72' }}>目前沒有資料，或請點擊按鈕提取。</p>}
      </ul>
    </div>
  );
}

function App() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
        <h1>Error: Missing Clerk Publishable Key</h1>
        <p>Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.</p>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ color: '#6c5ce7' }}>TrustCase: Clerk + FastAPI + Supabase</h1>

        {/* 登出狀態 */}
        <SignedOut>
          <p>請登入以查看您的私有筆記</p>
          <SignInButton mode="modal">
            <button style={btnStyle}>登入 / 註冊</button>
          </SignInButton>
        </SignedOut>

        {/* 登入狀態 */}
        <SignedIn>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px', backgroundColor: '#f9f9fb' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <span style={{ fontWeight: '500' }}>您已成功登入！</span>
              <UserButton />
            </div>

            <NotesList />
          </div>
        </SignedIn>
      </div>
    </ClerkProvider>
  );
}

const btnStyle = {
  padding: '12px 24px',
  backgroundColor: '#6c5ce7',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600',
  transition: 'background-color 0.2s',
};

export default App;
