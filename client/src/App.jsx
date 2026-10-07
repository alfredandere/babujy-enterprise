import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api';

function App() {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [cart, setCart] = useState([]);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(data => setProducts(data));

    fetch(`${API_BASE}/products/featured`)
      .then(res => res.json())
      .then(data => setFeatured(data));
  }, []);

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
        <Route path="/admin" element={<AdminPage setAdminLoggedIn={setAdminLoggedIn} adminLoggedIn={adminLoggedIn} />} />
        <Route path="/cart" element={<CartPage cart={cart} removeFromCart={removeFromCart} totalPrice={totalPrice} onCheckout={() => setPaymentOpen(true)} />} />
      </Routes>

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
            <a href="/contact" className="secondary-btn">Contact</a>
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
  return (
    <main className="content form-page">
      <div className="panel contact-panel">
        <h2>Contact Us</h2>
        <p>Have a question or partnership request? Send us a message.</p>

        <form className="stacked-form">
          <input type="text" placeholder="Full name" />
          <input type="email" placeholder="Email address" />
          <input type="text" placeholder="Subject" />
          <textarea rows="5" placeholder="Your message" />
          <button type="button" className="primary-btn">Send message</button>
        </form>
      </div>

      <div className="panel info-panel">
        <h3>Get in touch</h3>
        <ul>
          <li>Email: hello@babujyenterprise.com</li>
          <li>Customer support: <a href="tel:+254111888259">+254111888259</a></li>
          <li>Payment: Paybill 247247, account 0706313599</li>
        </ul>
        <button className="primary-btn" type="button" onClick={onPayForService}>Pay for a service</button>
      </div>
    </main>
  );
}

function AdminPage({ setAdminLoggedIn, adminLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (adminLoggedIn) {
      fetch(`${API_BASE}/admin/stats`)
        .then(res => res.json())
        .then(data => setStats(data));
    }
  }, [adminLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      setAdminLoggedIn(true);
      setMessage('Welcome back, admin.');
    } else {
      setAdminLoggedIn(false);
      setMessage(data.message || 'Login failed');
    }
  };

  if (!adminLoggedIn) {
    return (
      <main className="content form-page">
        <div className="panel auth-panel">
          <h2>Admin Login</h2>
          <form className="stacked-form" onSubmit={handleLogin}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            <button type="submit" className="primary-btn">Login</button>
          </form>
          {message && <p className="message-box">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="content admin-page">
      <div className="panel">
        <h2>Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Total Products</span><strong>{stats?.totalProducts ?? 0}</strong></div>
          <div className="stat-card"><span>Earnings</span><strong>KSh {(stats?.totalRevenue ?? 0).toLocaleString()}</strong></div>
          <div className="stat-card"><span>Orders</span><strong>{stats?.orders ?? 0}</strong></div>
          <div className="stat-card"><span>Customers</span><strong>{stats?.customers ?? 0}</strong></div>
        </div>
      </div>

      <div className="panel">
        <h3>Admin Controls</h3>
        <ul className="admin-list">
          <li>Manage products</li>
          <li>Review customer orders</li>
          <li>Monitor sales reports</li>
        </ul>
      </div>
    </main>
  );
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
