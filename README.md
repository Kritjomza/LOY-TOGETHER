# Loy Together

เว็บลอยกระทงร่วมกัน แชร์ลิงก์ห้องและเพิ่มคำอธิษฐานลงในกระทงใบเดียวกัน

## ทดลองในเครื่อง

ใช้ Node.js 20 ขึ้นไป เปิด PowerShell ในโฟลเดอร์นี้แล้วรัน:

```powershell
node server.js
```

เปิด http://localhost:3000 โหมดนี้เก็บห้องใน `rooms.json` ในเครื่อง และแยกจากฐานข้อมูลออนไลน์ ห้องเดิมในไฟล์จะไม่ถูกย้ายขึ้น Supabase อัตโนมัติ

## นำขึ้น GitHub + Vercel + Supabase

1. สร้างโปรเจกต์ใหม่ใน [Supabase](https://supabase.com/dashboard) สำหรับเว็บนี้ รอให้โปรเจกต์พร้อมใช้งาน
2. เปิด **SQL Editor** ของโปรเจกต์ คัดลอกเนื้อหาทั้งหมดจาก `supabase-setup.sql` ไปวาง แล้วกด **Run** หนึ่งครั้ง สคริปต์สร้างตารางและฟังก์ชันใหม่ จึงควรใช้กับโปรเจกต์ใหม่หรือฐานข้อมูลที่ยังไม่มีวัตถุชื่อเดียวกัน
3. เปิด **Project Settings → API Keys** จด Project URL และสร้าง/คัดลอก Secret key ที่ขึ้นต้นด้วย `sb_secret_` เก็บเป็นความลับ ห้ามใส่ลง GitHub หรือส่งในแชต
4. สร้าง repository บน GitHub แล้วอัปโหลดไฟล์โปรเจกต์ โดยไม่รวม `rooms.json`, `.env`, `.vercel` และ `public` (ระบุไว้ใน `.gitignore` แล้ว) ตัวอย่างเมื่อสร้าง repository ว่างแล้ว:

   ```powershell
   git init
   git add .
   git commit -m "Prepare Loy Together for Vercel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```

   เปลี่ยน URL ให้ตรงกับ repository ของคุณ หากมี git อยู่แล้วไม่ต้อง `git init` หรือเพิ่ม remote ซ้ำ
5. เข้า [Vercel](https://vercel.com/new) → **Add New Project** → นำเข้า repository จาก GitHub ตั้งค่า Environment Variables ก่อนกด Deploy:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Project URL จาก Supabase |
   | `SUPABASE_SECRET_KEY` | Secret key `sb_secret_...` จาก Supabase |

   ควรเพิ่มค่าใน Production และ Preview ตามที่ต้องการใช้งาน อย่าใส่ key ในไฟล์หรือโค้ดฝั่งเบราว์เซอร์ หากเพิ่มหรือเปลี่ยนค่าหลัง deploy ต้อง deploy ใหม่
6. กด **Deploy** แล้วเปิด URL ที่ Vercel ให้มา สร้างห้อง คัดลอกลิงก์ เปิดอีกอุปกรณ์ เพิ่มคำอธิษฐาน และตรวจสอบว่าสถานะกระทงตรงกัน

หน้าเว็บเช็กข้อมูลห้องทุก 2.5 วินาที ห้องออนไลน์ใช้ลิงก์ที่สุ่มขึ้นเป็นกุญแจเข้าห้อง **ทุกคนที่มีลิงก์สามารถอ่านคำอธิษฐาน เพิ่มคำอธิษฐาน และกดลอยได้** จึงไม่ควรใส่ข้อมูลอ่อนไหว ระบบยังไม่มีบัญชีผู้ใช้ การลบห้องอัตโนมัติ หรือระบบจำกัดคำขอ ควรเพิ่มก่อนเปิดบริการวงกว้าง

## ตรวจสอบ

```powershell
npm test
npm run build
```

โหมดออนไลน์ต้องตั้งค่า Supabase จริงและ deploy จึงทดสอบการเชื่อมต่อครบวงจรได้
