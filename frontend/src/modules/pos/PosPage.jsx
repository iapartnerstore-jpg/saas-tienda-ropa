import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: "💵" },
  { value: "debit", label: "Debito", icon: "💳" },
  { value: "credit", label: "Credito", icon: "💳" },
  { value: "transfer", label: "Transferencia", icon: "🏦" }
];

const PRODUCT_CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "promociones", label: "Promociones" },
  { value: "varon", label: "Varon" },
  { value: "mujer", label: "Mujer" },
  { value: "ninos", label: "Ninos" },
  { value: "bebes", label: "Bebes" },
  { value: "colegio", label: "Ropa Colegio" },
  { value: "blanqueria", label: "Blanqueria" },
];

const PRODUCT_DEPARTMENTS = [
  { value: "all", label: "Ropa + Calzado" },
  { value: "ropa", label: "Ropa" },
  { value: "calzado", label: "Calzado" }
];

const PROMOTION_TYPES = [
  { value: "all", label: "Todas" },
  { value: "combo", label: "Combo" },
  { value: "liquidacion", label: "Liquidación" }
];

const normalizeCategory = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "hombre") return "varon";
  if (raw === "niño" || raw === "nino" || raw === "niños") return "ninos";
  if (raw === "bebé" || raw === "bebe") return "bebes";
  return raw;
};

const normalizeDepartment = (value) => String(value || "").trim().toLowerCase();

const getCartKey = (item) => `${item.productId}-${item.promotionId || "regular"}`;

const getCategoryLabel = (value) => {
  const normalized = normalizeCategory(value);
  return PRODUCT_CATEGORIES.find((item) => item.value === normalized)?.label || value || "Producto";
};

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const lastKeyTimeRef = useRef(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [promotionTypeFilter, setPromotionTypeFilter] = useState("all");
  const [inputQty, setInputQty] = useState("");
  const [selectedCartKey, setSelectedCartKey] = useState(null);
  const [keypadMode, setKeypadMode] = useState("qty"); // "qty" | "price"

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savingSale, setSavingSale] = useState(false);
  const [error, setError] = useState("");

  // Clientes
  const [customers, setCustomers] = useState([]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Modal de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [discountPercent, setDiscountPercent] = useState("");
  const [currentPayment, setCurrentPayment] = useState({
    method: "cash"
  });
  const [entrega, setEntrega] = useState("");

  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Tenant": tenant
  };

  // ===== CARGA DE DATOS =====

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");
      const { data } = await api.get("/products", { headers: authHeaders });
      setProducts(data || []);
    } catch (err) {
      console.error("Error cargando productos POS", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get("/customers", { headers: authHeaders });
      setCustomers(data || []);
    } catch (err) {
      console.error("Error cargando clientes POS", err);
    }
  };

  const fetchPromotions = async () => {
    try {
      const { data } = await api.get("/promotions", { headers: authHeaders });
      // Solo mostrar las marcadas como activas
      setPromotions((data || []).filter(p => p.active === 1 || p.active === true));
    } catch (err) {
      console.error("Error cargando promociones POS", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    fetchCustomers();
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== FILTROS =====

  // Calcula el precio total de una promoción sumando price_override (o precio del producto) * qty
  const calcPromoPrice = (promo) => {
    return promo.items.reduce((sum, item) => {
      const price = item.price_override != null
        ? Number(item.price_override)
        : Number(products.find(p => p.id === item.product_id)?.price || 0);
      return sum + price * Number(item.qty || 1);
    }, 0);
  };

  const showingPromos = categoryFilter === "promociones";

  const filteredProducts = useMemo(() => {
    if (showingPromos) return [];
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      // When searching, ignore category/department filters so results are global
      const hasSearch = term.length > 0;
      const categoryOk = hasSearch || categoryFilter === "all" || normalizeCategory(p.category) === categoryFilter;
      const departmentOk = hasSearch || departmentFilter === "all" || normalizeDepartment(p.department) === departmentFilter;
      const searchOk =
        !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.department && p.department.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.model && p.model.toLowerCase().includes(term)) ||
        (p.size && p.size.toLowerCase().includes(term)) ||
        (p.color && p.color.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));
      return categoryOk && departmentOk && searchOk;
    });
  }, [products, search, categoryFilter, departmentFilter, showingPromos]);

  const filteredPromotions = useMemo(() => {
    if (!showingPromos) return [];
    const term = search.toLowerCase();
    return promotions.filter(p =>
      !term || p.name.toLowerCase().includes(term)
    );
  }, [promotions, search, showingPromos]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.document && c.document.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term))
    );
  }, [customers, customerSearch]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );

  const discountValue = useMemo(() => {
    const raw = Number(discountPercent);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return raw;
  }, [discountPercent]);

  const totalWithDiscount = useMemo(() => {
    const discounted = subtotal * (1 - discountValue / 100);
    return Math.max(0, discounted);
  }, [subtotal, discountValue]);

  const pending = useMemo(() => {
    return Math.max(0, totalWithDiscount - totalPaid);
  }, [totalWithDiscount, totalPaid]);

  // Cuenta corriente: cuánto entrega y cuánto queda de deuda
  const entregaValue = useMemo(() => {
    const raw = Number(entrega);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.min(raw, totalWithDiscount);
  }, [entrega, totalWithDiscount]);

  const debtToAccount = useMemo(() => {
    if (!selectedCustomer) return 0;
    return Math.max(0, totalWithDiscount - entregaValue);
  }, [totalWithDiscount, entregaValue, selectedCustomer]);

  // ===== CARRITO =====

  const addToCart = (product) => {
    if (!product.id) return;
    if (Number(product.stock) <= 0) return;
    const qty = inputQty ? parseInt(inputQty, 10) || 1 : 1;
    const key = `${product.id}-regular`;

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && !i.promotionId);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && !i.promotionId ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          qty
        }
      ];
    });

    setSelectedCartKey(key);
    setKeypadMode("qty");
    setInputQty("");
  };

  // ===== BARCODE SCAN =====
  const handleSearchKeyDown = (e) => {
    const now = Date.now();
    lastKeyTimeRef.current = now;

    if (e.key !== "Enter") return;

    e.preventDefault();
    const code = search.trim();
    if (!code) return;

    // Buscar producto con barcode exacto
    const match = products.find((p) => p.barcode && p.barcode === code);
    if (match) {
      addToCart(match);
      setSearch("");
      setScanFeedback(match.name);
      setTimeout(() => setScanFeedback(""), 1800);
    }
  };

  const addPromotionToCart = (promotion) => {
    if (!promotion.items || promotion.items.length === 0) return;
    
    setCart((prev) => {
      let updatedCart = [...prev];
      
      for (const item of promotion.items) {
        const price = item.price_override != null ? Number(item.price_override) : 
                     products.find(p => p.id === item.product_id)?.price || 0;
        
        const existing = updatedCart.find((i) => i.productId === item.product_id && i.promotionId === promotion.id);
        if (existing) {
          updatedCart = updatedCart.map((i) =>
            i === existing ? { ...i, qty: i.qty + item.qty } : i
          );
        } else {
          updatedCart.push({
            productId: item.product_id,
            name: products.find(p => p.id === item.product_id)?.name || `Producto ${item.product_id}`,
            price,
            qty: item.qty,
            promotionId: promotion.id,
            promotionName: promotion.name
          });
        }
      }
      
      return updatedCart;
    });
    
    setInputQty("");
  };

  const clearCart = () => {
    setCart([]);
    setInputQty("");
    setPayments([]);
    setSelectedCartKey(null);
    setKeypadMode("qty");
  };

  const removeItem = (productId, promotionId = null) => {
    setCart((prev) => prev.filter((i) => 
      !(i.productId === productId && (promotionId === null ? !i.promotionId : i.promotionId === promotionId))
    ));
  };

  // ===== KEYPAD =====

  const handleKeypad = (value) => {
    if (value === "C") {
      setInputQty("");
      return;
    }
    const newBuffer = inputQty + String(value);
    setInputQty(newBuffer);

    // En modo cantidad: aplicar al ítem seleccionado en tiempo real
    if (selectedCartKey && keypadMode === "qty") {
      const num = parseInt(newBuffer, 10);
      if (!isNaN(num) && num > 0) {
        setCart((prev) =>
          prev.map((i) => getCartKey(i) === selectedCartKey ? { ...i, qty: num } : i)
        );
      }
    }
    // En modo precio: solo actualiza el buffer, se aplica al confirmar
  };

  const confirmPriceEdit = () => {
    if (selectedCartKey && inputQty.trim()) {
      const num = parseFloat(inputQty);
      if (!isNaN(num) && num >= 0) {
        setCart((prev) =>
          prev.map((i) => getCartKey(i) === selectedCartKey ? { ...i, price: num } : i)
        );
      }
    }
    setKeypadMode("qty");
    setInputQty("");
  };

  const startPriceEdit = () => {
    if (!selectedCartKey) return;
    setKeypadMode("price");
    setInputQty("");
  };

  // ===== CLIENTE =====

  const openCustomerSelector = () => {
    setCustomerSearch("");
    setCustomerModalOpen(true);
  };

  const chooseCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerModalOpen(false);
  };

  const clearCustomer = () => setSelectedCustomer(null);

  // ===== PAGOS =====

  const openPaymentModal = () => {
    if (!cart.length) {
      alert("Agregá productos al carrito primero");
      return;
    }
    setPayments([]);
    setDiscountPercent("");
    setEntrega("");
    setCurrentPayment({ method: "cash" });
    setPaymentModalOpen(true);
  };

  const addPayment = () => {
    // When customer selected, the max payable is entregaValue; otherwise totalWithDiscount
    const maxPayable = selectedCustomer ? entregaValue : totalWithDiscount;
    const remainingToPay = Math.max(0, Number((maxPayable - totalPaid).toFixed(2)));

    if (remainingToPay <= 0) {
      alert(selectedCustomer ? "La entrega ya está cubierta" : "La venta ya está saldada");
      return;
    }

    const amount = remainingToPay;
    const method = PAYMENT_METHODS.find(m => m.value === currentPayment.method);  

    setPayments(prev => {
      const existingIndex = prev.findIndex((p) => p.method === currentPayment.method);
      if (existingIndex >= 0) {
        return prev.map((p, i) =>
          i === existingIndex
            ? { ...p, amount: Number((p.amount + amount).toFixed(2)) }
            : p
        );
      }

      return [
        ...prev,
        {
          method: currentPayment.method,
          methodLabel: method?.label || currentPayment.method,
          amount: amount
        }
      ];
    });

    setCurrentPayment({ method: "cash" });
  };

  const removePayment = (index) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };  

  // ===== COBRAR =====

  const handlePay = async () => {
    if (!cart.length || savingSale) return;
    if (!token) {
      alert("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    // If no customer and no payments cover the total, require full payment
    if (!selectedCustomer && totalPaid < totalWithDiscount - 0.01 && payments.length > 0) {
      alert("Falta cubrir el total. Agregá otro método de pago.");
      return;
    }

    setSavingSale(true);
    setError("");

    const itemsPayload = cart.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price
    }));

    const fallbackMethod = PAYMENT_METHODS.find((m) => m.value === currentPayment.method);
    const paidAmount = selectedCustomer ? entregaValue : totalWithDiscount;
    const effectivePayments =
      payments.length > 0
        ? payments
        : [
            {
              method: currentPayment.method,
              methodLabel: fallbackMethod?.label || currentPayment.method,
              amount: Number(paidAmount.toFixed(2))
            }
          ];

    const debtAmount = selectedCustomer ? debtToAccount : 0;

    try {
      const { data } = await api.post(
        "/sales",
        {
          items: itemsPayload,
          paymentMethod: effectivePayments[0]?.method || currentPayment.method || "cash",
          payments: effectivePayments.map(p => ({
            method: p.method,
            amount: p.amount
          })),
          subtotal: subtotal,
          discountPercent: discountValue,
          total: totalWithDiscount,
          customerId: selectedCustomer ? selectedCustomer.id : null,
          entrega: selectedCustomer ? entregaValue : null,
          debtToAccount: debtAmount
        },
        { headers: authHeaders }
      );

      const paymentsSummary = effectivePayments.map(p => 
        `${p.methodLabel}: $${p.amount.toFixed(2)}`
      ).join('\n');

      let confirmMsg = `Venta registrada\n\nTicket: #${data.ticket_number}\nTotal: $${totalWithDiscount.toFixed(2)}`;
      if (discountValue > 0) confirmMsg += `\nDescuento: ${discountValue}%`;
      confirmMsg += `\n\nPagos:\n${paymentsSummary}`;
      if (selectedCustomer) {
        confirmMsg += `\n\nCliente: ${selectedCustomer.name}`;
        if (debtAmount > 0) {
          confirmMsg += `\nEntrega: $${entregaValue.toFixed(2)}`;
          confirmMsg += `\nA cuenta corriente: $${debtAmount.toFixed(2)}`;
        }
      }

      alert(confirmMsg);

      setCart([]);
      setInputQty("");
      setPayments([]);
      setDiscountPercent("");
      setEntrega("");
      setPaymentModalOpen(false);
      fetchProducts();
      // Refresh customers to update balances
      fetchCustomers();
    } catch (err) {
      console.error("Error registrando venta", err);
      const errorMsg = err?.response?.data?.message || "No se pudo registrar la venta.";
      setError(errorMsg);
      alert("Error: " + errorMsg);
    } finally {
      setSavingSale(false);
    }
  };

  // ===== RENDER =====

  return (
    <div className="pos-layout">
      {/* CARRITO */}
      <section className="pos-cart">
        <div className="pos-cart-header">
          <div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Cliente</div>
            <div style={{ fontSize: 15 }}>
              {selectedCustomer ? selectedCustomer.name : "Consumidor final"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {selectedCustomer && (
              <button
                onClick={clearCustomer}
                style={{
                  fontSize: 11,
                  borderRadius: 999,
                  padding: "4px 8px",
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer"
                }}
              >
                Quitar
              </button>
            )}
            <button
              onClick={openCustomerSelector}
              style={{
                fontSize: 11,
                borderRadius: 999,
                padding: "4px 10px",
                border: "1px solid #38bdf8",
                background: "transparent",
                color: "#38bdf8",
                cursor: "pointer"
              }}
            >
              Cambiar
            </button>
            <button
              onClick={clearCart}
              style={{
                fontSize: 11,
                borderRadius: 999,
                padding: "4px 10px",
                border: "1px solid #374151",
                background: "transparent",
                color: "#9ca3af",
                cursor: "pointer"
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="pos-cart-items">
          {cart.length === 0 && (
            <div className="pos-cart-empty">
              No hay productos en el carrito. Seleccioná desde la grilla 👇
            </div>
          )}

          {cart.map((item) => {
            const itemKey = getCartKey(item);
            const isSelected = selectedCartKey === itemKey;
            return (
            <div
              key={itemKey}
              onClick={() => {
                setSelectedCartKey(isSelected ? null : itemKey);
                setKeypadMode("qty");
                setInputQty("");
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: 12,
                cursor: "pointer",
                background: item.promotionId ? "#fef3c7" : "color-mix(in srgb, var(--primary) 10%, white)",
                border: isSelected
                  ? "2px solid var(--primary)"
                  : item.promotionId ? "1px solid #eab308" : "1px solid var(--border-subtle)",
                boxShadow: isSelected ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
                transition: "box-shadow 0.15s, border 0.15s"
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: item.promotionId ? "#1f2937" : "var(--text-main)", fontWeight: 600 }}>
                  {item.name}
                  {item.promotionId && <span style={{ fontSize: 10, marginLeft: 6, color: "#d97706" }}>🎁</span>}
                </div>
                <div style={{ fontSize: 11, color: item.promotionId ? "#6b7280" : "var(--text-soft)" }}>
                  x{item.qty} · ${item.price.toLocaleString("es-AR")}
                  {item.promotionName && <span style={{ marginLeft: 4 }}>({item.promotionName})</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: item.promotionId ? "#d97706" : "var(--primary)" }}>
                  ${(item.price * item.qty).toLocaleString("es-AR")}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.productId, item.promotionId || null); if (selectedCartKey === itemKey) setSelectedCartKey(null); }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: item.promotionId ? "#d97706" : "#6b7280",
                    cursor: "pointer",
                    fontSize: 16
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <div className="pos-cart-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="pos-total-label" style={{ margin: 0 }}>Total ({cart.reduce((s, i) => s + i.qty, 0)} items)</div>
            <div className="pos-total-value" style={{ margin: 0, fontSize: 22 }}>${subtotal.toLocaleString("es-AR")}</div>
          </div>
          {discountValue > 0 && (
            <div style={{ fontSize: 12, color: "#22c55e" }}>
              Desc: {discountValue}% &rarr; ${totalWithDiscount.toFixed(2)}
            </div>
          )}
          
          {payments.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                Pagado: ${totalPaid.toFixed(2)}
              </div>
            </> 
          )}

          {error && (
            <div style={{ fontSize: 11, color: "#f97316", marginTop: 8 }}>
              {error}
            </div>
          )}
        </div> 
      </section>

      {/* KEYPAD + ACCIONES */}
      <section className="pos-center">
        <div>
          <div style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{keypadMode === "price" ? "Precio" : "Cantidad"}</span>
            {selectedCartKey && (
              <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
                {keypadMode === "price" ? "✏️ editando precio" : "ítem seleccionado"}
              </span>
            )}
          </div>
          <input
            type="number"
            min="0"
            value={inputQty || ""}
            onChange={(e) => setInputQty(e.target.value)}
            placeholder={keypadMode === "price" ? "0" : "1"}
            style={{
              width: "100%",
              fontSize: 26,
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: 14,
              background: keypadMode === "price"
                ? "color-mix(in srgb, var(--accent) 8%, white)"
                : "color-mix(in srgb, var(--primary) 8%, white)",
              border: keypadMode === "price"
                ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
                : "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
              color: keypadMode === "price" ? "var(--accent)" : "var(--primary)",
              textAlign: "center"
            }}
          />
        </div>

        {selectedCartKey && (
          <button
            onClick={keypadMode === "price" ? confirmPriceEdit : startPriceEdit}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 10,
              border: keypadMode === "price"
                ? "1px solid color-mix(in srgb, var(--success) 50%, transparent)"
                : "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              background: keypadMode === "price"
                ? "color-mix(in srgb, var(--success) 10%, white)"
                : "color-mix(in srgb, var(--accent) 8%, white)",
              color: keypadMode === "price" ? "var(--success)" : "var(--accent)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {keypadMode === "price" ? "✓ Confirmar precio" : "✏️ Editar precio"}
          </button>
        )}

        <div className="pos-keypad-grid">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button key={n} className="pos-key-btn" onClick={() => handleKeypad(n)}>
              {n}
            </button>
          ))}
          <button className="pos-key-btn" onClick={() => handleKeypad(0)}>
            0
          </button>
          <button className="pos-key-btn danger" onClick={() => handleKeypad("C")}>
            C
          </button>
          {keypadMode === "price" && selectedCartKey ? (
            <button className="pos-key-btn primary" onClick={confirmPriceEdit}>
              OK
            </button>
          ) : (
            <button
              className="pos-key-btn primary"
              onClick={openPaymentModal}
              disabled={!cart.length}
            >
              Cobrar
            </button>
          )}
        </div>
      </section> 

      {/* GRID PRODUCTOS */}
      <section className="pos-right">
        <div className="pos-search">
          <input
            placeholder="Buscar producto o escanear código..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim() && categoryFilter === "promociones") {
                setCategoryFilter("all");
              }
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {scanFeedback && (
            <div style={{ fontSize: 12, color: "var(--success)", padding: "4px 2px", fontWeight: 600 }}>
              ✓ {scanFeedback} agregado
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {PRODUCT_CATEGORIES.map((category) => {
            const active = categoryFilter === category.value;
            const isPromo = category.value === "promociones";
            const activeColor = isPromo ? "#d97706" : "#38bdf8";
            const activeBg = isPromo ? "rgba(245,158,11,0.15)" : "rgba(56,189,248,0.15)";
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setCategoryFilter(category.value)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 999,
                  border: active ? `1px solid ${activeColor}` : "1px solid #1f2937",
                  background: active ? activeBg : "transparent",
                  color: active ? activeColor : "#9ca3af",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: isPromo ? 600 : 400,
                }}
              >
                {isPromo ? "🏷️ " : ""}{category.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {PRODUCT_DEPARTMENTS.map((department) => {
            const active = departmentFilter === department.value;
            return (
              <button
                key={department.value}
                type="button"
                onClick={() => setDepartmentFilter(department.value)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 999,
                  border: active ? "1px solid #22c55e" : "1px solid #1f2937",
                  background: active ? "rgba(34, 197, 94, 0.15)" : "transparent",
                  color: active ? "#22c55e" : "#9ca3af",
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                {department.label}
              </button>
            );
          })}
        </div>

        <div className="pos-products-grid">
          {showingPromos ? (
            filteredPromotions.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 14, gridColumn: "1/-1" }}>
                No hay promociones activas.
              </div>
            ) : (
              filteredPromotions.map((promo) => {
                const totalPrice = calcPromoPrice(promo);
                return (
                  <div
                    key={promo.id}
                    className="pos-product-card pos-promo-card"
                    onClick={() => addPromotionToCart(promo)}
                  >
                    <div className="pos-product-tag pos-promo-tag">
                      {promo.type === "combo" ? "🎁 Combo" : "⚡ Liquidación"}
                    </div>
                    <div className="pos-product-name">{promo.name}</div>
                    <div className="pos-product-price">
                      ${Number(totalPrice).toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                      {promo.items.map(i => `${i.product_name} x${i.qty}`).join(" · ")}
                    </div>
                    {promo.discount_percent > 0 && (
                      <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>
                        {promo.discount_percent}% descuento
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : loadingProducts ? (
            <div style={{ color: "#9ca3af", fontSize: 14 }}>Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 14 }}>No se encontraron productos.</div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="pos-product-card"
                onClick={() => addToCart(p)}
                style={{
                  opacity: p.stock <= 0 ? 0.5 : 1,
                  cursor: p.stock <= 0 ? "not-allowed" : "pointer"
                }}
              >
                <div className="pos-product-tag">
                  {getCategoryLabel(p.category)} · {p.department || "ropa"}
                </div>
                <div className="pos-product-name">{p.name}</div>
                <div className="pos-product-price">
                  ${Number(p.price).toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {(p.brand || "-") + " / " + (p.model || "-")}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  Stock: {p.stock}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL CLIENTE */}
      {customerModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Seleccionar cliente</h3>
            <input
              style={{
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #4b5563",
                background: "#020817",
                color: "#e5e7eb",
                fontSize: 13,
                width: "100%"
              }}
              placeholder="Buscar..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              {filteredCustomers.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 2px" }}>
                  No se encontraron clientes.
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => chooseCustomer(c)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 10,
                      border: "1px solid #d6cfc7",
                      background: "#f5f0eb",
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    <div>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {c.document || c.phone || "Sin datos"}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setCustomerModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGOS */}
      {paymentModalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 420, padding: "18px 16px", gap: 10 }}>
            <h3 style={{ color: "#16a34a", textAlign: "center", margin: 0, fontSize: 16 }}>Metodos de pago</h3>

            {/* Resumen compacto */}
            <div style={{ background: "#f5f0eb", border: "1px solid #e8e0d8", padding: "10px 12px", borderRadius: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#6b5e52" }}>Total a cobrar:</span>
                <span style={{ fontWeight: 700, color: "#1e1b4b" }}>${totalWithDiscount.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6b5e52" }}>Descuento:</span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>{discountValue.toFixed(2)}%</span>
                </div>
              )}
              {selectedCustomer && entregaValue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6b5e52" }}>Entrega:</span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>${entregaValue.toFixed(2)}</span>
                </div>
              )}
              {selectedCustomer && debtToAccount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6b5e52" }}>A cta. corriente:</span>
                  <span style={{ fontWeight: 600, color: "#dc2626" }}>${debtToAccount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b5e52" }}>Pagado:</span>
                <span style={{ fontWeight: 700, color: "#16a34a" }}>${totalPaid.toFixed(2)}</span>
              </div>
            </div>

            {/* Descuento + Entrega en una fila */}
            <div style={{ display: "grid", gridTemplateColumns: selectedCustomer ? "1fr 1fr" : "1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Descuento %</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #d6cfc7", background: "#f5f0eb", color: "#1e1b4b", fontSize: 13 }}
                />
              </div>
              {selectedCustomer && (
                <div>
                  <div style={{ fontSize: 11, color: "#92400e", marginBottom: 3 }}>
                    Entrega $ <span style={{ color: "#9ca3af", fontWeight: 400 }}>({selectedCustomer.name})</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalWithDiscount}
                    placeholder="0.00"
                    value={entrega}
                    onChange={(e) => { setEntrega(e.target.value); setPayments([]); }}
                    style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #d6cfc7", background: "#fff", color: "#1e1b4b", fontSize: 14, fontWeight: 600 }}
                  />
                </div>
              )}
            </div>

            {/* Info cuenta corriente */}
            {selectedCustomer && (
              <div style={{ fontSize: 11, color: "#78716c", lineHeight: 1.4 }}>
                {selectedCustomer.balance > 0 && (
                  <span style={{ color: "#dc2626" }}>Deuda actual: ${Number(selectedCustomer.balance).toLocaleString("es-AR")} | </span>
                )}
                {debtToAccount > 0 ? (
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>Queda en cta. cte.: ${debtToAccount.toFixed(2)}</span>
                ) : (
                  <span style={{ color: "#16a34a" }}>Pago completo</span>
                )}
              </div>
            )}

            {/* Metodo de pago */}
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Metodo de pago</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                <select
                  value={currentPayment.method}
                  onChange={(e) => setCurrentPayment({ ...currentPayment, method: e.target.value })}
                  style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #d6cfc7", background: "#f5f0eb", color: "#1e1b4b", fontSize: 13 }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                  ))}
                </select>
                <button onClick={addPayment} className="save" style={{ padding: "7px 14px", fontSize: 13 }}>
                  Agregar
                </button>
              </div>
            </div>

            {/* Pagos agregados */}
            {payments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", background: "#f5f0eb", borderRadius: 8, border: "1px solid #d6cfc7", fontSize: 13 }}>
                    <span><strong>{p.methodLabel}</strong> — ${p.amount.toFixed(2)}</span>
                    <button onClick={() => removePayment(i)} style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button className="save" onClick={handlePay} disabled={savingSale}>
                {savingSale ? "Procesando..." : "Confirmar venta"}
              </button>
              <button className="cancel" onClick={() => setPaymentModalOpen(false)} disabled={savingSale}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
