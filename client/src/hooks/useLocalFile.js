import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Manages a local video file selected from the user's machine.
 * Creates a blob:// URL for use in the video player.
 * Automatically revokes the blob URL on cleanup to free memory.
 */
const useLocalFile = () => {
  const [localFile, setLocalFile] = useState(null);   // { name, size, blobUrl }
  const blobUrlRef = useRef(null);

  // Revoke old blob URL before setting a new one
  const loadFile = useCallback((file) => {
    if (!file) return;

    // Clean up previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;

    setLocalFile({
      name: file.name,
      size: file.size,
      blobUrl,
    });
  }, []);

  const clearFile = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setLocalFile(null);
  }, []);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return { localFile, loadFile, clearFile };
};

export default useLocalFile;
