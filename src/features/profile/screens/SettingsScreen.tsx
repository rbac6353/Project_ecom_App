import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout, login, isLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, colors } = useTheme();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [password, setPassword] = useState('');

  // ✅ ฟังก์ชันเปลี่ยนภาษา
  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang); // เปลี่ยนทันที
    await AsyncStorage.setItem('language', lang); // จำค่าไว้
  };

  // ✅ UI เลือกภาษา
  const showLanguageOptions = () => {
    Alert.alert(
      t('profile.language'),
      'Select your language / เลือกภาษา',
      [
        { text: 'English', onPress: () => changeLanguage('en') },
        { text: 'ไทย', onPress: () => changeLanguage('th') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('common.confirm') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          // Navigate ไปที่ AuthScreen
          navigation.navigate('MainTabs', {
            screen: 'Profile',
            params: {
              screen: 'AuthScreen',
            },
          });
        },
      },
    ]);
  };

  // ✅ ฟังก์ชันช่วยสลับบัญชีทดสอบอย่างรวดเร็ว
  const quickSwitchLogin = async (email: string, password: string) => {
    if (isLoading) return;
    try {
      const ok = await login(email, password);
      if (ok) {
        // กลับไปหน้าโปรไฟล์หลังสลับบัญชี
        navigation.popToTop();
        const rootNavigation = navigation.getParent()?.getParent();
        if (rootNavigation) {
          rootNavigation.navigate('MainTabs', { screen: 'Profile' });
        } else {
          navigation.navigate('MainTabs', { screen: 'Profile' });
        }
      } else {
        Alert.alert('สลับบัญชีไม่สำเร็จ', 'กรุณาตรวจสอบบัญชีทดสอบอีกครั้ง');
      }
    } catch (e) {
      console.error('switch account error', e);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสลับบัญชีได้ในขณะนี้');
    }
  };

  // ✅ ปุ่มเมนูสลับบัญชี (ใช้ Modal แทน Alert เพื่อแสดงได้ครบ 4 บัญชีบน Android)
  const handleSwitchAccountMenu = () => {
    setShowAccountModal(true);
  };

  // รายชื่อบัญชีทดสอบ
  const testAccounts = [
    { label: 'User', email: 'user@gmail.com', password: '12345678' },
    { label: 'Seller', email: 'seller1@gmail.com', password: '12345678' },
    { label: 'Seller Mall', email: 'sellermall1@gmail.com', password: '12345678' },
    { label: 'Courier', email: 'courier@gmail.com', password: '12345678' },
    { label: 'Admin', email: 'admin@gmail.com', password: '12345678' },
  ];

  // ✅ Step 109: ฟังก์ชันลบบัญชีผู้ใช้
  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ ' + t('profile.deleteAccountConfirm'),
      t('profile.deleteAccountWarning') + '\n\n' + t('common.confirm') + '?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: () => setShowPasswordModal(true), // เปิด Modal กรอกรหัสผ่าน
        },
      ],
    );
  };

  const confirmDelete = async () => {
    if (!password.trim()) {
      Alert.alert(t('common.error'), 'กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      await client.post('/users/me/delete', { password: password.trim() });
      setShowPasswordModal(false);
      setPassword('');
      Alert.alert(t('profile.deleteAccountSuccess'), t('profile.deleteAccountSuccessMessage'), [
        {
          text: t('common.confirm'),
          onPress: async () => {
            await logout(); // ออกจากระบบ
            // Navigate ไปที่ AuthScreen
            navigation.navigate('MainTabs', {
              screen: 'Profile',
              params: {
                screen: 'AuthScreen',
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Delete account error:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || 'ไม่สามารถลบบัญชีได้ในขณะนี้',
      );
      setPassword(''); // ล้างรหัสผ่านเมื่อเกิด error
    }
  };

  const renderItem = (
    icon: any,
    title: string,
    onPress: () => void,
    color?: string,
  ) => (
    <TouchableOpacity style={[styles.item, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={24} color={color || colors.icon} style={styles.icon} />
        <Text style={[styles.itemTitle, { color: color || colors.text }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('profile.settings')} />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.subText }]}>{t('settings.account')}</Text>
          {renderItem('person-outline', t('profile.editProfile'), () =>
            navigation.navigate('EditProfile'),
          )}
          {renderItem('location-outline', t('profile.addresses'), () =>
            navigation.navigate('AddressList', { mode: 'manage' }),
          )}
          {renderItem('card-outline', 'บัญชีธนาคาร / บัตร', () =>
            Alert.alert('Coming Soon', 'ฟีเจอร์นี้จะเปิดให้ใช้งานเร็วๆ นี้'),
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.subText }]}>{t('settings.title')}</Text>
          {renderItem('notifications-outline', t('profile.notifications'), () =>
            navigation.getParent()?.getParent()?.navigate('NotificationSettings'),
          )}
          <TouchableOpacity style={[styles.item, { backgroundColor: colors.card }]} onPress={showLanguageOptions}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={24} color={colors.icon} style={styles.icon} />
              <Text style={[styles.itemTitle, { color: colors.text }]}>{t('profile.language')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.subText, marginRight: 8 }}>
                {i18n.language === 'th' ? 'ไทย' : 'English'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </View>
          </TouchableOpacity>
          <View style={[styles.item, { backgroundColor: colors.card }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={24} color={colors.icon} style={styles.icon} />
              <Text style={[styles.itemTitle, { color: colors.text }]}>โหมดมืด (Dark Mode)</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e0e0e0', true: colors.primary }}
              thumbColor={theme === 'dark' ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.subText }]}>{t('settings.about')}</Text>
          {renderItem('information-circle-outline', 'นโยบายความเป็นส่วนตัว', () =>
            navigation.navigate('PrivacyPolicy'),
          )}
          {renderItem('help-circle-outline', t('profile.help'), () =>
            navigation.navigate('HelpCenter'),
          )}
        </View>

        <View style={[styles.section, { marginTop: 20 }]}>
          {renderItem('log-out-outline', t('profile.logout'), handleLogout, '#FF5722')}
        </View>

        {/* ปุ่มสลับบัญชีทดสอบ (อยู่ใต้ปุ่มออกจากระบบ สีแตกต่าง) */}
        <TouchableOpacity
          style={[
            styles.switchAccountBtn,
            { borderColor: colors.primary },
          ]}
          onPress={handleSwitchAccountMenu}
          disabled={isLoading}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color={colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.switchAccountText, { color: colors.primary }]}>
            สลับบัญชี (ทดสอบ)
          </Text>
        </TouchableOpacity>

        {/* ✅ เพิ่มปุ่มลบบัญชี (ไว้ล่างสุด ตัวหนังสือสีแดง) */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ✅ Modal กรอกรหัสผ่าน */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ยืนยันรหัสผ่าน</Text>
            <Text style={styles.modalSubtitle}>
              กรุณากรอกรหัสผ่านของคุณเพื่อยืนยันการลบบัญชี
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="รหัสผ่าน"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal สลับบัญชีทดสอบ */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountModal(false)}
        >
          <View style={[styles.accountModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>สลับบัญชีทดสอบ</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              เลือกบัญชีที่ต้องการเข้าสู่ระบบ
            </Text>
            {testAccounts.map((account) => (
              <TouchableOpacity
                key={account.email}
                style={[styles.accountItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowAccountModal(false);
                  quickSwitchLogin(account.email, account.password);
                }}
                disabled={isLoading}
              >
                <Text style={[styles.accountLabel, { color: colors.primary }]}>
                  {account.label.toUpperCase()} ({account.email})
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelAccountBtn}
              onPress={() => setShowAccountModal(false)}
            >
              <Text style={{ color: colors.subText }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    marginLeft: 5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 1,
    borderRadius: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 15,
  },
  itemTitle: {
    fontSize: 16,
  },
  switchAccountBtn: {
    marginHorizontal: 15,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  switchAccountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    marginTop: 30,
    alignItems: 'center',
    padding: 15,
  },
  deleteAccountText: {
    color: '#D32F2F',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  accountModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  accountItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  accountLabel: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelAccountBtn: {
    paddingVertical: 15,
    alignItems: 'center',
  },
});
