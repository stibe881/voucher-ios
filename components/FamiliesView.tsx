import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, Switch, ActivityIndicator } from 'react-native';
import { Family, User, FamilyMember, FamilyInvite, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../types';
import { supabaseService } from '../services/supabase';
import { sendInviteResponseNotification } from '../services/notifications';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import Icon from './Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENCIES, getCurrencySymbol } from './AddVoucher';

interface FamiliesViewProps {
  families: Family[];
  user: User | null;
  pendingInvites: FamilyInvite[];
  onUpdateUser: (user: User) => void;
  onCreateFamily: (name: string, invites: string[]) => void;
  onUpdateFamily: (family: Family) => void;
  onDeleteFamily?: (id: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  showNotification: (title: string, body: string) => void;
  onRefreshInvites: () => void;
  onRefreshData?: () => void;
}

const FamiliesView: React.FC<FamiliesViewProps> = ({ families, user, pendingInvites, onUpdateUser, onCreateFamily, onUpdateFamily, onDeleteFamily, onLogout, onDeleteAccount, showNotification, onRefreshInvites, onRefreshData }) => {
  const { t, i18n } = useTranslation();
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isProcessingInvite, setIsProcessingInvite] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<FamilyInvite[]>([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [showNotifDetails, setShowNotifDetails] = useState(false);

  // Load sent invites when a family is selected
  useEffect(() => {
    if (selectedFamily) {
      supabaseService.getSentInvitesForFamily(selectedFamily.id).then(setSentInvites);
    } else {
      setSentInvites([]);
    }
  }, [selectedFamily]);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
    if (user) {
      onUpdateUser({ ...user, language: langCode });
    }
  };

  const currentLanguageLabel = LANGUAGES.find(l => l.code === i18n.language)?.label || 'Deutsch';
  const currentCurrencyCode = user?.default_currency || 'CHF';
  const currentCurrencyLabel = CURRENCIES.find(c => c.code === currentCurrencyCode);
  const currentCurrencyDisplay = currentCurrencyLabel ? `${currentCurrencyLabel.code} ${currentCurrencyLabel.symbol !== currentCurrencyLabel.code ? currentCurrencyLabel.symbol : ''}`.trim() : currentCurrencyCode;

  const changeCurrency = async (code: string) => {
    await AsyncStorage.setItem('default-currency', code);
    setShowCurrencyModal(false);
    if (user) {
      onUpdateUser({ ...user, default_currency: code });
    }
  };

  const handleCreateFamily = () => {
    if (newFamilyName.trim()) {
      onCreateFamily(newFamilyName.trim(), []);
      setNewFamilyName('');
      setIsAddingFamily(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedFamily || !inviteEmail.trim().includes('@') || !user) return;

    try {
      await supabaseService.createInvite(
        selectedFamily.id,
        user.id,
        inviteEmail.trim(),
        user.name,
        selectedFamily.name
      );
      const invites = await supabaseService.getSentInvitesForFamily(selectedFamily.id);
      setSentInvites(invites);
      setInviteEmail('');
      showNotification(t('settings.inviteSent'), `${inviteEmail} ${t('settings.wasInvited')}`);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('settings.inviteFailed'));
    }
  };

  const handleRespondToInvite = async (invite: FamilyInvite, response: 'accepted' | 'rejected') => {
    if (!user) return;
    setIsProcessingInvite(invite.id);

    try {
      if (response === 'rejected') {
        await supabaseService.respondToInvite(invite.id, 'rejected');
        showNotification(t('settings.rejected'), t('settings.inviteRejected', { name: invite.family_name }));
      } else {
        const { error } = await supabaseService.acceptInviteAtomic(invite.id, user.email, user.name);
        if (error) throw error;

        showNotification(t('settings.joined'), `${t('settings.joinedMessage')} "${invite.family_name}"`);
      }

      const inviterData = await supabaseService.getInviterPushToken(invite.inviter_id);
      if (inviterData?.push_token) {
        // Check inviter's invitation_response preference
        const prefs = inviterData.notification_preferences;
        const wantsResponse = !prefs || prefs.invitation_response !== false;
        if (wantsResponse) {
          await sendInviteResponseNotification(inviterData.push_token, user.name, invite.family_name || t('settings.groupFallback'), response);
        }
      }

      onRefreshInvites();
    } catch (error: any) {
      console.error("Invite Error:", error);
      Alert.alert(t('common.error'), error.message || t('settings.actionFailed'));
    } finally {
      setIsProcessingInvite(null);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedFamily) return;
    const updatedMembers = (selectedFamily.members || []).filter(m => m.id !== memberId);
    const updatedFamily = {
      ...selectedFamily,
      members: updatedMembers,
      member_count: updatedMembers.length + 1
    };
    onUpdateFamily(updatedFamily);
    setSelectedFamily(updatedFamily);
  };

  const handleDeleteFamily = async (id: string) => {
    const family = families.find(f => f.id === id);
    const isOwner = family && user && family.user_id === user.id;

    if (!isOwner) {
      Alert.alert(
        t('settings.noPermission'),
        t('settings.deleteGroupError')
      );
      return;
    }

    Alert.alert(
      t('settings.deleteGroup'),
      t('settings.deleteGroupConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              if (onDeleteFamily) onDeleteFamily(id);
              else await supabaseService.deleteFamily(id);
              setSelectedFamily(null);
              showNotification(t('settings.removed'), t('settings.groupRemoved'));
            } catch (e) {
              Alert.alert(t('common.error'), t('settings.deleteFailed'));
            }
          }
        }
      ]
    );
  };

  const handleLeaveFamily = async (id: string) => {
    Alert.alert(
      t('settings.leaveGroup'),
      t('settings.leaveGroupConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('settings.leave'),
          style: "destructive",
          onPress: async () => {
            try {
              if (user) {
                await supabaseService.removeFamilyMember(id, user.id);
                setSelectedFamily(null);
                showNotification(t('settings.left'), t('settings.leftGroup'));
                if (onRefreshData) onRefreshData();
              }
            } catch (e) {
              Alert.alert(t('common.error'), t('settings.leaveFailed'));
            }
          }
        }
      ]
    );
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await supabaseService.deleteInvite(inviteId);
      if (sentInvites) {
        setSentInvites(prev => prev.filter(i => i.id !== inviteId));
      }
      showNotification(t('settings.removed'), t('settings.inviteDeleted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.inviteDeleteFailed'));
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (user) {
      onUpdateUser({ ...user, notifications_enabled: val });
    }
  };

  const handleToggleNotifPref = (key: keyof NotificationPreferences, val: boolean) => {
    if (user) {
      const currentPrefs = user.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES;
      const newPrefs = { ...currentPrefs, [key]: val };
      onUpdateUser({ ...user, notification_preferences: newPrefs });
    }
  };

  const handleSaveProfile = () => {
    if (user && editName.trim()) {
      onUpdateUser({ ...user, name: editName.trim() });
      setIsEditingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert(t('common.error'), t('settings.invalidEmail'));
      return;
    }
    setIsLoading(true);
    try {
      await supabaseService.updateEmail(newEmail.trim());
      Alert.alert(t('settings.confirmationSent'), t('settings.checkEmail'));
      setIsChangingEmail(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('settings.emailChangeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('settings.shortPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('settings.passwordsDoNotMatch'));
      return;
    }
    setIsLoading(true);
    try {
      await supabaseService.updatePassword(newPassword);
      Alert.alert(t('common.success'), t('settings.passwordChanged'));
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('settings.passwordChangeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profileCard} onPress={() => setIsEditingProfile(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.substring(0, 1).toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || t('app.userFallback')}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <Text style={styles.editLabel}>{t('settings.editProfile')}</Text>
          </View>
          <Icon name="chevron-forward-outline" size={20} color="#d1d5db" />
        </TouchableOpacity>

        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 5 }}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#dbeafe' }]}>
                <Icon name="notifications" size={18} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
                <Text style={styles.settingSub}>{t('settings.receivePush')}</Text>
              </View>
            </View>
            <Switch
              value={user?.notifications_enabled ?? true}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
              thumbColor={'#fff'}
            />
          </View>

          {(user?.notifications_enabled ?? true) && (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowNotifDetails(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#eff6ff' }]}>
                  <Icon name="options-outline" size={18} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
                  <Text style={styles.settingSub}>
                    {Object.values(user?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES).filter(Boolean).length}/5 {t('settings.notifications').toLowerCase()}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward-outline" size={16} color="#d1d5db" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#f3e8ff' }]}>
                <Icon name="globe-outline" size={18} color="#9333ea" />
              </View>
              <View>
                <Text style={styles.settingLabel}>{t('login.language')}</Text>
                <Text style={styles.settingSub}>{currentLanguageLabel}</Text>
              </View>
            </View>
            <Icon name="chevron-forward-outline" size={16} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowCurrencyModal(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#fef3c7' }]}>
                <Icon name="cash-outline" size={18} color="#d97706" />
              </View>
              <View>
                <Text style={styles.settingLabel}>{t('settings.defaultCurrency')}</Text>
                <Text style={styles.settingSub}>{currentCurrencyDisplay}</Text>
              </View>
            </View>
            <Icon name="chevron-forward-outline" size={16} color="#d1d5db" />
          </TouchableOpacity>
        </View>

      </View>

      {isEditingProfile && (
        <View style={styles.editOverlay}>
          <Text style={styles.sectionLabel}>{t('settings.changeName')}</Text>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} autoFocus placeholderTextColor="#9ca3af" />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsEditingProfile(false)}><Text style={styles.btnCancelText}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSaveProfile}><Text style={styles.btnSaveText}>{t('common.save')}</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('settings.accountSecurity')}</Text>

        <TouchableOpacity style={styles.settingRow} onPress={() => setIsChangingEmail(!isChangingEmail)}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#f59e0b' }]}><Icon name="mail" size={16} color="#fff" /></View>
            <Text style={styles.settingLabel}>{t('settings.changeEmail')}</Text>
          </View>
          <Icon name={isChangingEmail ? "chevron-down-outline" : "chevron-forward-outline"} size={16} color="#d1d5db" />
        </TouchableOpacity>

        {isChangingEmail && (
          <View style={styles.settingContent}>
            <Text style={styles.inputLabel}>{t('settings.newEmailAddress')}</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="neue@email.de"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateEmail} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.settingRow} onPress={() => setIsChangingPassword(!isChangingPassword)}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#10b981' }]}><Icon name="lock-closed" size={16} color="#fff" /></View>
            <Text style={styles.settingLabel}>{t('settings.changePassword')}</Text>
          </View>
          <Icon name={isChangingPassword ? "chevron-down-outline" : "chevron-forward-outline"} size={16} color="#d1d5db" />
        </TouchableOpacity>

        {isChangingPassword && (
          <View style={styles.settingContent}>
            <Text style={styles.inputLabel}>{t('settings.newPassword')}</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder={t('settings.shortPassword')}
            />
            <Text style={styles.inputLabel}>{t('settings.confirm')}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={t('settings.repeatPassword')}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdatePassword} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{t('settings.changePassword')}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.pendingInvites')}</Text>
          {pendingInvites.map(invite => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteFamily}>{invite.family_name || t('settings.groupFallback')}</Text>
                <Text style={styles.inviteFrom}>{t('settings.fromInviter', { name: invite.inviter_name || t('settings.unknown') })}</Text>
              </View>
              <View style={styles.inviteActions}>
                {isProcessingInvite === invite.id ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inviteRejectBtn}
                      onPress={() => handleRespondToInvite(invite, 'rejected')}
                    >
                      <Icon name="close" size={20} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inviteAcceptBtn}
                      onPress={() => handleRespondToInvite(invite, 'accepted')}
                    >
                      <Icon name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{t('settings.groupsFamilies')}</Text>
          <TouchableOpacity onPress={() => setIsAddingFamily(true)} style={styles.addBtn}>
            <Text style={styles.addText}>+ {t('settings.create')}</Text>
          </TouchableOpacity>
        </View>

        {isAddingFamily && (
          <View style={styles.createBox}>
            <TextInput autoFocus style={styles.input} value={newFamilyName} onChangeText={setNewFamilyName} placeholder={t('settings.groupName')} placeholderTextColor="#9ca3af" />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsAddingFamily(false)}><Text style={styles.btnCancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleCreateFamily}><Text style={styles.btnSaveText}>{t('settings.create')}</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {families.map(family => (
          <TouchableOpacity key={family.id} style={styles.settingRow} onPress={() => setSelectedFamily(family)}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#eef2ff' }]}><Icon name="people" size={16} color="#2563eb" /></View>
              <View>
                <Text style={styles.settingLabel}>{family.name}</Text>
                <Text style={styles.settingSub}>{family.member_count} {t('settings.members')}</Text>
              </View>
            </View>
            <Icon name="chevron-forward-outline" size={16} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.settingRow} onPress={onLogout}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#fee2e2' }]}><Icon name="log-out-outline" size={16} color="#ef4444" /></View>
            <Text style={[styles.settingLabel, { color: '#ef4444' }]}>{t('settings.logout')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            Alert.alert(
              t('settings.deleteAccount'),
              t('settings.deleteAccountConfirm'),
              [
                { text: t('common.cancel'), style: "cancel" },
                {
                  text: t('settings.deleteAccount'),
                  style: "destructive",
                  onPress: onDeleteAccount
                }
              ]
            );
          }}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#fee2e2' }]}><Icon name="trash-outline" size={16} color="#ef4444" /></View>
            <Text style={[styles.settingLabel, { color: '#ef4444' }]}>{t('settings.deleteAccount')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal für Gruppen-Details */}
      <Modal visible={!!selectedFamily} animationType="slide" presentationStyle="pageSheet">
        {selectedFamily && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedFamily(null)}><Icon name="close" size={24} color="#64748b" /></TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedFamily.name}</Text>
              {user && selectedFamily.user_id === user.id ? (
                <TouchableOpacity onPress={() => handleDeleteFamily(selectedFamily.id)}><Icon name="trash-outline" size={24} color="#ef4444" /></TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => handleLeaveFamily(selectedFamily.id)}><Icon name="exit-outline" size={24} color="#f59e0b" /></TouchableOpacity>
              )}
            </View>

            <ScrollView contentContainerStyle={styles.modalContentInner}>
              <Text style={styles.modalSectionLabel}>{t('settings.manageMembers')}</Text>

              {user && selectedFamily.user_id === user.id && (
                <View style={styles.memberInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder={t('settings.inviteEmail')}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                  />
                  <TouchableOpacity style={styles.memberAddBtn} onPress={handleAddMember}>
                    <Icon name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.memberList}>
                <View style={styles.memberItem}>
                  <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>D</Text></View>
                  <Text style={styles.memberName}>{user && selectedFamily.user_id === user.id ? t('settings.youOwner') : t('settings.you')}</Text>
                </View>
                {(selectedFamily.members || []).filter(m => m && m.id).map(member => (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={[styles.memberAvatar, { backgroundColor: '#f1f5f9' }]}><Text style={[styles.memberAvatarText, { color: '#64748b' }]}>{member.email[0].toUpperCase()}</Text></View>
                    <Text style={styles.memberName}>{member.email}</Text>
                    {user && selectedFamily.user_id === user.id && (
                      <TouchableOpacity onPress={() => handleRemoveMember(member.id)}><Icon name="remove-circle-outline" size={20} color="#ef4444" /></TouchableOpacity>
                    )}
                  </View>
                ))}
                {/* Pending invites */}
                {sentInvites.filter(inv => inv && inv.id).map(invite => (
                  <View key={invite.id} style={styles.memberItem}>
                    <View style={[styles.memberAvatar, { backgroundColor: '#fef3c7' }]}><Text style={[styles.memberAvatarText, { color: '#d97706' }]}>{invite.invitee_email[0].toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{invite.invitee_email}</Text>
                      <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '600' }}>{t('settings.invited')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteInvite(invite.id)}>
                      <Icon name="close-circle-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Notification Preferences Modal */}
      <Modal visible={showNotifDetails} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('settings.notifications')}</Text>
            <ScrollView>
              {([
                { key: 'voucher_expiry' as const, label: t('settings.notifExpiryReminders'), desc: t('settings.notifExpiryRemindersDesc'), icon: 'time-outline', color: '#f59e0b' },
                { key: 'family_invitation' as const, label: t('settings.notifFamilyInvitations'), desc: t('settings.notifFamilyInvitationsDesc'), icon: 'people-outline', color: '#8b5cf6' },
                { key: 'invitation_response' as const, label: t('settings.notifInvitationResponses'), desc: t('settings.notifInvitationResponsesDesc'), icon: 'mail-open-outline', color: '#06b6d4' },
                { key: 'voucher_new' as const, label: t('settings.notifNewVouchers'), desc: t('settings.notifNewVouchersDesc'), icon: 'add-circle-outline', color: '#10b981' },
                { key: 'voucher_transfer' as const, label: t('settings.notifVoucherTransfers'), desc: t('settings.notifVoucherTransfersDesc'), icon: 'paper-plane-outline', color: '#ef4444' },
              ]).map(item => {
                const prefs = user?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES;
                return (
                  <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.color + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Icon name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    <Switch
                      value={prefs[item.key]}
                      onValueChange={(val) => handleToggleNotifPref(item.key, val)}
                      trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                      thumbColor={'#fff'}
                    />
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNotifDetails(false)}>
              <Text style={styles.modalCloseText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('login.language')}</Text>
            <ScrollView>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langItem, i18n.language === lang.code && styles.langItemActive]}
                  onPress={() => changeLanguage(lang.code)}
                >
                  <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>{lang.label}</Text>
                  {i18n.language === lang.code && <Icon name="checkmark" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('settings.defaultCurrency')}</Text>
            <ScrollView>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur.code}
                  style={[styles.langItem, currentCurrencyCode === cur.code && styles.langItemActive]}
                  onPress={() => changeCurrency(cur.code)}
                >
                  <Text style={[styles.langText, currentCurrencyCode === cur.code && styles.langTextActive]}>{cur.code} {cur.symbol !== cur.code ? cur.symbol : ''}</Text>
                  {currentCurrencyCode === cur.code && <Icon name="checkmark" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCurrencyModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Vouchy v1.2.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { marginBottom: 15, paddingTop: 10, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827' },
  profileSection: { marginBottom: 25, paddingHorizontal: 20 },
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  editLabel: { fontSize: 12, color: '#2563eb', fontWeight: '800', marginTop: 6 },
  section: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 25, marginHorizontal: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  addBtn: { paddingTop: 20, paddingBottom: 10 },
  addText: { color: '#2563eb', fontWeight: '800', fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  settingSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  editOverlay: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 25, marginHorizontal: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8 },
  input: { height: 55, backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#1e293b', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 5 },
  btn: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCancelText: { fontWeight: '700', color: '#64748b' },
  btnSave: { backgroundColor: '#2563eb' },
  btnSaveText: { fontWeight: '800', color: '#fff' },
  createBox: { padding: 20, backgroundColor: '#f8fafc' },
  footer: { alignItems: 'center', marginTop: 20, paddingBottom: 40 },
  versionText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalContentInner: { padding: 20 },
  modalSectionLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15 },
  memberInputRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  memberAddBtn: { width: 55, height: 55, backgroundColor: '#2563eb', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  memberList: { gap: 12 },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 18 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { color: '#fff', fontWeight: '800' },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },

  // Invite styles
  inviteCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inviteInfo: { flex: 1 },
  inviteFamily: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  inviteFrom: { fontSize: 13, color: '#64748b', marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  inviteRejectBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  inviteAcceptBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },

  // Language Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  langModalContent: { backgroundColor: '#fff', width: '100%', maxWidth: 320, borderRadius: 24, padding: 20, maxHeight: 500 },
  langModalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center', color: '#111827' },
  langItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  langItemActive: { backgroundColor: '#eff6ff', marginHorizontal: -20, paddingHorizontal: 20 },
  langText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  langTextActive: { color: '#2563eb', fontWeight: '700' },
  modalCloseBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
  modalCloseText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },

  // Missing styles
  settingContent: { padding: 20, backgroundColor: '#f8fafc', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 10 },
  primaryBtn: { height: 50, backgroundColor: '#2563eb', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default FamiliesView;
