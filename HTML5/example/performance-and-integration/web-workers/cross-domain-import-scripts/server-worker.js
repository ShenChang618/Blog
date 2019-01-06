const http = require('http');
const fs = require('fs');

http.createServer((request, response) => {
  if (request.url === '/worker.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./worker.js', 'utf8');
    response.end(html);
  }
}).listen(3001);
console.log('listen: 3001');