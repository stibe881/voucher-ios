
import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Pressable, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { Voucher, Family, AppNotification } from '../types';
import Icon from './Icon';

interface DashboardProps {
  vouchers: Voucher[];
  families: Family[];
  notifications: AppNotification[];
  onUpdateVoucher: (v: Voucher) => Promise<void>;
  onSelectVoucher: (v: Voucher) => void;
  onOpenNotifications: () => void;
  onRefresh?: () => Promise<void>;
  loadError?: string | null;
  userEmail?: string;
  userName?: string;
}

type SortOption = 'newest' | 'alphabetical' | 'amount' | 'expiry';

const Dashboard: React.FC<DashboardProps> = ({ vouchers, families, notifications, onUpdateVoucher, onSelectVoucher, onOpenNotifications, onRefresh, loadError, userEmail, userName }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredAndSortedVouchers = useMemo(() => {
    let result = vouchers.filter(v => 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.store.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'amount':
        result.sort((a, b) => b.remaining_amount - a.remaining_amount);
        break;
      case 'expiry':
        result.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return a.expiry_date.localeCompare(b.expiry_date);
        });
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return result;
  }, [vouchers, searchQuery, sortBy]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const useVoucher = async (voucher: Voucher) => {
    const remaining = Number(voucher.remaining_amount || 0);
    if (remaining <= 0 || isProcessing) return;
    
    const promptText = voucher.type === 'VALUE' 
      ? `Betrag abziehen (${voucher.currency || 'CHF'}):` 
      : `Anzahl abziehen:`;
      
    const reduction = window.prompt(promptText, '5');
    if (reduction !== null && reduction.trim() !== "") {
      const val = parseFloat(reduction.replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        setIsProcessing(voucher.id);
        try {
          const newAmount = Math.max(0, remaining - val);
          
          // Wir fügen die Redemption lokal zum history-array hinzu (wird vom Parent in DB gespeichert)
          const newRedemption = {
            id: Date.now().toString(),
            voucher_id: voucher.id,
            amount: val,
            timestamp: new Date().toISOString(),
            user_name: userName || 'Ich'
          };

          await onUpdateVoucher({ 
            ...voucher, 
            remaining_amount: newAmount,
            history: [newRedemption, ...(voucher.history || [])]
          });
        } catch (err) {
          alert("Konnte den Betrag nicht aktualisieren.");
        } finally {
          setIsProcessing(null);
        }
      }
    }
  };

  return (
    <View style={{flex: 1}}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Guten Tag, {userName || 'Benutzer'}</Text>
          <Text style={styles.title}>Gutscheine</Text>
        </View>
        <TouchableOpacity style={[styles.actionBtn, styles.notificationBtn]} onPress={onOpenNotifications}>
          <Icon name="notifications-outline" size={22} color="#1e293b" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={18} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Suchen..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
          {[
            { id: 'newest', label: 'Neueste', icon: 'time-outline' },
            { id: 'alphabetical', label: 'A-Z', icon: 'text-outline' },
            { id: 'amount', label: 'Betrag', icon: 'card-outline' },
            { id: 'expiry', label: 'Ablauf', icon: 'calendar-outline' }
          ].map(opt => (
            <TouchableOpacity 
              key={opt.id} 
              onPress={() => setSortBy(opt.id as SortOption)}
              style={[styles.sortChip, sortBy === opt.id && styles.sortChipActive]}
            >
              <Icon name={opt.icon} size={14} color={sortBy === opt.id ? '#fff' : '#64748b'} />
              <Text style={[styles.sortChipText, sortBy === opt.id && styles.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />}
      >
        {loadError && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={20} color="#ef4444" style={{marginRight: 10}} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        <View style={styles.list}>
          {filteredAndSortedVouchers.map(voucher => {
            const family = families.find(f => f.id === voucher.family_id);
            const remaining = Number(voucher.remaining_amount || 0);
            const initial = Number(voucher.initial_amount || 0);
            const progress = initial > 0 ? (remaining / initial) * 100 : 0;
            const processing = isProcessing === voucher.id;
            
            return (
              <TouchableOpacity key={voucher.id} style={styles.card} activeOpacity={0.9} onPress={() => onSelectVoucher(voucher)}>
                {family && (
                  <View style={styles.familyBadge}>
                    <Icon name="people" size={10} color="#2563eb" style={{marginRight: 4}} />
                    <Text style={styles.familyBadgeText}>{family.name}</Text>
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}><Icon name={voucher.type === 'VALUE' ? 'card-outline' : 'list-outline'} size={22} color="#2563eb" /></View>
                  <View style={styles.titleBox}>
                    <Text style={styles.voucherTitle} numberOfLines={1}>{voucher.title}</Text>
                    <Text style={styles.voucherStore} numberOfLines={1}>{voucher.store}</Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountText}>{remaining.toFixed(2)}{voucher.type === 'VALUE' && <Text style={styles.currencyText}> {voucher.currency}</Text>}</Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min(100, progress)}%`, backgroundColor: progress < 20 ? '#ef4444' : '#2563eb' }]} />
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.footerLabel}>GÜLTIG BIS</Text>
                    <Text style={[styles.footerValue, voucher.expiry_date && styles.expiryHighlight]}>{voucher.expiry_date || 'Unbegrenzt'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.useButton, (remaining <= 0 || processing) && { opacity: 0.3 }]} 
                    onPress={(e: any) => { e.stopPropagation(); if (remaining > 0 && !processing) useVoucher(voucher); }}
                  >
                    <Text style={styles.useButtonText}>{processing ? '...' : 'Abziehen'}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          
          {filteredAndSortedVouchers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="search-outline" size={60} color="#e2e8f0" />
              <Text style={styles.emptyText}>Nichts gefunden</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  notificationBtn: { position: 'relative' },
  unreadBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  unreadBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  filterContainer: { marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 15, height: 50, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1e293b' },
  sortScroll: { flexDirection: 'row' },
  sortChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  sortChipActive: { backgroundColor: '#2563eb' },
  sortChipText: { fontSize: 13, fontWeight: '700', color: '#64748b', marginLeft: 6 },
  sortChipTextActive: { color: '#fff' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, position: 'relative', overflow: 'hidden' },
  familyBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderBottomLeftRadius: 16, flexDirection: 'row', alignItems: 'center' },
  familyBadgeText: { fontSize: 9, fontWeight: '800', color: '#2563eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 52, height: 52, backgroundColor: '#f1f5f9', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  titleBox: { flex: 1 },
  voucherTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  voucherStore: { fontSize: 14, color: '#64748b', marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  currencyText: { fontSize: 12, color: '#94a3b8' },
  progressBarContainer: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressBar: { height: '100%' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8' },
  footerValue: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 },
  expiryHighlight: { color: '#2563eb' },
  useButton: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  useButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 10 },
  errorBox: { flexDirection: 'row', backgroundColor: '#fff1f2', padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
  errorText: { color: '#e11d48', fontSize: 13, fontWeight: '600' }
});

export default Dashboard;
