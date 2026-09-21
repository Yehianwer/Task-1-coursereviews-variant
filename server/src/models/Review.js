import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer'
      }
    },
    comment: {
      type: String,
      trim: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

reviewSchema.index(
  { courseCode: 1, reviewedBy: 1 },
  {
    unique: true,
    partialFilterExpression: { reviewedBy: { $type: 'objectId' } }
  }
);

export const Review = mongoose.model('Review', reviewSchema);
