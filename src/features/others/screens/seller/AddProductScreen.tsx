import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import client, { getApiBaseUrl } from '@app/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddProductScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const productId = route.params?.productId;
  const productData = route.params?.product;
  const isEditMode = !!productId;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('100');

  // ✅ เปลี่ยนจาก TextInput เป็น Selection
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState(''); // ✅ Backward compatibility: เก็บ name
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null); // ✅ ใช้ subcategoryId (แนะนำ)

  // ✅ รองรับหลายรูปภาพ (รูปปก + รูปเพิ่มเติม)
  const [images, setImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [hasVariants, setHasVariants] = useState(false);
  // ✅ รูปแบบใหม่: เก็บ attributes และ variants แยกกัน
  const [attributeTypes, setAttributeTypes] = useState<
    { type: string; values: string[] }[]
  >([]); // เช่น [{ type: 'COLOR', values: ['ดำ', 'ขาว'] }, { type: 'MEMORY', values: ['128GB', '256GB'] }]
  const [variants, setVariants] = useState<
    { name: string; price: string; stock: string; imageIndex?: number | null; attributes?: Record<string, string> | null }[]
  >([]);

  // ✅ Categories Data
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [globalSubcategories, setGlobalSubcategories] = useState<any[]>([]); // ✅ Global subcategories
  const [shopSubcategories, setShopSubcategories] = useState<any[]>([]); // ✅ Shop-specific subcategories
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null); // ✅ Store ID สำหรับ Seller

  useEffect(() => {
    fetchStoreId(); // ✅ ดึง storeId ก่อน
    fetchCategories();
    if (isEditMode && productId) {
      // ✅ แก้ไขสินค้า: โหลดข้อมูลตัวเต็มจาก API ทุกครั้ง (รวมตัวเลือก/รูปล่าสุด)
      loadProductData();
    } else if (!isEditMode && productData) {
      // กรณีพิเศษถ้าในอนาคตมีการส่ง product มาใช้เป็นค่าเริ่มต้น
      loadProductDataFromProduct(productData);
    }
  }, []);

  // ✅ ดึง storeId จาก user profile
  const fetchStoreId = async () => {
    try {
      const userData = await client.get('/auth/profile');
      const stores = userData?.stores || [];
      if (stores.length > 0) {
        setStoreId(stores[0].id);
      }
    } catch (error) {
      console.error('Error fetching storeId:', error);
    }
  };

  const loadProductData = async () => {
    try {
      if (productId) {
        // ✅ ใช้ข้อมูลจาก backend เป็นหลักเสมอ เพื่อให้ได้ข้อมูลล่าสุด
        // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
        const response = await client.get(`/products/${productId}`);
        // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
        const product = response?.data || response;

        if (!product || !product.id) {
          Alert.alert('ผิดพลาด', 'ไม่พบข้อมูลสินค้า');
          return;
        }

        loadProductDataFromProduct(product);
      }
    } catch (error: any) {
      console.error('Error loading product data:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
    }
  };

  const loadProductDataFromProduct = (product: any) => {
    // ✅ เพิ่ม null check เพื่อป้องกัน error
    if (!product) {
      console.warn('⚠️ loadProductDataFromProduct: product is undefined');
      return;
    }

    setName(product.title || product.name || '');
    setPrice(product.price?.toString() || '');
    setDescription(product.description || '');
    setStock(product.quantity?.toString() || '100');
    setCategoryId(product.categoryId?.toString() || '');
    setSubcategory(product.subcategory || product.subcategoryName || ''); // ✅ Backward compatibility
    setSubcategoryId(product.subcategoryId || null); // ✅ ใช้ subcategoryId

    if (product.images && product.images.length > 0) {
      const urls = product.images.map((img: any) => img.url).filter(Boolean);
      setImages(urls);
      setSelectedImageIndex(0);
    }

    if (product.variants && product.variants.length > 0) {
      setHasVariants(true);
      // ✅ โหลด variants พร้อม attributes
      setVariants(
        product.variants.map((v: any) => ({
          name: v.name || '',
          price: v.price?.toString() || '',
          stock: v.stock?.toString() || '0',
          imageIndex:
            typeof v.imageIndex === 'number' && !isNaN(v.imageIndex)
              ? v.imageIndex
              : null,
          attributes: v.attributes || null, // ✅ โหลด attributes
        }))
      );

      // ✅ สร้าง attributeTypes จาก variants ที่มีอยู่
      const typesMap = new Map<string, Set<string>>();
      product.variants.forEach((v: any) => {
        if (v.attributes && typeof v.attributes === 'object') {
          Object.keys(v.attributes).forEach((key) => {
            if (!typesMap.has(key)) {
              typesMap.set(key, new Set());
            }
            typesMap.get(key)?.add(v.attributes[key]);
          });
        }
      });

      const types: { type: string; values: string[] }[] = [];
      typesMap.forEach((values, type) => {
        types.push({ type, values: Array.from(values) });
      });
      setAttributeTypes(types);
    }

    if (product.category) {
      setCategoryName(product.category.name || '');
    }
  };

  const fetchCategories = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/categories');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const categoriesList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // ✅ Handle Category Selection - ดึง subcategories จาก API
  const handleSelectCategory = async (cat: any) => {
    setCategoryId(cat.id.toString());
    setCategoryName(cat.name);
    setSubcategory(''); // Reset subcategory
    setShowCategoryModal(false);

    // ✅ ดึง subcategories จาก API (Global + Shop-specific)
    await fetchSubcategories(cat.id);
  };

  // ✅ ดึง subcategories จาก API
  const fetchSubcategories = async (categoryId: number) => {
    try {
      // ✅ เรียก API พร้อม storeId (ถ้ามี) เพื่อดึง Global + Shop-specific
      let url = `/categories/${categoryId}/subcategories`;
      if (storeId) {
        url += `?storeId=${storeId}`;
      }

      const res = await client.get(url);
      const subcategoriesList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      // ✅ แยก Global และ Shop-specific
      const global = subcategoriesList.filter((sub: any) => !sub.storeId);
      const shop = subcategoriesList.filter((sub: any) => sub.storeId === storeId);

      setGlobalSubcategories(global);
      setShopSubcategories(shop);
      setSubcategories(subcategoriesList); // รวมทั้งหมดไว้ด้วย (สำหรับ backward compatibility)
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setGlobalSubcategories([]);
      setShopSubcategories([]);
      setSubcategories([]);
    }
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 50,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => {
        const merged = [...prev, ...newUris];
        // จำกัดไม่เกิน 50 รูป
        return merged.slice(0, 50);
      });
      setSelectedImageIndex(0);
    }
  };

  // ✅ เพิ่ม attribute type (เช่น Color, Memory)
  const addAttributeType = () => {
    setAttributeTypes([...attributeTypes, { type: '', values: [] }]);
  };

  // ✅ ลบ attribute type
  const removeAttributeType = (index: number) => {
    const newTypes = [...attributeTypes];
    newTypes.splice(index, 1);
    setAttributeTypes(newTypes);
    // ✅ สร้าง variants ใหม่เมื่อลบ attribute type
    generateVariantsFromAttributes(newTypes);
  };

  // ✅ อัปเดต attribute type name
  const updateAttributeType = (index: number, type: string) => {
    const newTypes = [...attributeTypes];
    newTypes[index].type = type.toUpperCase();
    setAttributeTypes(newTypes);
    generateVariantsFromAttributes(newTypes);
  };

  // ✅ เพิ่ม value ให้ attribute type
  const addAttributeValue = (typeIndex: number, value: string) => {
    if (!value.trim()) return;
    const newTypes = [...attributeTypes];
    if (!newTypes[typeIndex].values.includes(value.trim())) {
      newTypes[typeIndex].values.push(value.trim());
      setAttributeTypes(newTypes);
      generateVariantsFromAttributes(newTypes);
    }
  };

  // ✅ ลบ value จาก attribute type
  const removeAttributeValue = (typeIndex: number, valueIndex: number) => {
    const newTypes = [...attributeTypes];
    newTypes[typeIndex].values.splice(valueIndex, 1);
    setAttributeTypes(newTypes);
    generateVariantsFromAttributes(newTypes);
  };

  // ✅ สร้าง variants จาก combinations ของ attributes
  const generateVariantsFromAttributes = (types: { type: string; values: string[] }[]) => {
    if (types.length === 0 || types.some(t => !t.type || t.values.length === 0)) {
      setVariants([]);
      return;
    }

    // สร้าง combinations
    const combinations: Record<string, string>[] = [];

    const generateCombinations = (current: Record<string, string>, remainingTypes: { type: string; values: string[] }[]) => {
      if (remainingTypes.length === 0) {
        combinations.push({ ...current });
        return;
      }

      const [firstType, ...rest] = remainingTypes;
      firstType.values.forEach(value => {
        generateCombinations({ ...current, [firstType.type]: value }, rest);
      });
    };

    generateCombinations({}, types);

    // สร้าง variants จาก combinations
    const newVariants = combinations.map(combo => {
      // หา variant เดิมที่มี attributes เหมือนกัน
      const existingVariant = variants.find(v =>
        v.attributes &&
        Object.keys(combo).every(key => v.attributes?.[key] === combo[key]) &&
        Object.keys(v.attributes).length === Object.keys(combo).length
      );

      // สร้างชื่อจาก attributes
      const name = Object.values(combo).join(' ');

      return {
        name: existingVariant?.name || name,
        price: existingVariant?.price || '',
        stock: existingVariant?.stock || '0',
        imageIndex: existingVariant?.imageIndex || null,
        attributes: combo,
      };
    });

    setVariants(newVariants);
  };

  // ✅ อัปเดต variant
  const updateVariant = (
    index: number,
    field: keyof (typeof variants)[number],
    value: string,
  ) => {
    const newVariants = [...variants];
    if (field === 'imageIndex') {
      const num = parseInt(value || '0', 10);
      newVariants[index] = {
        ...newVariants[index],
        imageIndex: isNaN(num) || num <= 0 ? null : num,
      };
    } else {
      newVariants[index] = { ...newVariants[index], [field]: value };
    }
    setVariants(newVariants);
  };

  const handleCreate = async () => {
    if (!name || !price || images.length === 0 || !categoryId) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ (ชื่อ, ราคา, รูปภาพอย่างน้อย 1 รูป, หมวดหมู่)');
      return;
    }

    // ✅ Validation: ถ้ามี variants ต้องกรอกชื่อครบ
    if (hasVariants && variants.length > 0) {
      const hasEmptyName = variants.some((v) => v.name.trim() === '');
      if (hasEmptyName) {
        Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อตัวเลือกให้ครบทุกแถว');
        return;
      }
    }

    try {
      setUploading(true);

      // เตรียม FormData
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description || '');
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('categoryId', categoryId);

      // ✅ ส่ง Subcategory (ใช้ subcategoryId แนะนำ)
      if (subcategoryId) {
        formData.append('subcategoryId', subcategoryId.toString());
      } else if (subcategory) {
        // ✅ Backward compatibility: ใช้ subcategory name
        formData.append('subcategory', subcategory);
      }

      // ✅ ส่ง Variants ไปด้วย (แปลงเป็น JSON String)
      if (hasVariants && variants.length > 0) {
        // กรองเอาเฉพาะอันที่กรอกชื่อครบ
        const validVariants = variants.filter((v) => v.name.trim() !== '');
        if (validVariants.length > 0) {
          // แปลงเป็น Array ของ Object ที่มี price เป็น number หรือ null
          const variantsToSend = validVariants.map((v) => ({
            name: v.name.trim(),
            price: v.price.trim() && !isNaN(parseFloat(v.price))
              ? parseFloat(v.price)
              : null, // ถ้าไม่กรอกราคาหรือไม่ใช่ตัวเลข ให้เป็น null (ใช้ราคาหลัก)
            stock: parseInt(v.stock.trim() || '0') || 0,
            imageIndex:
              typeof v.imageIndex === 'number' && v.imageIndex > 0
                ? v.imageIndex
                : null,
            attributes: v.attributes || null, // ✅ ส่ง attributes
          }));

          console.log('📦 Sending variants:', variantsToSend);
          const variantsJson = JSON.stringify(variantsToSend);
          console.log('📦 Variants JSON string:', variantsJson);

          formData.append('variants', variantsJson);
        }
      } else {
        console.log('ℹ️ No variants to send');
      }

      // Append Images (รองรับหลายรูป) - ใช้ field name 'image' ให้เข้ากับ backend/multer
      if (images.length > 0) {
        // ✅ ถ้าเป็นโหมดแก้ไข ให้บอก backend ว่ามีรูปเดิมอะไรบ้าง (เก็บต่อ)
        if (isEditMode) {
          const existingUrls = images.filter(
            (uri) =>
              !uri.startsWith('file://') &&
              !uri.startsWith('content://') &&
              !uri.startsWith('ph://'),
          );
          if (existingUrls.length > 0) {
            formData.append('existingImages', JSON.stringify(existingUrls));
          }
        }

        images.forEach((uri, index) => {
          const isLocalImage =
            uri.startsWith('file://') ||
            uri.startsWith('content://') ||
            uri.startsWith('ph://');

          if (isLocalImage) {
            const filename = uri.split('/').pop() || `image_${index}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            // @ts-ignore (FormData ใน React Native รับ object ได้)
            formData.append('image', {
              uri,
              name: filename,
              type,
            });
          }
        });
      }

      // ยิง API (POST สำหรับสร้างใหม่, PATCH สำหรับแก้ไข)
      // ✅ ใช้ fetch แทน axios เพื่อแก้ปัญหา Network Error กับ FormData บน Android
      const API_BASE_URL = getApiBaseUrl();
      const token = await AsyncStorage.getItem('ultra_token');

      const fetchOptions: RequestInit = {
        method: isEditMode && productId ? 'PATCH' : 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      };

      const url = isEditMode && productId
        ? `${API_BASE_URL}/products/${productId}`
        : `${API_BASE_URL}/products`;

      console.log('📤 Sending request to:', url);

      const response = await fetch(url, fetchOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message || 'ไม่สามารถบันทึกสินค้าได้');
      }

      console.log('✅ Product saved successfully:', responseData);

      if (isEditMode && productId) {
        Alert.alert('สำเร็จ', 'แก้ไขสินค้าเรียบร้อย', [
          {
            text: 'ตกลง',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('สำเร็จ', 'เพิ่มสินค้าเรียบร้อย', [
          {
            text: 'ตกลง',
            onPress: () => {
              // Reset Form
              setName('');
              setPrice('');
              setDescription('');
              setStock('100');
              setImages([]);
              setSelectedImageIndex(0);
              setCategoryId('');
              setCategoryName('');
              setSubcategory('');
              setHasVariants(false);
              setVariants([]);
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Create product error:', error);
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'ไม่สามารถเพิ่มสินค้าได้',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isEditMode ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
        {/* ✅ แกลเลอรีรูปสินค้า (หลายรูป) */}
        <View>
          <TouchableOpacity
            style={[styles.imageBox, { backgroundColor: colors.background }]}
            onPress={pickImage}
          >
            {images.length > 0 ? (
              <Image source={{ uri: images[selectedImageIndex] }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera" size={40} color={colors.subText} />
                <Text style={[styles.placeholderText, { color: colors.subText }]}>
                  แตะเพื่อเพิ่มรูป
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
              contentContainerStyle={styles.thumbnailRow}
            >
              {images.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnailWrapper,
                    index === selectedImageIndex && styles.thumbnailSelected,
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                >
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.thumbnailRemove}
                    onPress={() => {
                      setImages((prev) => {
                        const copy = [...prev];
                        copy.splice(index, 1);
                        return copy;
                      });
                      setSelectedImageIndex((prev) => {
                        if (index === prev) return 0;
                        if (index < prev) return Math.max(0, prev - 1);
                        return prev;
                      });
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#ff4d4f" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {/* ปุ่มเพิ่มรูปเพิ่มเติม */}
              <TouchableOpacity
                style={[styles.thumbnailWrapper, styles.addThumbnailBtn]}
                onPress={pickImage}
              >
                <Ionicons name="add" size={20} color={colors.subText} />
                <Text style={[styles.addThumbnailText, { color: colors.subText }]}>
                  เพิ่มรูป
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>ชื่อสินค้า</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={name}
          onChangeText={setName}
          placeholder="เช่น เสื้อยืดสีดำ"
          placeholderTextColor={colors.subText}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.label, { color: colors.text }]}>ราคา (บาท)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.subText}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>คลัง (ชิ้น)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.subText}
            />
          </View>
        </View>

        {/* ✅ Category Selection */}
        <Text style={[styles.label, { color: colors.text }]}>หมวดหมู่</Text>
        <TouchableOpacity
          style={[styles.input, { justifyContent: 'center', borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={{ color: categoryName ? colors.text : colors.subText }}>
            {categoryName || 'เลือกหมวดหมู่'}
          </Text>
        </TouchableOpacity>

        {/* ✅ Subcategory Selection - แสดง Global + My Shop แยกกัน */}
        {(globalSubcategories.length > 0 || shopSubcategories.length > 0) && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>หมวดหมู่ย่อย</Text>

            {/* ✅ Global Subcategories */}
            {globalSubcategories.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={[styles.subcategoryLabel, { color: colors.subText }]}>Global</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {globalSubcategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subChip,
                        subcategoryId === sub.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setSubcategoryId(sub.id);
                        setSubcategory(sub.name); // ✅ Backward compatibility
                      }}
                    >
                      <Text style={[
                        styles.subChipText,
                        subcategoryId === sub.id && { color: '#fff' }
                      ]}>
                        {sub.iconEmoji || sub.iconIonicon || '🔹'} {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ✅ My Shop Subcategories */}
            {shopSubcategories.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={[styles.subcategoryLabel, { color: colors.subText }]}>My Shop</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {shopSubcategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subChip,
                        subcategoryId === sub.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setSubcategoryId(sub.id);
                        setSubcategory(sub.name); // ✅ Backward compatibility
                      }}
                    >
                      <Text style={[
                        styles.subChipText,
                        subcategoryId === sub.id && { color: '#fff' }
                      ]}>
                        {sub.iconEmoji || sub.iconIonicon || '🔹'} {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>รายละเอียด</Text>
        <TextInput
          style={[styles.input, { height: 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="รายละเอียดสินค้า..."
          placeholderTextColor={colors.subText}
        />

        <View style={[styles.variantSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.text }]}>มีตัวเลือกสินค้า? (เช่น สี, ไซส์)</Text>
            <Switch
              value={hasVariants}
              onValueChange={setHasVariants}
              trackColor={{ false: colors.subText, true: colors.primary }}
              thumbColor={hasVariants ? '#fff' : colors.subText}
            />
          </View>

          {hasVariants && (
            <View>
              {/* ✅ ส่วนจัดการ Attribute Types */}
              <Text style={[styles.label, { color: colors.text, marginTop: 10 }]}>
                ประเภทตัวเลือก (เช่น สี, ขนาด, ความจุ)
              </Text>

              {attributeTypes.map((attrType, typeIndex) => (
                <View key={typeIndex} style={[styles.attributeTypeCard, { backgroundColor: colors.inputBg || colors.background, borderColor: colors.border }]}>
                  <View style={styles.attributeTypeHeader}>
                    <TextInput
                      style={[styles.inputSmall, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      placeholder="ชื่อประเภท (เช่น COLOR, SIZE)"
                      placeholderTextColor={colors.subText}
                      value={attrType.type}
                      onChangeText={(text) => updateAttributeType(typeIndex, text)}
                    />
                    <TouchableOpacity
                      onPress={() => removeAttributeType(typeIndex)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { color: colors.text, fontSize: 12, marginTop: 8 }]}>ค่า (Values)</Text>
                  <View style={styles.valuesContainer}>
                    {attrType.values.map((value, valueIndex) => (
                      <View key={valueIndex} style={[styles.valueChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.valueChipTextInput, { color: colors.text }]}
                          value={value}
                          onChangeText={(text) => {
                            // ✅ แก้ไข value ที่มีอยู่แล้ว
                            const newTypes = [...attributeTypes];
                            newTypes[typeIndex].values[valueIndex] = text;
                            setAttributeTypes(newTypes);
                            generateVariantsFromAttributes(newTypes);
                          }}
                          onBlur={() => {
                            // ✅ เมื่อ blur ถ้าค่าว่างให้ลบออก
                            if (!attrType.values[valueIndex].trim()) {
                              removeAttributeValue(typeIndex, valueIndex);
                            }
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => removeAttributeValue(typeIndex, valueIndex)}
                          style={styles.valueRemoveBtn}
                        >
                          <Ionicons name="close-circle" size={16} color="#ff4d4f" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TextInput
                      style={[styles.inputSmall, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      placeholder="เพิ่มค่า (กด Enter)"
                      placeholderTextColor={colors.subText}
                      onSubmitEditing={(e) => {
                        addAttributeValue(typeIndex, e.nativeEvent.text);
                        e.currentTarget.clear();
                      }}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addVariantBtn}
                onPress={addAttributeType}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addVariantText, { color: colors.primary }]}>เพิ่มประเภทตัวเลือก</Text>
              </TouchableOpacity>

              {/* ✅ ส่วนแสดง Variants ที่สร้างจาก Attributes */}
              {variants.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    ตัวเลือกสินค้า ({variants.length} รายการ)
                  </Text>

                  {variants.map((v, index) => (
                    <View key={index} style={[styles.variantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.variantHeader}>
                        <Text style={[styles.variantName, { color: colors.text }]}>{v.name}</Text>
                        {v.attributes && (
                          <View style={styles.attributesBadge}>
                            {Object.entries(v.attributes).map(([key, val]) => (
                              <Text key={key} style={[styles.attributeBadge, { color: colors.subText }]}>
                                {key}: {val}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>

                      <View style={styles.variantRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.label, { color: colors.text, fontSize: 12 }]}>ราคา</Text>
                          <TextInput
                            style={[styles.inputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
                            placeholder="ราคา (ว่าง = ใช้ราคาหลัก)"
                            placeholderTextColor={colors.subText}
                            keyboardType="numeric"
                            value={v.price}
                            onChangeText={(text) => updateVariant(index, 'price', text)}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.label, { color: colors.text, fontSize: 12 }]}>สต็อก</Text>
                          <TextInput
                            style={[styles.inputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
                            placeholder="สต็อก"
                            placeholderTextColor={colors.subText}
                            keyboardType="numeric"
                            value={v.stock}
                            onChangeText={(text) => updateVariant(index, 'stock', text)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.label, { color: colors.text, fontSize: 12 }]}>รูปที่</Text>
                          <TextInput
                            style={[styles.inputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
                            placeholder="รูปที่ (1, 2, 3...)"
                            placeholderTextColor={colors.subText}
                            keyboardType="numeric"
                            value={v.imageIndex ? String(v.imageIndex) : ''}
                            onChangeText={(text) => updateVariant(index, 'imageIndex', text)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, uploading && styles.disabledBtn]}
          onPress={handleCreate}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>ลงขายทันที</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกหมวดหมู่</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectCategory(item)}
                >
                  <Text style={[styles.categoryItemText, { color: colors.text }]}>{item.name}</Text>
                  {categoryId === item.id.toString() && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  imageBox: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 14,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  variantSection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  inputSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    minHeight: 40,
  },
  removeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 10,
    marginTop: 5,
  },
  addVariantText: {
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  // ✅ New Styles
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  subChipText: {
    fontSize: 13,
    color: '#333',
  },
  subcategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 16,
  },
  // ✅ แกลเลอรีรูปย่อย
  thumbnailScroll: {
    marginTop: 10,
  },
  thumbnailRow: {
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailSelected: {
    borderColor: '#ee4d2d',
    borderWidth: 2,
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  addThumbnailBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  addThumbnailText: {
    fontSize: 10,
    marginTop: 2,
  },
  // ✅ Styles สำหรับ Attribute Types
  attributeTypeCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  attributeTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  valueChipText: {
    fontSize: 12,
  },
  valueChipTextInput: {
    fontSize: 12,
    flex: 1,
    padding: 0,
    margin: 0,
  },
  valueRemoveBtn: {
    marginLeft: 4,
  },
  // ✅ Styles สำหรับ Variants
  variantCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  variantHeader: {
    marginBottom: 10,
  },
  variantName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  attributesBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributeBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
});
