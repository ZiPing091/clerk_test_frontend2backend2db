-- 建立筆記資料表
CREATE TABLE user_notes (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL, -- 儲存從 Clerk 取得的使用者 ID
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入一些初始測試資料
INSERT INTO user_notes (clerk_user_id, content)
VALUES 
('default_user', '這是我的第一條祕密筆記！'),
('default_user', 'Hello World from FastAPI + Supabase');
