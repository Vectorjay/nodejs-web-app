const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// API Routes
app.post('/api/process-text', (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const characters = text.length;
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  // Process text
  const uppercaseText = text.toUpperCase();
  const reversedText = text.split('').reverse().join('');
  const wordCount = words.length;
  
  res.json({
    originalText: text,
    processedText: uppercaseText,
    reversedText: reversedText,
    statistics: {
      characters,
      words: wordCount,
      sentences: sentences.length,
      readingTime: Math.ceil(wordCount / 200) // Assuming 200 words per minute
    }
  });
});

app.post('/api/tasks', (req, res) => {
  const { task } = req.body;
  
  if (!task || task.trim() === '') {
    return res.status(400).json({ error: 'Task description is required' });
  }
  
  // In a real app, you would save to a database
  // For now, we'll just return the task with an ID'
  const newTask = {
    id: Date.now(),
    text: task,
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Task added successfully',
    task: newTask
  });
});

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});