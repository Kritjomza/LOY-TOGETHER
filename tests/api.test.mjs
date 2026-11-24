import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/[...path].mjs';
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
function response() { return { code: 0, body: null, status(n) { this.code=n; return this; }, setHeader() { return this; }, json(x) { this.body=x; return this; } }; }

test('create uses a random room token and server-only secret', async () => {
  let captured;
  globalThis.fetch = async (url, options) => { captured={url,options}; return {ok:true,json:async()=>({id:'created'})}; };
  const res=response(); await handler({method:'POST',query:{path:['rooms']},body:{style:'orchid'}},res);
  assert.equal(res.code,201); assert.match(captured.url,/\/rpc\/loy_create$/);
  assert.equal(captured.options.headers.apikey,'sb_secret_test');
  const data=JSON.parse(captured.options.body); assert.match(data.p_id,/^[A-Za-z0-9_-]{24}$/); assert.equal(data.p_style,'orchid');
});
test('validate requests and forward room operations', async () => {
  const id='a'.repeat(24); let calls=0, sent;
  globalThis.fetch=async (url, options)=>{calls++;sent={url,body:JSON.parse(options.body)};return {ok:true,json:async()=>({id,wishes:[]})};};
  let res=response(); await handler({method:'POST',query:{path:['rooms',id,'wish']},body:{name:'  ',wish:'x'}},res); assert.equal(res.code,400); assert.equal(calls,0);
  res=response(); await handler({method:'POST',query:{path:['rooms',id,'wish']},body:{name:' A ',wish:' hello '}},res); assert.equal(res.code,200); assert.match(sent.url,/loy_wish$/); assert.deepEqual(sent.body,{p_id:id,p_name:'A',p_wish:'hello'});
  res=response(); await handler({method:'GET',query:{path:['rooms',id]}},res); assert.match(sent.url,/loy_get$/); assert.equal(res.code,200);
  res=response(); await handler({method:'POST',query:{path:['rooms',id,'float']}},res); assert.match(sent.url,/loy_float$/); assert.equal(res.code,200);
});
test('database and missing configuration errors are handled', async () => {
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:409,error:'floated'})});
  let res=response(); await handler({method:'POST',query:{path:['rooms','a'.repeat(24),'float']}},res); assert.equal(res.code,409);
  const key=process.env.SUPABASE_SECRET_KEY; delete process.env.SUPABASE_SECRET_KEY;
  res=response(); await handler({method:'POST',query:{path:['rooms']},body:{}},res); assert.equal(res.code,503); process.env.SUPABASE_SECRET_KEY=key;
});
