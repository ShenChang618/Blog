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
  } else if (request.url === '/import-script.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./import-script.js', 'utf8');
    response.end(html);
  } else if (request.url === '/import-script2.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./import-script2.js', 'utf8');
    response.end(html);
  } else if (request.url === '/import-script3.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./import-script3.js', 'utf8');
    response.end(html);
  } else if (request.url === '/import-script-text.txt') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
    });
    const html = fs.readFileSync('./import-script-text.txt', 'utf8');
    response.end(html);
  }
}).listen(3000);
console.log('listen: 3000');