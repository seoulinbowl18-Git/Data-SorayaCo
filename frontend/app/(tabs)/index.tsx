import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { API, BRAND_NAME, CATEGORIES, PAYMENT_METHODS, colors, radius, spacing } from "@/src/theme";
import { formatPrice, Product, useCart } from "@/src/context/CartContext";
import { resolveImage } from "@/src/utils/image";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

type ApiCategory = { key: string; label: string; image?: string | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { count, addItem } = useCart();
  const [category, setCategory] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load featured categories once
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then((data) => !cancelled && setFeatured(data.slice(0, 4)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/products${category !== "all" ? `?category=${category}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => !cancelled && setError("Could not load products"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category]);

  const shopNow = () => {
    // Scroll target: keep on same screen; smooth UX enhancement could scroll to grid.
    setCategory("all");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.logo} testID="app-logo">{BRAND_NAME}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} testID="search-btn" onPress={() => {}}>
            <Ionicons name="search-outline" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.iconBtn} testID="account-btn" onPress={() => {}}>
            <Ionicons name="person-outline" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            testID="header-cart-btn"
            onPress={() => router.push("/(tabs)/cart")}
          >
            <Ionicons name="bag-outline" size={22} color={colors.onSurface} />
            {count > 0 ? (
              <View style={styles.headerBadge} testID="header-cart-badge">
                <Text style={styles.headerBadgeText}>{count > 9 ? "9+" : count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap} testID="hero-banner">
          <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.65)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroKicker}>KOLEKSI TERBARU</Text>
            <Text style={styles.heroTitle}>Rayon Premium,{`\n`}Nyaman Setiap Hari.</Text>
            <Pressable style={styles.heroCta} onPress={shopNow} testID="shop-now-btn">
              <Text style={styles.heroCtaText}>Belanja Sekarang</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onBrand} />
            </Pressable>
          </View>
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={styles.pillsScroller}
        >
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`category-pill-${c.key}`}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Featured categories */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Featured Categories</Text>
          <Text style={styles.sectionSub}>Pilihan favorit koleksi Soraya.Co.</Text>
        </View>
        <View style={styles.featuredGrid}>
          {featured.map((f) => (
            <Pressable
              key={f.key}
              style={styles.featuredCard}
              testID={`featured-${f.key}`}
              onPress={() => setCategory(f.key)}
            >
              {f.image ? (
                <Image source={{ uri: resolveImage(f.image) }} style={styles.featuredImage} />
              ) : null}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.55)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.featuredTitle}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Product grid */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Produk Terbaru</Text>
          <Text style={styles.sectionSub}>Dibuat rapi, harga jujur.</Text>
        </View>
        {loading ? (
          <View style={styles.center}> 
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: colors.muted }}>{error}</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.center} testID="empty-category">
            <Ionicons name="pricetags-outline" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: spacing.md, fontWeight: "600" }}>
              Belum ada produk di kategori ini.
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addItem(p)} />
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} testID="footer">
          <Text style={styles.footerBrand}>{BRAND_NAME}</Text>
          <Text style={styles.footerTag}>Fashion rayon nyaman untuk keseharian.</Text>

          <View style={styles.footerLinks}>
            <Pressable testID="footer-about"><Text style={styles.footerLink}>About Us</Text></Pressable>
            <Pressable testID="footer-contact"><Text style={styles.footerLink}>Contact</Text></Pressable>
            <Pressable testID="footer-track"><Text style={styles.footerLink}>Track Order</Text></Pressable>
          </View>

          <View style={styles.socialRow}>
            {(["logo-instagram", "logo-tiktok", "logo-twitter", "logo-youtube"] as const).map((n) => (
              <Pressable key={n} style={styles.socialBtn} onPress={() => Linking.openURL("https://instagram.com")}>
                <Ionicons name={n} size={18} color={colors.onSurface} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.paymentsLabel}>We accept</Text>
          <View style={styles.paymentsRow}>
            {PAYMENT_METHODS.map((p) => (
              <View key={p} style={styles.paymentPill} testID={`payment-${p}`}>
                <Text style={styles.paymentText}>{p}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.copy}>© 2026 {BRAND_NAME}. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: resolveImage(product.image) }} style={styles.cardImage} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceNow}>{formatPrice(product.price)}</Text>
        {product.original_price ? (
          <Text style={styles.priceOld}>{formatPrice(product.original_price)}</Text>
        ) : null}
      </View>
      <Pressable
        style={[styles.addBtn, added && styles.addBtnAdded]}
        onPress={handleAdd}
        testID={`add-to-cart-${product.id}`}
      >
        <Text style={styles.addBtnText}>{added ? "Added ✓" : "Add to Cart"}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: colors.onSurface,
  },
  headerActions: { flexDirection: "row", gap: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  heroWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    height: 440,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  heroImage: { width: "100%", height: "100%" },
  heroContent: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36,
    marginBottom: spacing.lg,
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroCtaText: { color: colors.onBrand, fontWeight: "800", letterSpacing: 0.5 },

  pillsScroller: { marginTop: spacing.xl },
  pillsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    height: 56,
    alignItems: "center",
  },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  pillText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: colors.onBrand },

  sectionHead: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },

  featuredGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  featuredCard: {
    flexBasis: "48%",
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  featuredImage: { width: "100%", height: "100%" },
  featuredTitle: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  productGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.sm,
  },
  cardImage: { width: "100%", height: "100%" },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  priceNow: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  priceOld: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  addBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  addBtnAdded: { backgroundColor: colors.success },
  addBtnText: { color: colors.onBrand, fontWeight: "800", fontSize: 13, letterSpacing: 0.4 },

  center: { paddingVertical: spacing.xxl, alignItems: "center" },

  footer: {
    marginTop: spacing.xxxl,
    backgroundColor: colors.surfaceInverse,
    padding: spacing.xl,
    alignItems: "center",
  },
  footerBrand: {
    color: colors.onSurfaceInverse,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  footerTag: { color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 },
  footerLinks: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  footerLink: { color: colors.onSurfaceInverse, fontWeight: "600", fontSize: 13 },
  socialRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentsLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  paymentsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  paymentPill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  paymentText: { color: "#FFF", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  copy: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: spacing.xl },
});
