import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const removeLocalFile = localFilePath => {
    try {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    } catch {
        /* ignore */
    }
};

const uploadOnCloudinary = async localFilePath => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        removeLocalFile(localFilePath);
        return response;
    } catch (error) {
        removeLocalFile(localFilePath);
        return null;
    }
};

// Cloudinary URL থেকে publicId বের করা (folder/version থাকলেও কাজ করে)
const publicIdFromUrl = url => {
    try {
        const rest = String(url).split("/upload/")[1];
        if (!rest) return null;
        return rest
            .split("?")[0]
            .replace(/^(?:.*?\/)?v\d+\//, "")
            .replace(/\.[^./]+$/, "");
    } catch {
        return null;
    }
};

const deleteFromCloudinary = async publicId => {
    try {
        if (!publicId) return null;
        return await cloudinary.uploader.destroy(publicId, {
            resource_type: "image"
        });
    } catch (error) {
        console.log("Error deleting from cloudinary:", error);
        return null;
    }
};

export {
    uploadOnCloudinary,
    deleteFromCloudinary,
    publicIdFromUrl,
    removeLocalFile
};
