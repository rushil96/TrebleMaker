const fetch = require('node-fetch');
async function test() {
  const res = await fetch('https://www.last.fm/music/Maanu/_/Saamnay/+playerdetails?ajax=1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  const text = await res.text();
  console.log(res.status, text.substring(0, 500));
}
test();
