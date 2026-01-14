const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('./index');

const dbPath = path.join(__dirname, 'db.json');
const uploadsDir = path.join(__dirname, 'public/uploads');
const dummyImagePath = path.join(__dirname, 'test-image.png');


describe('API Endpoints', () => {
  let initialData;

  beforeAll(() => {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  beforeEach(() => {
    initialData = {
      articles: [
        {
          id: 'test-id',
          title: 'Test Article',
          content: 'Test Content',
          image: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  });

  afterEach(() => {
    // Clean up dummy image file
    if (fs.existsSync(dummyImagePath)) {
        fs.unlinkSync(dummyImagePath);
    }
    // Clean up the uploads directory
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
    }
  });

  afterAll((done) => {
    server.close(done);
  });

  // Test GET all articles
  it('should get all articles', async () => {
    const res = await request(app).get('/api/articles');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Test Article');
  });

  // Test GET a single article
  it('should get a single article', async () => {
    const res = await request(app).get('/api/articles/test-id');
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe('Test Article');
  });

  it('should return 404 for a non-existent article', async () => {
    const res = await request(app).get('/api/articles/non-existent-id');
    expect(res.statusCode).toEqual(404);
  });

  // Test POST a new article
  it('should create a new article', async () => {
    const res = await request(app)
      .post('/api/articles')
      .send({ title: 'New Article', content: 'New Content' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toBe('New Article');

    const data = JSON.parse(fs.readFileSync(dbPath));
    expect(data.articles).toHaveLength(2);
  });

    // Test POST a new article with an image
  it('should create a new article with an image', async () => {
    fs.writeFileSync(dummyImagePath, 'dummy image content');
    const res = await request(app)
      .post('/api/articles')
      .field('title', 'New Article with Image')
      .field('content', 'New Content with Image')
      .attach('image', dummyImagePath);
    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toBe('New Article with Image');
    expect(res.body.image).not.toBeNull();
  });

  // Test PUT an article
  it('should partially update an article', async () => {
    const res = await request(app)
      .put('/api/articles/test-id')
      .send({ title: 'Updated Title' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.content).toBe('Test Content'); // Unchanged

    const data = JSON.parse(fs.readFileSync(dbPath));
    expect(data.articles[0].title).toBe('Updated Title');
    expect(data.articles[0].content).toBe('Test Content');
  });

  // Test DELETE an article
  it('should delete an article', async () => {
    const res = await request(app).delete('/api/articles/test-id');
    expect(res.statusCode).toEqual(204);

    const data = JSON.parse(fs.readFileSync(dbPath));
    expect(data.articles).toHaveLength(0);
  });
});
