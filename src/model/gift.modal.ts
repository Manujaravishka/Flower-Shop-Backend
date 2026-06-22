import mongoose, { Document, Schema } from "mongoose";

export enum Category {
    Boquets = "BOQUETS",
    Pot = "POT",
    Flowers = "FLOWERS",
    Keytag = "KEYTAG",
    GiftBox = "GIFTBOX",
}

export enum Size {
    Small = "SMALL",
    Medium = "MEDIUM",
    Large = "LARGE",
}

export interface IMediaUrl {
    url: string;
    public_id: string;
}

export interface IGift extends Document {
    name: string;
    description: string;
    price: number;
    colour: string;
    size: Size;
    category: Category[];
    mediaUrl: IMediaUrl[];
    imageUrl?: IMediaUrl[];
    stock: number;
    isActive: boolean;
    slug?: string;
    createdAt: Date;
    updatedAt: Date;
}

const giftSchema: Schema = new Schema<IGift>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 200,
            index: true,
        },
        description: { type: String, required: false, maxlength: 2000 },
        price: { type: Number, required: true, min: 0, index: true },
        colour: { type: String, required: true, trim: true },
        size: {
            type: String,
            enum: Object.values(Size),
            required: false,
        },
        category: {
            type: [String],
            enum: Object.values(Category),
            required: true,
            index: true,
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
            default: [],
            alias: "imageUrl",
        },
        stock: { type: Number, default: 0, min: 0 },
        isActive: { type: Boolean, default: true, index: true },
        slug: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
        },
    
    },
    { timestamps: true }
);

giftSchema.index({ name: "text", description: "text" });

giftSchema.pre("init", function (raw: Record<string, unknown>) {
    const doc = raw as Record<string, unknown>;
    if (doc.imageUrl && !doc.mediaUrl) {
        doc.mediaUrl = doc.imageUrl;
    }
    delete doc.imageUrl;
    if (doc.mediaUrl && typeof doc.mediaUrl === "string") {
        doc.mediaUrl = [{ url: doc.mediaUrl, public_id: "" }];
    }
    if (
        doc.mediaUrl &&
        Array.isArray(doc.mediaUrl) &&
        doc.mediaUrl.length > 0 &&
        typeof doc.mediaUrl[0] === "string"
    ) {
        doc.mediaUrl = (doc.mediaUrl as string[]).map((u) => ({
            url: u,
            public_id: "",
        }));
    }
});

const Gift = mongoose.model<IGift>("Gift", giftSchema);

export default Gift;
