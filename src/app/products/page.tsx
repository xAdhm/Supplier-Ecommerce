import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';

// Fetches live data from MongoDB, so this page must render per-request
// rather than being statically prerendered at build time. Without this,
// a build-time DB hiccup (e.g. DNS SRV lookup failure) bakes an empty
// "No Products Available" page into the static output.
export const dynamic = 'force-dynamic';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getProducts(limit: number = 20) {
  try {
    await connectDB();

    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts(20);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      cleaning: 'bg-blue-100 text-blue-800',
      packaging: 'bg-green-100 text-green-800',
      safety: 'bg-red-100 text-red-800',
      storage: 'bg-purple-100 text-purple-800',
      equipment: 'bg-orange-100 text-orange-800',
      electronics: 'bg-indigo-100 text-indigo-800',
      clothing: 'bg-pink-100 text-pink-800',
      books: 'bg-yellow-100 text-yellow-800',
      home: 'bg-teal-100 text-teal-800',
      sports: 'bg-cyan-100 text-cyan-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              All Products
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our comprehensive range of high-quality supplies for your business needs
            </p>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Products Available</h2>
              <p className="text-gray-600">Check back soon for new products!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <div key={product._id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300">
                  <Link href={`/products/${product._id}`}>
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <Image
                        src={product.images[0] || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(product.category)}`}>
                          {product.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-xl font-bold text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                        <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}