
import React from 'react';

// Wir nutzen hier direkt das Web Component <ion-icon>, da wir uns im Browser befinden
// und dies zuverlässiger ist als der @expo/vector-icons Import via esm.sh.

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style }) => {
  // Mapping für React Native Web: Wir rendern das custom element als string tag
  // TypeScript meckert ggf. ohne @ts-ignore, da ion-icon kein Standard-HTML-Tag ist.
  
  return (
    // @ts-ignore
    <ion-icon 
      name={name} 
      style={{ 
        fontSize: size, 
        color: color, 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...style 
      }}
    />
  );
};

export default Icon;
