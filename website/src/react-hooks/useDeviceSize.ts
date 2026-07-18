import { useState, useEffect } from 'react';

interface DeviceSize {
  width: number;
  height: number;
}

const useDeviceSize = (): DeviceSize => {
  const [size, setSize] = useState<DeviceSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Now we're on the client, so `window` is defined
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize(); // Set initial size on mount
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
};

export default useDeviceSize;

