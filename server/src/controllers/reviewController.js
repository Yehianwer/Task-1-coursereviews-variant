import Joi from 'joi';
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';

const objectId = Joi.string().hex().length(24);

const createSchema = Joi.object({
  courseCode: Joi.string().trim().uppercase().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow(''),
  reviewedBy: objectId
});

const updateSchema = Joi.object({
  courseCode: Joi.string().trim().uppercase(),
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().allow(''),
  reviewedBy: objectId.allow(null)
}).min(1);

function validateReviewId(id, res) {
  if (mongoose.isValidObjectId(id)) return true;
  res.status(400).json({ message: 'Invalid review id' });
  return false;
}

function handleDuplicateReview(err, res, next) {
  if (err?.code === 11000) {
    return res.status(409).json({
      message: 'This user has already reviewed this course'
    });
  }
  return next(err);
}

// GET /api/reviews
export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find()
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/:id
export async function getReview(req, res, next) {
  try {
    if (!validateReviewId(req.params.id, res)) return;

    const review = await Review.findById(req.params.id)
      .populate('reviewedBy', 'name email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ review });
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/summary?courseCode=CS101
export async function getCourseSummary(req, res, next) {
  try {
    const { value, error } = Joi.string()
      .trim()
      .uppercase()
      .required()
      .validate(req.query.courseCode);

    if (error) {
      return res.status(400).json({ message: 'courseCode query parameter is required' });
    }

    const [summary] = await Review.aggregate([
      { $match: { courseCode: value } },
      {
        $group: {
          _id: '$courseCode',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          courseCode: '$_id',
          averageRating: 1,
          reviewCount: 1
        }
      }
    ]);

    res.json(summary ?? {
      courseCode: value,
      averageRating: null,
      reviewCount: 0
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/reviews
export async function createReview(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const review = await Review.create(value);
    await review.populate('reviewedBy', 'name email');

    res.status(201).json({ review });
  } catch (err) {
    handleDuplicateReview(err, res, next);
  }
}

// PATCH /api/reviews/:id
export async function updateReview(req, res, next) {
  try {
    if (!validateReviewId(req.params.id, res)) return;

    const { value, error } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { new: true, runValidators: true }
    ).populate('reviewedBy', 'name email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ review });
  } catch (err) {
    handleDuplicateReview(err, res, next);
  }
}

// DELETE /api/reviews/:id
export async function deleteReview(req, res, next) {
  try {
    if (!validateReviewId(req.params.id, res)) return;

    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
