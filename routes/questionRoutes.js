const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createQuestion,
  getQuestions,
  getMyQuestions,  // Add this
  getAvailableDoubtsForTutor,
  assignTutor,
  resolveDoubt,
  addComment,
  addReply,
  getComments,
  getAssignedQuestions,
  updateQuestionStatus,
  reopenDoubt, // Import reopenDoubt controller
  rateDoubt // Import rateDoubt controller
} = require('../controllers/questionController');

// Create a new question (students only)
router.post('/', auth, createQuestion);

// Get all questions
router.get('/', auth, getQuestions);

// Get my questions (for students)
router.get('/my-questions', auth, getMyQuestions);

// Get available doubts for tutor
router.get('/available', auth, getAvailableDoubtsForTutor);

// Get assigned questions for tutor
router.get('/assigned', auth, getAssignedQuestions);

// Assign tutor to question (tutors only)
router.post('/:questionId/assign', auth, assignTutor);

// Resolve doubt (assigned tutor only)
router.post('/:questionId/resolve', auth, resolveDoubt);

// Update question status
router.put('/:questionId/status', auth, updateQuestionStatus);

// Reopen a resolved doubt (student only)
router.put('/:questionId/reopen', auth, reopenDoubt);

// Rate a resolved doubt (student only)
router.put('/:questionId/rate', auth, rateDoubt);

// Comments and replies routes
router.get('/:questionId/comments', auth, getComments);
router.post('/:questionId/comments', auth, addComment);
router.post('/:questionId/comments/:commentId/replies', auth, addReply);

module.exports = router;
