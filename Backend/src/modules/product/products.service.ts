import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThanOrEqual, LessThanOrEqual, Not, DataSource, Like, IsNull } from 'typeorm';
import { Product, Image, ProductVariant, RecentlyViewed, Subcategory } from '@core/database/entities';
import { generateSlugFromText, ensureUniqueSlug } from '@core/shared/utils/slug.util'; // SlugUtil
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Image)
    private imageRepository: Repository<Image>,
    @InjectRepository(RecentlyViewed)
    private recentRepo: Repository<RecentlyViewed>,
    private dataSource: DataSource,
  ) { }

  async findAll(query: any): Promise<any> {
    // รับ query object เข้ามาจัดการ - ป้องกัน undefined
    let page = query?.page ? Number(query.page) : 1;
    let limit = query?.limit ? Number(query.limit) : 10;

    // ✅ Validation: ป้องกันค่าติดลบหรือไม่ถูกต้อง
    if (isNaN(page) || page < 1) {
      page = 1; // ใช้ค่า default ถ้าไม่ถูกต้อง
    }
    if (isNaN(limit) || limit < 1) {
      limit = 10; // ใช้ค่า default ถ้าไม่ถูกต้อง
    }
    if (limit > 100) {
      limit = 100; // จำกัดสูงสุดที่ 100 เพื่อป้องกันการโหลดข้อมูลมากเกินไป
    }

    const skip = (page - 1) * limit;
    const categoryId = query?.categoryId ? Number(query.categoryId) : undefined;
    const subcategoryId = query?.subcategoryId ? Number(query.subcategoryId) : undefined;
    const subcategory = query?.subcategory ? query.subcategory.trim() : undefined; // ✅ เก็บไว้เพื่อ backward compatibility
    const keyword = query?.keyword || undefined;
    const sortBy = query?.sortBy || undefined;
    const shopType = query?.shopType || undefined; // ✅ mall = สินค้าจากร้าน Mall เท่านั้น
    let minPrice = query?.minPrice ? Number(query.minPrice) : undefined;
    let maxPrice = query?.maxPrice ? Number(query.maxPrice) : undefined;

    console.log('🔍 Search params:', { keyword, categoryId, subcategoryId, subcategory, sortBy, shopType, minPrice, maxPrice, page, limit });

    // สร้าง Query Builder
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory') // ✅ เพิ่ม relation กับ subcategory
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.store', 'store')
      .loadRelationCountAndMap('product.variantsCount', 'product.variants'); // ✅ ให้แอปรู้ว่าสินค้ามีตัวเลือก (สี/ไซส์) หรือไม่

    // กรองตาม categoryId
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // ✅ กรองตาม subcategoryId (ใช้ ID โดยตรง - แม่นยำและเร็วกว่า)
    if (subcategoryId) {
      queryBuilder.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
      console.log(`🔍 Filtering by subcategoryId: ${subcategoryId}`);
    }
    // ✅ Backward compatibility: ถ้ายังส่ง subcategory name มา (จาก Frontend เก่า)
    else if (subcategory) {
      // ถ้ามี subcategory name ให้หา subcategoryId ก่อน
      const subcategoryRecord = await this.dataSource
        .getRepository(Subcategory)
        .findOne({
          where: { name: subcategory, categoryId: categoryId || undefined },
        });

      if (subcategoryRecord) {
        queryBuilder.andWhere('product.subcategoryId = :subcategoryId', {
          subcategoryId: subcategoryRecord.id
        });
        console.log(`🔍 Filtering by subcategory name "${subcategory}" -> subcategoryId: ${subcategoryRecord.id}`);
      } else {
        // ถ้าไม่เจอ subcategory ใน table ให้ fallback ไปใช้ keyword search (backward compatibility)
        queryBuilder.andWhere(
          '(product.title LIKE :keyword OR product.description LIKE :keyword)',
          { keyword: `%${subcategory}%` }
        );
        console.log(`🔍 Subcategory "${subcategory}" not found, using keyword search as fallback`);
      }
    }

    // ✅ กรองตาม keyword (ถ้ามี) - ค้นหาจาก title, description, category name, store name
    if (keyword) {
      queryBuilder.andWhere(
        '(product.title LIKE :keyword OR product.description LIKE :keyword OR category.name LIKE :keyword OR store.name LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
      console.log(`🔍 Searching for keyword: "${keyword}"`);
    }

    // ✅ กรองตาม shopType: mall = สินค้าของร้าน Mall เท่านั้น
    if (shopType === 'mall') {
      queryBuilder.andWhere('store.isMall = :isMall', { isMall: true });
      console.log('🔍 Filtering by Mall stores only');
    }

    // ✅ กรองช่วงราคา (พร้อม validation)
    if (minPrice !== undefined && maxPrice !== undefined) {
      // ✅ ถ้า minPrice > maxPrice ให้สลับค่า
      if (minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
        console.log(`⚠️  Swapped minPrice and maxPrice: ${maxPrice} -> ${minPrice}, ${minPrice} -> ${maxPrice}`);
      }
      // ✅ ป้องกันค่าติดลบ
      if (minPrice < 0) minPrice = 0;
      if (maxPrice < 0) maxPrice = 0;

      queryBuilder.andWhere('product.price BETWEEN :minPrice AND :maxPrice', {
        minPrice,
        maxPrice,
      });
    } else if (minPrice !== undefined) {
      // ✅ ป้องกันค่าติดลบ
      if (minPrice < 0) minPrice = 0;
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    } else if (maxPrice !== undefined) {
      // ✅ ป้องกันค่าติดลบ
      if (maxPrice < 0) maxPrice = 0;
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // ✅ การเรียงลำดับ (Sort)
    switch (sortBy) {
      case 'price_asc':
        queryBuilder.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        queryBuilder.orderBy('product.price', 'DESC');
        break;
      case 'sold':
        queryBuilder.orderBy('product.sold', 'DESC'); // ขายดีสุด
        break;
      case 'related':
        // สำหรับการเรียงแบบเกี่ยวข้อง - ใช้ id DESC (แทน createdAt)
        queryBuilder.orderBy('product.id', 'DESC');
        break;
      default:
        // Default: ใหม่สุด (ใช้ id แทน createdAt)
        queryBuilder.orderBy('product.id', 'DESC');
        break;
    }

    // นับจำนวนทั้งหมด
    const total = await queryBuilder.getCount();
    console.log(`📊 Total results: ${total}`);

    // ดึงข้อมูลพร้อม pagination
    const result = await queryBuilder.skip(skip).take(limit).getMany();
    console.log(`📦 Returned products: ${result.length}`);

    return {
      data: result, // Array สินค้า
      total: total, // จำนวนทั้งหมดใน DB
      page: page,
      last_page: Math.ceil(total / limit),
    };
  }

  // ✅ Suggestion API - ดึงคำแนะนำการค้นหาจากชื่อสินค้า
  // กรองเฉพาะคำที่ขึ้นต้นด้วย keyword และยาวกว่าคำค้นหา (ไม่ส่งแค่ตัวอักษรเดียวเช่น "ก" กลับไป)
  async getSuggestions(keyword: string): Promise<string[]> {
    const trimmed = (keyword || '').trim();
    if (!trimmed) {
      return [];
    }

    const pattern = `${trimmed}%`;

    const rows = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.title', 'title')
      .where('product.isActive = :active', { active: true })
      .andWhere('product.title LIKE :pattern', { pattern })
      .andWhere('CHAR_LENGTH(product.title) > :minLen', { minLen: trimmed.length })
      .orderBy('product.title', 'ASC')
      .take(10)
      .getRawMany();

    return rows.map((r: any) => r.title).filter(Boolean);
  }

  async findOne(id: number): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'images', 'store', 'store.owner', 'reviews', 'reviews.user', 'variants'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // ✅ นับจำนวนสินค้าที่ขายในร้านนี้ (ใช้ของจริงจากฐานข้อมูล)
    const activeProductCount = await this.productRepository.count({
      where: {
        storeId: product.storeId,
        isActive: true,
      },
    });

    // --- จำลองข้อมูลเพิ่มเติม (Dummy Data) + ข้อมูลจริงบางส่วน ---
    const productWithExtra = {
      ...product,
      // ใช้ title แทน name (เพราะ entity ใช้ title)
      name: product.title,
      // Part 1 Data
      // สมมติว่าราคาจริงแพงกว่านี้ 30%
      originalPrice: Math.round(product.price * 1.3),
      // คำนวณ % ส่วนลด
      discountPercentage: 30,
      // สมมติจำนวนที่ขายแล้ว (สุ่มเลข 100 - 5000)
      soldCount: Math.floor(Math.random() * (5000 - 100) + 100),
      // คะแนนเฉลี่ย (สุ่ม 4.0 - 5.0)
      ratingAverage: parseFloat((Math.random() * (5.0 - 4.0) + 4.0).toFixed(1)),
      ratingCount: Math.floor(Math.random() * 500),

      // ✅ Part 2 Data (ข้อมูลร้านค้า) - ใช้ข้อมูลจริงจาก Database
      store: {
        ...product.store,
        // ถ้าใน DB ไม่มี logo ให้ใช้รูปแมว
        logo: product.store?.logo || 'https://placekitten.com/200/200',
        location: 'กรุงเทพมหานคร',
        // ✅ ใช้จำนวนสินค้าจริงของร้าน (เฉพาะสินค้าที่เปิดขายอยู่)
        itemCount: activeProductCount,
        rating: product.store?.rating || 4.8,
        responseRate: '98%',
        responseTime: 'ไม่กี่นาที',
        joinDate: '2 ปีที่แล้ว',
        // ✅ ใช้ followerCount จริงจาก store entity (ไม่ใช่ dummy data)
        followerCount: product.store?.followerCount || 0,
      },
      // ข้อมูลสเปคสินค้า
      brand: 'No Brand',
      shipsFrom: 'เขตจตุจักร, จังหวัดกรุงเทพมหานคร',
      stock: product.quantity || Math.floor(Math.random() * 100) + 10, // ใช้ quantity จาก DB หรือสุ่ม

      // ✅ Part 3 Data (รีวิว) - ดึงข้อมูลจริงจาก Database
      reviews: (() => {
        // กรองเฉพาะ reviews ที่ไม่ถูกซ่อน (isHidden = false)
        const visibleReviews = (product.reviews || []).filter((review: any) => !review.isHidden);

        // แปลง reviews ให้มีรูปแบบที่ Frontend ต้องการ
        return visibleReviews.map((review: any) => {
          // แปลง images string (JSON) เป็น array
          let imagesArray: string[] = [];
          if (review.images) {
            try {
              // ถ้าเป็น JSON string ให้ parse
              if (typeof review.images === 'string') {
                const parsed = JSON.parse(review.images);
                imagesArray = Array.isArray(parsed) ? parsed : [review.images];
              } else if (Array.isArray(review.images)) {
                imagesArray = review.images;
              }
            } catch (e) {
              // ถ้า parse ไม่ได้ ให้ใช้เป็น string เดียว
              imagesArray = [review.images];
            }
          }

          // ดึง variant จาก orderItem (ถ้ามี)
          let variation = null;
          if (review.orderItemId) {
            // TODO: ดึง variant จาก orderItem ถ้าต้องการ
            // variation = review.orderItem?.variant?.name || null;
          }

          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment || '',
            images: imagesArray,
            createdAt: review.createdAt ? new Date(review.createdAt).toLocaleString('th-TH') : '',
            sellerReply: review.sellerReply || null,
            isEdited: review.isEdited || false,
            user: {
              id: review.user?.id,
              name: review.user?.name || 'ผู้ใช้',
              avatar: review.user?.picture || null,
              email: review.user?.email || null,
            },
            variation: variation,
          };
        });
      })(),
      // ✅ คำนวณ ratingSummary จาก reviews จริง
      ratingSummary: (() => {
        const visibleReviews = (product.reviews || []).filter((review: any) => !review.isHidden);

        if (visibleReviews.length === 0) {
          return {
            average: 0,
            count: 0,
            star5: 0,
            star4: 0,
            star3: 0,
            star2: 0,
            star1: 0,
            withMedia: 0,
          };
        }

        // คำนวณค่าเฉลี่ย
        const totalRating = visibleReviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        const average = parseFloat((totalRating / visibleReviews.length).toFixed(1));

        // นับจำนวนตาม rating
        const star5 = visibleReviews.filter((r: any) => r.rating === 5).length;
        const star4 = visibleReviews.filter((r: any) => r.rating === 4).length;
        const star3 = visibleReviews.filter((r: any) => r.rating === 3).length;
        const star2 = visibleReviews.filter((r: any) => r.rating === 2).length;
        const star1 = visibleReviews.filter((r: any) => r.rating === 1).length;

        // นับรีวิวที่มีรูปภาพ
        const withMedia = visibleReviews.filter((r: any) => {
          if (!r.images) return false;
          try {
            const parsed = typeof r.images === 'string' ? JSON.parse(r.images) : r.images;
            return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
          } catch {
            return !!r.images;
          }
        }).length;

        return {
          average,
          count: visibleReviews.length,
          star5,
          star4,
          star3,
          star2,
          star1,
          withMedia,
        };
      })(),
    };
    // ------------------------------------

    return productWithExtra; // ส่งข้อมูลที่เพิ่มแล้วกลับไป
  }

  /**
   * Search products with Full-text Search (if available) or LIKE fallback
   * 
   * Note: Full-text search requires FULLTEXT index on title and description columns
   * To enable: ALTER TABLE product ADD FULLTEXT INDEX ft_search (title, description);
   */
  async search(keyword: string): Promise<Product[]> {
    if (!keyword || keyword.trim().length === 0) {
      return [];
    }

    const trimmedKeyword = keyword.trim();

    // ✅ Try Full-text Search first (faster and more accurate)
    // Note: This requires FULLTEXT index on title and description
    try {
      const fullTextResults = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.store', 'store')
        .where(
          `MATCH(product.title, product.description) AGAINST(:keyword IN BOOLEAN MODE)`,
          { keyword: `${trimmedKeyword}*` }
        )
        .andWhere('product.isActive = :active', { active: true })
        .orderBy('product.sold', 'DESC') // Sort by relevance (sold count)
        .limit(50)
        .getMany();

      if (fullTextResults.length > 0) {
        return fullTextResults;
      }
    } catch (error) {
      // Full-text search not available, fallback to LIKE
      console.warn('Full-text search not available, using LIKE fallback:', error.message);
    }

    // ✅ Fallback to LIKE search (works on all MySQL versions)
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.isActive = :active', { active: true })
      .andWhere(
        '(product.title LIKE :keyword OR product.description LIKE :keyword OR category.name LIKE :keyword OR store.name LIKE :keyword)',
        { keyword: `%${trimmedKeyword}%` }
      )
      .orderBy('product.sold', 'DESC')
      .limit(50)
      .getMany();
  }

  // ✅ ฟังก์ชันดึงสินค้าแนะนำ (Related/Recommended Products)
  // ✅ ฟังก์ชันสุ่มสินค้าแนะนำ (ตามหมวดหมู่) - สำหรับหน้าหมวดหมู่
  async getRecommendations(categoryId?: number, limit: number = 6) {
    try {
      // ดึงสินค้ามา (จำกัดที่ 50 ตัวเพื่อประสิทธิภาพ) แล้วสุ่มใน JavaScript
      const query = this.productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.store', 'store')
        .where('product.isActive = :active', { active: true });

      if (categoryId) {
        query.andWhere('product.categoryId = :catId', { catId: categoryId });
      }

      // ดึงสินค้ามา 50 ตัว (หรือมากกว่า limit) แล้วสุ่มใน JavaScript
      const allProducts = await query
        .orderBy('product.id', 'DESC') // ใช้ id แทน createdAt
        .take(Math.max(limit * 5, 50)) // ดึงมา 5 เท่าของ limit หรืออย่างน้อย 50 ตัว
        .getMany();

      // ถ้าไม่มีสินค้า
      if (allProducts.length === 0) {
        return [];
      }

      // 🧠 สุ่มสินค้าใน JavaScript (Fisher-Yates shuffle)
      const shuffled = [...allProducts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // เอาแค่ limit ตัวแรก
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('Error in getRecommendations:', error);
      // Fallback: ดึงสินค้าล่าสุดแทน
      const fallbackQuery = this.productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.store', 'store')
        .where('product.isActive = :active', { active: true });

      if (categoryId) {
        fallbackQuery.andWhere('product.categoryId = :catId', { catId: categoryId });
      }

      return fallbackQuery
        .orderBy('product.id', 'DESC') // ใช้ id แทน createdAt
        .take(limit)
        .getMany();
    }
  }

  async getRecommendedProducts(
    categoryId?: number,
    excludeProductId?: number,
    limit: number = 10,
  ): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.isActive = :isActive', { isActive: true });

    // ถ้ามี categoryId ให้กรองตาม category
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // ยกเว้นสินค้าปัจจุบัน
    if (excludeProductId) {
      queryBuilder.andWhere('product.id != :excludeProductId', {
        excludeProductId,
      });
    }

    // เรียงแบบสุ่ม (Random) เพื่อให้ได้สินค้าที่หลากหลาย
    // ใช้ id DESC แทน RAND() เพื่อความเสถียร (หรือจะใช้ RAND() ก็ได้ถ้า MySQL)
    queryBuilder.orderBy('product.id', 'DESC');

    // จำกัดจำนวน
    queryBuilder.take(limit);

    return queryBuilder.getMany();
  }

  // ✅ ฟังก์ชันดึงสินค้า Flash Sale (สินค้าที่มี discountPrice)
  async getFlashSaleProducts(limit: number = 10): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.discountPrice IS NOT NULL') // มีราคาลด
      .andWhere('product.discountPrice < product.price') // ราคาลดน้อยกว่าราคาปกติ
      .andWhere('product.quantity > 0') // มีสินค้าในสต็อก
      .orderBy('product.id', 'DESC') // เรียงตามของใหม่ (ใช้ id แทน createdAt)
      .take(limit);

    return queryBuilder.getMany();
  }

  async visualSearch(file: any): Promise<{ products: Product[]; otherProducts: Product[] }> {
    try {
      console.log('Visual Search - File received:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      // 1. เตรียมข้อมูลเพื่อส่งไป Python Service
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype || 'image/jpeg',
      });

      // 2. ยิง Request ไป Python Service (Port 8000)
      // หมายเหตุ: ถ้าใช้ Android Emulator อาจต้องเช็ค IP (แต่ถ้า Backend รันบนเครื่องเดียวกับ Python ใช้ localhost ได้)
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

      console.log(`Sending image to AI Service: ${AI_SERVICE_URL}/visual-search`);

      const response = await axios.post(`${AI_SERVICE_URL}/visual-search`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 seconds timeout (เพิ่มขึ้นเพื่อรองรับการประมวลผล)
      });

      const results = response.data.results || []; // ตรงกับรูป (score สูง)
      const others = response.data.others || [];   // สินค้าอื่นๆ (score ต่ำกว่า)
      const totalIndexed = response.data.total_indexed;
      const topScores = response.data.top_scores;

      console.log('AI Service response:', {
        resultsCount: results?.length || 0,
        othersCount: others?.length || 0,
        totalIndexed: totalIndexed,
        topScores: topScores,
      });

      const productIds = results.map((r: any) => r.id);
      const otherIds = others.map((r: any) => r.id);
      const allIds = [...productIds, ...otherIds];

      if (allIds.length === 0) {
        console.log('⚠️ No matching products from AI Service');
        return { products: [], otherProducts: [] };
      }

      // ใช้แค่ IDs ที่ AI ส่งมา — ไม่ดึง findAll()
      const allProducts = await this.productRepository.find({
        where: { id: In(allIds) },
        relations: ['images', 'category', 'store'],
      });

      const sortedProducts = productIds
        .map((id: number) => allProducts.find((p) => p.id === id))
        .filter((p: Product | undefined) => p !== undefined) as Product[];
      const sortedOtherProducts = otherIds
        .map((id: number) => allProducts.find((p) => p.id === id))
        .filter((p: Product | undefined) => p !== undefined) as Product[];

      console.log(`✅ Visual search: ${sortedProducts.length} relevant, ${sortedOtherProducts.length} others`);
      return { products: sortedProducts, otherProducts: sortedOtherProducts };
    } catch (error: any) {
      console.error('Visual Search Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ AI Service is not running. Please start AI Service on port 8000');
        console.error('   Run: cd AI_Service && python main.py');
      }
      if (error.response) {
        console.error('AI Service error response:', error.response.data);
      }
      return { products: [], otherProducts: [] };
    }
  }

  async createProduct(data: {
    title: string;
    description: string;
    price: number;
    quantity: number;
    categoryId: number;
    imagePath: string | null;
    extraImagePaths?: string[] | null;
    slug?: string;
    isActive?: boolean;
    subcategory?: string; // ✅ Backward compatibility: subcategory name
    subcategoryId?: number; // ✅ ใช้ subcategoryId (แนะนำ)
    variants?: Array<{ name: string; price?: number | null; stock: number; imageIndex?: number | null; attributes?: Record<string, string> | null }>; // ✅ เพิ่ม variants
  }): Promise<Product> {
    // สร้าง Slug: "iPhone 15 Pro Max" -> "iphone-15-pro-max-1715..."
    // เติม Date.now() ต่อท้ายเพื่อกันชื่อซ้ำ
    // ✅ Auto-generate slug สำหรับ SEO (รองรับภาษาไทย + ความไม่ซ้ำ)
    const baseSlug = data.slug?.trim() || generateSlugFromText(data.title || '');
    const slug = await ensureUniqueSlug(this.productRepository, baseSlug, undefined);

    // ✅ 1. หา subcategoryId (ถ้ามี subcategory name แต่ไม่มี subcategoryId)
    let subcategoryId: number | null = data.subcategoryId || null;
    if (!subcategoryId && data.subcategory) {
      // Backward compatibility: หา subcategoryId จาก name
      const subcategory = await this.dataSource
        .getRepository(Subcategory)
        .findOne({
          where: { name: data.subcategory, categoryId: data.categoryId },
        });
      if (subcategory) {
        subcategoryId = subcategory.id;
      }
    }

    // 2. สร้างสินค้า
    const product = this.productRepository.create({
      title: data.title,
      description: data.description,
      price: parseFloat(data.price.toString()), // ตรวจสอบว่ามีการแปลง type ของ price ให้ถูกต้อง
      quantity: data.quantity,
      categoryId: data.categoryId,
      storeId: 1, // Hardcode ไปก่อน หรือดึงจาก User
      slug: slug,
      isActive: data.isActive !== undefined ? data.isActive : true,
      subcategoryId: subcategoryId, // ✅ ใช้ subcategoryId
      subcategoryName: data.subcategory, // ✅ บันทึก subcategory name (backward compatibility)
    });

    // ✅ 2. ถ้ามี Variants ส่งมาด้วย -> สร้าง Variant Entities
    if (data.variants) {
      console.log('📦 Received variants:', {
        type: typeof data.variants,
        value: data.variants,
      });

      // variants ควรเป็น Array ของ Object: [{ name: 'สีแดง', price: 100, stock: 10 }, ...]
      // ต้อง Parse JSON ถ้าส่งมาเป็น String (FormData มักส่ง Array เป็น String)
      let parsedVariants = [];
      try {
        if (typeof data.variants === 'string') {
          parsedVariants = JSON.parse(data.variants);
          console.log('✅ Parsed variants from string:', parsedVariants);
        } else if (Array.isArray(data.variants)) {
          parsedVariants = data.variants;
          console.log('✅ Variants is already an array:', parsedVariants);
        }
      } catch (e) {
        console.error('❌ Parse variants error:', e);
        console.error('Variants value:', data.variants);
      }

      if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
        // สร้าง Variant entities
        product.variants = parsedVariants.map((v, index) => {
          const variant = new ProductVariant();
          variant.name = v.name || `Variant ${index + 1}`;
          variant.price =
            v.price && !isNaN(parseFloat(v.price.toString()))
              ? parseFloat(v.price.toString())
              : null; // ถ้าราคาไม่ต่าง ใช้ null (จะใช้ราคาหลัก)
          variant.stock = parseInt(v.stock?.toString() || '0') || 0;
          variant.imageIndex =
            typeof v.imageIndex === 'number' && !isNaN(v.imageIndex) && v.imageIndex > 0
              ? v.imageIndex
              : null;
          // ✅ บันทึก attributes (JSON object)
          variant.attributes = v.attributes && typeof v.attributes === 'object' ? v.attributes : null;
          console.log(`✅ Created variant ${index + 1}:`, {
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes,
          });
          return variant;
        });
        console.log(`✅ Total variants created: ${product.variants.length}`);
      } else {
        console.log('⚠️ No valid variants to create');
      }
    } else {
      console.log('ℹ️ No variants provided');
    }

    // 3. บันทึก (Cascade จะทำงานบันทึก Variants ให้เอง)
    const savedProduct = await this.productRepository.save(product) as Product;

    // 4. สร้างรูปภาพ (รองรับหลายรูป)
    const imageUrls: string[] = [];
    if (data.imagePath) {
      imageUrls.push(data.imagePath);
    }
    if (Array.isArray(data.extraImagePaths)) {
      imageUrls.push(...data.extraImagePaths.filter((u) => !!u));
    }

    if (imageUrls.length > 0) {
      const imageEntities = imageUrls.map((url) =>
        this.imageRepository.create({
          url,
          productId: savedProduct.id,
        }),
      );
      await this.imageRepository.save(imageEntities);
    }

    // 5. ดึงข้อมูลสินค้าพร้อม relations กลับไป
    return this.findOne(savedProduct.id);
  }

  // ✅ อัปเดตสินค้า
  async updateProduct(
    productId: number,
    userId: number,
    data: {
      title?: string;
      description?: string;
      price?: number;
      quantity?: number;
      categoryId?: number;
      imagePath?: string | null;
      extraImagePaths?: string[] | null;
      subcategory?: string;
      slug?: string; // ถ้าส่งมาใช้ค่าที่ส่ง แต่ต้อง validate uniqueness
      variants?: Array<{ name: string; price?: number | null; stock: number; imageIndex?: number | null; attributes?: Record<string, string> | null }>;
    },
  ): Promise<Product> {
    // 1. ดึงสินค้าและเช็คว่าเป็นเจ้าของหรือไม่
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['store', 'store.owner'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. เช็คว่า user เป็นเจ้าของร้านหรือไม่
    if (product.store.ownerId !== userId) {
      throw new NotFoundException('You do not have permission to update this product');
    }

    // 3. อัปเดตข้อมูลสินค้า
    if (data.title) product.title = data.title;
    if (data.description !== undefined) product.description = data.description;
    if (data.price !== undefined) product.price = parseFloat(data.price.toString());
    if (data.quantity !== undefined) product.quantity = data.quantity;
    if (data.categoryId !== undefined) product.categoryId = data.categoryId;
    if (data.subcategory !== undefined) product.subcategoryName = data.subcategory; // ✅ ใช้ subcategoryName แทน

    // ✅ อัปเดต slug: ถ้า user ส่ง slug มาใช้ค่าที่ส่ง (validate uniqueness); ถ้าเปลี่ยนชื่อสินค้าให้ generate ใหม่
    if (data.slug !== undefined && data.slug !== null && String(data.slug).trim() !== '') {
      const baseSlug = String(data.slug).trim();
      product.slug = await ensureUniqueSlug(this.productRepository, baseSlug, product.id);
    } else if (!product.slug || data.title !== undefined) {
      const baseSlug = generateSlugFromText(product.title || '');
      product.slug = await ensureUniqueSlug(this.productRepository, baseSlug, product.id);
    }

    // 4. อัปเดตรูปภาพ (เฉพาะถ้ามีการเปลี่ยนรูป)
    if (data.imagePath !== undefined && data.imagePath !== null) {
      // ลบรูปเก่า (ถ้ามี)
      const oldImages = await this.imageRepository.find({
        where: { productId },
      });
      if (oldImages.length > 0) {
        await this.imageRepository.remove(oldImages);
      }

      // สร้างรูปใหม่ (รองรับหลายรูป)
      const imageUrls: string[] = [];
      if (data.imagePath) {
        imageUrls.push(data.imagePath);
      }
      if (Array.isArray(data.extraImagePaths)) {
        imageUrls.push(...data.extraImagePaths.filter((u) => !!u));
      }
      if (imageUrls.length > 0) {
        const imageEntities = imageUrls.map((url) =>
          this.imageRepository.create({
            url,
            productId: product.id,
          }),
        );
        await this.imageRepository.save(imageEntities);
      }
    }
    // ถ้า data.imagePath เป็น undefined แสดงว่าไม่ต้องการอัปเดตรูปภาพ

    // 5. อัปเดต variants (ถ้ามี)
    if (data.variants !== undefined) {
      // ลบ variants เก่า
      const oldVariants = await this.dataSource
        .getRepository(ProductVariant)
        .find({ where: { productId } });
      if (oldVariants.length > 0) {
        const oldVariantIds = oldVariants.map((v) => v.id);
        const placeholders = oldVariantIds.map(() => '?').join(',');
        // ✅ SET variantId เป็น NULL ใน productoncart ก่อนลบ variants (ป้องกัน FK constraint error)
        await this.dataSource.query(
          `UPDATE productoncart SET variantId = NULL WHERE variantId IN (${placeholders})`,
          oldVariantIds,
        );
        // ✅ SET variantId เป็น NULL ใน productonorder ด้วย (ป้องกัน FK — รายการออเดอร์ยังมี productId อยู่)
        await this.dataSource.query(
          `UPDATE productonorder SET variantId = NULL WHERE variantId IN (${placeholders})`,
          oldVariantIds,
        );
        await this.dataSource.getRepository(ProductVariant).remove(oldVariants);
      }

      // สร้าง variants ใหม่
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        const newVariants = data.variants.map((v) => {
          const variant = new ProductVariant();
          variant.name = v.name;
          variant.price =
            v.price && !isNaN(parseFloat(v.price.toString()))
              ? parseFloat(v.price.toString())
              : null;
          variant.stock = parseInt(v.stock?.toString() || '0') || 0;
          variant.imageIndex =
            typeof v.imageIndex === 'number' && !isNaN(v.imageIndex) && v.imageIndex > 0
              ? v.imageIndex
              : null;
          // ✅ บันทึก attributes (JSON object)
          variant.attributes = v.attributes && typeof v.attributes === 'object' ? v.attributes : null;
          variant.productId = product.id;
          return variant;
        });
        await this.dataSource.getRepository(ProductVariant).save(newVariants);
      }
    }

    // 6. บันทึกสินค้า
    await this.productRepository.save(product);

    // 7. ดึงข้อมูลสินค้าพร้อม relations กลับไป
    return this.findOne(product.id);
  }

  // ✅ Toggle Product Status
  async toggleStatus(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    product.isActive = !product.isActive;
    return this.productRepository.save(product);
  }

  // ✅ ลบสินค้า
  async deleteProduct(productId: number, userId: number): Promise<void> {
    // 1. ดึงสินค้าและเช็คว่าเป็นเจ้าของหรือไม่
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['store', 'store.owner'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. เช็คว่า user เป็นเจ้าของร้านหรือไม่
    if (product.store.ownerId !== userId) {
      throw new NotFoundException('You do not have permission to delete this product');
    }

    // 3. ลบสินค้า (Cascade จะลบ images และ variants ให้เอง)
    await this.productRepository.remove(product);
  }

  // ✅ 1. บันทึกการเข้าชม (Log View)
  async logView(userId: number, productId: number) {
    // เช็คว่าเคยดูสินค้านี้ไหม
    const existing = await this.recentRepo.findOne({
      where: { userId, productId },
    });

    if (existing) {
      // ถ้ามีแล้ว -> อัปเดตเวลาเป็นปัจจุบัน (Touch)
      existing.viewedAt = new Date();
      return this.recentRepo.save(existing);
    } else {
      // ถ้ายังไม่มี -> สร้างใหม่
      const log = this.recentRepo.create({ userId, productId });
      return this.recentRepo.save(log);
    }
  }

  // ✅ 2. ดึงประวัติการเข้าชม (เอา 10 รายการล่าสุด)
  async getRecentlyViewed(userId: number) {
    return this.recentRepo.find({
      where: { userId },
      relations: ['product', 'product.images', 'product.store', 'product.category'], // ดึงข้อมูลสินค้ามาโชว์
      order: { viewedAt: 'DESC' }, // ใหม่สุดขึ้นก่อน
      take: 10,
    });
  }

  // ✅ 3. แนะนำสินค้าหน้าแรก (Personalized based on History)
  async getPersonalRecommendations(userId: number, limit: number = 10) {
    // 1.1 ดึงประวัติการดูล่าสุด 5 รายการ
    const recentViews = await this.recentRepo.find({
      where: { userId },
      relations: ['product', 'product.category'],
      order: { viewedAt: 'DESC' },
      take: 5,
    });

    // 1.2 ถ้าไม่มีประวัติเลย -> ให้คืนค่าสินค้าขายดี (Best Seller) หรือสุ่ม
    if (recentViews.length === 0) {
      return this.productRepository.find({
        where: { isActive: true },
        order: { sold: 'DESC' }, // ขายดีสุด
        take: limit,
        relations: ['images', 'store', 'category'],
      });
    }

    // 1.3 ถ้ามีประวัติ -> หา Category ที่ดูบ่อยสุด หรือล่าสุด
    // (ในที่นี้เอา Category ของสินค้าที่ดูล่าสุดมาใช้เลย ง่ายและตรงใจ)
    const targetCategoryId = recentViews[0].product.categoryId;

    // 1.4 ดึงสินค้าใน Category นั้น (ที่ไม่ใช่ตัวเดิมที่เคยดูแล้ว)
    // รวบรวม ID สินค้าที่เคยดูแล้วเพื่อกรองออก
    const viewedProductIds = recentViews.map((rv: any) => rv.product.id);

    const recommendations = await this.productRepository.find({
      where: {
        categoryId: targetCategoryId,
        id: Not(In(viewedProductIds)), // ไม่เอาตัวที่เคยดูแล้ว (อยากให้เห็นของใหม่)
        isActive: true,
      },
      relations: ['images', 'store', 'category'],
      take: limit,
      order: { sold: 'DESC' }, // ในหมวดเดียวกัน เอาตัวขายดีขึ้นก่อน
    });

    // ถ้าสินค้าแนะนำมีน้อยกว่า limit (เช่น หมวดนี้ของน้อย) ให้เติมด้วยสินค้าขายดีทั่วไป
    if (recommendations.length < limit) {
      const allViewedIds = [
        ...viewedProductIds,
        ...recommendations.map((r) => r.id),
      ];
      const moreProducts = await this.productRepository.find({
        where: {
          id: Not(In(allViewedIds)),
          isActive: true,
        },
        take: limit - recommendations.length,
        relations: ['images', 'store', 'category'],
        order: { sold: 'DESC' },
      });
      return [...recommendations, ...moreProducts];
    }

    return recommendations;
  }

  // ✅ 4. สินค้าที่เกี่ยวข้อง (Related Products - สำหรับหน้า Detail)
  async getRelatedProducts(productId: number, categoryId: number, limit: number = 6) {
    return this.productRepository.find({
      where: {
        categoryId: categoryId, // หมวดเดียวกัน
        id: Not(productId), // ไม่ใช่ตัวปัจจุบัน
        isActive: true,
      },
      relations: ['images', 'store', 'category'],
      take: limit,
      order: { id: 'DESC' }, // สินค้าใหม่ในหมวดเดียวกัน (ใช้ id แทน createdAt)
    });
  }

  /**
   * Backfill slug สำหรับสินค้าที่ slug เป็น NULL (อัปเดตข้อมูลเก่า)
   * ค้นหาสินค้าทั้งหมดที่ slug เป็น NULL วนลูปสร้าง slug ให้ทีละตัว แล้วบันทึกกลับลง DB
   * @returns จำนวนรายการที่อัปเดตสำเร็จ (updated), จำนวนทั้งหมด (total), รายละเอียด (details)
   */
  async backfillProductSlugs(): Promise<{ updated: number; total: number; details: { id: number; title: string; slug: string }[] }> {
    const list = await this.productRepository.find({
      where: { slug: IsNull() },
      select: ['id', 'title'],
    });
    const total = list.length;
    const details: { id: number; title: string; slug: string }[] = [];
    for (const p of list) {
      const baseSlug = generateSlugFromText(p.title || '');
      const slug = await ensureUniqueSlug(this.productRepository, baseSlug, p.id);
      await this.productRepository.update(p.id, { slug });
      details.push({ id: p.id, title: p.title || '', slug });
    }
    return { updated: total, total, details };
  }
}

