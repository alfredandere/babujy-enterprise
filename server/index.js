const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.get('/', (req, res) => {
  res.redirect(302, 'https://www.babujyenterprise.co.ke/');
});

const products = [
  {
    id: 1,
    name: 'Little Explorer Hoodie',
    category: 'Kids Wear',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80',
    featured: true,
    description: 'A cosy everyday hoodie for little adventures.'
  },
  {
    id: 2,
    name: 'Everyday Kids Pullneck',
    category: 'Pullnecks',
    price: 2200,
    image: 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80',
    featured: true,
    description: 'A soft, warm pullneck made for school days and weekends.'
  },
  {
    id: 3,
    name: 'Colour Pop Kids Set',
    category: 'Kids Wear',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80',
    featured: true,
    description: 'A playful, comfortable outfit set for everyday wear.'
  },
  {
    id: 4,
    name: 'Classic Ribbed Pullneck',
    category: 'Pullnecks',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80',
    featured: true,
    description: 'A timeless ribbed knit layer with a comfortable fit.'
  },
  {
    id: 5,
    name: 'Mini Weekend Outfit',
    category: 'Kids Wear',
    price: 2100,
    image: 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80',
    featured: false,
    description: 'An easy-to-style outfit for little ones on the go.'
  },
  {
    id: 6,
    name: 'Junior Growth Blend',
    category: 'Nutrition',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    featured: false,
    description: 'A carefully selected nutrition product for family wellbeing.'
  },
  {
    id: 7,
    name: 'Daily Wellness Mix',
    category: 'Nutrition',
    price: 2600,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80',
    featured: false,
    description: 'A convenient daily nutrition blend for a balanced routine.'
  },
  {
    id: 8,
    name: 'Cozy Stripe Pullneck',
    category: 'Pullnecks',
    price: 2400,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
    featured: false,
    description: 'A soft striped pullneck that layers easily through the season.'
  }
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Babujy Enterprise API is running' });
});

app.post('/api/contact', async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return res.status(503).json({
      message: 'Contact email is not configured yet. Please email babujy13@gmail.com directly.'
    });
  }

  const { name, email, subject, message } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof subject !== 'string' ||
    typeof message !== 'string'
  ) {
    return res.status(400).json({ message: 'Please complete all contact form fields.' });
  }

  const contact = {
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim()
  };
  if (
    !contact.name ||
    contact.name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ||
    contact.email.length > 254 ||
    !contact.subject ||
    contact.subject.length > 200 ||
    !contact.message ||
    contact.message.length > 5000
  ) {
    return res.status(400).json({ message: 'Please check the contact details and try again.' });
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: ['babujy13@gmail.com'],
        reply_to: contact.email,
        subject: `Website contact: ${contact.subject}`,
        text: `Name: ${contact.name}\nReply email: ${contact.email}\n\n${contact.message}`
      })
    });

    if (!resendResponse.ok) {
      const errorDetails = await resendResponse.text();
      console.error(`Resend rejected contact email (${resendResponse.status}): ${errorDetails}`);
      return res.status(502).json({
        message: 'Your message could not be delivered right now. Please try again or email babujy13@gmail.com directly.'
      });
    }

    return res.status(200).json({ message: 'Your message has been sent. Thank you for contacting us.' });
  } catch (error) {
    console.error('Contact email delivery failed:', error);
    return res.status(502).json({
      message: 'Your message could not be delivered right now. Please try again or email babujy13@gmail.com directly.'
    });
  }
});

app.get('/api/products', (req, res) => {
  const category = req.query.category;
  res.json(category ? products.filter(product => product.category === category) : products);
});

app.get('/api/products/featured', (req, res) => {
  res.json(products.filter(product => product.featured));
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = products.find(item => item.id === id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json(product);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Babujy Enterprise backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
