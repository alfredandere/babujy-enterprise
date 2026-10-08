import { Routes, Route, NavLink } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api';

function App() {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const refreshProducts = useCallback(async () => {
    let productData;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      productData = data;
      setFeatured(data.filter(product => product.featured));
    } else {
      const [productsResponse, featuredResponse] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/products/featured`)
      ]);
      if (!productsResponse.ok || !featuredResponse.ok) {
        throw new Error('Could not load products from the store.');
      }
      const [catalog, featuredCatalog] = await Promise.all([
        productsResponse.json(),
        featuredResponse.json()
      ]);
      productData = catalog;
      setFeatured(featuredCatalog);
    }
    setProducts(productData);
    setCatalogError('');
  }, []);

  useEffect(() => {
    refreshProducts().catch(error => {
      console.error('Product catalog loading failed:', error);
      setCatalogError('Products could not be loaded. Please refresh the page.');
    });
  }, [refreshProducts]);

  const addToCart = (product) => {
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        return current.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(current => current.filter(item => item.id !== productId));
  };

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const clothingProducts = useMemo(
    () => products.filter(product => product.category !== 'Nutrition'),
    [products]
  );
  const featuredClothing = useMemo(
    () => featured.filter(product => product.category !== 'Nutrition'),
    [featured]
  );

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">B</div>
          <div>
            <h1>Babujy Enterprise</h1>
          </div>
        </div>

        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/nutrition">Nutrition</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>

        <a className="support-link" href="tel:+254111888259">Support: +254111888259</a>
        <NavLink className="cart-pill" to="/cart">
          <span>Cart</span>
          <strong>{totalItems}</strong>
        </NavLink>
      </header>

      <Routes>
        <Route path="/" element={<HomePage products={clothingProducts} featured={featuredClothing} addToCart={addToCart} />} />
        <Route path="/nutrition" element={<NutritionPage products={products.filter(product => product.category === 'Nutrition')} addToCart={addToCart} />} />
        <Route path="/contact" element={<ContactPage onPayForService={() => setPaymentOpen(true)} />} />
        <Route path="/admin" element={<AdminPage products={products} onProductsChanged={refreshProducts} />} />
        <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} totalPrice={totalPrice} onCheckout={() => setPaymentOpen(true)} />} />
      </Routes>
      {catalogError && <p className="catalog-error" role="alert">{catalogError}</p>}

      <aside className="floating-cart">
        <div className="mini-header">
          <h3>Shopping Cart</h3>
          <NavLink to="/cart">View cart</NavLink>
        </div>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          cart.map(item => (
            <div key={item.id} className="mini-item">
              <div>
                <strong>{item.name}</strong>
                <span>Qty: {item.quantity}</span>
              </div>
              <span>KSh {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))
        )}
        <div className="mini-total">
          <span>Total</span>
          <strong>KSh {totalPrice.toLocaleString()}</strong>
        </div>
      </aside>
      {paymentOpen && <PaymentModal totalPrice={totalPrice} onClose={() => setPaymentOpen(false)} />}
    </div>
  );
}

function HomePage({ products, featured, addToCart }) {
  return (
    <main className="content home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">NEW SEASON</p>
          <h2>Little looks. Big comfort.</h2>
          <p>
            Shop children’s clothing and cosy pullnecks for every day. Find family nutrition products in our dedicated wellness collection.
          </p>
          <div className="cta-row">
            <a href="#shop" className="primary-btn">Shop now</a>
            <NavLink to="/contact" className="secondary-btn">Contact</NavLink>
          </div>
        </div>
        <div className="hero-visual">
          <img src="https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80" alt="Children's clothing collection" />
        </div>
      </section>

      <section className="features-grid">
        <div><h3>Made for little ones</h3><p>Comfortable children's styles</p></div>
        <div><h3>Easy Returns</h3><p>30-day guarantee</p></div>
        <div><h3>Local support</h3><p>Call +254111888259</p></div>
      </section>

      <section className="product-section" id="shop">
        <div className="section-header">
          <div>
            <p className="eyebrow">For the little ones</p>
            <h3>Kidswear &amp; Pullnecks</h3>
          </div>
        </div>

        <ProductGrid products={featured} addToCart={addToCart} />
      </section>

      <section className="full-width-banner">
        <div>
          <p className="eyebrow">A little more to love</p>
          <h3>Soft layers, happy little days.</h3>
        </div>
      </section>

      <section className="product-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">More styles</p>
            <h3>Children’s Clothing &amp; Pullnecks</h3>
          </div>
        </div>

        <ProductGrid products={products} addToCart={addToCart} />
      </section>
    </main>
  );
}

function NutritionPage({ products, addToCart }) {
  return (
    <main className="content">
      <section className="nutrition-hero">
        <p className="eyebrow">Babujy Nutrition</p>
        <h2>Everyday nutrition for the whole family.</h2>
        <p>Explore our nutrition collection and find products to support your everyday wellbeing.</p>
      </section>
      <ProductGrid products={products} addToCart={addToCart} />
    </main>
  );
}

function ProductGrid({ products, addToCart }) {
  if (products.length === 0) {
    return <p className="empty-products">Products are loading. Please refresh if they do not appear.</p>;
  }

  return (
    <div className="product-grid nutrition-products">
      {products.map(product => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <div className="product-body">
            <span className="category-tag">{product.category}</span>
            <h4>{product.name}</h4>
            <p>{product.description}</p>
            <div className="price-row">
              <strong>KSh {product.price.toLocaleString()}</strong>
              <button onClick={() => addToCart(product)}>Add to cart</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactPage({ onPayForService }) {
  const [sending, setSending] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSending(true);
    setSubmissionMessage('');
    setSubmissionError('');

    try {
      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message')
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Your message could not be sent.');
      setSubmissionMessage(result.message);
      form.reset();
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setSubmissionError(error.message || 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="content form-page">
      <div className="panel contact-panel">
        <h2>Contact Us</h2>
        <p>Have a question or partnership request? Send us a message.</p>

        <form className="stacked-form" onSubmit={handleContactSubmit} aria-busy={sending}>
          <input type="text" name="name" placeholder="Full name" required />
          <input type="email" name="email" placeholder="Email address" required />
          <input type="text" name="subject" placeholder="Subject" required />
          <textarea rows="5" name="message" placeholder="Your message" required />
          <button type="submit" className="primary-btn" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>
        {submissionMessage && <p className="message-box" role="status">{submissionMessage}</p>}
        {submissionError && <p className="message-box error-message" role="alert">{submissionError}</p>}
      </div>

      <div className="panel info-panel">
        <h3>Get in touch</h3>
        <ul>
          <li>Email: <a href="mailto:babujy13@gmail.com">babujy13@gmail.com</a></li>
          <li>Customer support: <a href="tel:+254111888259">+254111888259</a></li>
          <li>Payment: Paybill 247247, account 0706313599</li>
        </ul>
        <button className="primary-btn" type="button" onClick={onPayForService}>Pay for a service</button>
      </div>
    </main>
  );
}

function AdminPage({ products, onProductsChanged }) {
  const [email, setEmail] = useState('babujy13@gmail.com');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch(error => {
      setAuthError(error.message);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAdmin(false);
      setAuthError('');
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(`Could not verify admin access: ${error.message}`);
        setIsAdmin(Boolean(data));
      })
      .catch(error => {
        if (active) setAuthError(`Could not verify admin access: ${error.message}`);
      });
    return () => { active = false; };
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setWorking(true);
    setAuthError('');
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword('');
      setMessage('Signed in. Verifying administrator access…');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setWorking(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!supabase || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid administrator email address first.');
      return;
    }
    setWorking(true);
    setAuthError('');
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`
      });
      if (error) throw error;
      setMessage('If that address belongs to an admin account, a secure password-reset link has been emailed.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setWorking(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (newPassword.length < 10) {
      setAuthError('Use at least 10 characters for the new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('The new passwords do not match.');
      return;
    }
    setWorking(true);
    setAuthError('');
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setWorking(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setAuthError(`Could not sign out: ${error.message}`);
    }
  };

  const updateProductField = (event) => {
    const { name, value, checked, type } = event.target;
    setProductForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file && (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setImageFile(null);
      event.target.value = '';
      setAuthError('Choose an image file no larger than 5 MB.');
      return;
    }
    setAuthError('');
    setImageFile(file);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setWorking(true);
    setAuthError('');
    setMessage('');
    try {
      let image = productForm.image.trim();
      if (imageFile) {
        const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'image';
        const imagePath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath);
        image = data.publicUrl;
      }

      const record = {
        name: productForm.name.trim(),
        category: productForm.category,
        price: Number(productForm.price),
        image,
        description: productForm.description.trim(),
        featured: productForm.featured
      };
      const result = editingProduct
        ? await supabase.from('products').update(record).eq('id', editingProduct.id)
        : await supabase.from('products').insert(record);
      if (result.error) throw result.error;

      await onProductsChanged();
      setProductForm(emptyProduct());
      setEditingProduct(null);
      setImageFile(null);
      setMessage(editingProduct ? 'Product updated.' : 'Product added.');
    } catch (error) {
      setAuthError(`Product could not be saved: ${error.message}`);
    } finally {
      setWorking(false);
    }
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      image: product.image || '',
      description: product.description || '',
      featured: Boolean(product.featured)
    });
    setImageFile(null);
    setMessage('');
    setAuthError('');
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}" from the catalog?`)) return;
    setWorking(true);
    setAuthError('');
    setMessage('');
    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
      await onProductsChanged();
      setMessage(`${product.name} deleted.`);
    } catch (error) {
      setAuthError(`Product could not be deleted: ${error.message}`);
    } finally {
      setWorking(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <main className="content form-page admin-login-page">
        <div className="panel auth-panel">
          <h2>Admin setup required</h2>
          <p>Configure the Supabase project URL and public anon key for the storefront before signing in to admin.</p>
        </div>
      </main>
    );
  }

  if (authLoading) {
    return <main className="content"><div className="panel"><p>Checking admin session…</p></div></main>;
  }

  if (!session || !isAdmin) {
    return (
      <main className="content form-page admin-login-page">
        <div className="panel auth-panel">
          <p className="eyebrow">Store administration</p>
          <h2>{session ? 'Administrator access required' : 'Admin Login'}</h2>
          {session ? (
            <>
              <p>This signed-in account is not authorized to manage the store.</p>
              <button type="button" className="secondary-btn" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <form className="stacked-form" onSubmit={handleLogin}>
              <label htmlFor="admin-email">Admin email</label>
              <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" />
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
              <button type="submit" className="primary-btn" disabled={working}>{working ? 'Signing in…' : 'Login'}</button>
              <button type="button" className="text-button" disabled={working} onClick={handlePasswordReset}>Email a password-reset link</button>
            </form>
          )}
          {authError && <p className="message-box error-message" role="alert">{authError}</p>}
          {message && <p className="message-box" role="status">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="content admin-page">
      <section className="panel admin-heading">
        <div>
          <p className="eyebrow">Store administration</p>
          <h2>Admin dashboard</h2>
          <p>Signed in as {session.user.email}</p>
        </div>
        <button type="button" className="secondary-btn" onClick={handleLogout}>Sign out</button>
      </section>

      <section className="stats-grid admin-stats">
        <div className="stat-card"><span>Products in catalog</span><strong>{products.length}</strong></div>
        <div className="stat-card"><span>Featured products</span><strong>{products.filter(product => product.featured).length}</strong></div>
      </section>

      <section className="panel product-manager">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h3>{editingProduct ? 'Edit product' : 'Add a product'}</h3>
          </div>
        </div>
        <form className="product-editor" onSubmit={saveProduct}>
          <label>Product name<input name="name" required maxLength="120" value={productForm.name} onChange={updateProductField} /></label>
          <label>Category
            <select name="category" value={productForm.category} onChange={updateProductField}>
              <option>Kids Wear</option><option>Pullnecks</option><option>Nutrition</option>
            </select>
          </label>
          <label>Price (KSh)<input name="price" type="number" min="1" step="1" required value={productForm.price} onChange={updateProductField} /></label>
          <label>Product image URL<input name="image" type="url" value={productForm.image} onChange={updateProductField} placeholder="https://…" /></label>
          <label className="image-upload">Or upload an image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} />{imageFile && <span>{imageFile.name}</span>}</label>
          <label className="product-description">Description<textarea name="description" rows="3" maxLength="500" value={productForm.description} onChange={updateProductField} /></label>
          <label className="featured-toggle"><input name="featured" type="checkbox" checked={productForm.featured} onChange={updateProductField} /> Show in featured collection</label>
          <div className="product-editor-actions">
            <button type="submit" className="primary-btn" disabled={working}>{working ? 'Saving…' : editingProduct ? 'Save changes' : 'Add product'}</button>
            {editingProduct && <button type="button" className="secondary-btn" onClick={() => { setEditingProduct(null); setProductForm(emptyProduct()); setImageFile(null); }}>Cancel edit</button>}
          </div>
        </form>
        {authError && <p className="message-box error-message" role="alert">{authError}</p>}
        {message && <p className="message-box" role="status">{message}</p>}
      </section>

      <section className="panel product-manager">
        <div className="admin-section-heading">
          <div><p className="eyebrow">Inventory</p><h3>Manage products</h3></div>
        </div>
        <div className="admin-product-list">
          {products.map(product => (
            <article className="admin-product-row" key={product.id}>
              <img src={product.image} alt="" />
              <div className="admin-product-details">
                <strong>{product.name}</strong>
                <span>{product.category} · KSh {Number(product.price).toLocaleString()}</span>
                {product.featured && <span className="featured-label">Featured</span>}
              </div>
              <div className="admin-product-actions">
                <button type="button" className="secondary-btn" onClick={() => editProduct(product)}>Edit</button>
                <button type="button" className="danger-btn" disabled={working} onClick={() => deleteProduct(product)}>Delete</button>
              </div>
            </article>
          ))}
          {products.length === 0 && <p>No products yet. Add the first item above.</p>}
        </div>
      </section>

      <section className="panel password-panel">
        <p className="eyebrow">Account security</p>
        <h3>Change admin password</h3>
        <form className="password-form" onSubmit={handlePasswordChange}>
          <label>New password<input type="password" autoComplete="new-password" minLength="10" required value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength="10" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
          <button type="submit" className="primary-btn" disabled={working}>{working ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>

      <p className="admin-notice">Orders and revenue reports are not available yet because checkout currently uses manual M-PESA payment instructions and does not create stored orders.</p>
    </main>
  );
}

function emptyProduct() {
  return { name: '', category: 'Kids Wear', price: '', image: '', description: '', featured: false };
}

function CartPage({ cart, removeFromCart, totalPrice, onCheckout }) {
  return (
    <main className="content cart-page">
      <div className="panel cart-panel">
        <h2>Your Shopping Cart</h2>
        {cart.length === 0 ? (
          <p>No items in cart.</p>
        ) : (
          <div className="cart-list">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-left">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.category}</p>
                  </div>
                </div>
                <div className="cart-right">
                  <strong>KSh {(item.price * item.quantity).toLocaleString()}</strong>
                  <span>Qty: {item.quantity}</span>
                  <button onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel summary-panel">
        <h3>Order Summary</h3>
        <div className="summary-row"><span>Subtotal</span><strong>KSh {totalPrice.toLocaleString()}</strong></div>
        <div className="summary-row"><span>Shipping</span><strong>Free</strong></div>
        <div className="summary-row total"><span>Total</span><strong>KSh {totalPrice.toLocaleString()}</strong></div>
        <button className="primary-btn full-width" onClick={onCheckout} disabled={cart.length === 0}>Checkout &amp; pay</button>
      </div>
    </main>
  );
}

function PaymentModal({ totalPrice, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        onClick={event => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close payment details" onClick={onClose}>×</button>
        <p className="eyebrow">Secure your order</p>
        <h2 id="payment-title">Pay via M-PESA</h2>
        <p>Use the details below to complete your payment{totalPrice > 0 ? ` of KSh ${totalPrice.toLocaleString()}` : ''}.</p>
        <div className="payment-detail">
          <span>PAY VIA PAYBILL</span>
          <strong>247247</strong>
        </div>
        <div className="payment-detail">
          <span>ACCOUNT NO</span>
          <strong>0706313599</strong>
        </div>
        <p className="payment-support">Need help? Call <a href="tel:+254111888259">+254111888259</a></p>
        <button className="primary-btn full-width" type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  );
}

export default App;
