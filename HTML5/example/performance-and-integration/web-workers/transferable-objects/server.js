const http = require('http');
const fs = require('fs');

http.createServer((request, response) => {
  if (request.url === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html',
    });
    const html = fs.readFileSync('./index.html', 'utf8');
    response.end(html);
  } else if (request.url === '/main.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./main.js', 'utf8');
    response.end(html);
  } else if (request.url === '/worker.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./worker.js', 'utf8');
    response.end(html);
  }
}).listen(3000);
console.log('listen: 3000');