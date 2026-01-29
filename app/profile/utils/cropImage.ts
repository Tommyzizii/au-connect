export async function getCroppedAvatarFile(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number },
  outputSize: number
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // draw the crop area into a square output
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Failed to create image blob"));
        resolve(b);
      },
      "image/jpeg",
      0.92
    );
  });

  return new File([blob], `profile-${crypto.randomUUID()}.jpg`, {
    type: "image/jpeg",
  });
}

export async function getCroppedCoverFile(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number },
  outputWidth: number = 1500,
  outputHeight: number = 500
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // draw the cropped area into a rectangular banner output
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Failed to create image blob"));
        resolve(b);
      },
      "image/jpeg",
      0.9
    );
  });

  return new File([blob], `cover-${crypto.randomUUID()}.jpg`, {
    type: "image/jpeg",
  });
}


function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
