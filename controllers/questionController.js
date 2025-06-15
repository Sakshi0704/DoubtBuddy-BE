const Question = require('../models/Question');
const User = require('../models/User');

// Create a new question
exports.createQuestion = async (req, res) => {
  try {
    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ msg: 'Only students can create questions' });
    }

    const { title, description, topic } = req.body;
    
    if (!title || !description || !topic) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    const question = await Question.create({
      title,
      description,
      topic,
      student: req.user.id,
      status: 'unassigned'
    });
    
    await question.populate([
      { path: 'student', select: 'name email' }
    ]);

    res.status(201).json(question);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ msg: 'Server error while creating question', error: err.message });
  }
};

// Get questions based on user role
exports.getQuestions = async (req, res) => {
  try {
    let query = {};
    
    // If student, show only their questions
    if (req.user.role === 'student') {
      query.student = req.user.id;
    }
    // If tutor, show questions assigned to them
    else if (req.user.role === 'tutor') {
      query.assignedTo = req.user.id;
    }

    const questions = await Question.find(query)
      .populate('student', 'name email')
      .populate('assignedTo', 'name email')
      .sort('-createdAt');
    
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ msg: 'Server error while fetching questions', error: err.message });
  }
};

// Get student's questions
exports.getMyQuestions = async (req, res) => {
  try {
    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ msg: 'Access denied. Students only.' });
    }

    const questions = await Question.find({ student: req.user.id })
      .populate('student', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email')
      .sort('-createdAt');
      
    res.json(questions);
  } catch (err) {
    console.error('Error fetching my questions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get assigned questions for tutor
exports.getAssignedQuestions = async (req, res) => {
  try {
    // Verify user is a tutor
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ msg: 'Access denied. Tutors only.' });
    }

    const questions = await Question.find({ 
      assignedTo: req.user.id,
      status: { $in: ['assigned', 'resolved'] }
    })
      .populate('student', 'name email')
      .populate('assignedTo', 'name email')
      .sort('-updatedAt');
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get available doubts for tutor
exports.getAvailableDoubtsForTutor = async (req, res) => {
  try {
    // Verify user is a tutor
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ msg: 'Access denied. Tutors only.' });
    }

    const questions = await Question.find({ 
      status: { $in: ['unassigned', 'open'] },  // Accept both statuses
      assignedTo: { $exists: false }
    })
      .populate('student', 'name email')
      .sort('-createdAt');
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign tutor to question
exports.assignTutor = async (req, res) => {
  try {
    // Verify user is a tutor
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ msg: 'Access denied. Tutors only.' });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    if (question.status !== 'unassigned' && question.status !== 'open') {
      return res.status(400).json({ msg: 'This doubt is already assigned or resolved' });
    }

    // Update the question
    question.assignedTo = req.user.id;
    question.status = 'assigned';
    await question.save();

    // Populate and return the updated question
    await question.populate([
      { path: 'student', select: 'name email' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    res.json(question);
  } catch (err) {
    console.error('Error assigning tutor:', err);
    res.status(500).json({ msg: 'Server error while assigning tutor', error: err.message });
  }
};

// Update question status
exports.updateQuestionStatus = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    
    if (!status) {
      return res.status(400).json({ msg: 'Status is required' });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    // Verify user is the assigned tutor
    if (question.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied. Only assigned tutor can update status.' });
    }

    question.status = status;
    if (resolution) {
      question.resolution = resolution;
    }
    
    await question.save();

    // Populate and return the updated question
    await question.populate([
      { path: 'student', select: 'name email' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    res.json(question);
  } catch (err) {
    console.error('Error updating question status:', err);
    res.status(500).json({ msg: 'Server error while updating status', error: err.message });
  }
};

exports.resolveDoubt = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    if (question.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to resolve this doubt' });
    }

    if (req.body.comment) {
      question.comments.push({
        content: req.body.comment,
        author: req.user.id
      });
    }

    question.status = 'resolved';
    await question.save();
    
    await question.populate('comments.author', 'name email');
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a comment to a question
exports.addComment = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }    // Create the new comment
    const newComment = {
      user: req.user.id,
      text: req.body.text || req.body.content  // Accept both text and content
    };

    if (!newComment.text) {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    // Add to comments array
    question.comments.unshift(newComment);
    await question.save();

    // Return the populated comments
    const populatedQuestion = await Question.findById(req.params.questionId)
      .populate('comments.user', 'name email')
      .populate('comments.replies.user', 'name email');

    res.json(populatedQuestion.comments);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ msg: 'Server error while adding comment', error: err.message });
  }
};

exports.addReply = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    const comment = question.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    const newReply = {
      user: req.user.id,
      text: req.body.text
    };

    comment.replies.unshift(newReply);
    await question.save();

    const populatedQuestion = await Question.findById(req.params.questionId)
      .populate('comments.user', 'name email')
      .populate('comments.replies.user', 'name email');

    res.json(populatedQuestion.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId)
      .populate('comments.user', 'name email')
      .populate('comments.replies.user', 'name email');

    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    res.json(question.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reopen a resolved doubt
exports.reopenDoubt = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    // Verify user is the student who created the doubt
    if (question.student.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the student who created this doubt can reopen it' });
    }

    // Can only reopen resolved doubts
    if (question.status !== 'resolved') {
      return res.status(400).json({ msg: 'Only resolved doubts can be reopened' });
    }

    const { reason } = req.body;
    
    // Update the question status and add the reopen reason as a comment
    question.status = 'assigned'; // Keep the same tutor assigned
    question.comments.unshift({
      user: req.user.id,
      text: `Doubt reopened. Reason: ${reason}`,
    });

    await question.save();

    // Populate and return the updated question
    await question.populate([
      { path: 'student', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'comments.user', select: 'name email' }
    ]);

    res.json(question);
  } catch (err) {
    console.error('Error reopening doubt:', err);
    res.status(500).json({ error: err.message });
  }
};

// Rate a resolved doubt
exports.rateDoubt = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    // Verify user is the student who created the doubt
    if (question.student.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the student who created this doubt can rate it' });
    }

    // Can only rate resolved doubts
    if (question.status !== 'resolved') {
      return res.status(400).json({ msg: 'Only resolved doubts can be rated' });
    }

    // Check if already rated
    if (question.rating && question.rating.score) {
      return res.status(400).json({ msg: 'This doubt has already been rated' });
    }

    const { score, feedback } = req.body;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ msg: 'Please provide a valid rating score between 1 and 5' });
    }

    question.rating = {
      score,
      feedback: feedback || '',
      ratedAt: new Date()
    };

    await question.save();

    // Populate and return the updated question
    await question.populate([
      { path: 'student', select: 'name email' },
      { path: 'assignedTo', select: 'name email' }
    ]);

    res.json(question);
  } catch (err) {
    console.error('Error rating doubt:', err);
    res.status(500).json({ error: err.message });
  }
};
