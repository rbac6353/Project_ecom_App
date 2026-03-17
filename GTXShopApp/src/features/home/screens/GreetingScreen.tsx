// screens/GreetingScreen.tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function GreetingScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // ฟังก์ชันสำหรับแสดงข้อความทักทายตามเวลา
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.name || 'Guest';
  const userEmail = user?.email || '';

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <ScreenHeader title="Welcome" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Card */}
        <View style={[styles.greetingCard, { backgroundColor: colors.card }]}>
          <View style={styles.greetingHeader}>
            {user?.picture ? (
              <Image
                source={{ uri: user.picture }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {userName[0]?.toUpperCase() || 'G'}
                </Text>
              </View>
            )}
            <View style={styles.greetingTextContainer}>
              <Text style={[styles.greetingText, { color: colors.text }]}>
                Hey, {userName} 👋
              </Text>
              <Text style={[styles.greetingSubtext, { color: colors.subText }]}>
                {getGreeting()}
              </Text>
            </View>
          </View>
        </View>

        {/* User Info Section */}
        {user ? (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>ข้อมูลผู้ใช้</Text>
              <TouchableOpacity
                onPress={() => {
                  // Navigate ไปยัง EditProfile (อยู่ใน RootStackNavigator)
                  navigation.navigate('EditProfile');
                }}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>แก้ไข</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={colors.subText} />
              <Text style={[styles.infoLabel, { color: colors.subText }]}>ชื่อ:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{userName}</Text>
            </View>
            
            {userEmail && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={colors.subText} />
                <Text style={[styles.infoLabel, { color: colors.subText }]}>อีเมล:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{userEmail}</Text>
              </View>
            )}
            
            {user?.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={colors.subText} />
                <Text style={[styles.infoLabel, { color: colors.subText }]}>เบอร์โทร:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.phone}</Text>
              </View>
            )}
            
            {user?.points !== undefined && (
              <TouchableOpacity
                style={styles.pointsRow}
                onPress={() => {
                  // Navigate ไปยัง MyPoints
                  const rootNavigation = navigation.getParent()?.getParent();
                  if (rootNavigation) {
                    rootNavigation.navigate('MyPoints');
                  } else {
                    navigation.navigate('MyPoints');
                  }
                }}
              >
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.subText }]}>BoxiFY Coins:</Text>
                <Text style={[styles.pointsValue, { color: colors.primary }]}>{user.points || 0}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>เข้าสู่ระบบ</Text>
            <Text style={[styles.sectionDescription, { color: colors.subText }]}>
              เข้าสู่ระบบเพื่อเข้าถึงฟีเจอร์ทั้งหมด
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>เมนูด่วน</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              // Navigate ไปยัง EditProfile (อยู่ใน RootStackNavigator)
              navigation.navigate('EditProfile');
            }}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>แก้ไขโปรไฟล์</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('OrderHistory')}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>คำสั่งซื้อของฉัน</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              // Navigate ไปยัง MainTabs -> Profile tab -> WishlistScreen
              const rootNavigation = navigation.getParent()?.getParent();
              if (rootNavigation) {
                rootNavigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'WishlistScreen',
                  },
                });
              } else {
                // Fallback: navigate ไปยัง MainTabs ก่อน
                navigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'WishlistScreen',
                  },
                });
              }
            }}
          >
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>รายการโปรด</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              // Navigate ไปยัง MainTabs -> Profile tab -> SettingsScreen
              const rootNavigation = navigation.getParent()?.getParent();
              if (rootNavigation) {
                rootNavigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'SettingsScreen',
                  },
                });
              } else {
                // Fallback: navigate ไปยัง MainTabs ก่อน
                navigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'SettingsScreen',
                  },
                });
              }
            }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>การตั้งค่า</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  greetingCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 16,
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 140, 66, 0.1)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 10,
    marginRight: 10,
    minWidth: 60,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
  },
});

