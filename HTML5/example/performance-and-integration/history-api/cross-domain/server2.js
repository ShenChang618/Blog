const http = require('http');
const fs = require('fs');

http.createServer((request, response) => {
  if (request.url === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html',
    });
    const html = fs.readFileSync('./index2.html', 'utf8');
    response.end(html);
  }
}).listen(3001);
console.log('listen: 3001');