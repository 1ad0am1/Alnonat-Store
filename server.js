const express = require('express');
const path = require('path');
const app = require('./app');
const server = express();
const PORT = process.env.PORT || 3000;

server.use(express.static(__dirname));
server.use('/public', express.static(path.join(__dirname, 'public')));
server.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
server.use('/api', app);
server.use('/', app);
server.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

server.listen(PORT, '0.0.0.0', () => console.log(`النون يعمل على http://localhost:${PORT}`));
