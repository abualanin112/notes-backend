import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../../src/app.js';
import setupTestDB from '../utils/setupTestDB.js';
import { prisma } from '../../src/infrastructure/prisma.js';
import { userOne, userTwo, insertUsers } from '../fixtures/user.fixture.js';
import { userOneAccessToken } from '../fixtures/token.fixture.js';
import { noteOne, noteTwo, noteThree, insertNotes } from '../fixtures/note.fixture.js';

setupTestDB();

// Helper to generate a valid CUID2 id for malformed checks
const generateValidCuid2 = () => {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

describe('Note routes', () => {
  describe('POST /v1/notes', () => {
    let newNote;

    beforeEach(() => {
      newNote = {
        title: 'My sweet note',
        content: 'This note is very optimized and secure.',
        tags: ['important', 'personal'],
        archived: false,
      };
    });

    test('should return 201 and successfully create a new note if data is ok', async () => {
      await insertUsers([userOne]);

      const res = await request(app)
        .post('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newNote)
        .expect(httpStatus.CREATED);

      expect(res.body.data).toMatchObject({
        id: expect.any(String),
        title: newNote.title,
        content: newNote.content,
        archived: newNote.archived,
        tags: newNote.tags,
        ownerId: userOne.id,
      });

      const dbNote = await prisma.note.findUnique({ where: { id: res.body.data.id } });
      expect(dbNote).toBeDefined();
      expect(dbNote).toMatchObject({
        title: newNote.title,
        content: newNote.content,
        archived: newNote.archived,
        ownerId: userOne.id,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).post('/v1/notes').send(newNote).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 error if title is shorter than 3 characters', async () => {
      await insertUsers([userOne]);
      newNote.title = 'ab';

      await request(app)
        .post('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newNote)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if content is missing', async () => {
      await insertUsers([userOne]);
      delete newNote.content;

      await request(app)
        .post('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newNote)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/notes', () => {
    test('should return 200 and return all notes belonging to the logged-in user', async () => {
      await insertUsers([userOne, userTwo]);
      await insertNotes([noteOne, noteTwo, noteThree]);

      const res = await request(app)
        .get('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.data).toHaveProperty('results');
      expect(res.body.data.results).toHaveLength(2);
      const expectedFirst = noteOne.id > noteTwo.id ? noteOne : noteTwo;
      const expectedSecond = noteOne.id > noteTwo.id ? noteTwo : noteOne;

      expect(res.body.data.results[0]).toMatchObject({
        id: expectedFirst.id,
        ownerId: userOne.id,
      });
      expect(res.body.data.results[1]).toMatchObject({
        id: expectedSecond.id,
        ownerId: userOne.id,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).get('/v1/notes').expect(httpStatus.UNAUTHORIZED);
    });

    test('should correctly filter notes by archived status', async () => {
      await insertUsers([userOne, userTwo]);
      const archivedNote = { ...noteOne, id: generateValidCuid2(), archived: true };
      await insertNotes([noteOne, noteTwo, archivedNote]);

      const res = await request(app)
        .get('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ archived: 'true' })
        .expect(httpStatus.OK);

      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].id).toBe(archivedNote.id);
    });

    test('should correctly filter notes by search term in title or content', async () => {
      await insertUsers([userOne]);
      const specialNote = {
        ...noteOne,
        id: generateValidCuid2(),
        title: 'Secret Agent Chronicles',
        content: 'This note has confidential data.',
      };
      await insertNotes([noteOne, noteTwo, specialNote]);

      const res = await request(app)
        .get('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ search: 'Chronicles' })
        .expect(httpStatus.OK);

      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].id).toBe(specialNote.id);
    });

    test('should correctly apply limit and cursor pagination', async () => {
      await insertUsers([userOne]);
      // noteOne and noteTwo belong to userOne, let's query with limit = 1
      await insertNotes([noteOne, noteTwo]);

      const res = await request(app)
        .get('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ limit: 1 })
        .expect(httpStatus.OK);

      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data).toHaveProperty('nextCursor');
      expect(res.body.data.nextCursor).toBeDefined();

      // Retrieve the next page using nextCursor
      const secondPageRes = await request(app)
        .get('/v1/notes')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ limit: 1, cursor: res.body.data.nextCursor })
        .expect(httpStatus.OK);

      expect(secondPageRes.body.data.results).toHaveLength(1);
    });
  });

  describe('GET /v1/notes/:noteId', () => {
    test('should return 200 and the note object if the user is the owner', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      const res = await request(app)
        .get(`/v1/notes/${noteOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.data).toMatchObject({
        id: noteOne.id,
        title: noteOne.title,
        content: noteOne.content,
        ownerId: userOne.id,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      await request(app).get(`/v1/notes/${noteOne.id}`).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 error if note does not exist', async () => {
      await insertUsers([userOne]);
      const randomNoteId = generateValidCuid2();

      await request(app)
        .get(`/v1/notes/${randomNoteId}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 404 error if note belongs to another user', async () => {
      await insertUsers([userOne, userTwo]);
      await insertNotes([noteThree]); // belongs to userTwo

      await request(app)
        .get(`/v1/notes/${noteThree.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if noteId is malformed', async () => {
      await insertUsers([userOne]);

      await request(app)
        .get('/v1/notes/invalid-note-id')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /v1/notes/:noteId', () => {
    let updateBody;

    beforeEach(() => {
      updateBody = {
        title: 'New super cool title',
        content: 'Brand new optimized content.',
      };
    });

    test('should return 200 and successfully update the note if user is the owner', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      const res = await request(app)
        .patch(`/v1/notes/${noteOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.data).toMatchObject({
        id: noteOne.id,
        title: updateBody.title,
        content: updateBody.content,
        ownerId: userOne.id,
      });

      const dbNote = await prisma.note.findUnique({ where: { id: noteOne.id } });
      expect(dbNote.title).toBe(updateBody.title);
      expect(dbNote.content).toBe(updateBody.content);
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      await request(app).patch(`/v1/notes/${noteOne.id}`).send(updateBody).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 error if note does not exist', async () => {
      await insertUsers([userOne]);
      const randomNoteId = generateValidCuid2();

      await request(app)
        .patch(`/v1/notes/${randomNoteId}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 404 error if note belongs to another user', async () => {
      await insertUsers([userOne, userTwo]);
      await insertNotes([noteThree]); // belongs to userTwo

      await request(app)
        .patch(`/v1/notes/${noteThree.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if update data is empty', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      await request(app)
        .patch(`/v1/notes/${noteOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({})
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /v1/notes/:noteId', () => {
    test('should return 204 and successfully delete the note if user is the owner', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      await request(app)
        .delete(`/v1/notes/${noteOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const dbNote = await prisma.note.findUnique({ where: { id: noteOne.id } });
      expect(dbNote).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await insertNotes([noteOne]);

      await request(app).delete(`/v1/notes/${noteOne.id}`).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 error if note does not exist', async () => {
      await insertUsers([userOne]);
      const randomNoteId = generateValidCuid2();

      await request(app)
        .delete(`/v1/notes/${randomNoteId}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 404 error if note belongs to another user', async () => {
      await insertUsers([userOne, userTwo]);
      await insertNotes([noteThree]); // belongs to userTwo

      await request(app)
        .delete(`/v1/notes/${noteThree.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);

      const dbNote = await prisma.note.findUnique({ where: { id: noteThree.id } });
      expect(dbNote).not.toBeNull();
    });
  });
});
