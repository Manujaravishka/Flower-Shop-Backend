import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
    productId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    rating: number;
    title: string;
    comment: string;
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema: Schema = new Schema<IReview>(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Gift",
            required: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },
        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },
        isApproved: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

reviewSchema.index({ productId: 1, createdAt: -1 });

const Review = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
