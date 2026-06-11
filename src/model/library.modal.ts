import mongoose, { Document, Schema, Types } from "mongoose";
import { IMediaUrl } from "./gift.modal";

export interface ILibrary extends Document {
    title: string;
    mediaUrl: IMediaUrl[];
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const LibrarySchema: Schema = new Schema<ILibrary>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 200,
        },
        mediaUrl: {
            type: [
                {
                    _id: false,
                    url: { type: String, required: true },
                    public_id: { type: String, required: true },
                },
            ],
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
    },
    { timestamps: true }
);

const LibraryModel = mongoose.model<ILibrary>("Library", LibrarySchema);

export default LibraryModel;
