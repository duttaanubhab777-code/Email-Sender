import mongoose from "mongoose";
import crypto from "crypto";

const apiKeySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true, 
            default: "Default Project Key"
        },
        key: {
            type: String,
            required: true,
            unique: true,
            index: true 
        },
        isActive: {
            type: Boolean,
            default: true 
        },
        usageCount: {
            type: Number,
            default: 0 
        },
        monthlyLimit: {
            type: Number,
            default: 500 
        }
    },
    { timestamps: true }
);

apiKeySchema.pre("validate",async function () {
    
    if (!this.key) {
        
        const randomString =  crypto.randomBytes(16).toString("hex");
        
        this.key = `Anubhab_email_sndr_${randomString}`;
    }
    
});



export const ApiKey = mongoose.model("ApiKey", apiKeySchema);