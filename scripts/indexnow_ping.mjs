// Tells Bing, Yandex, Seznam, Naver (and the AI search tools built on Bing's
// index) that pages changed — no webmaster account needed. Ownership is proven
// by public/6367c8eb139d71462c00843a886d80fa.txt. Run after a deploy that changes public content:
//   node scripts/indexnow_ping.mjs
// Google does not use IndexNow; it discovers changes via the sitemap in robots.txt.
const HOST = 'www.msclubsist.in';
const KEY = '6367c8eb139d71462c00843a886d80fa';
const urls = ['/', '/terms', '/sitemap.xml', '/llms.txt'].map(p => `https://${HOST}${p}`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});

// 200 = accepted, 202 = accepted pending key check; 403 means the key file isn't live yet.
console.log(`IndexNow: HTTP ${res.status}`, await res.text());
