import { Review, Product } from '../types';

export const sampleReviewPoolByCategory: Record<string, Omit<Review, 'id'>[]> = {
  grocery: [
    {
      author: "Pooja Sharma",
      rating: 5,
      date: "2 days ago",
      title: "Super fresh & authentic quality!",
      comment: "The quality is unmatched! The rotis came out so soft and fluffy. Packaging was completely vacuum-sealed and clean. Will order monthly in bulk for my family.",
      verifiedPurchase: true,
      location: "Jaipur, Rajasthan",
      helpfulCount: 42,
      images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Rajesh Kulkarni",
      rating: 5,
      date: "5 days ago",
      title: "100% genuine product at wholesale price",
      comment: "Delivered within 2 days in mint condition. No adulteration, pure aroma. Much cheaper than local supermarket retail price.",
      verifiedPurchase: true,
      location: "Pune, Maharashtra",
      helpfulCount: 28
    },
    {
      author: "Sunita Verma",
      rating: 4,
      date: "1 week ago",
      title: "Good texture and great packaging",
      comment: "Very good quality. Used it daily for breakfast cooking and everyone at home loved it. Highly recommended for daily household use.",
      verifiedPurchase: true,
      location: "Lucknow, Uttar Pradesh",
      helpfulCount: 15
    },
    {
      author: "Amit Patel",
      rating: 5,
      date: "2 weeks ago",
      title: "Best value for money",
      comment: "I have been reselling this to my apartment society members and everyone is giving repeat orders. Great profit margin and premium quality!",
      verifiedPurchase: true,
      location: "Ahmedabad, Gujarat",
      helpfulCount: 36,
      images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Meera Nair",
      rating: 4,
      date: "3 weeks ago",
      title: "Satisfied with the purchase",
      comment: "Neat packaging, long expiry date, and prompt delivery. Good experience overall.",
      verifiedPurchase: true,
      location: "Kochi, Kerala",
      helpfulCount: 9
    },
    {
      author: "Kavita Shinde",
      rating: 5,
      date: "1 week ago",
      title: "Fresh stock every single time",
      comment: "Been ordering every week for my tiffin service and the freshness never drops. Fully sealed, properly packed and on-time delivery.",
      verifiedPurchase: true,
      location: "Nashik, Maharashtra",
      helpfulCount: 33
    },
    {
      author: "Arjun Mehta",
      rating: 4,
      date: "2 weeks ago",
      title: "Great taste, decent delivery time",
      comment: "Taste and quality are top notch. Delivery took a day longer than expected but the packaging made up for it.",
      verifiedPurchase: true,
      location: "Surat, Gujarat",
      helpfulCount: 11
    },
    {
      author: "Neha Kapoor",
      rating: 5,
      date: "4 days ago",
      title: "Wholesale shoppers, this is a must",
      comment: "I run a small grocery shop and this works perfectly for reselling. Consistent quality and fantastic profit margin on every pack.",
      verifiedPurchase: true,
      location: "Indore, Madhya Pradesh",
      helpfulCount: 47,
      images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Sanjay Tiwari",
      rating: 4,
      date: "3 weeks ago",
      title: "Value for money",
      comment: "Better price than my local market and the quality is on par. Will definitely order again for the whole month.",
      verifiedPurchase: true,
      location: "Varanasi, Uttar Pradesh",
      helpfulCount: 14
    },
    {
      author: "Divya Pillai",
      rating: 5,
      date: "2 days ago",
      title: "Excellent experience overall",
      comment: "Ordered for the third time now. Fresh, well packed, exactly as described on the listing. Highly recommended.",
      verifiedPurchase: true,
      location: "Thiruvananthapuram, Kerala",
      helpfulCount: 26
    }
  ],
  kitchen: [
    {
      author: "Anjali Gupta",
      rating: 5,
      date: "3 days ago",
      title: "Premium finish & truly non-stick!",
      comment: "Cooked dosas, omelettes and curry without any oil sticking to the base. The heavy gauge base distributes heat evenly and handles stay cool.",
      verifiedPurchase: true,
      location: "New Delhi",
      helpfulCount: 54,
      images: ["https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Vikram Malhotra",
      rating: 5,
      date: "6 days ago",
      title: "Sturdy build and elegant design",
      comment: "Solid weight and scratch-resistant coating. It looks very luxurious on my kitchen countertop. Worth every rupee!",
      verifiedPurchase: true,
      location: "Chandigarh",
      helpfulCount: 31
    },
    {
      author: "Deepika Sen",
      rating: 4,
      date: "1 week ago",
      title: "Easy to clean and great quality",
      comment: "Very easy to clean with mild soap sponge. The lid fits tightly and traps steam well. Happy with the quick delivery.",
      verifiedPurchase: true,
      location: "Kolkata, West Bengal",
      helpfulCount: 19
    },
    {
      author: "Suresh Rao",
      rating: 5,
      date: "2 weeks ago",
      title: "Gifted to my mother, she loved it!",
      comment: "My mother was delighted with the build quality. The induction bottom works seamlessly with both gas stove and induction cooktop.",
      verifiedPurchase: true,
      location: "Bengaluru, Karnataka",
      helpfulCount: 22,
      images: ["https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Rohini Iyer",
      rating: 5,
      date: "5 days ago",
      title: "Better than premium brands",
      comment: "Used expensive branded cookware earlier, but this performs just as well at a fraction of the price. Sturdy and heats evenly.",
      verifiedPurchase: true,
      location: "Chennai, Tamil Nadu",
      helpfulCount: 38
    },
    {
      author: "Manish Agarwal",
      rating: 4,
      date: "1 week ago",
      title: "Solid quality, good looks",
      comment: "Finish quality is impressive. Slightly on the heavier side but that's expected from premium cookware. Happy with the buy.",
      verifiedPurchase: true,
      location: "Jaipur, Rajasthan",
      helpfulCount: 12
    },
    {
      author: "Shruti Kulkarni",
      rating: 5,
      date: "3 days ago",
      title: "Perfect for my catering business",
      comment: "Bought 6 pieces for my catering kitchen. Even heating, easy handling and the coating hasn't worn off after heavy daily use.",
      verifiedPurchase: true,
      location: "Pune, Maharashtra",
      helpfulCount: 51
    },
    {
      author: "Aman Khurana",
      rating: 4,
      date: "2 weeks ago",
      title: "Good product, quick delivery",
      comment: "Delivered in 2 days with proper bubble wrap. Works great on my induction cooktop. Would recommend to friends.",
      verifiedPurchase: true,
      location: "Amritsar, Punjab",
      helpfulCount: 16
    },
    {
      author: "Fatima Shaikh",
      rating: 5,
      date: "6 days ago",
      title: "Just what my kitchen needed",
      comment: "Lightweight, non-stick and so easy to clean. Made my whole cooking routine faster. Absolutely worth the price.",
      verifiedPurchase: true,
      location: "Mumbai, Maharashtra",
      helpfulCount: 29
    }
  ],
  electronics: [
    {
      author: "Rohan Deshmukh",
      rating: 5,
      date: "1 day ago",
      title: "Incredible sound & insane battery life!",
      comment: "The bass is punchy and vocals are crisp. Battery easily lasts 30+ hours on a single charge. Bluetooth pairing was instantaneous with both phone and laptop.",
      verifiedPurchase: true,
      location: "Mumbai, Maharashtra",
      helpfulCount: 67,
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Kavita Reddy",
      rating: 5,
      date: "4 days ago",
      title: "Mic quality is crystal clear for office calls",
      comment: "Noise cancellation blocks out room fan and traffic noise nicely. Very comfortable cushions for long work calls and gaming sessions.",
      verifiedPurchase: true,
      location: "Hyderabad, Telangana",
      helpfulCount: 45
    },
    {
      author: "Nikhil Joshi",
      rating: 4,
      date: "1 week ago",
      title: "Best wireless gadget in this budget",
      comment: "Build quality feels very premium. Fast Type-C charging is super convenient. Highly recommend to students and daily commuters.",
      verifiedPurchase: true,
      location: "Indore, Madhya Pradesh",
      helpfulCount: 18
    },
    {
      author: "Prashant Bhatt",
      rating: 5,
      date: "2 weeks ago",
      title: "Resold 15 units already!",
      comment: "Top selling product in my reseller group! Customers are very satisfied with the audio quality and low latency mode.",
      verifiedPurchase: true,
      location: "Ahmedabad, Gujarat",
      helpfulCount: 29
    },
    {
      author: "Sneha Menon",
      rating: 5,
      date: "2 days ago",
      title: "One word - outstanding",
      comment: "Sound clarity at this price is unbelievable. Perfect for travel and the case fits easily in my bag pocket. 10/10.",
      verifiedPurchase: true,
      location: "Kochi, Kerala",
      helpfulCount: 44
    },
    {
      author: "Varun Reddy",
      rating: 4,
      date: "1 week ago",
      title: "Great battery, great sound",
      comment: "Battery easily lasts me a whole week of daily commutes. Pairing is instant and call quality is clear even on busy roads.",
      verifiedPurchase: true,
      location: "Hyderabad, Telangana",
      helpfulCount: 20
    },
    {
      author: "Ishita Banerjee",
      rating: 5,
      date: "4 days ago",
      title: "Best purchase this year",
      comment: "Gifted these to my brother and he hasn't stopped using them. Comfortable fit, excellent noise isolation and premium feel.",
      verifiedPurchase: true,
      location: "Kolkata, West Bengal",
      helpfulCount: 35
    },
    {
      author: "Gaurav Shah",
      rating: 4,
      date: "2 weeks ago",
      title: "Reliable and well built",
      comment: "Using daily for zoom meetings and workouts. No connectivity drops so far. Minor nitpick - case could be slimmer.",
      verifiedPurchase: true,
      location: "Surat, Gujarat",
      helpfulCount: 13
    },
    {
      author: "Anita Rao",
      rating: 5,
      date: "3 days ago",
      title: "Perfect for resellers",
      comment: "My customers love these, I keep restocking. Great margin, quick delivery and zero defective pieces so far.",
      verifiedPurchase: true,
      location: "Visakhapatnam, Andhra Pradesh",
      helpfulCount: 40
    }
  ],
  makeup: [
    {
      author: "Sneha Mukherjee",
      rating: 5,
      date: "2 days ago",
      title: "Noticeable glow and so gentle on skin!",
      comment: "I have sensitive skin and was skeptical, but this worked like magic! Absorbs quickly, non-greasy, and leaves skin supple with a healthy natural glow.",
      verifiedPurchase: true,
      location: "Kolkata, West Bengal",
      helpfulCount: 58,
      images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=400"]
    },
    {
      author: "Priyanka Joshi",
      rating: 5,
      date: "5 days ago",
      title: "Dermatologically tested feel & lovely scent",
      comment: "Fragrance is mild and soothing. Reduced blemishes within a week of regular application. 100% original verified product.",
      verifiedPurchase: true,
      location: "Nagpur, Maharashtra",
      helpfulCount: 39
    },
    {
      author: "Divya Chauhan",
      rating: 4,
      date: "1 week ago",
      title: "Super moisturizing and non-sticky",
      comment: "Very lightweight formula. Keeps skin hydrated throughout the day without making it look oily. Great packaging with protective seal.",
      verifiedPurchase: true,
      location: "Delhi NCR",
      helpfulCount: 21
    },
    {
      author: "Ritu Aggarwal",
      rating: 5,
      date: "3 weeks ago",
      title: "Must have in your daily beauty routine",
      comment: "High quality ingredients. Gives smooth skin finish and works well under makeup too. Completely satisfied!",
      verifiedPurchase: true,
      location: "Ludhiana, Punjab",
      helpfulCount: 17
    },
    {
      author: "Tanvi Shah",
      rating: 5,
      date: "1 day ago",
      title: "Gave me a beautiful glow",
      comment: "Skin feels hydrated and looks radiant even without makeup now. No irritation at all. Definitely repurchasing.",
      verifiedPurchase: true,
      location: "Ahmedabad, Gujarat",
      helpfulCount: 46
    },
    {
      author: "Kiran Deshpande",
      rating: 4,
      date: "5 days ago",
      title: "Works great, mild fragrance",
      comment: "Lightweight formula that doesn't clog pores. Keeps my skin fresh throughout the day. Great value at this price.",
      verifiedPurchase: true,
      location: "Nagpur, Maharashtra",
      helpfulCount: 15
    },
    {
      author: "Sakshi Arora",
      rating: 5,
      date: "2 weeks ago",
      title: "Loved by every customer I resold to",
      comment: "Bought a box for my boutique customers and everyone asked for the brand name. Premium packaging and authentic product.",
      verifiedPurchase: true,
      location: "Delhi NCR",
      helpfulCount: 52
    },
    {
      author: "Lakshmi Nair",
      rating: 4,
      date: "3 days ago",
      title: "Gentle on sensitive skin",
      comment: "I have very sensitive skin and this caused zero reactions. Absorbs fast and hydrates well. Recommended for all skin types.",
      verifiedPurchase: true,
      location: "Thrissur, Kerala",
      helpfulCount: 18
    },
    {
      author: "Meghna Chawla",
      rating: 5,
      date: "6 days ago",
      title: "Exceeded my expectations",
      comment: "Texture is perfect and the results are visible within days. Works beautifully as a base before sunscreen and makeup.",
      verifiedPurchase: true,
      location: "Chandigarh, Punjab",
      helpfulCount: 31
    }
  ]
};

export function getReviewsForProduct(product: Product): Review[] {
  if (Array.isArray(product.reviews) && product.reviews.length > 0) {
    return product.reviews;
  }

  const category = (product.category || 'grocery').toLowerCase();
  const pool = sampleReviewPoolByCategory[category] || sampleReviewPoolByCategory.grocery;

  // Derive unique seed from product id to consistently select/tailor reviews
  let hash = 0;
  const seed = (product.id || '') + (product.title || '');
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  // Select a subset of reviews (always more than 5, up to the pool size)
  const minCount = Math.min(6, pool.length);
  const count = minCount + (posHash % ((pool.length - minCount) + 1));
  const selectedIndices = new Set<number>();
  while (selectedIndices.size < count) {
    selectedIndices.add((posHash + selectedIndices.size * 13) % pool.length);
  }

  const result = Array.from(selectedIndices).map((poolIdx, idx) => {
    const item = pool[poolIdx];
    
    // Add date variation based on hash
    const daysAgo = 1 + ((posHash + idx * 11) % 30);
    const dateStr = daysAgo === 1 ? "1 day ago" : daysAgo < 7 ? `${daysAgo} days ago` : `${Math.floor(daysAgo / 7)} week${Math.floor(daysAgo / 7) > 1 ? 's' : ''} ago`;

    return {
      id: `rev-${product.id}-${poolIdx}-${idx + 1}`,
      ...item,
      date: dateStr,
      // Add realistic variations
      helpfulCount: Math.max(5, (item.helpfulCount || 10) + ((posHash + idx * 7) % 30))
    };
  });

  // Sort by rating (highest first) or something consistent
  return result.sort((a, b) => b.rating - a.rating);
}
