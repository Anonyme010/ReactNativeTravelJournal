import { useState, useEffect, useRef } from "react";
import { Camera } from "expo-camera";

export default function useCamera() {
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      return photo;
    }
    return null;
  };

  return {
    hasPermission,
    cameraRef,
    setCameraRef: (ref) => (cameraRef.current = ref),
    takePhoto,
  };
}
