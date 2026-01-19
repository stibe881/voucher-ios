
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from './Icon';

interface NavigationProps {
  currentView: 'dashboard' | 'add' | 'families';
  setView: (view: 'dashboard' | 'add' | 'families') => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  return (
    <View style={styles.nav}>
      <TouchableOpacity style={styles.tab} onPress={() => setView('dashboard')}>
        <Icon 
          name={currentView === 'dashboard' ? 'ticket' : 'ticket-outline'} 
          size={24} 
          color={currentView === 'dashboard' ? '#2563eb' : '#9ca3af'} 
        />
        <Text style={[styles.tabText, currentView === 'dashboard' && styles.activeText]}>Gutscheine</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => setView('add')}>
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => setView('families')}>
        <Icon 
          name={currentView === 'families' ? 'person' : 'person-outline'} 
          size={24} 
          color={currentView === 'families' ? '#2563eb' : '#9ca3af'} 
        />
        <Text style={[styles.tabText, currentView === 'families' && styles.activeText]}>Profil</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.98)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: 25,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tab: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabText: { fontSize: 10, fontWeight: '700', color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  activeText: { color: '#2563eb' },
  addButton: {
    width: 60,
    height: 60,
    backgroundColor: '#2563eb',
    borderRadius: 30,
    marginTop: -45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 5,
    borderColor: '#fff',
  },
});

export default Navigation;
