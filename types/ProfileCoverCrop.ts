export type ProfileCoverCrop = {
  zoom: number; // e.g. 1 - 3

  crop: {
    x: number;
    y: number;
  };

  croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};
