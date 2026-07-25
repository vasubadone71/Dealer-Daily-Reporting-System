const fetch = require('node-fetch'); // node 18+ has global fetch, but we'll just use http module

const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login/admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Login response:', body);
    try {
      const parsed = JSON.parse(body);
      if (parsed.token) {
        console.log('Got token, fetching inventory tree...');
        const req2 = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/master/inventory-tree',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + parsed.token
          }
        }, res2 => {
          let body2 = '';
          res2.on('data', d => body2 += d);
          res2.on('end', () => console.log('Inventory Tree:', JSON.parse(body2)));
        });
        req2.end();
      }
    } catch (e) {
      console.log('Error parsing JSON');
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
