import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";

import { API, BRAND_NAME, CATEGORIES, colors, radius, spacing } from "@/src/theme";
import { adminStorage } from "@/src/utils/adminAuth";
import { resolveImage } from "@/src/utils/image";
import { Product } from "@/src/context/CartContext";

// Categories a merchant can toggle on/off for a product.
const TAGGABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== "all");

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [secret, setSecret] = useState<string>("");
  const [inputSecret, setInputSecret] = useState<string>("");
  const [signingIn, setSigningIn] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await adminStorage.get();
      if (stored) {
        // Verify still valid
        const ok = await verifySecret(stored);
        if (ok) setSecret(stored);
        else await adminStorage.clear();
      }
      setBootstrapped(true);
    })();
  }, []);

  const verifySecret = async (candidate: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/api/admin/verify`, {
        method: "POST",
        headers: { "X-Admin-Secret": candidate },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleUnlock = async () => {
    setSigningIn(true);
    setError(null);
    const trimmed = inputSecret.trim();
    if (!trimmed) {
      setError("Masukkan admin secret.");
      setSigningIn(false);
      return;
    }
    const ok = await verifySecret(trimmed);
    if (!ok) {
      setError("Secret salah. Coba lagi.");
      setSigningIn(false);
      return;
    }
    await adminStorage.set(trimmed);
    setSecret(trimmed);
    setSigningIn(false);
  };

  const handleLock = async () => {
    await adminStorage.clear();
    setSecret("");
    setInputSecret("");
  };

  if (!bootstrapped) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!secret) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        <View style={[styles.gateHeader, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={() => router.back()} testID="admin-back">
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.gateTitle}>Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.gateContent}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.onSurface} />
          <Text style={styles.gateHeading}>Panel Admin {BRAND_NAME}</Text>
          <Text style={styles.gateSub}>
            Masukkan admin secret untuk mengelola produk, harga, stok, dan tag.
          </Text>
          <TextInput
            testID="admin-secret-input"
            style={styles.input}
            placeholder="Admin secret"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={inputSecret}
            onChangeText={setInputSecret}
            onSubmitEditing={handleUnlock}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={[styles.primaryBtn, signingIn && { opacity: 0.7 }]}
            onPress={handleUnlock}
            disabled={signingIn}
            testID="admin-unlock-btn"
          >
            {signingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Buka Admin</Text>
            )}
          </Pressable>
          <Text style={styles.hint}>
            Default (bisa diubah nanti): sorayaco-admin
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return <AdminList secret={secret} onLock={handleLock} />;
}

function AdminList({ secret, onLock }: { secret: string; onLock: () => void }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products`);
      const data = await res.json();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable onPress={() => router.back()} testID="admin-close">
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <View>
            <Text style={styles.title}>Admin</Text>
            <Text style={styles.subtitle}>{products.length} produk</Text>
          </View>
        </View>
        <Pressable onPress={onLock} testID="admin-logout" style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              secret={secret}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onSaved={reload}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ProductRow({
  product,
  secret,
  expanded,
  onToggle,
  onSaved,
}: {
  product: Product;
  secret: string;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(product.stock != null ? String(product.stock) : "");
  const [categories, setCategories] = useState<string[]>(product.categories ?? []);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    return (
      name !== product.name ||
      Number(price) !== product.price ||
      (product.stock == null ? stock !== "" : Number(stock) !== product.stock) ||
      JSON.stringify(categories) !== JSON.stringify(product.categories ?? [])
    );
  }, [name, price, stock, categories, product]);

  const toggleTag = (key: string) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const patch: any = {};
      if (name !== product.name) patch.name = name;
      const priceNum = Number(price);
      if (Number.isFinite(priceNum) && priceNum !== product.price) patch.price = Math.round(priceNum);
      if (stock !== "" && Number(stock) !== product.stock) patch.stock = Math.round(Number(stock));
      if (JSON.stringify(categories) !== JSON.stringify(product.categories ?? []))
        patch.categories = categories;

      if (Object.keys(patch).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch(`${API}/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": secret },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Gagal simpan");
      }
      onSaved();
      Alert.alert("Berhasil", "Produk sudah diupdate.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.productRow} testID={`admin-row-${product.id}`}>
      <Pressable onPress={onToggle} style={styles.rowHead}>
        <Image source={{ uri: resolveImage(product.image) }} style={styles.thumb} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.rowMeta}>
            Rp{Math.round(product.price).toLocaleString("id-ID")} · Stok:{" "}
            {product.stock ?? (product.variants?.length ? `${product.variants.length} varian` : "-")}
          </Text>
          <View style={styles.tagRow}>
            {product.categories.map((c) => (
              <View key={c} style={styles.tagChip}>
                <Text style={styles.tagText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.muted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.editor}>
          <Field label="Nama produk">
            <TextInput
              testID={`admin-name-${product.id}`}
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              multiline
            />
          </Field>
          <Field label="Harga (Rp)">
            <TextInput
              testID={`admin-price-${product.id}`}
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </Field>
          {product.stock != null || product.variants?.length === 0 ? (
            <Field label="Stok">
              <TextInput
                testID={`admin-stock-${product.id}`}
                style={styles.textInput}
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </Field>
          ) : (
            <Text style={styles.helperText}>
              Produk ini punya {product.variants.length} varian; edit stok per varian
              belum tersedia di panel ini.
            </Text>
          )}
          <Field label="Kategori / Tag">
            <View style={styles.tagPicker}>
              {TAGGABLE_CATEGORIES.map((c) => {
                const active = categories.includes(c.key);
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => toggleTag(c.key)}
                    style={[styles.tagPickerChip, active && styles.tagPickerChipActive]}
                    testID={`admin-tag-${product.id}-${c.key}`}
                  >
                    <Text
                      style={[
                        styles.tagPickerText,
                        active && styles.tagPickerTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Pressable
            style={[
              styles.saveBtn,
              (!dirty || saving) && { opacity: 0.4 },
            ]}
            onPress={save}
            disabled={!dirty || saving}
            testID={`admin-save-${product.id}`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Simpan perubahan</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },

  // Gate
  gateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  gateTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, letterSpacing: 0.3 },
  gateContent: {
    flex: 1,
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  gateHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  gateSub: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
    marginTop: spacing.lg,
    borderRadius: radius.sm,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  primaryBtn: {
    width: "100%",
    backgroundColor: colors.brand,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.onBrand, fontWeight: "800", letterSpacing: 0.4 },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.md, textAlign: "center" },

  // List
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  productRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  thumb: {
    width: 60,
    height: 74,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
  },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  rowMeta: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: "600" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  tagText: { fontSize: 10, color: colors.onSurfaceSecondary, fontWeight: "700", letterSpacing: 0.4 },

  editor: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  helperText: { fontSize: 12, color: colors.muted, fontWeight: "600", lineHeight: 18 },

  tagPicker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tagPickerChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tagPickerChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tagPickerText: { fontSize: 12, color: colors.onSurfaceSecondary, fontWeight: "700" },
  tagPickerTextActive: { color: colors.onBrand },

  saveBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.onBrand, fontWeight: "800", letterSpacing: 0.4 },
});
