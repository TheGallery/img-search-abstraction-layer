const mongo = require('mongodb').MongoClient;
const fetch = require('node-fetch');

function queryImages (res, query, offset = 1) {
  // Imgur's API returns 60 items max per page (no support for limit)
  // so we need to calculate the page based on our offset which returns 10 items/page
  const page = Math.floor((offset * 10) / 60) + 1;

  fetch(`https://api.imgur.com/3/gallery/search/top/all/${page}?q=${query}`, {
    headers: {
      authorization: `Client-ID ${process.env.CLIENT_ID}`
    }
  })
  .then(data => data.json())
  .then(({data}) => saveQuery(res, query, offset, data))
  .catch(err => {
    error(res, 'FETCH', err);
  });
}

function getSearchHistory (res) {
  mongo.connect(process.env.DB, (err, db) => {
    if (err) error(res, 'DB_CONNECT', err);

    db.collection('searches').find()
      .sort({time: -1}) // sort by newest
      .limit(10)
      .toArray((err, data) => {
        if (err) error(res, 'DB_FIND', err);

        res.json(
          data.map(search => ({query: search.query, time: search.time}))
        );
      });

    db.close();
  });
}

function saveQuery (res, query, offset, data) {
  mongo.connect(process.env.DB, (err, db) => {
    if (err) error(res, 'DB_CONNECT', err);

    db.collection('searches').insert({
      query: query,
      time: new Date().toISOString()
    }, (err) => {
      if (err) error(res, 'DB_INSERT', err);

      displayResults(res, offset, data);
    });

    db.close();
  });
}

function displayResults (res, offset, data) {
  // We only display 10 results per page
  const sliceIndex = ((offset % 10) - 1) * 10;

  const filteredData = data
    .slice(sliceIndex, sliceIndex + 10)
    .map(post => {
      return {
        url: (post.is_album) ? post.images[0].link : post.link,
        description: post.title,
        context: (post.is_album) ? post.link : `https://i.imgur.com/${post.id}`
      };
    });

  if (filteredData.length) {
    res.json(filteredData);
  } else {
    error(res, 'NO_RESULT');
  }
}

function error (res, type, err = '') {
  const errors = {
    FETCH: 'An error occured while fetching images',
    DB_CONNECT: 'There was an error connecting to the database.',
    DB_INSERT: 'There was an error when inserting data to the database.',
    NO_RESULT: 'We couldn\'t find any images that match your query. Try searching for something else.'
  };

  if (err) {
    console.log(errors[type]);
    console.log(`${err.name}: ${err.message}`);
  }

  res.json({
    error: errors[type]
  });
}

module.exports = {
  queryImages,
  getSearchHistory
};
