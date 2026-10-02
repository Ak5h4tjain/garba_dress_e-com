// Catalog Microservice: Products, Categories, Taxonomy, Search
import { elasticsearch } from "../../storage/elasticsearch.js";

export class CatalogService {
  constructor() {
    this.elasticsearch = elasticsearch;
  }

  getProducts(filter = {}) {
    return this.elasticsearch.search(filter);
  }

  getProductById(id) {
    return this.elasticsearch.getProductById(id);
  }

  getCategories() {
    return this.elasticsearch.getCategories();
  }

  searchProducts(query, category) {
    return this.elasticsearch.search({ query, category });
  }

  createProduct(productData) {
    const id = productData.id || `prod_garba_${Date.now().toString(36)}`;
    const newProduct = {
      id,
      sku: productData.sku || `GARBA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      rating: 4.9,
      reviewsCount: 1,
      featured: true,
      ...productData
    };
    return this.elasticsearch.upsertProduct(newProduct);
  }

  updateProduct(id, updates) {
    const existing = this.elasticsearch.getProductById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    return this.elasticsearch.upsertProduct(updated);
  }

  deleteProduct(id) {
    return this.elasticsearch.deleteProduct(id);
  }
}

export const catalogService = new CatalogService();
