const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const DB_JSON = path.join(__dirname, '..', 'db.json');

async function seed() {
  const data = JSON.parse(fs.readFileSync(DB_JSON, 'utf-8'));
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Seed started...\n');

    // ============ 1. USERS ============
    console.log('📥 Users...');
    for (const u of data.users || []) {
      await client.query(
        `INSERT INTO users (id, first_name, last_name, email, password, role, phone, avatar, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.firstName, u.lastName, u.email, u.password, u.role,
         u.phone || null, u.avatar || null, u.isActive !== false, u.createdAt || new Date()]
      );

      // Addresses
      for (const a of u.addresses || []) {
        await client.query(
          `INSERT INTO addresses (id, user_id, label, street, city, state, zip_code, country, is_default)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, u.id, a.label || null, a.street, a.city, a.state || null,
           a.zipCode || null, a.country, !!a.isDefault]
        );
      }
    }
    console.log(`   ✅ ${data.users?.length || 0} users`);

    // ============ 2. CATEGORIES ============
    console.log('📥 Categories...');
    // Insert parents first, then children (for FK constraints)
    const cats = data.categories || [];
    const sortedCats = [...cats].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
    for (const c of sortedCats) {
      await client.query(
        `INSERT INTO categories (id, name, slug, description, image, icon, parent_id, is_active, "order")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.slug, c.description || null, c.image || null, c.icon || null,
         c.parentId || null, c.isActive !== false, c.order || 0]
      );
    }
    console.log(`   ✅ ${cats.length} categories`);

    // ============ 3. PRODUCTS ============
    console.log('📥 Products...');
    for (const p of data.products || []) {
      await client.query(
        `INSERT INTO products (id, name, slug, description, short_description, price, compare_price,
                               category_id, brand, sku, stock, images, specifications, features,
                               rating, review_count, is_featured, is_new, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.slug, p.description || null, p.shortDescription || null,
         p.price, p.comparePrice || null, p.categoryId || null, p.brand || null,
         p.sku || null, p.stock || 0,
         JSON.stringify(p.images || []),
         JSON.stringify(p.specifications || {}),
         JSON.stringify(p.features || []),
         p.rating || 0, p.reviewCount || 0,
         !!p.isFeatured, !!p.isNew, p.isActive !== false,
         p.createdAt || new Date()]
      );
    }
    console.log(`   ✅ ${data.products?.length || 0} products`);

    // ============ 4. CARTS + CART_ITEMS ============
    console.log('📥 Carts...');
    let cartItemsCount = 0;
    for (const c of data.carts || []) {
      await client.query(
        `INSERT INTO carts (user_id, updated_at)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        [c.userId, c.updatedAt || new Date()]
      );
      for (const item of c.items || []) {
        await client.query(
          `INSERT INTO cart_items (user_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [c.userId, item.productId, item.quantity || 1]
        );
        cartItemsCount++;
      }
    }
    console.log(`   ✅ ${data.carts?.length || 0} carts, ${cartItemsCount} items`);

    // ============ 5. ORDERS + ORDER_ITEMS ============
    console.log('📥 Orders...');
    let orderItemsCount = 0;
    for (const o of data.orders || []) {
      await client.query(
        `INSERT INTO orders (id, user_id, subtotal, discount, shipping, tax, total,
                             status, payment_method, payment_status, shipping_address,
                             tracking_number, estimated_delivery, delivered_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.userId || null, o.subtotal, o.discount || 0, o.shipping || 0,
         o.tax || 0, o.total, o.status || 'pending', o.paymentMethod || null,
         o.paymentStatus || 'pending',
         o.shippingAddress ? JSON.stringify(o.shippingAddress) : null,
         o.trackingNumber || null, o.estimatedDelivery || null,
         o.deliveredAt || null, o.createdAt || new Date(), o.updatedAt || new Date()]
      );
      for (const item of o.items || []) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [o.id, item.productId || null, item.name, item.price, item.quantity, item.image || null]
        );
        orderItemsCount++;
      }
    }
    console.log(`   ✅ ${data.orders?.length || 0} orders, ${orderItemsCount} items`);

    // ============ 6. REVIEWS ============
    console.log('📥 Reviews...');
    for (const r of data.reviews || []) {
      await client.query(
        `INSERT INTO reviews (id, product_id, user_id, user_name, rating, title, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.productId, r.userId || null, r.userName || null,
         r.rating, r.title || null, r.comment || null, r.createdAt || new Date()]
      );
    }
    console.log(`   ✅ ${data.reviews?.length || 0} reviews`);

    // ============ 7. COUPONS ============
    console.log('📥 Coupons...');
    for (const c of data.coupons || []) {
      await client.query(
        `INSERT INTO coupons (id, code, type, value, min_order, max_discount,
                              usage_limit, used_count, is_active, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.code, c.type, c.value, c.minOrder || 0, c.maxDiscount || null,
         c.usageLimit || null, c.usedCount || 0, c.isActive !== false, c.expiresAt || null]
      );
    }
    console.log(`   ✅ ${data.coupons?.length || 0} coupons`);

    // ============ 8. WISHLIST ============
    console.log('📥 Wishlist...');
    for (const w of data.wishlist || []) {
      await client.query(
        `INSERT INTO wishlist (user_id, product_id, added_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id, product_id) DO NOTHING`,
         [w.userId, w.productId, w.addedAt || new Date()]
      );
    }
    console.log(`   ✅ ${data.wishlist?.length || 0} wishlist items`);

    // ============ 9. NEWSLETTER ============
    console.log('📥 Newsletter...');
    for (const n of data.newsletter || []) {
      await client.query(
        `INSERT INTO newsletter (email, subscribed_at, is_active)
         VALUES ($1,$2,$3)
         ON CONFLICT (email) DO NOTHING`,
         [n.email, n.subscribedAt || new Date(), n.isActive !== false]
      );
    }
    console.log(`   ✅ ${data.newsletter?.length || 0} newsletter subscriptions`);

    // ============ 10. SETTINGS ============
    console.log('📥 Settings...');
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await client.query(
          `INSERT INTO settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
    }
    console.log('   ✅ settings migrated');

    await client.query('COMMIT');
    console.log('\n🎉 Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed error:', err.message);
    console.error(err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));    
