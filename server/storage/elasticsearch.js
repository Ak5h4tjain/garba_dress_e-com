// Elasticsearch Simulation: Full-Text Garba & Navratri Designer Ethnic Wear Search & Filtering
class ElasticsearchEngine {
  constructor() {
    this.index = new Map();
    this.seedCatalog();
  }

  seedCatalog() {
    const products = [
      {
        id: "prod_garba_gamthi_01",
        sku: "GARBA-GAMTHI-BLK",
        name: "Royal Kutchhi Gamthi Real Mirror Work Chaniya Choli",
        category: "Chaniya Choli",
        subCategory: "Gamthi Mirror Work",
        price: 3499,
        mrp: 5999,
        rentalPrice: 899,
        unit: "Complete 3-Piece Set",
        flare: "10.5 Meter Full Circle Gher",
        fabric: "100% Pure Heavy Khadi Cotton with Real Convex Glass Mirrors & Hand Embroidery",
        sizes: ["S (36)", "M (38)", "L (40)", "XL (42)", "Custom Tailoring"],
        color: "Jet Black with Multicolored Gamthi Threads",
        description: "Masterpiece Gujarati artisan Chaniya Choli. Features over 1,200 hand-stitched real glass mirrors, traditional elephant and peacock Gamthi motifs, and massive 10.5-meter twirling flare for effortless 360° Garba pirouettes.",
        imageUrl: "/garba_black_mirror.jpg",
        tags: ["garba", "chaniya choli", "mirror work", "gamthi", "black", "navratri", "kutchhi", "twirl", "choli", "lehenga"],
        rating: 4.95,
        reviewsCount: 1840,
        featured: true
      },
      {
        id: "prod_garba_peacock_02",
        sku: "GARBA-KALIDAR-BLU",
        name: "Festive Kalidar Twirl Chaniya Choli in Peacock Blue & Crimson",
        category: "Chaniya Choli",
        subCategory: "Kalidar Flare",
        price: 3899,
        mrp: 6499,
        rentalPrice: 949,
        unit: "Complete 3-Piece Set",
        flare: "12 Meter Super-Flared Gher",
        fabric: "Pure Cotton with Foil Mirror Work and Brass Cowrie Shell Latkans",
        sizes: ["S (36)", "M (38)", "L (40)", "XL (42)"],
        color: "Peacock Blue & Crimson Red",
        description: "Spectacular 12-meter 32-kali flare designed for maximum dramatic twirls on the Garba ground. Accented with brass ghungroo tassels and heavy zari thread borders.",
        imageUrl: "/garba_choli_hero.jpg",
        tags: ["garba", "chaniya choli", "peacock blue", "crimson", "twirl", "navratri", "kalidar", "choli"],
        rating: 4.92,
        reviewsCount: 1420,
        featured: true
      },
      {
        id: "prod_garba_yellow_03",
        sku: "GARBA-BANDHEJ-YEL",
        name: "Radiant Mustard Yellow & Rust Bandhani Georgette Lehenga Choli",
        category: "Chaniya Choli",
        subCategory: "Bandhani & Leheriya",
        price: 2899,
        mrp: 4799,
        rentalPrice: 749,
        unit: "Complete 3-Piece Set",
        flare: "8.5 Meter Circular Flare",
        fabric: "Flowy Georgette with Authentic Bandhej Print and Gota Patti Borders",
        sizes: ["Free Size (Waist 28-42)", "Custom"],
        color: "Mustard Yellow & Rust Orange",
        description: "Lightweight, breathable, and vibrant. Ideal for high-energy non-stop Garba nights. Detailed with glimmering gota patti borders and matching designer choli.",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
        tags: ["yellow", "bandhani", "georgette", "garba", "chaniya choli", "navratri", "gota patti"],
        rating: 4.88,
        reviewsCount: 960,
        featured: false
      },
      {
        id: "prod_garba_emerald_04",
        sku: "GARBA-SILK-EMR",
        name: "Royal Emerald Green & Gold Zari Pure Silk Chaniya Choli",
        category: "Chaniya Choli",
        subCategory: "Silk & Zari",
        price: 5499,
        mrp: 8999,
        rentalPrice: 1299,
        unit: "Complete 3-Piece Set",
        flare: "9 Meter Flare with Can-Can",
        fabric: "Chanderi Silk with Weave Gold Zari and Micro-Sequin Embellishments",
        sizes: ["S (36)", "M (38)", "L (40)", "XL (42)"],
        color: "Royal Emerald Green",
        description: "Aristocratic royalty on the dance floor. Features a structured can-can underlay for full silhouette volume and rich brocade silk choli.",
        imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
        tags: ["emerald green", "silk", "zari", "chaniya choli", "garba", "navratri", "designer", "royal"],
        rating: 4.96,
        reviewsCount: 680,
        featured: true
      },
      {
        id: "prod_garba_rani_05",
        sku: "GARBA-RANI-PNK",
        name: "Dazzling Rani Pink & Orange Mirror Work Cotton Chaniya Choli",
        category: "Chaniya Choli",
        subCategory: "Gamthi Mirror Work",
        price: 3199,
        mrp: 5299,
        rentalPrice: 799,
        unit: "Complete 3-Piece Set",
        flare: "10 Meter Flare",
        fabric: "Cambric Cotton with Handcrafted Mirror & Resham Threadwork",
        sizes: ["S (36)", "M (38)", "L (40)", "XL (42)"],
        color: "Rani Pink & Bright Tangerine",
        description: "Traditional Gujarati festive color combination with contrasting yellow choli and authentic multi-color pom-pom latkans.",
        imageUrl: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80",
        tags: ["rani pink", "pink", "chaniya choli", "garba", "navratri", "mirror work", "cotton"],
        rating: 4.85,
        reviewsCount: 1120,
        featured: false
      },
      {
        id: "prod_garba_white_06",
        sku: "GARBA-DIVINE-WHT",
        name: "Divine Off-White & Multicolored Threadwork Navratri Choli Set",
        category: "Chaniya Choli",
        subCategory: "Traditional Navratri",
        price: 3699,
        mrp: 5999,
        rentalPrice: 899,
        unit: "Complete 3-Piece Set",
        flare: "11 Meter Flare",
        fabric: "Pure Rayon Cotton with Colorful Kutchi Wool Embroidery & Real Mirrors",
        sizes: ["S (36)", "M (38)", "L (40)", "XL (42)"],
        color: "Off-White with Festive Jewel Tones",
        description: "Elegance personified. Dedicated for Sharad Purnima and Navratri Day 1 & 9 rituals. Accented with brass dori hangings and authentic hand mirror border.",
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        tags: ["white", "off-white", "divine", "garba", "chaniya choli", "navratri", "sharad purnima"],
        rating: 4.9,
        reviewsCount: 540,
        featured: false
      },
      {
        id: "prod_dupatta_bandhani_07",
        sku: "DUP-GAJI-BANDHEJ",
        name: "Authentic Gujarati Gaji Silk Bandhani Heavy Latkan Dupatta",
        category: "Dupattas & Odhanis",
        subCategory: "Bandhani Dupattas",
        price: 899,
        mrp: 1699,
        rentalPrice: 249,
        unit: "1 pc (2.5 Meters)",
        flare: "Standard Width (38 inches)",
        fabric: "100% Pure Gaji Silk with Handmade Rai Bandhej and Real Mirrors",
        sizes: ["Standard 2.5m"],
        color: "Ruby Red & Gold",
        description: "Hand-tied authentic Jamnagar Bandhani dupatta with dense mirror embroidery and hand-crafted metal coin tassels on all four edges.",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
        tags: ["dupatta", "bandhani", "gaji silk", "garba", "latkan", "mirror work"],
        rating: 4.93,
        reviewsCount: 780,
        featured: false
      },
      {
        id: "prod_dupatta_patola_08",
        sku: "DUP-PATOLA-SILK",
        name: "Handcrafted Rajkot Double Ikkat Patola Silk Dupatta",
        category: "Dupattas & Odhanis",
        subCategory: "Patola Weaves",
        price: 1499,
        mrp: 2799,
        rentalPrice: 399,
        unit: "1 pc (2.4 Meters)",
        flare: "Standard Width",
        fabric: "Pure Art Silk with Traditional Elephant & Parrot Ikkat Weave",
        sizes: ["Standard 2.4m"],
        color: "Royal Maroon & Mustard",
        description: "Prestigious Gujarati Patola weave geometry with rich golden zari borders. Gives an aristocratic royal flair over plain or mirror-work lehengas.",
        imageUrl: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80",
        tags: ["patola", "dupatta", "ikkat", "gujarati", "garba", "silk"],
        rating: 4.89,
        reviewsCount: 430,
        featured: false
      },
      {
        id: "prod_dandiya_wooden_09",
        sku: "DAND-WOOD-BELLS",
        name: "Handcrafted Wooden Dandiya Sticks with Brass Ghungroo (Pair)",
        category: "Dandiya Sticks",
        subCategory: "Traditional Wooden",
        price: 249,
        mrp: 450,
        rentalPrice: 60,
        unit: "1 Pair (2 Sticks)",
        flare: "15 inches length",
        fabric: "Seasoned Solid Teak Wood with Bandhani Silk Wrap & Metallic Ghungroo",
        sizes: ["Standard Adult (15 in)"],
        color: "Multicolor Embroidered Wrap",
        description: "Perfect weight and acoustic strike resonance. Weighted for rhythmic Dandiya Raas with brass bells that chime on every beat.",
        imageUrl: "/garba_dandiya_jewelry.jpg",
        tags: ["dandiya", "dandiya sticks", "ghungroo", "garba", "wooden", "bells", "navratri"],
        rating: 4.91,
        reviewsCount: 2200,
        featured: true
      },
      {
        id: "prod_dandiya_led_10",
        sku: "DAND-LED-GLOW",
        name: "Premium LED Multi-Mode Glow Dandiya Sticks for Neon Garba",
        category: "Dandiya Sticks",
        subCategory: "LED & Glow",
        price: 399,
        mrp: 699,
        rentalPrice: 99,
        unit: "1 Pair with USB Charger",
        flare: "14.5 inches length",
        fabric: "Shatterproof High-Density Acrylic with RGB Motion Sensors",
        sizes: ["Standard (14.5 in)"],
        color: "Rainbow RGB Glow Modes",
        description: "Illuminate the dance floor! Built-in accelerometer changes LED color pattern on impact. Over 6 hours continuous battery life on single USB charge.",
        imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        tags: ["led dandiya", "glow", "neon garba", "dandiya sticks", "rgb", "night"],
        rating: 4.84,
        reviewsCount: 1540,
        featured: false
      },
      {
        id: "prod_jewelry_choker_11",
        sku: "JWL-OXID-CHOKER",
        name: "Royal Antique Oxidized German Silver Heavy Choker & Jhumka Set",
        category: "Oxidized Jewelry",
        subCategory: "Necklace Sets",
        price: 1199,
        mrp: 2299,
        rentalPrice: 299,
        unit: "Necklace + Earrings + Maang Tikka",
        flare: "Adjustable Velvet Dori",
        fabric: "Premium German Silver Alloy (Lead & Nickel Free, Skin Safe)",
        sizes: ["Adjustable Free Size"],
        color: "Antique Matte Silver",
        description: "The quintessential Navratri statement piece. Intricate peacock repoussé work with cascading silver ghungroo beads and matching statement jhumkas.",
        imageUrl: "/garba_dandiya_jewelry.jpg",
        tags: ["oxidized jewelry", "choker", "jhumka", "silver", "garba", "navratri", "peacock"],
        rating: 4.97,
        reviewsCount: 3100,
        featured: true
      },
      {
        id: "prod_jewelry_kamar_12",
        sku: "JWL-KAMAR-BELLS",
        name: "Traditional Gujarati Chabi Chhalla & Mirror Kamarbandh (Waistband)",
        category: "Oxidized Jewelry",
        subCategory: "Waistbands & Payal",
        price: 549,
        mrp: 999,
        rentalPrice: 149,
        unit: "1 Waistband with Key Ring",
        flare: "Adjustable 26-40 inches",
        fabric: "Oxidized Silver with Inlaid Mirrors and Hanging Ghungroo Drops",
        sizes: ["Free Size (26-40 in)"],
        color: "Matte Antique Silver",
        description: "Accentuates every hip movement during Sanedo and Garba steps. Includes traditional keychain latch to tuck securely into chaniya waistband.",
        imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
        tags: ["kamarbandh", "waistband", "oxidized", "chabi chhalla", "garba", "jewelry"],
        rating: 4.86,
        reviewsCount: 890,
        featured: false
      },
      {
        id: "prod_men_kediyu_13",
        sku: "MEN-KEDIYU-RABARI",
        name: "Men's Authentic Rabari Hand-Embroidered Kediyu & Dhoti Set",
        category: "Men's Garba Wear",
        subCategory: "Kediyu & Dhoti",
        price: 2999,
        mrp: 4999,
        rentalPrice: 799,
        unit: "Kediyu Frock + Stitched Dhoti + Dupatta",
        flare: "Frock Style Pleated Flare",
        fabric: "Pure Khadi Cotton with Pom-Poms, Mirrors & Cowrie Shell Accents",
        sizes: ["38 (M)", "40 (L)", "42 (XL)", "44 (XXL)"],
        color: "Black & Multicolored Tribal Resham",
        description: "Traditional Kutchi Rabari men's attire. Heavy gathers create a dramatic flared silhouette when twirling. Pre-stitched dhoti with elastic waistband for comfort.",
        imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
        tags: ["kediyu", "men garba", "dhoti", "rabari", "kutchhi", "navratri", "kurta"],
        rating: 4.88,
        reviewsCount: 720,
        featured: true
      },
      {
        id: "prod_kids_choli_14",
        sku: "KIDS-CHOLI-GIRL",
        name: "Little Princess Gujarati Mirror Work Chaniya Choli Set (Ages 4-12)",
        category: "Kids Festive Wear",
        subCategory: "Girls Chaniya Choli",
        price: 1499,
        mrp: 2499,
        rentalPrice: 399,
        unit: "Skirt + Choli + Dupatta",
        flare: "6 Meter Twirl Flare",
        fabric: "Soft 100% Breathable Cotton with Child-Safe Acrylic Mirrors",
        sizes: ["4-5 Yrs", "6-7 Yrs", "8-9 Yrs", "10-12 Yrs"],
        color: "Bright Yellow & Rani Pink",
        description: "Ultra-comfortable lightweight festive wear for young girls. Soft lining inside to prevent any mirror scratching during dance performances.",
        imageUrl: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=600&q=80",
        tags: ["kids garba", "girls choli", "chaniya choli", "navratri", "kids ethnic"],
        rating: 4.92,
        reviewsCount: 650,
        featured: false
      }
    ];

    products.forEach(p => this.index.set(p.id, p));
  }

  // Full-Text Search with Fuzzy Matching and Scoring
  search({ query = "", category = "", minPrice = 0, maxPrice = 999999, sortBy = "relevance" }) {
    const q = query.trim().toLowerCase();
    let results = Array.from(this.index.values());

    if (category && category !== "All") {
      results = results.filter(p => p.category === category || p.subCategory === category);
    }

    if (q) {
      results = results
        .map(product => {
          let score = 0;
          const nameLower = product.name.toLowerCase();
          const descLower = product.description.toLowerCase();
          const tags = product.tags.map(t => t.toLowerCase());

          // Exact SKU match
          if (product.sku.toLowerCase() === q) score += 100;
          // Exact name match or start
          if (nameLower === q) score += 80;
          else if (nameLower.startsWith(q)) score += 50;
          else if (nameLower.includes(q)) score += 30;

          // Tag match
          if (tags.includes(q)) score += 40;
          else if (tags.some(t => t.includes(q) || q.includes(t))) score += 20;

          // Description match
          if (descLower.includes(q)) score += 10;

          return { product, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);
    }

    // Price range
    results = results.filter(p => p.price >= minPrice && p.price <= maxPrice);

    // Sorting
    if (sortBy === "price_asc") results.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") results.sort((a, b) => b.price - a.price);
    else if (sortBy === "rating") results.sort((a, b) => b.rating - a.rating);

    return results;
  }

  getProductById(id) {
    return this.index.get(id) || null;
  }

  getAllProducts() {
    return Array.from(this.index.values());
  }

  getCategories() {
    const categories = new Set();
    this.index.forEach(p => categories.add(p.category));
    return Array.from(categories);
  }

  upsertProduct(product) {
    this.index.set(product.id, product);
    return product;
  }

  deleteProduct(id) {
    return this.index.delete(id);
  }
}

export const elasticsearch = new ElasticsearchEngine();
