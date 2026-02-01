這個流程展示了現代 Web 開發最流行的架構：**Clerk (身分驗證) + FastAPI (後端邏輯) + Supabase (資料庫)**。

**重要觀念：** 當你使用 Clerk 時，**密碼不會存放在你的 Supabase 資料庫中**。Clerk 會全權負責身分安全，你的資料庫只需儲存 `clerk_user_id` 來對應資料。

---

### 1. Database: Supabase (PostgreSQL)

請在 Supabase 的 SQL Editor 執行以下指令。我們建立一個 `user_notes` 資料表，用來存放每個使用者的私有筆記。

```sql
-- 建立筆記資料表
CREATE TABLE user_notes (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL, -- 儲存從 Clerk 取得的使用者 ID
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入一些初始測試資料
-- 注意：這裡的 'user_2k...' 是模擬的 Clerk ID，實際上會在你登入後產生
INSERT INTO user_notes (clerk_user_id, content)
VALUES 
('default_user', '這是我的第一條祕密筆記！'),
('default_user', 'Hello World from FastAPI + Supabase');
```

---

### 2. Backend: FastAPI (`main.py`)

你需要安裝：`pip install fastapi uvicorn python-dotenv python-jose[cryptography] requests supabase`

```python
import os
import requests
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

# 允許跨域請求 (讓前端 React 可以存取)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 環境變數設定
CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL") # 例如 https://clerk.your-app.com
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
security = HTTPBearer()

# 驗證 Clerk Token 的函式
def get_current_user(res: HTTPAuthorizationCredentials = Depends(security)):
    token = res.credentials
    try:
        # 取得 Clerk 公鑰來驗證 JWT
        jwks_url = f"{CLERK_ISSUER_URL}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()
        
        # 解碼並驗證 (這會檢查過期時間與簽章)
        payload = jwt.decode(token, jwks, algorithms=["RS256"], issuer=CLERK_ISSUER_URL)
        return payload["sub"] # 這就是 clerk_user_id
    except Exception:
        raise HTTPException(status_code=401, detail="無效的憑證")

@app.get("/api/notes")
async def get_notes(user_id: str = Depends(get_current_user)):
    # 只提取屬於該使用者的資料
    response = supabase.table("user_notes")\
        .select("*")\
        .eq("clerk_user_id", user_id)\
        .execute()
    
    return response.data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### 3. Frontend: React TSX (`App.tsx`)

你需要安裝：`npm install @clerk/clerk-react`

```tsx
import React, { useState } from 'react';
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useAuth 
} from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function NotesList() {
  const [notes, setNotes] = useState<any[]>([]);
  const { getToken } = useAuth();

  const fetchNotes = async () => {
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
      setNotes(data);
    } catch (err) {
      console.error("抓取資料失敗", err);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <button onClick={fetchNotes} style={btnStyle}>從資料庫提取資料 (GET)</button>
      <ul>
        {notes.map(note => (
          <li key={note.id}>{note.content} <small>({note.created_at})</small></li>
        ))}
        {notes.length === 0 && <p>目前沒有資料，或請點擊按鈕提取。</p>}
      </ul>
    </div>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>TrustCase: Clerk + FastAPI + Supabase</h1>

        {/* 登出狀態 */}
        <SignedOut>
          <p>請登入以查看您的私有筆記</p>
          <SignInButton mode="modal">
            <button style={btnStyle}>登入 / 註冊</button>
          </SignInButton>
        </SignedOut>

        {/* 登入狀態 */}
        <SignedIn>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <span>您已成功登入！</span>
              <UserButton afterSignOutUrl="/" />
            </div>
            
            <NotesList />
          </div>
        </SignedIn>
      </div>
    </ClerkProvider>
  );
}

const btnStyle = {
  padding: '10px 20px',
  backgroundColor: '#6c5ce7',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer'
};

export default App;
```

---

### 4. 流程解釋

1.  **登入與註冊**：
    *   使用者在前端點擊 `<SignInButton>`。
    *   Clerk 彈出視窗，處理 Email、密碼或 Google 登入。
    *   **不需要寫後端登入程式碼**，Clerk 會處理一切並在瀏覽器儲存 Session。

2.  **提取資料 (GET Request)**：
    *   前端 `NotesList` 元件呼叫 `getToken()`，這會從 Clerk 取得一個加密的 **JWT Token**。
    *   前端將 Token 放入 Header：`Authorization: Bearer <TOKEN>` 發送給 FastAPI。
    *   FastAPI 收到請求，透過 `get_current_user` 攔截器，去 Clerk 的 URL 下載公鑰並驗證 Token。
    *   如果 Token 合法，FastAPI 從 Token 拆解出使用者的 ID (`sub`)。
    *   FastAPI 去 Supabase 搜尋 `WHERE clerk_user_id = '當前使用者ID'`，確保使用者**只能看到自己的資料**。

3.  **登出**：
    *   使用者點擊 `<UserButton>` 中的 Sign Out。
    *   Clerk 自動清除瀏覽器的 Cookie 與 Token。
    *   React 偵測到狀態改變，`<SignedIn>` 內的內容自動消失，回到 `<SignedOut>` 狀態。

### .env 檔案範例

**FastAPI (`.env`):**
```env
CLERK_ISSUER_URL=https://your-clerk-instance.clerk.accounts.dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

**React (`.env`):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```