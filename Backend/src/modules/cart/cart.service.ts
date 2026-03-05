import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, ProductOnCart, Product, ProductVariant } from '@core/database/entities';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(ProductOnCart)
    private productOnCartRepository: Repository<ProductOnCart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    try {
      // ✅ ใช้ Query Builder เพื่อควบคุมการเลือกคอลัมน์และหลีกเลี่ยงปัญหา createdAt/updatedAt
      let cart = await this.cartRepository
        .createQueryBuilder('cart')
        .leftJoinAndSelect('cart.productOnCarts', 'productOnCarts')
        .leftJoinAndSelect('productOnCarts.product', 'product')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.store', 'store')
        .leftJoinAndSelect('productOnCarts.variant', 'variant')
        .where('cart.orderedById = :userId', { userId })
        .getOne();

      if (!cart) {
        cart = this.cartRepository.create({
          orderedById: userId,
          cartTotal: 0,
        });
        cart = await this.cartRepository.save(cart);
        // Reload with relations after creating
        cart = await this.cartRepository
          .createQueryBuilder('cart')
          .leftJoinAndSelect('cart.productOnCarts', 'productOnCarts')
          .leftJoinAndSelect('productOnCarts.product', 'product')
          .leftJoinAndSelect('product.images', 'images')
          .leftJoinAndSelect('product.store', 'store')
          .leftJoinAndSelect('productOnCarts.variant', 'variant')
          .where('cart.id = :cartId', { cartId: cart.id })
          .getOne();
      }

      return cart;
    } catch (error) {
      console.error('❌ Error in getOrCreateCart:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        userId,
      });
      
      // Return a minimal cart object to prevent app crash
      // This allows the frontend to continue working even if there's a database issue
      return {
        id: 0,
        cartTotal: 0,
        orderedById: userId,
        productOnCarts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Cart;
    }
  }

  async addToCart(
    userId: number,
    productId: number,
    count: number,
    variantId?: number,
  ) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // ✅ ถ้ามี variantId ให้เช็คว่า variant มีจริงและเป็นของ product นี้
    let variant: ProductVariant | null = null;
    if (variantId) {
      variant = await this.productVariantRepository.findOne({
        where: { id: variantId, productId },
      });
      if (!variant) {
        throw new Error('Product variant not found');
      }
    }

    // ✅ เช็คว่ามีสินค้านี้ + ตัวเลือกนี้ ในตะกร้าหรือยัง?
    let productOnCart = await this.productOnCartRepository.findOne({
      where: {
        cartId: cart.id,
        productId: productId,
        variantId: variantId || null, // เช็คทั้งคู่ (ถ้า variantId ไม่ส่งมา ให้เช็คที่เป็น null)
      },
    });

    // ✅ กำหนดราคา: ถ้ามี variant ให้ใช้ราคา variant, ถ้าไม่มีให้ใช้ราคา product
    const itemPrice = variant
      ? variant.price || product.discountPrice || product.price
      : product.discountPrice || product.price;

    if (productOnCart) {
      // 2.1 ถ้ามีแล้ว -> บวกจำนวนเพิ่ม
      productOnCart.count += count;
      productOnCart.price = itemPrice;
    } else {
      // 2.2 ถ้ายังไม่มี -> สร้างรายการใหม่
      productOnCart = this.productOnCartRepository.create({
        cartId: cart.id,
        productId: productId,
        variantId: variantId || null, // บันทึก variantId
        count: count,
        price: itemPrice,
      });
    }

    await this.productOnCartRepository.save(productOnCart);
    await this.updateCartTotal(cart.id);

    return this.getOrCreateCart(userId);
  }

  // ✅ แก้ไขให้ใช้ itemId แทน productId เพื่อรองรับ variants
  async removeFromCart(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);
    // ✅ เช็คว่า item นี้เป็นของ cart นี้จริงๆ
    const item = await this.productOnCartRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new Error('Cart item not found');
    }
    await this.productOnCartRepository.delete({ id: itemId });
    await this.updateCartTotal(cart.id);
    return this.getOrCreateCart(userId);
  }

  // ✅ แก้ไขให้ใช้ itemId แทน productId เพื่อรองรับ variants
  async updateCartItem(userId: number, itemId: number, count: number) {
    const cart = await this.getOrCreateCart(userId);
    // ✅ เช็คว่า item นี้เป็นของ cart นี้จริงๆ
    const productOnCart = await this.productOnCartRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (productOnCart) {
      productOnCart.count = count;
      await this.productOnCartRepository.save(productOnCart);
      await this.updateCartTotal(cart.id);
    }

    return this.getOrCreateCart(userId);
  }

  private async updateCartTotal(cartId: number) {
    const items = await this.productOnCartRepository.find({
      where: { cartId },
    });

    const total = items.reduce((sum, item) => sum + item.price * item.count, 0);

    await this.cartRepository.update(cartId, { cartTotal: total });
  }
}

