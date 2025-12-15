const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// About page route
router.get('/about', (req, res) => {
  res.sendFile('about.html', { root: 'public' });
});

// API documentation route
router.get('/api-docs', (req, res) => {
  const apiDocs = {
    endpoints: [
      {
        method: 'POST',
        path: '/api/process-text',
        description: 'Process text and return statistics',
        body: { text: 'string' }
      },
      {
        method: 'POST',
        path: '/api/tasks',
        description: 'Add a new task',
        body: { task: 'string' }
      }
    ]
  };
  res.json(apiDocs);
});

module.exports = router;