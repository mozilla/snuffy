/**
 * Before any test in the entire project starts, spin up a server to serve test
 * pages to the Selenium-driven headless Firefox we use in some tests.
 */
const http = require('http');
const fs = require('fs');
const url = require('url');


const PORT = 8000;
const server = http.createServer((request, response) => {
    console.log('processing request');
    // TODO: Replace url.parse with url.URL.
    // eslint-disable-next-line node/no-deprecated-api
    const path = url.parse(request.url).pathname;
    fs.readFile(__dirname + path, 'utf8', (error, data) => {
        if (error) {
            console.error(`There was a ${error.code} error fetching the resource at ${path}.`);
        } else {
            console.log(`Fetched resource at ${path}`);
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(data);
            response.end();
        }
    });
});

before(
    function start_server() {
        server.listen(PORT);
        console.log(`Serving from ${__dirname} at http://localhost:${PORT}... listening: ${server.listening}`);
    }
);

after(
    function stop_server() {
        server.close();
    }
);
