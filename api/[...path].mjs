import { randomBytes } from 'node:crypto';

const styles = new Set(['lotus', 'gold', 'orchid', 'jasmine']);
const json = (res, status, value) => res.status(status).setHeader('Cache-Control', 'no-store').json(value);
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  if (path[0] !== 'rooms' || path.length > 3) return json(res, 404, { error: 'ไม่พบห้องนี้' });
  const [ , id, action ] = path;
  let operation;
  let args;
  if (req.method === 'POST' && !id) {
    operation = 'create';
    args = { p_id: randomBytes(18).toString('base64url'), p_style: styles.has(req.body?.style) ? req.body.style : 'lotus' };
  } else if (id && /^[A-Za-z0-9_-]{24}$/.test(id) && req.method === 'GET' && !action) {
    operation = 'get'; args = { p_id: id };
  } else if (id && /^[A-Za-z0-9_-]{24}$/.test(id) && req.method === 'POST' && action === 'wish') {
    const name = clean(req.body?.name, 30), wish = clean(req.body?.wish, 200);
    if (!name || !wish) return json(res, 400, { error: 'กรุณาใส่ชื่อและคำอธิษฐาน' });
    operation = 'wish'; args = { p_id: id, p_name: name, p_wish: wish };
  } else if (id && /^[A-Za-z0-9_-]{24}$/.test(id) && req.method === 'POST' && action === 'float') {
    operation = 'float'; args = { p_id: id };
  } else return json(res, 404, { error: 'ไม่พบห้องนี้' });

  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return json(res, 503, { error: 'ยังไม่ได้ตั้งค่าฐานข้อมูลบนเซิร์ฟเวอร์' });
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/rest/v1/rpc/loy_${operation}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, body: JSON.stringify(args),
    });
    if (!response.ok) { console.error('Database request failed:', response.status); return json(res, 502, { error: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง' }); }
    const result = await response.json();
    if (result.error) return json(res, result.status || 400, { error: result.error });
    return json(res, operation === 'create' ? 201 : 200, result);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return json(res, 502, { error: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง' });
  }
}
