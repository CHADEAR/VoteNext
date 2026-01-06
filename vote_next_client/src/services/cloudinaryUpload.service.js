// vote_next_client/src/services/cloudinaryUpload.service.js

export async function uploadImageToCloudinary(file, folder) {
  if (!file) throw new Error("No file provided");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "vote-next");
  if (folder) formData.append("folder", folder);

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dsh33xcoy/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id,
  };
}
