import os
import jwt
from jwt import PyJWKClient
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# 初始化 Clerk JWKS Client
JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL)

if not all([CLERK_ISSUER_URL, SUPABASE_URL, SUPABASE_KEY]):
    print("Warning: Missing environment variables. Please check your .env file.")

# 初始化 Supabase client
# 注意：在實際運行前，確保環境變數已正確聯結
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
except Exception as e:
    print(f"Error initializing Supabase: {e}")
    supabase = None

security = HTTPBearer()

# 驗證 Clerk Token 的函式
def get_current_user(res: HTTPAuthorizationCredentials = Depends(security)):
    token = res.credentials
    try:
        # 使用 PyJWKClient 自動取得公鑰並快取
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # 解碼並驗證 (這會檢查過期時間與簽章)
        payload = jwt.decode(
            token, 
            signing_key.key, 
            algorithms=["RS256"], 
            issuer=CLERK_ISSUER_URL,
            options={"verify_aud": False}  # Clerk JWT 的 aud 通常是前端 Client ID，若後端不需要驗證 aud 可設為 False
        )
        return payload["sub"] # 這就是 clerk_user_id
    except Exception as e:
        print(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="無效的憑證")

from pydantic import BaseModel

class NoteCreate(BaseModel):
    content: str

@app.get("/api/notes")
async def get_notes(user_id: str = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    # 只提取屬於該使用者的資料
    response = supabase.table("user_notes")\
        .select("*")\
        .eq("clerk_user_id", user_id)\
        .execute()
    
    # JIT Sync: 如果是全新使用者，幫他建立一則歡迎筆記
    if not response.data:
        welcome_note = {
            "clerk_user_id": user_id,
            "content": "歡迎來到 TrustCase！您的第一個私密筆記已在此啟動。🚀"
        }
        supabase.table("user_notes").insert(welcome_note).execute()
        
        # 重新抓取資料
        response = supabase.table("user_notes")\
            .select("*")\
            .eq("clerk_user_id", user_id)\
            .execute()
            
    return response.data

@app.post("/api/notes")
async def create_note(note: NoteCreate, user_id: str = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    new_note = {
        "clerk_user_id": user_id,
        "content": note.content
    }
    
    response = supabase.table("user_notes").insert(new_note).execute()
    return response.data[0] if response.data else {}

@app.get("/")
async def root():
    return {"message": "Clerk + FastAPI + Supabase API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
