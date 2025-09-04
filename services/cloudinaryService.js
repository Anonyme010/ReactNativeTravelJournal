const CLOUD_NAME = "dxoduxgvw"; // ton cloud name
const UPLOAD_PRESET = "travel_journal"; // preset UNSIGNED

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

  return json.secure_url;
};
