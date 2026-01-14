const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, 'db.json');
const uploadsDir = path.join(__dirname, 'public/uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const readData = () => {
  const data = fs.readFileSync(dbPath);
  return JSON.parse(data);
};

const writeData = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Get all articles
app.get('/api/articles', (req, res) => {
  const data = readData();
  res.json(data.articles);
});

// Get a single article
app.get('/api/articles/:id', (req, res) => {
  const data = readData();
  const article = data.articles.find(a => a.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ error: 'Article not found' });
  }
});

// Create a new article
app.post('/api/articles', upload.single('image'), (req, res) => {
  const data = readData();
  const newArticle = {
    id: uuidv4(),
    title: req.body.title,
    content: req.body.content,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.articles.push(newArticle);
  writeData(data);
  res.status(201).json(newArticle);
});

// Update an article
app.put('/api/articles/:id', upload.single('image'), (req, res) => {
  const data = readData();
  const articleIndex = data.articles.findIndex(a => a.id === req.params.id);
  if (articleIndex !== -1) {
    const oldArticle = data.articles[articleIndex];
    const updatedArticle = {
      ...oldArticle,
      ...req.body,
      updated_at: new Date().toISOString(),
    };
    if (req.file) {
      // Delete old image
      if (oldArticle.image) {
        const oldImagePath = path.join(__dirname, 'public', oldArticle.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updatedArticle.image = `/uploads/${req.file.filename}`;
    }
    data.articles[articleIndex] = updatedArticle;
    writeData(data);
    res.json(updatedArticle);
  } else {
    res.status(404).json({ error: 'Article not found' });
  }
});

// Delete an article
app.delete('/api/articles/:id', (req, res) => {
  const data = readData();
  const articleIndex = data.articles.findIndex(a => a.id === req.params.id);
  if (articleIndex !== -1) {
    const articleToDelete = data.articles[articleIndex];
    // Delete image file
    if (articleToDelete.image) {
      const imagePath = path.join(__dirname, 'public', articleToDelete.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    data.articles.splice(articleIndex, 1);
    writeData(data);
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Article not found' });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = { app, server };
