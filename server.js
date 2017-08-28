require('dotenv').config();
const express = require('express');
const api = require('./api');

const app = express();

app.get('/api/search/:query', (req, res) => {
  api.queryImages(res, req.params.query, req.query.offset);
});

app.get('/api/history', (req, res) => {
  api.getSearchHistory(res);
});

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running.');
});
