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
        if (req.method === 'GET' && url.pathname === '/api/river') return send(res,200,Object.values(rooms).filter(r=>r.floated).slice(-30).reverse().map(r=>({style:r.style,wishes:r.wishes.map(({name,wish})=>({name,wish}))})));
        const match = url.pathname.match(/^\/api\/rooms\/([\w-]+)(?:\/(wish|float|style))?$/);
        if (!match || !rooms[match[1]]) return send(res,404,{error:'ไม่พบห้องนี้'});
        const room = rooms[match[1]];
        const view = () => ({...room, wishes: room.wishes.map(({token, ...person}) => person)});
        if (req.method === 'GET' && !match[2]) return send(res,200,view());
        if (req.method === 'POST' && ['wish','float','style'].includes(match[2])) {
          const token = clean(input.token,64);
          if (!/^[a-f0-9]{64}$/.test(token)) return send(res,400,{error:'ข้อมูลผู้เข้าร่วมไม่ถูกต้อง'});
          if (room.floated) return send(res,409,{error:'กระทงลอยไปแล้ว'});
          const person = room.wishes.find(p => p.token === token);
          if (match[2] === 'wish') {
            const name=clean(input.name,30), wish=clean(input.wish,200);
            if (!name || !wish) return send(res,400,{error:'กรุณาใส่ชื่อและคำอธิษฐาน'});
            if (!person && room.wishes.length >= 2) return send(res,409,{error:'ห้องนี้มีผู้เข้าร่วมครบสองคนแล้ว'});
            if (person) { person.name=name; person.wish=wish; person.ready=false; }
            else room.wishes.push({token,name,wish,ready:false});
          } else if (!person) return send(res,403,{error:'กรุณาใส่ชื่อและคำอธิษฐานก่อน'});
          else if (match[2] === 'style') {
            if (!['lotus','gold','orchid','jasmine'].includes(input.style)) return send(res,400,{error:'ไม่พบกระทงแบบนี้'});
            room.style=input.style; room.wishes.forEach(p => p.ready=false);
          } else {
            if (room.wishes.length !== 2) return send(res,409,{error:'รอให้เพื่อนเข้าร่วมก่อน'});
            person.ready=true; room.floated=room.wishes.every(p => p.ready);
          }
          save(); return send(res,200,view());
        }
        return send(res,405,{error:'ไม่รองรับคำขอนี้'});
      } catch (error) { console.error(error); return send(res,500,{error:'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'}); }
    }); return;
  }
  const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/client.js':'client.js'};
  const file = files[url.pathname]; if (!file) {res.writeHead(404); return res.end('Not found');}
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
  res.writeHead(200,{'Content-Type': type + '; charset=utf-8'}); fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`Loy Together: http://localhost:${process.env.PORT || 3000}`));
