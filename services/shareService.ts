import { toPng } from "html-to-image";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export const shareCareerCard = async (elementId: string): Promise<void> => {
  try {
    const node = document.getElementById(elementId);
    if (!node) {
      throw new Error("Share card element not found");
    }

    // Generate image as PNG data URL
    // Use 2x pixel ratio for better quality on high-DPI screens
    const dataUrl = await toPng(node, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#0f172a", // Match the card background
      skipAutoScale: true,
      fontEmbedCSS: "", // Skip font embedding to avoid CORS issues
    });

    // Check if we are on a native platform (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      // Extract base64 data from data URL
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

      // Generate unique filename
      const fileName = `football-career-${Date.now()}.png`;

      // Save the image to the cache directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Share using the file URI
      await Share.share({
        title: "My Football Career",
        text: "Check out my career in My Football Career Simulator!",
        url: savedFile.uri,
        dialogTitle: "Share your career",
      });

      // Clean up: delete the temporary file after a delay
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache,
          });
        } catch {
          // Ignore cleanup errors
        }
      }, 30000); // Delete after 30 seconds
    } else {
      // Web fallback: Download the image
      const link = document.createElement("a");
      link.download = `football-career-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  } catch (error) {
    console.error("Error sharing career card:", error);
    throw error;
  }
};
