const CLOUD_NAME = "dxoduxgvw"; // cloud name de Hajar
const UPLOAD_PRESET = "travel_journal"; // preset UNSIGNED

/**
 * Upload an image to Cloudinary
 * @param {string} photoUri - Local image URI
 * @returns {Promise<string>} Cloudinary secure URL
 */
export const uploadToCloudinary = async (photoUri) => {
  const data = new FormData();
  data.append("file", {
    uri: photoUri,
    type: "image/jpeg",
    name: "upload.jpg",
  });
  data.append("upload_preset", UPLOAD_PRESET);

  // 👉 On ajoute un dossier
  data.append("folder", "journal/mes-photos");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: data,
  });

  const json = await res.json();
  console.log("✅ Upload response:", json);

  // Store the public_id for potential deletion later
  return {
    secure_url: json.secure_url,
    public_id: json.public_id
  };
};

/**
 * Extract public ID from a Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} Public ID or null if not found
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // Cloudinary URLs typically look like:
    // https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/image_id.jpg
    const regex = /\/v\d+\/(.+)$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      // Remove file extension
      return match[1].replace(/\.\w+$/, '');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};