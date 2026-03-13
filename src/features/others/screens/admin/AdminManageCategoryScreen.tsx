import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

interface Subcategory {
  name: string;
  icon: string;
}

export default function AdminManageCategoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const category = route.params?.category;
  const isEdit = !!category;

  const [name, setName] = useState(category?.name || '');

  // ✅ แยก State สำหรับ Icon, Image URL, และ Subcategories
  const [categoryIcon, setCategoryIcon] = useState('');
  const [categoryImage, setCategoryImage] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [loading, setLoading] = useState(false);

  // ✅ โหลดข้อมูล Category และ Subcategories เมื่อโหลด
  useEffect(() => {
    if (category) {
      // Parse JSON จาก field 'image' เพื่อดึง icon และ image URL
      if (category.image) {
        try {
          const parsed = JSON.parse(category.image);
          if (typeof parsed === 'object') {
            setCategoryIcon(parsed.icon || '');
            setCategoryImage(parsed.image || '');
          }
        } catch (e) {
          // ถ้าไม่ใช่ JSON (เป็น URL ตรงๆ แบบเก่า)
          setCategoryImage(category.image);
        }
      }
      
      // ✅ ใช้ subcategories จาก API (ไม่ต้อง parse JSON)
      if (category.subcategories && Array.isArray(category.subcategories)) {
        const subs = category.subcategories.map((item: any) => {
          // แปลง icon จาก entity fields เป็น icon string
          let icon = '🔹';
          if (item.iconEmoji) {
            icon = item.iconEmoji;
          } else if (item.iconIonicon) {
            icon = item.iconIonicon;
          }
          
          return {
            name: item.name,
            icon: icon,
          };
        });
        setSubcategories(subs);
      }
    }
  }, [category]);

  const handleAddSubcategory = () => {
    setSubcategories([...subcategories, { name: '', icon: '🔹' }]);
  };

  const handleRemoveSubcategory = (index: number) => {
    const newSubs = [...subcategories];
    newSubs.splice(index, 1);
    setSubcategories(newSubs);
  };

  const handleUpdateSubcategory = (index: number, field: keyof Subcategory, value: string) => {
    const newSubs = [...subcategories];
    newSubs[index] = { ...newSubs[index], [field]: value };
    setSubcategories(newSubs);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('ผิดพลาด', 'กรุณากรอกชื่อหมวดหมู่');
    }

    setLoading(true);
    try {
      // ✅ Construct JSON Object สำหรับ image (เก็บแค่ icon และ image URL)
      const imageJson = JSON.stringify({
        icon: categoryIcon.trim(),
        image: categoryImage.trim(),
        // ✅ ไม่ต้องส่ง subcategories ใน JSON แล้ว (ส่งแยกเป็น array)
      });

      // ✅ ส่ง subcategories แยกเป็น array (Backend จะบันทึกลง table)
      const subcategoriesData = subcategories
        .filter(s => s.name.trim() !== '') // กรองอันที่ไม่มีชื่อออก
        .map(sub => ({
          name: sub.name.trim(),
          icon: sub.icon.trim() || '🔹', // ส่ง icon เป็น string (Backend จะแปลงเป็น iconType, iconEmoji, iconIonicon)
        }));

      const payload = {
        name: name.trim(),
        image: imageJson, // ✅ เก็บแค่ icon และ image URL
        subcategories: subcategoriesData, // ✅ ส่ง subcategories แยกเป็น array
      };

      console.log(
        `${isEdit ? '✏️ Updating' : '➕ Creating'} category:`,
        {
          name: payload.name,
          subcategoriesCount: payload.subcategories.length,
          subcategories: payload.subcategories,
        },
      );

      if (isEdit) {
        await client.patch(`/categories/${category.id}`, payload);
        Alert.alert('สำเร็จ', 'แก้ไขหมวดหมู่เรียบร้อย');
      } else {
        await client.post('/categories', payload);
        Alert.alert('สำเร็จ', 'เพิ่มหมวดหมู่เรียบร้อย');
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('❌ Error saving category:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'บันทึกไม่สำเร็จ';
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
      />

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* ชื่อหมวดหมู่ */}
        <Text style={styles.label}>ชื่อหมวดหมู่ *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="เช่น เสื้อผ้าแฟชั่น"
          placeholderTextColor="#999"
        />

        {/* ไอคอนหมวดหมู่ */}
        <Text style={styles.label}>ไอคอน (Emoji)</Text>
        <TextInput
          style={styles.input}
          value={categoryIcon}
          onChangeText={setCategoryIcon}
          placeholder="เช่น 👗"
          placeholderTextColor="#999"
        />

        {/* รูปภาพหมวดหมู่ */}
        <Text style={styles.label}>URL รูปภาพปก</Text>
        <TextInput
          style={styles.input}
          value={categoryImage}
          onChangeText={setCategoryImage}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor="#999"
        />
        {categoryImage ? (
          <Image source={{ uri: categoryImage }} style={styles.previewImage} />
        ) : null}

        {/* จัดการหมวดหมู่ย่อย */}
        <View style={styles.divider} />
        <View style={styles.subHeader}>
          <Text style={styles.sectionTitle}>หมวดหมู่ย่อย (Subcategories)</Text>
          <TouchableOpacity onPress={handleAddSubcategory} style={styles.addBtn}>
            <Ionicons name="add-circle" size={24} color="#FF5722" />
            <Text style={styles.addBtnText}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        {subcategories.map((sub, index) => (
          <View key={index} style={styles.subItemContainer}>
            <TextInput
              style={[styles.subInput, { width: 50, textAlign: 'center' }]}
              value={sub.icon}
              onChangeText={(text) => handleUpdateSubcategory(index, 'icon', text)}
              placeholder="Icon"
            />
            <TextInput
              style={[styles.subInput, { flex: 1, marginLeft: 10 }]}
              value={sub.name}
              onChangeText={(text) => handleUpdateSubcategory(index, 'name', text)}
              placeholder="ชื่อหมวดหมู่ย่อย"
            />
            <TouchableOpacity onPress={() => handleRemoveSubcategory(index)} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {subcategories.length === 0 && (
          <Text style={styles.emptyText}>ยังไม่มีหมวดหมู่ย่อย</Text>
        )}

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={[styles.btn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {isEdit ? 'บันทึกการแก้ไข' : 'สร้างหมวดหมู่'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
    backgroundColor: '#eee',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FF5722',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  subItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  removeBtn: {
    padding: 10,
    marginLeft: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  disabledBtn: { backgroundColor: '#ffccbc', opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

