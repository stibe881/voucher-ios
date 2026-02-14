
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { AppNotification } from '../types';
import Icon from './Icon';
import { useTranslation } from 'react-i18next';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onBack: () => void;
  onClearAll: () => void;
  onMarkAsRead: (id: string) => void;
  onSelectNotification?: (n: AppNotification) => void; // New prop for deep link
  onAcceptInvite?: (inviteId: string) => Promise<void>;
  onRejectInvite?: (inviteId: string) => Promise<void>;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onBack,
  onClearAll,
  onMarkAsRead,
  onSelectNotification,
  onAcceptInvite,
  onRejectInvite
}) => {
  const { t } = useTranslation();
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#10b981' };
      case 'warning': return { name: 'alert-circle', color: '#ef4444' };
      default: return { name: 'information-circle', color: '#3b82f6' };
    }
  };

  const handleAccept = async (inviteId: string, notificationId: string) => {
    if (!onAcceptInvite) return;
    setProcessingInvite(inviteId);
    try {
      await onAcceptInvite(inviteId);
      onMarkAsRead(notificationId);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleReject = async (inviteId: string, notificationId: string) => {
    if (!onRejectInvite) return;
    setProcessingInvite(inviteId);
    try {
      await onRejectInvite(inviteId);
      onMarkAsRead(notificationId);
    } finally {
      setProcessingInvite(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.circleBtn} activeOpacity={0.7}>
          <Icon name="chevron-back-outline" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <TouchableOpacity onPress={onClearAll} style={styles.clearBtn} activeOpacity={0.7}>
          <Text style={styles.clearBtnText}>{t('notifications.clearAll')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off-outline" size={80} color="#e2e8f0" />
            <Text style={styles.emptyText}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptySubText}>{t('notifications.emptyMessage')}</Text>
          </View>
        ) : (
          notifications.map(item => {
            const icon = getIconForType(item.type);
            const isInvitation = !!item.metadata?.invite_id;
            const isProcessing = processingInvite === item.metadata?.invite_id;

            return (
              <View
                key={item.id}
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
              >
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => {
                    if (!isInvitation) {
                      onMarkAsRead(item.id);
                      if (onSelectNotification) onSelectNotification(item);
                    }
                  }}
                  activeOpacity={isInvitation ? 1 : 0.7}
                  disabled={isInvitation}
                >
                  <View style={[styles.iconBox, { backgroundColor: icon.color + '10' }]}>
                    <Icon name={icon.name} size={22} color={icon.color} />
                  </View>
                  <View style={styles.contentBox}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text style={styles.notifBody}>{item.body}</Text>
                  </View>
                  {!item.read && !isInvitation && <View style={styles.unreadDot} />}
                </TouchableOpacity>

                {isInvitation && item.metadata?.invite_id && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.actionBtnDisabled]}
                      onPress={() => handleReject(item.metadata.invite_id!, item.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <>
                          <Icon name="close-outline" size={18} color="#ef4444" />
                          <Text style={styles.rejectBtnText}>{t('notifications.decline')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn, isProcessing && styles.actionBtnDisabled]}
                      onPress={() => handleAccept(item.metadata.invite_id!, item.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon name="checkmark-outline" size={18} color="#fff" />
                          <Text style={styles.acceptBtnText}>{t('notifications.accept')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  list: { padding: 20, paddingBottom: 60 },
  notificationCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  cardContent: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contentBox: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  timestamp: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  notifBody: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  actionBtnDisabled: { opacity: 0.5 },
  rejectBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  acceptBtn: { backgroundColor: '#2563eb' },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: '900', color: '#334155', marginTop: 20 },
  emptySubText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginTop: 10, lineHeight: 22 }
});

export default NotificationCenter;
