
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, View, Dimensions } from 'react-native';
import Icon from './Icon';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'warning';
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Einblenden
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Nach 3 Sekunden ausblenden
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getStyles = () => {
    switch (type) {
      case 'success': return { bg: '#ecfdf5', border: '#10b981', icon: 'checkmark-circle', iconColor: '#10b981' };
      case 'warning': return { bg: '#fef2f2', border: '#ef4444', icon: 'alert-circle', iconColor: '#ef4444' };
      default: return { bg: '#eff6ff', border: '#3b82f6', icon: 'information-circle', iconColor: '#3b82f6' };
    }
  };

  const config = getStyles();

  return (
    <Animated.View style={[
      styles.container, 
      { opacity, transform: [{ translateY }], backgroundColor: config.bg, borderColor: config.border }
    ]}>
      <Icon name={config.icon} size={20} color={config.iconColor} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
});

export default Toast;
