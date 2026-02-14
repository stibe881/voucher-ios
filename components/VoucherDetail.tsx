
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Modal, Dimensions, Linking, Share, Platform } from 'react-native';

import { Voucher, User, Family, Redemption, Trip } from '../types';
import Icon from './Icon';
import { supabaseService } from '../services/supabase'; // Import Service
import TripSelectionModal from './TripSelectionModal';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, getCurrencySymbol } from './AddVoucher';

interface VoucherDetailProps {
  voucher: Voucher;
  owner: User | null;
  family: Family | null;
  families: Family[];
  onBack: () => void;
  onUpdateVoucher: (v: Voucher) => Promise<void> | void;
  onDeleteVoucher: (id: string) => Promise<void> | void;
}

const { width } = Dimensions.get('window');

const VoucherDetail: React.FC<VoucherDetailProps> = ({ voucher, owner, family, families, onBack, onUpdateVoucher, onDeleteVoucher }) => {
  const { t, i18n } = useTranslation();

  // Guard: Return early if voucher is undefined/null
  if (!voucher || !voucher.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#64748b' }}>{t('voucherDetail.voucherNotFound')}</Text>
        </View>
      </View>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [selectedCodeForRedeem, setSelectedCodeForRedeem] = useState<string | null>(null); // NEW: For code pool selection

  const [linkedTrip, setLinkedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    // Load trip details if ID exists
    if (voucher.trip_id) {
      supabaseService.getTrips(owner?.id || '').then(trips => {
        const found = trips.find(t => t.id === voucher.trip_id);
        if (found) setLinkedTrip(found);
      });
    }
  }, [voucher.trip_id]);

  const handleOpenTrip = async () => {
    if (!voucher.trip_id) return;
    const url = `manusausflugfinder://trip/${voucher.trip_id}`;
    const storeUrl = 'https://apps.apple.com/app/id6755850765';

    try {
      // Attempt to open directly first (bypass check effectively for dev) or check first
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback: Try to open anyway - sometimes canOpenURL returns false on dev builds
        // If this fails, we catch it below.
        try {
          await Linking.openURL(url);
        } catch (e) {
          Alert.alert(
            t('voucherDetail.tripAppNotInstalled'),
            t('voucherDetail.installAppPrompt'),
            [
              { text: t('common.no'), style: "cancel" },
              { text: t('common.yes'), onPress: () => Linking.openURL(storeUrl) }
            ]
          );
        }
      }
    } catch (err) {
      console.error(err);
      // Final Catch
      Alert.alert(
        t('voucherDetail.tripAppNotInstalled'),
        t('voucherDetail.installAppPrompt'),
        [
          { text: t('common.no'), style: "cancel" },
          { text: t('common.yes'), onPress: () => Linking.openURL(storeUrl) }
        ]
      );
    }
  };

  // Form states for editing
  const [editTitle, setEditTitle] = useState(voucher.title || '');
  const [editStore, setEditStore] = useState(voucher.store || '');
  const [editAmount, setEditAmount] = useState(voucher.remaining_amount?.toString() || '0');
  const [editCurrency, setEditCurrency] = useState(voucher.currency || 'CHF');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [editCode, setEditCode] = useState(voucher.code || '');
  const [editPin, setEditPin] = useState(voucher.pin || '');
  const [editMinOrderValue, setEditMinOrderValue] = useState(voucher.min_order_value ? voucher.min_order_value.toString() : '');
  const [editExpiry, setEditExpiry] = useState('');
  const [editWebsite, setEditWebsite] = useState(voucher.website || '');
  const [editType, setEditType] = useState(voucher.type || 'VALUE');
  const [editFamilyId, setEditFamilyId] = useState<string | null>(voucher.family_id);
  const [editNotes, setEditNotes] = useState(voucher.notes || '');
  const [editCategory, setEditCategory] = useState(voucher.category || 'Shopping');
  const [editTripId, setEditTripId] = useState<number | null>(voucher.trip_id || null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [showTripModal, setShowTripModal] = useState(false);

  // Helper date function (Moved inside or ensure availability)
  const displayDateDE = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  const convertDateToISO = (dateStr: string): string | null => {
    if (!dateStr || !dateStr.trim()) return null;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return null;
  };

  useEffect(() => {
    setEditTitle(voucher.title || '');
    setEditStore(voucher.store || '');
    setEditAmount(voucher.remaining_amount?.toString() || '0');
    setEditCurrency(voucher.currency || 'CHF');
    setEditCode(voucher.code || '');
    setEditPin(voucher.pin || '');
    setEditExpiry(displayDateDE(voucher.expiry_date));
    setEditWebsite(voucher.website || '');
    setEditType(voucher.type || 'VALUE');
    setEditFamilyId(voucher.family_id);
    setEditNotes(voucher.notes || '');
    setEditCategory(voucher.category || 'Shopping');
    setEditTripId(voucher.trip_id || null);
  }, [voucher, isEditing]);

  useEffect(() => {
    if (isEditing && owner?.id) {
      supabaseService.getTrips(owner.id).then(setAllTrips);
    }
  }, [isEditing, owner?.id]);

  const remaining = Number(voucher.remaining_amount || 0);
  const initial = Number(voucher.initial_amount || 1);
  const progress = Math.min(100, Math.max(0, (remaining / initial) * 100));

  const handleShare = async () => {
    try {
      const deepLink = `vouchervault://voucher/${voucher.id}`;
      const appStoreLink = "https://apps.apple.com/app/id6758004270";

      const message = t('voucherDetail.shareMessage', {
        title: voucher.title,
        store: voucher.store,
        amount: `${remaining.toFixed(2)} ${getCurrencySymbol(voucher.currency)}`,
        code: voucher.code ? `Code: ${voucher.code}` : '',
        pin: voucher.pin ? `PIN: ${voucher.pin}` : '',
        expiry: voucher.expiry_date ? `${t('voucherDetail.label.expiryDateCap')}: ${displayDateDE(voucher.expiry_date)}` : '',
        website: voucher.website ? `${voucher.website}` : '',
        notes: voucher.notes ? `${t('voucherDetail.label.notes')}: ${voucher.notes}` : '',
        link: appStoreLink
      }).replace(/\n\n+/g, '\n').trim();

      await Share.share({
        message,
        title: `Gutschein: ${voucher.title}`
      });
    } catch (error: any) {
      // Alert.alert("Fehler beim Teilen", error.message);
    }
  };

  const handleOpenWebsite = async (url: string) => {
    if (!url) return;
    try {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      const supported = await Linking.canOpenURL(finalUrl);
      if (supported) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert(t('common.error'), finalUrl);
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), url);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editStore.trim()) {
      Alert.alert(t('common.error'), t('voucherDetail.error.titleStoreRequired'));
      return;
    }
    setIsProcessing(true);
    try {
      await onUpdateVoucher({
        ...voucher,
        title: editTitle.trim(),
        store: editStore.trim(),
        remaining_amount: parseFloat(editAmount.replace(',', '.')) || 0,
        currency: editCurrency,
        code: editCode.trim(),
        pin: editPin.trim(),
        expiry_date: convertDateToISO(editExpiry),
        website: editWebsite.trim(),
        min_order_value: editMinOrderValue ? parseFloat(editMinOrderValue.replace(',', '.')) : null,
        type: editType,
        family_id: editFamilyId,
        notes: editNotes.trim(),
        category: editCategory,
        trip_id: editTripId
      });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), t('voucherDetail.error.saveFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRedemption = async () => {
    // Handle code pool vouchers
    if (voucher.code_pool && voucher.code_pool.length > 0) {
      if (!selectedCodeForRedeem) {
        Alert.alert(t('common.error'), t('voucherDetail.error.selectCode'));
        return;
      }

      setIsProcessing(true);
      setShowRedeemModal(false);

      try {
        // Mark selected code as used
        const updatedCodePool = voucher.code_pool.map(item =>
          item.code === selectedCodeForRedeem
            ? { ...item, used: true, used_at: new Date().toISOString(), used_by: owner?.name || 'Benutzer' }
            : item
        );

        const newAmount = Math.max(0, remaining - 1);
        const newHistoryEntry: Redemption = {
          id: Date.now().toString(),
          voucher_id: voucher.id,
          amount: 1,
          timestamp: new Date().toISOString(),
          user_name: owner?.name || 'Benutzer',
          code_used: selectedCodeForRedeem // Track which code was used
        };

        await onUpdateVoucher({
          ...voucher,
          remaining_amount: newAmount,
          code_pool: updatedCodePool,
          history: [newHistoryEntry, ...(voucher.history || [])]
        });
      } catch (err: any) {
        Alert.alert(t('common.error'), t('voucherDetail.error.updateFailed'));
      } finally {
        setIsProcessing(false);
        setSelectedCodeForRedeem(null);
      }
      return;
    }

    // Regular redemption (non-code-pool)
    const val = parseFloat(redeemInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert(t('common.error'), t('voucherDetail.error.invalidAmount'));
      return;
    }
    if (val > remaining) {
      Alert.alert(t('common.error'), t('voucherDetail.error.amountTooHigh'));
      return;
    }

    setIsProcessing(true);
    setShowRedeemModal(false);

    try {
      const newAmount = Math.max(0, remaining - val);
      const newHistoryEntry: Redemption = {
        id: Date.now().toString(),
        voucher_id: voucher.id,
        amount: val,
        timestamp: new Date().toISOString(),
        user_name: owner?.name || 'Benutzer'
      };

      await onUpdateVoucher({
        ...voucher,
        remaining_amount: newAmount,
        history: [newHistoryEntry, ...(voucher.history || [])]
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), t('voucherDetail.error.updateFailed'));
    } finally {
      setIsProcessing(false);
      setRedeemInput('');
    }
  };

  // Format Date helper for input
  const formatDate = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
    let res = cleaned;
    if (cleaned.length > 2) res = cleaned.substring(0, 2) + '.' + cleaned.substring(2);
    if (cleaned.length > 4) res = cleaned.substring(0, 2) + '.' + cleaned.substring(2, 4) + '.' + cleaned.substring(4);
    return res;
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.circleBtn}><Icon name="close-outline" size={24} color="#4b5563" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{t('voucherDetail.edit')}</Text>
          <TouchableOpacity onPress={handleSaveEdit} style={styles.saveHeaderBtn} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
          </TouchableOpacity>
        </View>

        {/* EDIT FORM - Keep existing form logic */}
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.title')}</Text><TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} placeholder={t('voucherDetail.placeholder.title')} /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.store')}</Text><TextInput style={styles.input} value={editStore} onChangeText={setEditStore} placeholder={t('voucherDetail.placeholder.store')} /></View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: editType === 'VALUE' ? 12 : 0 }}><Text style={styles.label}>{editType === 'VALUE' ? t('voucherDetail.label.remainingAmount') : t('voucherDetail.label.remainingQuantity')}</Text><TextInput style={styles.input} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" /></View>
            {editType === 'VALUE' && (
              <View style={{ flex: 1 }}><Text style={styles.label}>{t('voucherDetail.label.currency')}</Text><TouchableOpacity style={styles.input} onPress={() => setShowCurrencyPicker(true)}><Text style={{ fontSize: 15, color: '#1e293b' }}>{editCurrency} {getCurrencySymbol(editCurrency) !== editCurrency ? getCurrencySymbol(editCurrency) : ''}</Text></TouchableOpacity></View>
            )}
          </View>
          {editType === 'VALUE' && (
            <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.minOrderValue')}</Text><TextInput style={styles.input} value={editMinOrderValue} onChangeText={setEditMinOrderValue} keyboardType="numeric" placeholder="0.00" /></View>
          )}
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.expiryDate')}</Text><TextInput style={styles.input} value={editExpiry} onChangeText={(t) => setEditExpiry(formatDate(t))} maxLength={10} keyboardType="numeric" placeholder="31.12.2025" /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.voucherCode')}</Text><TextInput style={styles.input} value={editCode} onChangeText={setEditCode} placeholder="Gutschein-Code" /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.pin')}</Text><TextInput style={styles.input} value={editPin} onChangeText={setEditPin} placeholder="PIN-Code" /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('voucherDetail.label.website')}</Text><TextInput style={styles.input} value={editWebsite} onChangeText={setEditWebsite} placeholder="https://example.com" autoCapitalize="none" keyboardType="url" /></View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('voucherDetail.label.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Shopping', 'Lebensmittel', 'Wohnen', 'Reisen', 'Freizeit', 'Gastro', 'Sonstiges'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.familyItem, editCategory === cat && styles.familyItemActive]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text style={[styles.familyItemText, editCategory === cat && styles.familyItemTextActive]}>{t(`categories.${cat}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('voucherDetail.label.voucherType')}</Text>
            <View style={styles.familySelect}>
              <TouchableOpacity style={[styles.familyItem, editType === 'VALUE' && styles.familyItemActive]} onPress={() => setEditType('VALUE')}>
                <Text style={[styles.familyItemText, editType === 'VALUE' && styles.familyItemTextActive]}>{t('voucherDetail.label.valueVoucher')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.familyItem, editType === 'QUANTITY' && styles.familyItemActive]} onPress={() => setEditType('QUANTITY')}>
                <Text style={[styles.familyItemText, editType === 'QUANTITY' && styles.familyItemTextActive]}>{t('voucherDetail.label.quantityVoucher')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('voucherDetail.label.shareWithGroup')}</Text>
            <View style={styles.familySelect}>
              <TouchableOpacity style={[styles.familyItem, editFamilyId === null && styles.familyItemActive]} onPress={() => setEditFamilyId(null)}>
                <Text style={[styles.familyItemText, editFamilyId === null && styles.familyItemTextActive]}>{t('common.private')}</Text>
              </TouchableOpacity>
              {families.map(f => (
                <TouchableOpacity key={f.id} style={[styles.familyItem, editFamilyId === f.id && styles.familyItemActive]} onPress={() => setEditFamilyId(f.id)}>
                  <Text style={[styles.familyItemText, editFamilyId === f.id && styles.familyItemTextActive]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('voucherDetail.label.linkTrip')}</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowTripModal(true)}
            >
              <Text style={{ color: editTripId ? '#1e293b' : '#94a3b8', fontSize: 16 }}>
                {editTripId ? allTrips.find(t => t.id === editTripId)?.title : t('voucherDetail.label.selectTrip')}
              </Text>
              <Icon name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TripSelectionModal
              visible={showTripModal}
              onClose={() => setShowTripModal(false)}
              onSelect={(trip) => setEditTripId(trip ? trip.id : null)}
              trips={allTrips}
              selectedTripId={editTripId}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('voucherDetail.label.notes')}</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 15 }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder={t('voucherDetail.placeholder.notes')}
              multiline
            />
          </View>
        </ScrollView >
      </View >
    );
  }

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!transferEmail.trim()) {
      alert(t('voucherDetail.error.enterEmail'));
      return;
    }

    setIsTransferring(true);
    try {
      await supabaseService.transferVoucher(voucher.id, transferEmail.trim());
      alert(t('voucherDetail.transferSuccess'));
      setShowTransferModal(false);
      onBack(); // Close detail view as voucher is gone/moved
    } catch (e: any) {
      alert(t('voucherDetail.transferError') + (e.message || t('app.unknownError')));
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.circleBtn}><Icon name="chevron-back-outline" size={24} color="#4b5563" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('voucherDetail.title')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
            <Icon name="share-outline" size={24} color="#0f172a" />
          </TouchableOpacity>
          {!isEditing && (
            <TouchableOpacity onPress={() => setShowTransferModal(true)} style={[styles.circleBtn, { backgroundColor: '#eff6ff' }]}>
              <Icon name="paper-plane" size={20} color="#2563eb" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.circleBtn} onPress={() => setIsEditing(true)}>
            <Icon name="create-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>{t('voucherDetail.transferTitle')}</Text>
            <Text style={{ color: '#4b5563', marginBottom: 20, textAlign: 'center' }}>
              {t('voucherDetail.transferDescription')}
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 5, color: '#374151' }}>{t('voucherDetail.label.recipientEmail')}</Text>
            <TextInput
              style={{ height: 50, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 }}
              value={transferEmail}
              onChangeText={setTransferEmail}
              placeholder="email@beispiel.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowTransferModal(false)}
                style={{ flex: 1, height: 44, backgroundColor: '#f3f4f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#4b5563' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTransfer}
                disabled={isTransferring}
                style={{ flex: 1, height: 44, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              >
                {isTransferring ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ fontWeight: '600', color: 'white' }}>{t('voucherDetail.transfer')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {/* DEBUGGING: Log image status */}
          {(function () {
            console.log('Voucher Images:', { id: voucher.id, img1: voucher.image_url, img2: voucher.image_url_2 });
            return null;
          })()}

          {/* Force Gallery if ANY 2nd image is present (even if empty string check fails elsewhere, though we check length) */}
          {(voucher.image_url_2 && voucher.image_url_2.length > 5) ? (
            <View style={{ width: width, height: 280 }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={width}
                bounces={false}
                style={{ width: width, height: 280 }}
                contentContainerStyle={{ width: width * 2 }}
              >
                <Image source={{ uri: voucher.image_url || 'https://placehold.co/600x400/png' }} style={{ width: width, height: 280 }} resizeMode="cover" />
                <Image source={{ uri: voucher.image_url_2 }} style={{ width: width, height: 280 }} resizeMode="cover" />
              </ScrollView>
              <View style={styles.paginationDots}>
                <View style={[styles.dot, { backgroundColor: '#fff' }]} />
                <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
              </View>
              <View style={styles.swipeHint}>
                <Icon name="swap-horizontal-outline" size={20} color="#fff" />
              </View>
            </View>
          ) : voucher.image_url ? (
            <Image source={{ uri: voucher.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: '#2563eb' }]}>
              <Icon name="ticket-outline" size={100} color="rgba(255,255,255,0.3)" />
              <Text style={styles.placeholderStore}>{voucher.store}</Text>
            </View>
          )}

          <View style={styles.heroOverlay} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.storeName}>{voucher.store}</Text>
              <Text style={styles.voucherTitle}>{voucher.title}</Text>
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerText}>{t('voucherDetail.from')} {owner?.name || t('settings.unknown')}</Text>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>{voucher.type === 'QUANTITY' ? Math.floor(remaining) : remaining.toFixed(2)}<Text style={styles.balanceCurrency}> {voucher.type === 'QUANTITY' ? t('dashboard.pcs') : getCurrencySymbol(voucher.currency)}</Text></Text>
              <Text style={styles.initialText}>von {voucher.type === 'QUANTITY' ? Math.floor(Number(voucher.initial_amount || 0)) : Number(voucher.initial_amount || 0).toFixed(2)} {voucher.type === 'QUANTITY' ? t('dashboard.pcs') : ''}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: progress < 20 ? '#ef4444' : '#2563eb' }]} />
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('voucherDetail.label.number')}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{voucher.code || '–'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('voucherDetail.label.pin')}</Text>
              <View style={styles.pinContainer}>
                <Text style={styles.infoValue}>{showPin ? (voucher.pin || '–') : (voucher.pin ? '••••' : '–')}</Text>
                {voucher.pin && (
                  <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.pinToggle}>
                    <Icon name={showPin ? "eye-off-outline" : "eye-outline"} size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('voucherDetail.label.expiryDateCap')}</Text>
              <Text style={[styles.infoValue, { color: '#2563eb' }]}>{displayDateDE(voucher.expiry_date) || t('dashboard.unlimited')}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('voucherDetail.label.category')}</Text>
              <Text style={styles.infoValue}>{t(`categories.${voucher.category || 'Sonstiges'}`, voucher.category)}</Text>
            </View>

            {/* Min Order Value Display */}
            {voucher.type === 'VALUE' && voucher.min_order_value && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>{t('voucherDetail.label.minOrderValue')}</Text>
                <Text style={styles.infoValue}>
                  {voucher.currency === 'x' ? '' : getCurrencySymbol(voucher.currency)} {voucher.min_order_value.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{t('voucherDetail.label.shared')}</Text>
              <Text style={styles.infoValue}>{family?.name || t('common.private')}</Text>
            </View>
          </View>

          {voucher.website ? (
            <TouchableOpacity onPress={() => handleOpenWebsite(voucher.website!)} style={styles.websiteLink}>
              <Icon name="globe-outline" size={16} color="#2563eb" />
              <Text style={styles.websiteText} numberOfLines={1}>{voucher.website}</Text>
            </TouchableOpacity>
          ) : null}

          {voucher.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>{t('voucherDetail.label.notes')}</Text>
              <Text style={styles.notesText}>{voucher.notes}</Text>
            </View>
          ) : null}

          {/* New Trip Link Section */}
          {linkedTrip && (
            <TouchableOpacity onPress={handleOpenTrip} style={styles.tripContainer}>
              <View style={[styles.tripIconBox, { overflow: 'hidden' }]}>
                {linkedTrip.image ? (
                  <Image source={{ uri: linkedTrip.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Icon name="map-outline" size={24} color="#fff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripLabel}>{t('voucherDetail.label.linkedTrip')}</Text>
                <Text style={styles.tripTitle}>{linkedTrip.title}</Text>
                <Text style={styles.tripDestination}>{linkedTrip.destination}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}

          {/* Code Pool Display */}
          {voucher.code_pool && voucher.code_pool.length > 0 && (
            <View style={styles.codePoolContainer}>
              <Text style={styles.codePoolTitle}>{t('voucherDetail.availableCodes')} ({voucher.code_pool.filter(c => !c.used).length}/{voucher.code_pool.length})</Text>
              {voucher.code_pool.map((item, index) => (
                <View key={index} style={[styles.codeItem, item.used && styles.codeItemUsed]}>
                  <View style={styles.codeIndicator}>
                    {item.used ? (
                      <Icon name="checkmark-circle" size={20} color="#10b981" />
                    ) : (
                      <Icon name="radio-button-off" size={20} color="#64748b" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.codeText, item.used && styles.codeTextUsed]}>{item.code}</Text>
                    {item.used && item.used_at && (
                      <Text style={styles.codeUsedDate}>
                        {t('voucherDetail.usedAtBy', { date: new Date(item.used_at).toLocaleDateString(i18n.language), user: item.used_by || '?' })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>{t('voucherDetail.historyTitle')}</Text>
            {(!voucher.history || voucher.history.length === 0) ? (
              <View style={styles.emptyHistory}>
                <Icon name="receipt-outline" size={32} color="#e2e8f0" />
                <Text style={styles.noHistory}>{t('voucherDetail.noHistory')}</Text>
              </View>
            ) : (
              voucher.history.map((entry) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={[styles.historyIcon, { backgroundColor: '#fef2f2' }]}><Icon name="remove" size={16} color="#ef4444" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyUser}>{entry.user_name}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.timestamp).toLocaleDateString(i18n.language)} • {new Date(entry.timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>– {voucher.type === 'QUANTITY' ? `${Math.floor(Number(entry.amount || 0))} ${t('dashboard.pcs')}` : Number(entry.amount || 0).toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.useButton, remaining <= 0 && styles.useButtonDisabled]}
              onPress={() => setShowRedeemModal(true)}
              disabled={remaining <= 0}
            >
              <Text style={styles.useButtonText}>{t('voucherDetail.redeem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setShowConfirmDelete(true)}>
              <Icon name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Redeem Modal */}
      <Modal visible={showRedeemModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('voucherDetail.redeemTitle')}</Text>

            {/* Code Pool Selection */}
            {voucher.code_pool && voucher.code_pool.length > 0 ? (
              <>
                <Text style={styles.modalSubtitle}>{t('voucherDetail.selectCodeToRedeem')}</Text>
                <ScrollView style={{ maxHeight: 250, marginBottom: 20 }}>
                  {voucher.code_pool.filter(c => !c.used).map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.codeSelectItem,
                        selectedCodeForRedeem === item.code && styles.codeSelectItemActive
                      ]}
                      onPress={() => setSelectedCodeForRedeem(item.code)}
                    >
                      <View style={styles.codeSelectRadio}>
                        {selectedCodeForRedeem === item.code ? (
                          <View style={styles.codeSelectRadioInner} />
                        ) : null}
                      </View>
                      <Text style={[
                        styles.codeSelectText,
                        selectedCodeForRedeem === item.code && styles.codeSelectTextActive
                      ]}>
                        {item.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowRedeemModal(false); setSelectedCodeForRedeem(null); }}>
                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirm, !selectedCodeForRedeem && { opacity: 0.5 }]}
                    onPress={executeRedemption}
                    disabled={!selectedCodeForRedeem}
                  >
                    <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Regular Amount Input */
              <>
                <Text style={styles.modalSubtitle}>{t('voucherDetail.redeemPrompt')}</Text>
                <View style={styles.modalInputWrapper}>
                  <TextInput
                    style={styles.modalInput}
                    value={redeemInput}
                    onChangeText={setRedeemInput}
                    keyboardType="numeric"
                    autoFocus
                    placeholder="0.00"
                  />
                  <Text style={styles.modalCurrency}>{getCurrencySymbol(voucher.currency)}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowRedeemModal(false); setRedeemInput(''); }}>
                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirm} onPress={executeRedemption}>
                    <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showConfirmDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.deleteIconCircle}>
              <Icon name="trash" size={30} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>{t('voucherDetail.deletePrompt.title')}</Text>
            <Text style={styles.modalSubtitle}>{t('voucherDetail.deletePrompt.message')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowConfirmDelete(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: '#ef4444' }]} onPress={() => onDeleteVoucher(voucher.id)}>
                <Text style={styles.modalConfirmText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowCurrencyPicker(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '80%' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 16 }}>{t('addVoucher.selectCurrency')}</Text>
            {CURRENCIES.map(cur => (
              <TouchableOpacity key={cur.code} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }} onPress={() => { setEditCurrency(cur.code); setShowCurrencyPicker(false); }}>
                <Text style={[{ fontSize: 16, color: '#374151' }, editCurrency === cur.code && { color: '#2563eb', fontWeight: '800' }]}>{cur.code} {cur.symbol !== cur.code ? cur.symbol : ''}</Text>
                {editCurrency === cur.code && <Icon name="checkmark" size={18} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    zIndex: 10
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  saveHeaderBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 14 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  hero: { width: '100%', height: 280, backgroundColor: '#e2e8f0', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  placeholderStore: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 10, opacity: 0.8 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0)' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  storeName: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  voucherTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 4 },
  ownerBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ownerText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'flex-start', marginBottom: 20
  },

  balanceContainer: { marginBottom: 25 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  balanceValue: { fontSize: 42, fontWeight: '900', color: '#111827' },
  balanceCurrency: { fontSize: 20, color: '#94a3b8' },
  initialText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  progressBarContainer: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  infoBox: { width: (width - 80) / 2, backgroundColor: '#f8fafc', padding: 14, borderRadius: 18 },
  infoLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  pinContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinToggle: { padding: 2 },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 24 },

  historySection: { marginBottom: 30 },
  historyTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  emptyHistory: { alignItems: 'center', paddingVertical: 10 },
  noHistory: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
  historyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  historyIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyUser: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  historyDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: '900', color: '#ef4444' },

  useButton: { height: 60, backgroundColor: '#111827', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  useButtonDisabled: { opacity: 0.3 },
  useButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  deleteButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14, marginLeft: 8 },

  // Edit Mode Styles
  formContent: { padding: 20, paddingBottom: 100 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 4 },
  input: { height: 56, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row' },
  familySelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  familyItem: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  familyItemActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  familyItemText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  familyItemTextActive: { color: '#fff' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 28, padding: 24, alignItems: 'center' },
  deleteIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 12, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 20, height: 70, marginBottom: 24, width: '100%' },
  modalInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center' },
  modalCurrency: { fontSize: 18, fontWeight: '800', color: '#94a3b8', marginLeft: 10 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, height: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#f1f5f9' },
  modalCancelText: { fontWeight: '700', color: '#64748b' },
  modalConfirm: { flex: 1, height: 54, backgroundColor: '#2563eb', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '800' },

  // New Styles
  websiteLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
  websiteText: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginLeft: 6, textDecorationLine: 'underline' },
  notesContainer: { backgroundColor: '#fff7ed', padding: 16, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#f97316' },
  notesLabel: { fontSize: 10, fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  notesText: { fontSize: 14, color: '#431407', lineHeight: 20 },
  paginationDots: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, zIndex: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },

  swipeHint: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', zIndex: 20 },

  // Trip Styles
  tripContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 16, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e0f2fe' },
  tripIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tripLabel: { fontSize: 10, fontWeight: '800', color: '#0ea5e9', letterSpacing: 0.5, marginBottom: 2 },
  tripTitle: { fontSize: 16, fontWeight: '800', color: '#0c4a6e' },
  tripDestination: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Code Pool Styles
  codePoolContainer: { backgroundColor: '#fefce8', padding: 16, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#fef08a' },
  codePoolTitle: { fontSize: 13, fontWeight: '800', color: '#854d0e', marginBottom: 12, letterSpacing: 0.5 },
  codeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#fef08a' },
  codeItemUsed: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  codeIndicator: { marginRight: 12 },
  codeText: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  codeTextUsed: { color: '#166534', textDecorationLine: 'line-through' as 'line-through' },
  codeUsedDate: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Code Selection Modal Styles
  codeSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: '#e2e8f0' },
  codeSelectItemActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  codeSelectRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  codeSelectRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },
  codeSelectText: { fontSize: 15, fontWeight: '600', color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  codeSelectTextActive: { color: '#2563eb', fontWeight: '700' }
});

export default VoucherDetail;
