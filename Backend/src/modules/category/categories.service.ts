import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Category, Subcategory, Product } from '@core/database/entities';
import { generateSlugFromText, ensureUniqueSlug } from '@core/shared/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    private dataSource: DataSource, // ✅ เพิ่ม DataSource สำหรับ Transaction
  ) {}

  // ✅ ดึง Categories พร้อม Subcategories (filter ตาม storeId)
  // storeId = null → แสดงเฉพาะ Global subcategories (storeId IS NULL)
  // storeId = number → แสดง Global + Shop-specific subcategories
  async findAll(storeId?: number | null): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      relations: ['products'],
      order: { id: 'ASC' },
    });

    // ✅ ดึง subcategories แยกตาม storeId
    for (const category of categories) {
      const subcategories = await this.getSubcategoriesByCategory(category.id, storeId);
      category.subcategories = subcategories;
    }

    return categories;
  }

  async findOne(id: number, storeId?: number | null): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'products.images'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // ✅ ดึง subcategories แยกตาม storeId
    const subcategories = await this.getSubcategoriesByCategory(id, storeId);
    category.subcategories = subcategories;

    return category;
  }

  // ✅ ดึง Subcategories ของ Category ตาม storeId
  // storeId = null → แสดงเฉพาะ Global (storeId IS NULL)
  // storeId = number → แสดง Global + Shop-specific ของร้านนั้น
  async getSubcategoriesByCategory(
    categoryId: number,
    storeId?: number | null,
  ): Promise<Subcategory[]> {
    const queryBuilder = this.subcategoryRepository
      .createQueryBuilder('subcategory')
      .where('subcategory.categoryId = :categoryId', { categoryId });

    if (storeId === null || storeId === undefined) {
      // ✅ Marketplace: แสดงเฉพาะ Global subcategories (storeId IS NULL)
      queryBuilder.andWhere('subcategory.storeId IS NULL');
    } else {
      // ✅ Store Shop: แสดง Global + Shop-specific ของร้านนั้น
      queryBuilder.andWhere(
        '(subcategory.storeId IS NULL OR subcategory.storeId = :storeId)',
        { storeId },
      );
    }

    return queryBuilder.orderBy('subcategory.name', 'ASC').getMany();
  }

  // ✅ สร้างหมวดหมู่ใหม่พร้อม Subcategories (ใช้ Transaction)
  async create(data: any): Promise<Category> {
    // ✅ ใช้ Transaction เพื่อบันทึก Category และ Subcategories พร้อมกัน
    return await this.dataSource.transaction(async (manager) => {
      // 1. แยก subcategories ออกจาก data
      const { subcategories, ...categoryData } = data;

      // 2. Auto-generate slug สำหรับ SEO (รองรับภาษาไทย + ความไม่ซ้ำ)
      const baseSlug = data.slug?.trim() || generateSlugFromText(data.name || '');
      const slug = await ensureUniqueSlug(manager.getRepository(Category), baseSlug, undefined);

      // 3. สร้าง Category
      const category = manager.create(Category, { ...categoryData, slug });
      const savedCategory = await manager.save(Category, category);
      
      // 4. สร้าง Subcategories (ถ้ามี)
      if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
        const subcategoryEntities = subcategories
          .filter((sub: any) => sub.name && sub.name.trim() !== '') // กรองอันที่ไม่มีชื่อ
          .map((sub: any) => {
            // กำหนด iconType และ icon fields ตาม icon ที่ส่งมา
            let iconType = 'emoji';
            let iconEmoji: string | null = null;
            let iconIonicon: string | null = null;
            
            if (sub.icon) {
              // เช็คว่า icon เป็น emoji หรือ ionicon
              if (/^[a-z0-9\-]+$/i.test(sub.icon.trim())) {
                // ถ้าเป็นตัวอักษร/ตัวเลข = ionicon
                iconType = 'ionicon';
                iconIonicon = sub.icon.trim();
              } else {
                // ถ้าเป็น emoji
                iconType = 'emoji';
                iconEmoji = sub.icon.trim();
              }
            }
            
            return manager.create(Subcategory, {
              name: sub.name.trim(),
              categoryId: savedCategory.id,
              iconType,
              iconEmoji,
              iconIonicon,
              storeId: sub.storeId || null, // ✅ รองรับ storeId (สำหรับ Seller สร้าง subcategory ของร้าน)
            });
          });
        
        await manager.save(Subcategory, subcategoryEntities);
      }

      // 5. ดึง Category พร้อม Subcategories กลับมา
      return await manager.findOne(Category, {
        where: { id: savedCategory.id },
        relations: ['subcategories'],
      }) as Category;
    });
  }

  // ✅ แก้ไขหมวดหมู่พร้อม Subcategories (ใช้ Transaction)
  async update(id: number, data: any): Promise<Category> {
    const category = await this.findOne(id);
    if (!category) throw new NotFoundException('Category not found');

    // ✅ ใช้ Transaction เพื่ออัปเดต Category และ Subcategories พร้อมกัน
    return await this.dataSource.transaction(async (manager) => {
      // 1. แยก subcategories ออกจาก data
      const { subcategories, ...categoryData } = data;

      // 2. อัปเดต Category
      Object.assign(category, categoryData);

      // ✅ อัปเดต slug: ถ้า user ส่ง slug มาใช้ค่าที่ส่ง (validate uniqueness); ถ้าเปลี่ยนชื่อหมวดหมู่ให้ generate ใหม่
      if (data.slug !== undefined && data.slug !== null && String(data.slug).trim() !== '') {
        const baseSlug = String(data.slug).trim();
        category.slug = await ensureUniqueSlug(manager.getRepository(Category), baseSlug, category.id);
      } else if (!category.slug || data.name !== undefined) {
        const baseSlug = generateSlugFromText(category.name || '');
        category.slug = await ensureUniqueSlug(manager.getRepository(Category), baseSlug, category.id);
      }

      const savedCategory = await manager.save(Category, category);
      
      // 3. ลบ Subcategories เก่าทั้งหมด (ถ้ามีการส่ง subcategories ใหม่มา)
      if (subcategories !== undefined) {
        await manager.delete(Subcategory, { categoryId: id });
        
        // 4. สร้าง Subcategories ใหม่ (ถ้ามี)
        if (Array.isArray(subcategories) && subcategories.length > 0) {
          const subcategoryEntities = subcategories
            .filter((sub: any) => sub.name && sub.name.trim() !== '') // กรองอันที่ไม่มีชื่อ
            .map((sub: any) => {
              // กำหนด iconType และ icon fields ตาม icon ที่ส่งมา
              let iconType = 'emoji';
              let iconEmoji: string | null = null;
              let iconIonicon: string | null = null;
              
              if (sub.icon) {
                // เช็คว่า icon เป็น emoji หรือ ionicon
                if (/^[a-z0-9\-]+$/i.test(sub.icon.trim())) {
                  // ถ้าเป็นตัวอักษร/ตัวเลข = ionicon
                  iconType = 'ionicon';
                  iconIonicon = sub.icon.trim();
                } else {
                  // ถ้าเป็น emoji
                  iconType = 'emoji';
                  iconEmoji = sub.icon.trim();
                }
              }
              
              return manager.create(Subcategory, {
                name: sub.name.trim(),
                categoryId: id,
                iconType,
                iconEmoji,
                iconIonicon,
                storeId: sub.storeId || null, // ✅ รองรับ storeId (สำหรับ Seller สร้าง subcategory ของร้าน)
              });
            });
          
          await manager.save(Subcategory, subcategoryEntities);
        }
      }
      
      // 5. ดึง Category พร้อม Subcategories กลับมา
      return await manager.findOne(Category, {
        where: { id },
        relations: ['subcategories'],
      }) as Category;
    });
  }

  // ✅ ลบหมวดหมู่
  async remove(id: number): Promise<{ success: boolean }> {
    const category = await this.findOne(id);
    if (!category) throw new NotFoundException('Category not found');

    // Optional: เช็คก่อนว่ามีสินค้าในหมวดหมู่นี้ไหม ถ้ามีห้ามลบ
    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        `ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากยังมีสินค้า ${category.products.length} รายการอยู่ในหมวดหมู่นี้`,
      );
    }

    await this.categoryRepository.remove(category);
    return { success: true };
  }

  // ✅ Auto-assign subcategoryId ให้สินค้าที่ยังเป็น NULL
  async autoAssignSubcategoryToProducts(): Promise<{
    success: boolean;
    totalProducts: number;
    productsWithoutSubcategory: number;
    productsAssigned: number;
    productsStillNull: number;
    details: Array<{
      productId: number;
      productTitle: string;
      subcategoryId: number | null;
      subcategoryName: string | null;
      matchType: 'exact' | 'fuzzy' | 'none';
    }>;
  }> {
    // 1. ดึงสินค้าทั้งหมดที่ subcategoryId เป็น NULL
    const productsWithoutSubcategory = await this.dataSource
      .getRepository(Product)
      .find({
        where: { subcategoryId: null },
        relations: ['category'],
      });

    console.log(`🔍 Found ${productsWithoutSubcategory.length} products without subcategoryId`);

    // 2. ดึง Subcategories ทั้งหมด
    const allSubcategories = await this.subcategoryRepository.find({
      order: { name: 'ASC' },
    });

    console.log(`📋 Found ${allSubcategories.length} subcategories`);

    // 3. Loop ผ่านสินค้าแต่ละตัวและพยายาม match กับ subcategory
    const results: Array<{
      productId: number;
      productTitle: string;
      subcategoryId: number | null;
      subcategoryName: string | null;
      matchType: 'exact' | 'fuzzy' | 'none';
    }> = [];

    let assignedCount = 0;

    for (const product of productsWithoutSubcategory) {
      // หา subcategory ที่ตรงกับ product title
      let matchedSubcategory: Subcategory | null = null;
      let matchType: 'exact' | 'fuzzy' | 'none' = 'none';

      // กรอง subcategories ที่อยู่ใน category เดียวกัน
      const relevantSubcategories = allSubcategories.filter(
        (sub) => sub.categoryId === product.categoryId,
      );

      // ลองหา exact match (title ขึ้นต้นด้วย subcategory name)
      for (const sub of relevantSubcategories) {
        const productTitleLower = product.title.toLowerCase().trim();
        const subNameLower = sub.name.toLowerCase().trim();

        if (productTitleLower.startsWith(subNameLower) && subNameLower.length >= 3) {
          matchedSubcategory = sub;
          matchType = 'exact';
          break;
        }
      }

      // ถ้าไม่เจอ exact match ลองหา fuzzy match (title มี subcategory name อยู่)
      if (!matchedSubcategory) {
        for (const sub of relevantSubcategories) {
          const productTitleLower = product.title.toLowerCase().trim();
          const subNameLower = sub.name.toLowerCase().trim();

          if (
            productTitleLower.includes(subNameLower) &&
            subNameLower.length >= 3 &&
            subNameLower.length <= 20 // จำกัดความยาวเพื่อความแม่นยำ
          ) {
            matchedSubcategory = sub;
            matchType = 'fuzzy';
            break;
          }
        }
      }

      // อัปเดต product ถ้าเจอ match
      if (matchedSubcategory) {
        product.subcategoryId = matchedSubcategory.id;
        await this.dataSource.getRepository(Product).save(product);
        assignedCount++;

        results.push({
          productId: product.id,
          productTitle: product.title,
          subcategoryId: matchedSubcategory.id,
          subcategoryName: matchedSubcategory.name,
          matchType,
        });
      } else {
        results.push({
          productId: product.id,
          productTitle: product.title,
          subcategoryId: null,
          subcategoryName: null,
          matchType: 'none',
        });
      }
    }

    // 4. นับจำนวนสินค้าทั้งหมด
    const totalProducts = await this.dataSource.getRepository(Product).count();
    const productsStillNull = productsWithoutSubcategory.length - assignedCount;

    console.log(`✅ Auto-assigned ${assignedCount} products`);
    console.log(`⚠️ ${productsStillNull} products still without subcategoryId`);

    return {
      success: true,
      totalProducts,
      productsWithoutSubcategory: productsWithoutSubcategory.length,
      productsAssigned: assignedCount,
      productsStillNull,
      details: results,
    };
  }

  /**
   * Backfill slug สำหรับหมวดหมู่ที่ slug เป็น NULL (อัปเดตข้อมูลเก่า)
   * ค้นหาหมวดหมู่ทั้งหมดที่ slug เป็น NULL วนลูปสร้าง slug ให้ทีละตัว แล้วบันทึกกลับลง DB
   * @returns จำนวนรายการที่อัปเดตสำเร็จ (updated), จำนวนทั้งหมด (total), รายละเอียด (details)
   */
  async backfillCategorySlugs(): Promise<{ updated: number; total: number; details: { id: number; name: string; slug: string }[] }> {
    const list = await this.categoryRepository.find({
      where: { slug: IsNull() },
      select: ['id', 'name'],
    });
    const total = list.length;
    const details: { id: number; name: string; slug: string }[] = [];
    for (const c of list) {
      const baseSlug = generateSlugFromText(c.name || '');
      const slug = await ensureUniqueSlug(this.categoryRepository, baseSlug, c.id);
      await this.categoryRepository.update(c.id, { slug });
      details.push({ id: c.id, name: c.name || '', slug });
    }
    return { updated: total, total, details };
  }
}

