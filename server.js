const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname, dataFile = path.join(root, 'rooms.json');
let rooms = {};
try { rooms = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const save = () => { const temp = dataFile + '.tmp'; fs.writeFileSync(temp, JSON.stringify(rooms)); fs.renameSync(temp, dataFile); };
const send = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
http.createServer((req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on('end', () => {
      try {
        const input = body ? JSON.parse(body) : {};
        if (req.method === 'POST' && url.pathname === '/api/rooms') {
          const id = crypto.randomBytes(9).toString('base64url');
          rooms[id] = {id, style: ['lotus','gold','orchid','jasmine'].includes(input.style) ? input.style : 'lotus', wishes: [], floated: false, createdAt: Date.now()}; save(); return send(res,201,rooms[id]);
        }
        const match = url.pathname.match(/^\/api\/rooms\/([\w-]+)(?:\/(wish|float))?$/);
        if (!match || !rooms[match[1]]) return send(res,404,{error:'ไม่พบห้องนี้'});
        const room = rooms[match[1]];
        if (req.method === 'GET' && !match[2]) return send(res,200,room);
        if (req.method === 'POST' && match[2] === 'wish') {
          const name = clean(input.name,30), wish = clean(input.wish,200);
          if (!name || !wish) return send(res,400,{error:'กรุณาใส่ชื่อและคำอธิษฐาน'});
          if (room.floated) return send(res,409,{error:'กระทงถูกลอยแล้ว สร้างห้องใหม่เพื่ออธิษฐานอีกครั้ง'});
          if (room.wishes.length >= 50) return send(res,400,{error:'ห้องนี้มีคำอธิษฐานครบ 50 ข้อแล้ว'});
          room.wishes.push({name,wish}); save(); return send(res,200,room);
        }
        if (req.method === 'POST' && match[2] === 'float') {
          if (!room.wishes.length) return send(res,400,{error:'เพิ่มคำอธิษฐานก่อนลอยกระทง'});
          room.floated = true; save(); return send(res,200,room);
        }
        return send(res,405,{error:'ไม่รองรับคำขอนี้'});
      } catch (error) { console.error(error); return send(res,500,{error:'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'}); }
    }); return;
  }
  const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js'};
  const file = files[url.pathname]; if (!file) {res.writeHead(404); return res.end('Not found');}
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
  res.writeHead(200,{'Content-Type': type + '; charset=utf-8'}); fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`Loy Together: http://localhost:${process.env.PORT || 3000}`));
